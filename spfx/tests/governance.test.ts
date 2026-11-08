import assert from 'node:assert/strict';
import {
  Decision, DecisionStatus, Lesson, LessonCategory, LessonStatus, Review, ReviewHealth, ReviewStatus, ReviewType, Risk, RiskScale, RiskStatus
} from '../src/models';
import {
  applyDecisionEffects, getAllowedDecisionStatuses, getAllowedLessonStatuses, getAllowedReviewStatuses, getAllowedRiskStatuses,
  isActiveRisk, isHighActiveRisk, riskLevel, riskLevelOf, riskScore
} from '../src/rules/governance';
import { isClosedStatus } from '../src/rules/transitions';
import { hasErrors, validateDecision, validateLesson, validateReview, validateRisk } from '../src/rules/validation';
import { buildDecisionPayload, buildLessonPayload, buildReviewPayload, buildRiskPayload } from '../src/entities/payloads';
import { mapDecision, mapLesson, mapReview, mapRisk } from '../src/components/shared/mappers';

const risk = (o: Partial<Risk> = {}): Risk => ({
  riskId: 'R-1', title: 'Risk', description: '', status: RiskStatus.OPEN, probability: RiskScale.MEDIUM, impact: RiskScale.MEDIUM, ownerUpn: 'a@b.com', mitigation: '', ...o
});
const decision = (o: Partial<Decision> = {}): Decision => ({ decisionId: 'D-1', title: 'Dec', description: '', rationale: '', status: DecisionStatus.PROPOSED, decidedBy: '', ...o });
const lesson = (o: Partial<Lesson> = {}): Lesson => ({
  lessonId: 'L-1', title: 'Lesson', description: '', recommendation: '', category: LessonCategory.PROCESS, status: LessonStatus.NEW, ownerUpn: '', ...o
});
const review = (o: Partial<Review> = {}): Review => ({
  reviewId: 'V-1', title: 'Review', reviewType: ReviewType.STATUS, status: ReviewStatus.SCHEDULED, health: ReviewHealth.GREEN, summary: '', nextSteps: '', ownerUpn: 'a@b.com', ...o
});

// ---------------------------------------------------------------- risk score
const testScoreAndLevel = (): void => {
  const L = RiskScale.LOW, M = RiskScale.MEDIUM, H = RiskScale.HIGH;
  assert.equal(riskScore(L, L), 1);
  assert.equal(riskScore(M, M), 4);
  assert.equal(riskScore(H, H), 9);
  assert.equal(riskScore(L, H), riskScore(H, L), 'probability and impact weigh the same');

  // every possible score maps to exactly one level, with the documented thresholds
  assert.equal(riskLevelOf(1), 'LOW');
  assert.equal(riskLevelOf(2), 'LOW');
  assert.equal(riskLevelOf(3), 'MEDIUM');
  assert.equal(riskLevelOf(4), 'MEDIUM');
  assert.equal(riskLevelOf(6), 'HIGH');
  assert.equal(riskLevelOf(9), 'HIGH');

  const all = [L, M, H];
  const levels: Record<string, string[]> = {};
  for (const p of all) {
    for (const i of all) {
      const key = riskLevel({ probability: p, impact: i });
      (levels[key] = levels[key] || []).push(`${p}/${i}`);
    }
  }
  assert.deepEqual(levels.HIGH.sort(), ['HIGH/HIGH', 'HIGH/MEDIUM', 'MEDIUM/HIGH'], 'only high-high and high-medium reach HIGH');
  assert.deepEqual(levels.LOW.sort(), ['LOW/LOW', 'LOW/MEDIUM', 'MEDIUM/LOW'].sort());
};

