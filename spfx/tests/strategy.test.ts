import assert from 'node:assert/strict';
import { en } from '../src/i18n/en';
import { es } from '../src/i18n/es';
import { mapCase, mapObjective, mapWeekly } from '../src/components/shared/mappers';
import { buildCasePayload, buildObjectivePayload, buildWeeklyPayload } from '../src/entities/payloads';
import { ActionPriority, ApprovalStatus, BusinessCase, CaseStatus, Objective, ObjectiveStatus, WeeklyReview, WeeklyReviewStatus } from '../src/models';
import { buildAgenda, IAgendaInput } from '../src/rules/agenda';
import { APPROVAL_RULES, evaluateChange, findRule } from '../src/rules/approvals';
import {
  applyCaseEffects, casePaybackMonths, caseRoiPct, casesOfObjective, getAllowedCaseStatuses, getAllowedObjectiveStatuses, isCaseToDecide, isObjectiveLate, isWeeklyReviewMissing,
  lastWeekStart, reviewTitleFor, weekStartOf
} from '../src/rules/strategy';
import { isClosedStatus } from '../src/rules/transitions';
import { hasErrors, validateCase, validateObjective, validateWeekly } from '../src/rules/validation';

const NOW = new Date(2026, 10, 9, 12); // Monday 9 November 2026

const objective = (o: Partial<Objective> = {}): Objective => ({
  objectiveId: 'O-1', title: 'Raise satisfaction', description: '', ownerUpn: 'a@b.com', sponsorUpn: '', status: ObjectiveStatus.ACTIVE, priority: ActionPriority.MEDIUM, goal: 'NPS 85', ...o
});
const businessCase = (o: Partial<BusinessCase> = {}): BusinessCase => ({
  caseId: 'C-1', title: 'Buy iPads', problem: '', options: '', recommendation: '', risks: '', estimatedCost: 10000, annualBenefit: 15000, ownerUpn: 'a@b.com', status: CaseStatus.DRAFT, decisionNotes: '', ...o
});
const review = (o: Partial<WeeklyReview> = {}): WeeklyReview => ({
  reviewId: 'W-1', title: 'Week', weekStart: '2026-11-02', status: WeeklyReviewStatus.COMPLETED, happened: '', wentWell: '', wentWrong: '', attention: '', decisions: '', risks: '', priorities: '',
  stopDoing: '', startDoing: '', ownerUpn: 'a@b.com', ...o
});

const testObjectives = (): void => {
  assert.equal(isObjectiveLate(objective({ targetDate: '2026-11-08' }), NOW), true);
  assert.equal(isObjectiveLate(objective({ targetDate: '2026-11-09' }), NOW), false, 'the target day itself is in time');
  assert.equal(isObjectiveLate(objective({ targetDate: '2026-11-01', status: ObjectiveStatus.ACHIEVED }), NOW), false, 'an achieved objective is never late');
  assert.equal(isObjectiveLate(objective({ targetDate: '2026-11-01', status: ObjectiveStatus.DRAFT }), NOW), false, 'only active objectives are late');
  assert.equal(isObjectiveLate(objective({ targetDate: undefined }), NOW), false);
  assert.deepEqual(getAllowedObjectiveStatuses(ObjectiveStatus.ACHIEVED), [ObjectiveStatus.ACHIEVED, ObjectiveStatus.ACTIVE], 'an achieved objective can be reopened');
  assert.ok(getAllowedObjectiveStatuses(ObjectiveStatus.DRAFT).indexOf(ObjectiveStatus.ACHIEVED) === -1, 'a draft cannot be achieved without being active');
  assert.equal(isClosedStatus('ACHIEVED'), true);
  assert.deepEqual(casesOfObjective(objective(), [businessCase({ objectiveId: 'O-1' }), businessCase({ caseId: 'C-2', objectiveId: 'O-2' }), businessCase({ caseId: 'C-3' })]).map(c => c.caseId), ['C-1']);
};

