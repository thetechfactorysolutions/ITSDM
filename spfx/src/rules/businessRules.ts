import { ActionItem, ActionStatus, IdeaStatus, Project, ProjectStatus } from '../models';
import { dayKeyFromValue, toDayKey } from './dates';

const IDEA_TRANSITIONS: Record<IdeaStatus, IdeaStatus[]> = {
  [IdeaStatus.NEW]: [IdeaStatus.DISCOVERY, IdeaStatus.REJECTED, IdeaStatus.CANCELLED],
  [IdeaStatus.DISCOVERY]: [IdeaStatus.VALIDATED, IdeaStatus.REJECTED, IdeaStatus.CANCELLED],
  [IdeaStatus.VALIDATED]: [IdeaStatus.PLANNED, IdeaStatus.REJECTED, IdeaStatus.CANCELLED],
  [IdeaStatus.PLANNED]: [IdeaStatus.IN_PROGRESS, IdeaStatus.CANCELLED],
  [IdeaStatus.IN_PROGRESS]: [IdeaStatus.PILOT, IdeaStatus.CANCELLED],
  [IdeaStatus.PILOT]: [IdeaStatus.ROLLOUT, IdeaStatus.CANCELLED],
  [IdeaStatus.ROLLOUT]: [IdeaStatus.COMPLETED, IdeaStatus.CANCELLED],
  [IdeaStatus.COMPLETED]: [],
  [IdeaStatus.REJECTED]: [],
  [IdeaStatus.CANCELLED]: []
};

const isOpenAction = (action: ActionItem): boolean => {
  return action.status !== ActionStatus.DONE && action.status !== ActionStatus.CANCELLED;
};

/** Overdue means the due day is before today. An action due today is not overdue yet. */
export const isOverdueAction = (action: ActionItem, now: Date = new Date()): boolean => {
  const due = dayKeyFromValue(action.dueDate);
  if (!due || !isOpenAction(action)) {
    return false;
  }

  return due < toDayKey(now);
};

export const isActionDueToday = (action: ActionItem, now: Date = new Date()): boolean => {
  const due = dayKeyFromValue(action.dueDate);
  return !!due && isOpenAction(action) && due === toDayKey(now);
};

/** Due from today up to and including today + `days`. Overdue actions are excluded. */
export const isActionDueWithinDays = (action: ActionItem, days: number, now: Date = new Date()): boolean => {
  const due = dayKeyFromValue(action.dueDate);
  if (!due || !isOpenAction(action)) {
    return false;
  }

  const limit = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  return due >= toDayKey(now) && due <= toDayKey(limit);
};

export const isProjectAtRiskByVariance = (project: Project, thresholdRatio: number = 0.1): boolean => {
  if (project.budgetAmount <= 0) {
    return false;
  }

  const variance = project.forecastAmount - project.budgetAmount;
  return variance / project.budgetAmount > thresholdRatio || project.status === ProjectStatus.AT_RISK;
};

export const canTransitionIdeaStatus = (current: IdeaStatus, target: IdeaStatus): boolean => {
  return IDEA_TRANSITIONS[current].indexOf(target) > -1;
};

/** Statuses an idea can be saved with: the current one plus its valid transitions. */
export const getAllowedIdeaStatuses = (current: IdeaStatus): IdeaStatus[] => {
  return [current].concat(IDEA_TRANSITIONS[current]);
};

export const canConvertIdeaToInitiative = (status: IdeaStatus, confirmation: boolean): boolean => {
  return status === IdeaStatus.VALIDATED && confirmation;
};
