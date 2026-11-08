import { ActionItem, ActionStatus, InitiativeStatus, ProjectStatus } from '../models';
import { toDayKey } from './dates';

/**
 * Allowed status changes for initiatives, projects and actions (ideas have their own map in
 * businessRules.ts). Completed and cancelled work can be reopened so a mistake is fixable.
 */
const INITIATIVE_TRANSITIONS: Record<InitiativeStatus, InitiativeStatus[]> = {
  [InitiativeStatus.DRAFT]: [InitiativeStatus.ACTIVE, InitiativeStatus.CANCELLED],
  [InitiativeStatus.ACTIVE]: [InitiativeStatus.BLOCKED, InitiativeStatus.ON_HOLD, InitiativeStatus.COMPLETED, InitiativeStatus.CANCELLED],
  [InitiativeStatus.BLOCKED]: [InitiativeStatus.ACTIVE, InitiativeStatus.ON_HOLD, InitiativeStatus.CANCELLED],
  [InitiativeStatus.ON_HOLD]: [InitiativeStatus.ACTIVE, InitiativeStatus.CANCELLED],
  [InitiativeStatus.COMPLETED]: [InitiativeStatus.ACTIVE],
  [InitiativeStatus.CANCELLED]: [InitiativeStatus.DRAFT]
};

const PROJECT_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  [ProjectStatus.PLANNING]: [ProjectStatus.ACTIVE, ProjectStatus.ON_HOLD, ProjectStatus.CANCELLED],
  [ProjectStatus.ACTIVE]: [ProjectStatus.AT_RISK, ProjectStatus.BLOCKED, ProjectStatus.ON_HOLD, ProjectStatus.COMPLETED, ProjectStatus.CANCELLED],
  [ProjectStatus.AT_RISK]: [ProjectStatus.ACTIVE, ProjectStatus.BLOCKED, ProjectStatus.ON_HOLD, ProjectStatus.COMPLETED, ProjectStatus.CANCELLED],
  [ProjectStatus.BLOCKED]: [ProjectStatus.ACTIVE, ProjectStatus.AT_RISK, ProjectStatus.ON_HOLD, ProjectStatus.CANCELLED],
  [ProjectStatus.ON_HOLD]: [ProjectStatus.PLANNING, ProjectStatus.ACTIVE, ProjectStatus.CANCELLED],
  [ProjectStatus.COMPLETED]: [ProjectStatus.ACTIVE],
  [ProjectStatus.CANCELLED]: [ProjectStatus.PLANNING]
};

const ACTION_TRANSITIONS: Record<ActionStatus, ActionStatus[]> = {
  [ActionStatus.OPEN]: [ActionStatus.IN_PROGRESS, ActionStatus.BLOCKED, ActionStatus.DONE, ActionStatus.CANCELLED],
  [ActionStatus.IN_PROGRESS]: [ActionStatus.OPEN, ActionStatus.BLOCKED, ActionStatus.DONE, ActionStatus.CANCELLED],
  [ActionStatus.BLOCKED]: [ActionStatus.OPEN, ActionStatus.IN_PROGRESS, ActionStatus.CANCELLED],
  [ActionStatus.DONE]: [ActionStatus.OPEN],
  [ActionStatus.CANCELLED]: [ActionStatus.OPEN]
};

/** Status first given to a new item. Import and create forms always start here. */
export const INITIAL_STATUS = {
  initiative: InitiativeStatus.DRAFT,
  project: ProjectStatus.PLANNING,
  action: ActionStatus.OPEN
};

/** The current status plus every status it may move to. */
export const getAllowedInitiativeStatuses = (current: InitiativeStatus): InitiativeStatus[] => [current].concat(INITIATIVE_TRANSITIONS[current]);
export const getAllowedProjectStatuses = (current: ProjectStatus): ProjectStatus[] => [current].concat(PROJECT_TRANSITIONS[current]);
export const getAllowedActionStatuses = (current: ActionStatus): ActionStatus[] => [current].concat(ACTION_TRANSITIONS[current]);

/**
 * Applies what must follow a status change on an action: the completion date is filled with
 * today when it becomes DONE (if empty) and cleared when it is reopened. Returns a new object.
 */
export const applyActionStatusEffects = (action: ActionItem, previousStatus: ActionStatus | undefined, now: Date = new Date()): ActionItem => {
  if (action.status === ActionStatus.DONE && previousStatus !== ActionStatus.DONE && !action.completedDate) {
    return { ...action, completedDate: toDayKey(now) };
  }

  if (action.status !== ActionStatus.DONE && previousStatus === ActionStatus.DONE) {
    return { ...action, completedDate: '' };
  }

  return action;
};

/** Statuses that count as closed: hidden by default in the tables. */
export const CLOSED_STATUSES: string[] = ['COMPLETED', 'CANCELLED', 'REJECTED', 'DONE', 'ARCHIVED', 'CLOSED', 'SUPERSEDED', 'APPLIED', 'INACTIVE', 'EXPIRED', 'TERMINATED'];

export const isClosedStatus = (status: string): boolean => CLOSED_STATUSES.indexOf(status) > -1;