const testCases = (): void => {
  assert.equal(caseRoiPct(businessCase({ estimatedCost: 10000, annualBenefit: 15000 })), 50);
  assert.equal(caseRoiPct(businessCase({ estimatedCost: 151200, annualBenefit: 90000 })), -40);
  assert.equal(caseRoiPct(businessCase({ estimatedCost: 8000, annualBenefit: 20000 })), 150);
  assert.equal(caseRoiPct(businessCase({ estimatedCost: 0, annualBenefit: 5000 })), undefined, 'no cost, nothing to compare with');
  assert.equal(caseRoiPct(businessCase({ estimatedCost: 5000, annualBenefit: 0 })), -100);
  assert.equal(casePaybackMonths(businessCase({ estimatedCost: 10000, annualBenefit: 15000 })), 8);
  assert.equal(casePaybackMonths(businessCase({ estimatedCost: 151200, annualBenefit: 90000 })), 20.2);
  assert.equal(casePaybackMonths(businessCase({ estimatedCost: 5000, annualBenefit: 0 })), undefined, 'no benefit, no payback');
  assert.equal(casePaybackMonths(businessCase({ estimatedCost: 0, annualBenefit: 100 })), undefined);

  assert.equal(isCaseToDecide(businessCase({ status: CaseStatus.SUBMITTED })), true);
  assert.equal(isCaseToDecide(businessCase()), false);
  assert.deepEqual(getAllowedCaseStatuses(CaseStatus.SUBMITTED), [CaseStatus.SUBMITTED, CaseStatus.APPROVED, CaseStatus.REJECTED, CaseStatus.DRAFT]);
  assert.ok(getAllowedCaseStatuses(CaseStatus.DRAFT).indexOf(CaseStatus.APPROVED) === -1, 'a case is submitted before it is approved');

  assert.equal(applyCaseEffects(businessCase({ status: CaseStatus.APPROVED }), NOW).decisionDate, '2026-11-09');
  assert.equal(applyCaseEffects(businessCase({ status: CaseStatus.REJECTED }), NOW).decisionDate, '2026-11-09');
  assert.equal(applyCaseEffects(businessCase({ status: CaseStatus.APPROVED, decisionDate: '2026-11-01' }), NOW).decisionDate, '2026-11-01', 'a given day is kept');
  assert.equal(applyCaseEffects(businessCase({ status: CaseStatus.DRAFT, decisionDate: '2026-11-01' }), NOW).decisionDate, '', 'back to a draft clears the decision');
  assert.equal(applyCaseEffects(businessCase({ status: CaseStatus.SUBMITTED }), NOW).decisionDate, undefined);
};

const testApproval = (): void => {
  const rule = findRule('case.approve');
  assert.ok(rule && rule.enabled && rule.entity === 'cases');
  assert.ok(en[rule.titleKey] && es[rule.titleKey] && en[rule.whyKey] && es[rule.whyKey], 'the rule has its texts in both languages');
  assert.ok(APPROVAL_RULES.every(r => en[r.titleKey] && es[r.titleKey]), 'every rule is translated');

  const submitted = businessCase({ status: CaseStatus.SUBMITTED, estimatedCost: 60000 });
  const approve = { ...submitted, status: CaseStatus.APPROVED };
  assert.equal(evaluateChange('cases', submitted, approve).blockedBy.length, 1, 'a large case cannot be approved without an approval');
  assert.equal(evaluateChange('cases', submitted, { ...approve, estimatedCost: 49999 }).blockedBy.length, 0, 'a smaller one can');
  assert.equal(evaluateChange('cases', submitted, { ...approve, estimatedCost: 50000 }).blockedBy.length, 1, 'the threshold itself needs it');
  assert.equal(evaluateChange('cases', submitted, { ...submitted, title: 'New title' }).blockedBy.length, 0, 'other changes are free');
  const approved = { ...submitted, approval: { ruleId: 'case.approve', status: ApprovalStatus.APPROVED, approver: 'x@y.com', requestedOn: '', decidedOn: '', decidedBy: '', comment: '' } };
  const gate = evaluateChange('cases', approved, approve);
  assert.equal(gate.blockedBy.length, 0, 'with a recorded approval it goes ahead');
  assert.equal(gate.consumesApproval, true, 'and the approval is used up');
  assert.equal(evaluateChange('cases', undefined, approve).needsExistingItem, true, 'a new case cannot be created already approved');
};

const testWeekly = (): void => {
  assert.equal(weekStartOf('2026-11-09'), '2026-11-09', 'a Monday is its own week start');
  assert.equal(weekStartOf('2026-11-15'), '2026-11-09', 'Sunday belongs to the week that started on Monday');
  assert.equal(weekStartOf('2026-11-11'), '2026-11-09');
  assert.equal(weekStartOf('2026-11-08'), '2026-11-02', 'the Sunday before');
  assert.equal(weekStartOf('2027-01-01'), '2026-12-28', 'across a year');
  assert.equal(weekStartOf('not a day'), 'not a day');
  assert.equal(lastWeekStart(NOW), '2026-11-02');
  assert.equal(lastWeekStart(new Date(2026, 10, 15, 12)), '2026-11-02', 'on a Sunday it is still the week before the current one');
  assert.equal(reviewTitleFor('2026-11-09'), 'Week of 2026-11-09');

  assert.equal(isWeeklyReviewMissing([], NOW), false, 'someone who never started is not nagged');
  assert.equal(isWeeklyReviewMissing([review({ weekStart: '2026-11-02' })], NOW), false, 'last week is covered');
  assert.equal(isWeeklyReviewMissing([review({ weekStart: '2026-11-04' })], NOW), false, 'any day of that week counts');
  assert.equal(isWeeklyReviewMissing([review({ weekStart: '2026-10-26' })], NOW), true, 'only an older week');
  assert.equal(isWeeklyReviewMissing([review({ weekStart: '2026-11-02', status: WeeklyReviewStatus.DRAFT })], NOW), true, 'a draft does not count');
  assert.equal(isWeeklyReviewMissing([review({ weekStart: undefined })], NOW), true);
};