const testHighActive = (): void => {
  assert.equal(isHighActiveRisk(risk({ probability: RiskScale.HIGH, impact: RiskScale.HIGH })), true);
  assert.equal(isHighActiveRisk(risk({ probability: RiskScale.HIGH, impact: RiskScale.HIGH, status: RiskStatus.MITIGATING })), true, 'being mitigated does not make it go away');
  assert.equal(isHighActiveRisk(risk({ probability: RiskScale.HIGH, impact: RiskScale.HIGH, status: RiskStatus.ACCEPTED })), true, 'an accepted risk is still exposure');
  assert.equal(isHighActiveRisk(risk({ probability: RiskScale.HIGH, impact: RiskScale.HIGH, status: RiskStatus.CLOSED })), false);
  assert.equal(isHighActiveRisk(risk()), false, 'a medium risk is not high');
  assert.equal(isActiveRisk(risk({ status: RiskStatus.CLOSED })), false);
};

// ---------------------------------------------------------------- status rules
const testTransitions = (): void => {
  assert.deepEqual(getAllowedRiskStatuses(RiskStatus.OPEN), [RiskStatus.OPEN, RiskStatus.MITIGATING, RiskStatus.ACCEPTED, RiskStatus.CLOSED]);
  assert.ok(getAllowedRiskStatuses(RiskStatus.CLOSED).indexOf(RiskStatus.OPEN) > -1, 'a closed risk can be reopened');
  assert.equal(getAllowedRiskStatuses(RiskStatus.CLOSED).indexOf(RiskStatus.ACCEPTED), -1);

  assert.deepEqual(getAllowedDecisionStatuses(DecisionStatus.PROPOSED), [DecisionStatus.PROPOSED, DecisionStatus.DECIDED]);
  assert.equal(getAllowedDecisionStatuses(DecisionStatus.PROPOSED).indexOf(DecisionStatus.SUPERSEDED), -1, 'a proposal cannot be superseded');
  assert.deepEqual(getAllowedDecisionStatuses(DecisionStatus.SUPERSEDED), [DecisionStatus.SUPERSEDED], 'a superseded decision is final');

  assert.ok(getAllowedLessonStatuses(LessonStatus.NEW).indexOf(LessonStatus.APPLIED) > -1);
  assert.ok(getAllowedLessonStatuses(LessonStatus.APPLIED).indexOf(LessonStatus.REVIEWED) > -1);

  assert.ok(getAllowedReviewStatuses(ReviewStatus.SCHEDULED).indexOf(ReviewStatus.COMPLETED) > -1);
  assert.ok(getAllowedReviewStatuses(ReviewStatus.CANCELLED).indexOf(ReviewStatus.SCHEDULED) > -1, 'a cancelled review can be rescheduled');
};

const testClosedStatuses = (): void => {
  for (const s of ['CLOSED', 'SUPERSEDED', 'APPLIED']) {
    assert.equal(isClosedStatus(s), true, s);
  }
  for (const s of ['OPEN', 'MITIGATING', 'ACCEPTED', 'PROPOSED', 'DECIDED', 'REVIEWED', 'SCHEDULED']) {
    assert.equal(isClosedStatus(s), false, s);
  }
};

const testDecisionEffects = (): void => {
  const now = new Date(2026, 10, 8, 15);
  const decided = applyDecisionEffects(decision({ status: DecisionStatus.DECIDED }), DecisionStatus.PROPOSED, 'me@x.com', now);
  assert.equal(decided.decisionDate, '2026-11-08');
  assert.equal(decided.decidedBy, 'me@x.com');

  const kept = applyDecisionEffects(decision({ status: DecisionStatus.DECIDED, decisionDate: '2026-11-01', decidedBy: 'boss@x.com' }), DecisionStatus.PROPOSED, 'me@x.com', now);
  assert.equal(kept.decisionDate, '2026-11-01', 'a date typed by the user is kept');
  assert.equal(kept.decidedBy, 'boss@x.com', 'so is the person');

  const partly = applyDecisionEffects(decision({ status: DecisionStatus.DECIDED, decidedBy: 'boss@x.com' }), DecisionStatus.PROPOSED, 'me@x.com', now);
  assert.equal(partly.decidedBy, 'boss@x.com');
  assert.equal(partly.decisionDate, '2026-11-08', 'only the missing part is filled');

  const unchanged = decision({ status: DecisionStatus.DECIDED, decisionDate: '2026-11-01', decidedBy: 'boss@x.com' });
  assert.equal(applyDecisionEffects(unchanged, DecisionStatus.DECIDED, 'me@x.com', now), unchanged, 'editing a decided decision changes nothing');
  const proposed = decision();
  assert.equal(applyDecisionEffects(proposed, DecisionStatus.PROPOSED, 'me@x.com', now), proposed, 'a proposal is not filled in');
};

