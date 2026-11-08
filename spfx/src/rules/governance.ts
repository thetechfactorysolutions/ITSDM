import { Decision, DecisionStatus, LessonStatus, ReviewStatus, Risk, RiskScale, RiskStatus } from '../models';
import { toDayKey } from './dates';

/** Rules for risks, decisions, lessons learned and reviews. Pure, so they are tested without a screen. */

// ---------------------------------------------------------------- risk score

const SCALE_VALUE: Record<RiskScale, number> = { [RiskScale.LOW]: 1, [RiskScale.MEDIUM]: 2, [RiskScale.HIGH]: 3 };

/** Probability times impact, from 1 to 9. */
export const riskScore = (probability: RiskScale, impact: RiskScale): number => SCALE_VALUE[probability] * SCALE_VALUE[impact];

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

/** LOW up to 2, MEDIUM up to 4, HIGH from 6 (a score of 5 cannot happen with a 3-step scale). */
export const riskLevelOf = (score: number): RiskLevel => (score <= 2 ? 'LOW' : score <= 4 ? 'MEDIUM' : 'HIGH');

export const riskLevel = (risk: Pick<Risk, 'probability' | 'impact'>): RiskLevel => riskLevelOf(riskScore(risk.probability, risk.impact));

/** A risk that still needs attention: anything not closed. */
export const isActiveRisk = (risk: Pick<Risk, 'status'>): boolean => risk.status !== RiskStatus.CLOSED;

export const isHighActiveRisk = (risk: Risk): boolean => isActiveRisk(risk) && riskLevel(risk) === 'HIGH';

// ---------------------------------------------------------------- status changes

const RISK_TRANSITIONS: Record<RiskStatus, RiskStatus[]> = {
  [RiskStatus.OPEN]: [RiskStatus.MITIGATING, RiskStatus.ACCEPTED, RiskStatus.CLOSED],
  [RiskStatus.MITIGATING]: [RiskStatus.OPEN, RiskStatus.ACCEPTED, RiskStatus.CLOSED],
  [RiskStatus.ACCEPTED]: [RiskStatus.OPEN, RiskStatus.CLOSED],
  [RiskStatus.CLOSED]: [RiskStatus.OPEN]
};

const DECISION_TRANSITIONS: Record<DecisionStatus, DecisionStatus[]> = {
  [DecisionStatus.PROPOSED]: [DecisionStatus.DECIDED],
  [DecisionStatus.DECIDED]: [DecisionStatus.SUPERSEDED],
  [DecisionStatus.SUPERSEDED]: []
};

const LESSON_TRANSITIONS: Record<LessonStatus, LessonStatus[]> = {
  [LessonStatus.NEW]: [LessonStatus.REVIEWED, LessonStatus.APPLIED],
  [LessonStatus.REVIEWED]: [LessonStatus.NEW, LessonStatus.APPLIED],
  [LessonStatus.APPLIED]: [LessonStatus.REVIEWED]
};

const REVIEW_TRANSITIONS: Record<ReviewStatus, ReviewStatus[]> = {
  [ReviewStatus.SCHEDULED]: [ReviewStatus.COMPLETED, ReviewStatus.CANCELLED],
  [ReviewStatus.COMPLETED]: [ReviewStatus.SCHEDULED],
  [ReviewStatus.CANCELLED]: [ReviewStatus.SCHEDULED]
};

/** The current status plus every status it may move to. */
export const getAllowedRiskStatuses = (current: RiskStatus): RiskStatus[] => [current].concat(RISK_TRANSITIONS[current]);
export const getAllowedDecisionStatuses = (current: DecisionStatus): DecisionStatus[] => [current].concat(DECISION_TRANSITIONS[current]);
export const getAllowedLessonStatuses = (current: LessonStatus): LessonStatus[] => [current].concat(LESSON_TRANSITIONS[current]);
export const getAllowedReviewStatuses = (current: ReviewStatus): ReviewStatus[] => [current].concat(REVIEW_TRANSITIONS[current]);

/**
 * When a decision becomes DECIDED, the date (today) and who decided it (the user) are filled in if
 * they were empty. Returns a new object, or the same one when nothing had to change.
 */
export const applyDecisionEffects = (decision: Decision, previousStatus: DecisionStatus | undefined, userEmail: string, now: Date = new Date()): Decision => {
  if (decision.status !== DecisionStatus.DECIDED || previousStatus === DecisionStatus.DECIDED) {
    return decision;
  }

  const date = decision.decisionDate || toDayKey(now);
  const by = decision.decidedBy || userEmail;
  return date === decision.decisionDate && by === decision.decidedBy ? decision : { ...decision, decisionDate: date, decidedBy: by };
};
