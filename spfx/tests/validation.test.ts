import assert from 'node:assert/strict';
import {
  ActionItem, ActionPriority, ActionStatus, Idea, IdeaStatus, Initiative, InitiativeStatus, Project, ProjectRiskLevel, ProjectStatus
} from '../src/models';
import { dayKeyFromValue, dayKeyToSharePoint, fromDayKey, isValidDayKey, toDayKey } from '../src/rules/dates';
import { hasErrors, validateAction, validateIdea, validateInitiative, validateProject } from '../src/rules/validation';

const idea = (o: Partial<Idea> = {}): Idea => ({
  ideaId: 'I-1', title: 'Idea', description: '', status: IdeaStatus.NEW, ownerUpn: 'a@b.com', tags: [], ...o
});
const initiative = (o: Partial<Initiative> = {}): Initiative => ({
  initiativeId: 'N-1', title: 'Init', description: '', status: InitiativeStatus.DRAFT, ownerUpn: 'a@b.com', progressPct: 0, ...o
});
const project = (o: Partial<Project> = {}): Project => ({
  projectId: 'P-1', title: 'Proj', description: '', status: ProjectStatus.PLANNING, ownerUpn: 'a@b.com',
  budgetAmount: 100, forecastAmount: 100, riskLevel: ProjectRiskLevel.LOW, ...o
});
const action = (o: Partial<ActionItem> = {}): ActionItem => ({
  actionId: 'A-1', title: 'Act', description: '', status: ActionStatus.OPEN, priority: ActionPriority.LOW, ownerUpn: 'a@b.com', ...o
});

const testDayKeys = (): void => {
  assert.equal(isValidDayKey('2025-02-28'), true);
  assert.equal(isValidDayKey('2025-02-30'), false, 'Feb 30 must not roll over to March');
  assert.equal(isValidDayKey('2025-2-3'), false);
  assert.equal(isValidDayKey(''), false);
  assert.equal(toDayKey(new Date(2025, 0, 5)), '2025-01-05');
  assert.equal(toDayKey(fromDayKey('2025-12-31') as Date), '2025-12-31');
  assert.equal(fromDayKey('nope'), undefined);
};

const testDayKeyFromValue = (): void => {
  assert.equal(dayKeyFromValue('2025-01-02'), '2025-01-02');
  assert.equal(dayKeyFromValue(undefined), undefined);
  assert.equal(dayKeyFromValue(''), undefined);
  assert.equal(dayKeyFromValue('garbage'), undefined);
  // A timestamp is an instant: it maps to the local day it falls on, in any timezone.
  assert.equal(dayKeyFromValue(new Date(2025, 0, 2, 8).toISOString()), '2025-01-02');
  assert.equal(dayKeyFromValue(new Date(2025, 0, 2, 0, 30).toISOString()), '2025-01-02');
};

const testWriteValueKeepsTheDay = (): void => {
  assert.equal(dayKeyToSharePoint('2025-01-02'), '2025-01-02T12:00:00Z');
  assert.equal(dayKeyToSharePoint(''), null);
  assert.equal(dayKeyToSharePoint(undefined), null);
  assert.equal(dayKeyToSharePoint('2025-02-30'), null);
  // Round trip: what is written is read back as the same day.
  assert.equal(dayKeyFromValue(dayKeyToSharePoint('2025-06-15') as string), '2025-06-15');
};

const testTitleAndOwnerRequired = (): void => {
  assert.equal(validateIdea(idea({ title: '   ' })).title, 'Title is required.');
  assert.equal(hasErrors(validateIdea(idea())), false);
  assert.match(validateIdea(idea({ title: 'x'.repeat(256) })).title ?? '', /255/);
  assert.equal(validateInitiative(initiative({ ownerUpn: '' })).ownerUpn, 'Owner is required.');
  assert.match(validateProject(project({ ownerUpn: 'not-an-email' })).ownerUpn ?? '', /valid user/);
  assert.equal(hasErrors(validateAction(action())), false);
};

const testProgressRange = (): void => {
  assert.equal(hasErrors(validateInitiative(initiative({ progressPct: 0 }))), false);
  assert.equal(hasErrors(validateInitiative(initiative({ progressPct: 100 }))), false);
  assert.ok(validateInitiative(initiative({ progressPct: 101 })).progressPct);
  assert.ok(validateInitiative(initiative({ progressPct: -1 })).progressPct);
  assert.ok(validateInitiative(initiative({ progressPct: NaN })).progressPct);
};

const testMoneyAndDates = (): void => {
  assert.ok(validateProject(project({ budgetAmount: -1 })).budgetAmount);
  assert.ok(validateProject(project({ forecastAmount: NaN })).forecastAmount);
  assert.ok(validateIdea(idea({ estimatedValue: -5 })).estimatedValue);
  assert.equal(hasErrors(validateProject(project({ startDate: '2025-01-01', endDate: '2025-01-01' }))), false);
  assert.ok(validateProject(project({ startDate: '2025-02-01', endDate: '2025-01-01' })).endDate);
  assert.ok(validateAction(action({ dueDate: '2025-13-01' })).dueDate);
  assert.equal(hasErrors(validateAction(action({ dueDate: '' }))), false, 'An empty date is allowed');
};

testDayKeys();
testDayKeyFromValue();
testWriteValueKeepsTheDay();
testTitleAndOwnerRequired();
testProgressRange();
testMoneyAndDates();
console.log('validation tests passed');