const testValidationAndMapping = (): void => {
  assert.equal(hasErrors(validateObjective(objective())), false);
  assert.equal(validateObjective(objective({ title: '' })).title, 'validation.titleRequired');
  assert.equal(validateObjective(objective({ ownerUpn: '' })).ownerUpn, 'validation.ownerRequired');
  assert.equal(validateObjective(objective({ sponsorUpn: 'nope' })).sponsorUpn, 'validation.sponsorInvalid');
  assert.equal(validateObjective(objective({ startDate: '2026-05-01', targetDate: '2026-04-01' })).targetDate, 'validation.endBeforeStart');
  assert.equal(hasErrors(validateCase(businessCase())), false);
  assert.equal(validateCase(businessCase({ estimatedCost: -1 })).estimatedCost, 'validation.cannotBeNegative');
  assert.equal(validateCase(businessCase({ annualBenefit: -1 })).annualBenefit, 'validation.cannotBeNegative');
  assert.equal(validateCase(businessCase({ ownerUpn: '' })).ownerUpn, 'validation.ownerRequired');
  assert.equal(validateCase(businessCase({ decisionDate: '2026-02-30' })).decisionDate, 'validation.dateInvalid');
  assert.equal(hasErrors(validateWeekly(review())), false);
  assert.equal(validateWeekly(review({ title: '' })).title, 'validation.titleRequired');
  assert.equal(validateWeekly(review({ weekStart: 'x' })).weekStart, 'validation.dateInvalid');

  const original = objective({ startDate: '2026-10-01', targetDate: '2027-03-01', kpiId: 'K-1', sponsorUpn: 's@b.com', description: 'd' });
  assert.deepEqual({ ...mapObjective({ ...buildObjectivePayload(original), Id: 1 }), id: undefined, created: '', modified: '', editor: '' }, { ...original, id: undefined, created: '', modified: '', editor: '' });
  const c = businessCase({ objectiveId: 'O-1', initiativeId: 'I-1', projectId: 'P-1', decisionDate: '2026-11-01', decisionNotes: 'ok', status: CaseStatus.APPROVED });
  const back = mapCase({ ...buildCasePayload(c), Id: 2 });
  assert.deepEqual({ ...back, id: undefined, created: '', modified: '', editor: '', approval: undefined }, { ...c, id: undefined, created: '', modified: '', editor: '', approval: undefined });
  assert.equal(buildCasePayload(c).ApprovalStatus, 'NONE', 'the approval columns are written with the case');
  assert.equal(back.approval?.status, ApprovalStatus.NONE);
  const w = review({ happened: 'h', priorities: 'p', stopDoing: 's', startDoing: 't' });
  assert.deepEqual({ ...mapWeekly({ ...buildWeeklyPayload(w), Id: 3 }), id: undefined, created: '', modified: '', editor: '' }, { ...w, id: undefined, created: '', modified: '', editor: '' });
  assert.equal(mapCase({}).status, CaseStatus.DRAFT);
  assert.equal(mapObjective({}).priority, ActionPriority.MEDIUM);
};

const testAgendaAndTexts = (): void => {
  const input: IAgendaInput = {
    matters: [], actions: [], contracts: [], entitlements: [], interactions: [], reviews: [], risks: [], trainings: [], skills: [], projects: [], articles: [], changes: [], incidents: [], stock: [], genius: [],
    objectives: [objective({ objectiveId: 'O-1', title: 'Active', targetDate: '2026-12-31' }), objective({ objectiveId: 'O-2', title: 'Drafted', status: ObjectiveStatus.DRAFT, targetDate: '2026-12-31' }), objective({ objectiveId: 'O-3', title: 'No date' })]
  };
  assert.deepEqual(buildAgenda(input, NOW).map(e => e.key), ['OBJECTIVE:O-1'], 'only the target date of an active objective is on the agenda');
  ['CaseStatus', 'ObjectiveStatus'].forEach(() => undefined);
  [['status', Object.keys(ObjectiveStatus).concat(Object.keys(CaseStatus), Object.keys(WeeklyReviewStatus))], ['agenda.kind', ['OBJECTIVE']]].forEach(([prefix, values]) => {
    (values as string[]).forEach(value => assert.ok(en[`${prefix as string}.${value}`] && es[`${prefix as string}.${value}`], `${prefix as string}.${value} is translated`));
  });
};

testObjectives();
testCases();
testApproval();
testWeekly();
testValidationAndMapping();
testAgendaAndTexts();
console.log('strategy tests passed');