// ---------------------------------------------------------------- validation
const testValidation = (): void => {
  assert.equal(hasErrors(validateRisk(risk())), false);
  assert.equal(validateRisk(risk({ title: ' ' })).title, 'validation.titleRequired');
  assert.equal(validateRisk(risk({ ownerUpn: '' })).ownerUpn, 'validation.ownerRequired', 'a risk needs an owner');
  assert.equal(validateRisk(risk({ dueDate: '2026-02-30' })).dueDate, 'validation.dateInvalid');

  assert.equal(hasErrors(validateDecision(decision())), false, 'a proposal needs no decider yet');
  assert.equal(validateDecision(decision({ decidedBy: 'Luis' })).decidedBy, 'validation.deciderInvalid');
  assert.equal(hasErrors(validateDecision(decision({ decidedBy: 'luis@x.com', decisionDate: '2026-11-08' }))), false);

  assert.equal(hasErrors(validateLesson(lesson())), false, 'a lesson does not need an owner');
  assert.equal(validateLesson(lesson({ ownerUpn: 'nobody' })).ownerUpn, 'validation.ownerInvalid');

  assert.equal(validateReview(review({ ownerUpn: '' })).ownerUpn, 'validation.ownerRequired');
  assert.equal(validateReview(review({ reviewDate: '2026-11-10', nextReviewDate: '2026-11-01' })).nextReviewDate, 'validation.nextBeforeReview');
  assert.equal(hasErrors(validateReview(review({ reviewDate: '2026-11-10', nextReviewDate: '2026-11-10' }))), false);
  assert.equal(hasErrors(validateReview(review({ nextReviewDate: '2026-11-10' }))), false, 'a next review without a date for this one is fine');
};

// ---------------------------------------------------------------- what is written and read
const testPayloadsAndMappers = (): void => {
  const r = buildRiskPayload(risk({ probability: RiskScale.HIGH, impact: RiskScale.LOW, dueDate: '2026-12-01', projectId: 'P-1' }));
  assert.equal(r.Probability, 'HIGH');
  assert.equal(r.Impact, 'LOW');
  assert.equal(r.DueDate, '2026-12-01T12:00:00Z');
  assert.equal(r.ProjectId, 'P-1');
  assert.equal(buildRiskPayload(risk()).DueDate, null, 'no date is cleared with null');

  assert.equal(buildDecisionPayload(decision({ title: '  Padded  ' })).Title, 'Padded');
  assert.equal(buildLessonPayload(lesson()).Category, 'PROCESS');
  assert.equal(buildReviewPayload(review({ health: ReviewHealth.RED })).Health, 'RED');

  // reading a row from SharePoint, including odd values
  const read = mapRisk({ Id: 5, Title: 'T', RiskId: 'R-9', Status: 'MITIGATING', Probability: 'HIGH', Impact: 'nonsense', DueDate: '2026-12-01T08:00:00Z', Editor: { Title: 'Ana' } });
  assert.equal(read.status, RiskStatus.MITIGATING);
  assert.equal(read.probability, RiskScale.HIGH);
  assert.equal(read.impact, RiskScale.MEDIUM, 'an unknown value falls back to the default');
  assert.equal(read.editor, 'Ana');
  assert.equal(mapDecision({ Status: 'weird' }).status, DecisionStatus.PROPOSED);
  assert.equal(mapLesson({ Category: 'VENDOR' }).category, LessonCategory.VENDOR);
  assert.equal(mapReview({ Health: 'AMBER', ReviewType: 'CLOSURE' }).health, ReviewHealth.AMBER);
  assert.equal(mapReview({}).status, ReviewStatus.SCHEDULED, 'an empty row gets the first status');
};

testScoreAndLevel();
testHighActive();
testTransitions();
testClosedStatuses();
testDecisionEffects();
testValidation();
testPayloadsAndMappers();
console.log('governance tests passed');
