import { BusinessCase, CaseStatus, Objective, ObjectiveStatus, WeeklyReview, WeeklyReviewStatus } from '../models';
import { addDays, dayKeyFromValue, fromDayKey, toDayKey } from './dates';

/** Rules for objectives, business cases and the weekly review. Pure, so they are tested without a screen. */

// ---------------------------------------------------------------- objectives

const OBJECTIVE_TRANSITIONS: Record<ObjectiveStatus, ObjectiveStatus[]> = {
  [ObjectiveStatus.DRAFT]: [ObjectiveStatus.ACTIVE, ObjectiveStatus.CANCELLED],
  [ObjectiveStatus.ACTIVE]: [ObjectiveStatus.ACHIEVED, ObjectiveStatus.DRAFT, ObjectiveStatus.CANCELLED],
  [ObjectiveStatus.ACHIEVED]: [ObjectiveStatus.ACTIVE],
  [ObjectiveStatus.CANCELLED]: [ObjectiveStatus.DRAFT]
};

export const getAllowedObjectiveStatuses = (current: ObjectiveStatus): ObjectiveStatus[] => [current].concat(OBJECTIVE_TRANSITIONS[current]);

/** An active objective whose target date has passed (the target day itself is still in time). */
export const isObjectiveLate = (objective: Objective, now: Date = new Date()): boolean => {
  const target = dayKeyFromValue(objective.targetDate);
  return objective.status === ObjectiveStatus.ACTIVE && !!target && target < toDayKey(now);
};

/** The business cases that point to an objective. */
export const casesOfObjective = (objective: Pick<Objective, 'objectiveId'>, cases: BusinessCase[]): BusinessCase[] => cases.filter(c => c.objectiveId === objective.objectiveId);

// ---------------------------------------------------------------- business cases

const CASE_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  [CaseStatus.DRAFT]: [CaseStatus.SUBMITTED, CaseStatus.ARCHIVED],
  [CaseStatus.SUBMITTED]: [CaseStatus.APPROVED, CaseStatus.REJECTED, CaseStatus.DRAFT],
  [CaseStatus.APPROVED]: [CaseStatus.ARCHIVED],
  [CaseStatus.REJECTED]: [CaseStatus.DRAFT, CaseStatus.ARCHIVED],
  [CaseStatus.ARCHIVED]: [CaseStatus.DRAFT]
};

export const getAllowedCaseStatuses = (current: CaseStatus): CaseStatus[] => [current].concat(CASE_TRANSITIONS[current]);

/**
 * Return in the first year, in %: what the case brings in a year minus what it costs, over what it
 * costs. Undefined when there is no cost to compare with.
 */
export const caseRoiPct = (businessCase: Pick<BusinessCase, 'estimatedCost' | 'annualBenefit'>): number | undefined =>
  businessCase.estimatedCost > 0 ? Math.round(((businessCase.annualBenefit - businessCase.estimatedCost) / businessCase.estimatedCost) * 100) : undefined;

/** Months until the benefit has paid for the cost, with one decimal; undefined without a cost or without a benefit. */
export const casePaybackMonths = (businessCase: Pick<BusinessCase, 'estimatedCost' | 'annualBenefit'>): number | undefined =>
  businessCase.estimatedCost > 0 && businessCase.annualBenefit > 0
    ? Math.round((businessCase.estimatedCost / (businessCase.annualBenefit / 12)) * 10) / 10
    : undefined;

/** Submitted and waiting for a decision. */
export const isCaseToDecide = (businessCase: Pick<BusinessCase, 'status'>): boolean => businessCase.status === CaseStatus.SUBMITTED;

/** The decision date (today) is filled in when a case is approved or rejected, and cleared when it goes back to a draft or is submitted again. */
export const applyCaseEffects = (businessCase: BusinessCase, now: Date = new Date()): BusinessCase => {
  const decided = businessCase.status === CaseStatus.APPROVED || businessCase.status === CaseStatus.REJECTED;
  if (decided && !businessCase.decisionDate) {
    return { ...businessCase, decisionDate: toDayKey(now) };
  }
  if ((businessCase.status === CaseStatus.DRAFT || businessCase.status === CaseStatus.SUBMITTED) && businessCase.decisionDate) {
    return { ...businessCase, decisionDate: '' };
  }
  return businessCase;
};

// ---------------------------------------------------------------- weekly review

/** The Monday of the week a day falls in. Returns the input when it is not a valid day. */
export const weekStartOf = (day: string): string => {
  const date = fromDayKey(day);
  if (!date) {
    return day;
  }
  return addDays(day, -((date.getDay() + 6) % 7));
};

export const reviewTitleFor = (weekStart: string): string => `Week of ${weekStart}`;

/** The Monday of the week before the one `now` falls in. */
export const lastWeekStart = (now: Date = new Date()): string => addDays(weekStartOf(toDayKey(now)), -7);

/**
 * The review of last week is missing: the person has used the weekly review before, but nothing
 * completed covers last week. Someone who never started one is not nagged.
 */
export const isWeeklyReviewMissing = (reviews: WeeklyReview[], now: Date = new Date()): boolean => {
  if (reviews.length === 0) {
    return false;
  }
  const last = lastWeekStart(now);
  return !reviews.some(r => r.status === WeeklyReviewStatus.COMPLETED && r.weekStart && weekStartOf(r.weekStart) === last);
};
