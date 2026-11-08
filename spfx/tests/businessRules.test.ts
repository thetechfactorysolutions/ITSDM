import assert from 'node:assert/strict';
import { ActionItem, ActionPriority, ActionStatus, IdeaStatus, ProjectRiskLevel, ProjectStatus } from '../src/models';
import {
  canConvertIdeaToInitiative,
  canTransitionIdeaStatus,
  getAllowedIdeaStatuses,
  isActionDueToday,
  isActionDueWithinDays,
  isOverdueAction,
  isProjectAtRiskByVariance
} from '../src/rules/businessRules';

const buildAction = (overrides: Partial<ActionItem>): ActionItem => ({
  actionId: 'A-1',
  title: 'Follow-up',
  description: 'desc',
  status: ActionStatus.OPEN,
  priority: ActionPriority.HIGH,
  ownerUpn: 'owner@tenant.com',
  ...overrides
});

// Local-time constructor on purpose: the rules compare local calendar days, so tests must not
// depend on the timezone of the machine running them.
const day = (year: number, month: number, date: number, hour: number = 12): Date => new Date(year, month - 1, date, hour);

const testOverdueDetection = (): void => {
  const overdue = isOverdueAction(buildAction({ dueDate: '2025-01-01' }), day(2025, 1, 2));
  assert.equal(overdue, true, 'Expected overdue action to be detected');
};

const testDueTodayIsNotOverdue = (): void => {
  const action = buildAction({ dueDate: '2025-01-02' });
  // Even at the very end of the due day the action is not overdue yet.
  assert.equal(isOverdueAction(action, day(2025, 1, 2, 0)), false);
  assert.equal(isOverdueAction(action, day(2025, 1, 2, 23)), false);
  assert.equal(isOverdueAction(action, day(2025, 1, 3, 0)), true);
  assert.equal(isActionDueToday(action, day(2025, 1, 2, 23)), true);
};

const testSharePointIsoDatesKeepTheirDay = (): void => {
  // A timestamp is an instant, so it belongs to the local day it falls on in any timezone.
  const action = buildAction({ dueDate: new Date(2025, 0, 2, 8).toISOString() });
  assert.equal(isActionDueToday(action, day(2025, 1, 2)), true);
  assert.equal(isOverdueAction(action, day(2025, 1, 2)), false);
};

const testClosedAndMissingDatesAreNeverOverdue = (): void => {
  const now = day(2025, 1, 10);
  assert.equal(isOverdueAction(buildAction({ dueDate: '2025-01-01', status: ActionStatus.DONE }), now), false);
  assert.equal(isOverdueAction(buildAction({ dueDate: '2025-01-01', status: ActionStatus.CANCELLED }), now), false);
  assert.equal(isOverdueAction(buildAction({ dueDate: '' }), now), false);
  assert.equal(isOverdueAction(buildAction({ dueDate: 'not a date' }), now), false);
};

const testOverdueAndTodayDoNotOverlap = (): void => {
  const now = day(2025, 1, 10);
  const action = buildAction({ dueDate: '2025-01-10' });
  assert.equal(isOverdueAction(action, now) && isActionDueToday(action, now), false);
};

const testDueWithinDays = (): void => {
  const now = day(2025, 1, 10);
  assert.equal(isActionDueWithinDays(buildAction({ dueDate: '2025-01-10' }), 7, now), true);
  assert.equal(isActionDueWithinDays(buildAction({ dueDate: '2025-01-17' }), 7, now), true);
  assert.equal(isActionDueWithinDays(buildAction({ dueDate: '2025-01-18' }), 7, now), false);
  assert.equal(isActionDueWithinDays(buildAction({ dueDate: '2025-01-09' }), 7, now), false);
};

const testProjectVarianceRisk = (): void => {
  const atRisk = isProjectAtRiskByVariance({
    projectId: 'P-1',
    title: 'Migration',
    description: 'desc',
    status: ProjectStatus.ACTIVE,
    ownerUpn: 'owner@tenant.com',
    budgetAmount: 100,
    forecastAmount: 135,
    riskLevel: ProjectRiskLevel.MEDIUM
  }, 0.2);

  assert.equal(atRisk, true, 'Expected project to be at risk due to variance');
};

const testIdeaTransitions = (): void => {
  assert.equal(canTransitionIdeaStatus(IdeaStatus.NEW, IdeaStatus.DISCOVERY), true);
  assert.equal(canTransitionIdeaStatus(IdeaStatus.NEW, IdeaStatus.COMPLETED), false);
};

const testAllowedIdeaStatuses = (): void => {
  assert.deepEqual(getAllowedIdeaStatuses(IdeaStatus.NEW), [IdeaStatus.NEW, IdeaStatus.DISCOVERY, IdeaStatus.REJECTED, IdeaStatus.CANCELLED]);
  // A terminal status can only stay as it is.
  assert.deepEqual(getAllowedIdeaStatuses(IdeaStatus.COMPLETED), [IdeaStatus.COMPLETED]);
  // Skipping steps is not allowed: NEW cannot reach VALIDATED in one save.
  assert.equal(getAllowedIdeaStatuses(IdeaStatus.NEW).indexOf(IdeaStatus.VALIDATED), -1);
};

const testInitiativeConversionValidation = (): void => {
  assert.equal(canConvertIdeaToInitiative(IdeaStatus.VALIDATED, true), true);
  assert.equal(canConvertIdeaToInitiative(IdeaStatus.DISCOVERY, true), false);
  assert.equal(canConvertIdeaToInitiative(IdeaStatus.VALIDATED, false), false);
};

const run = (): void => {
  testOverdueDetection();
  testDueTodayIsNotOverdue();
  testSharePointIsoDatesKeepTheirDay();
  testClosedAndMissingDatesAreNeverOverdue();
  testOverdueAndTodayDoNotOverlap();
  testDueWithinDays();
  testProjectVarianceRisk();
  testIdeaTransitions();
  testAllowedIdeaStatuses();
  testInitiativeConversionValidation();
  console.log('businessRules tests passed');
};

run();
