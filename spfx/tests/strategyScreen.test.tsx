import './helpers/globals';
import assert from 'node:assert/strict';
import * as React from 'react';
import WeeklyReviews from '../src/components/Management/WeeklyReviews';
import BusinessCases from '../src/components/Strategy/BusinessCases';
import Objectives from '../src/components/Strategy/Objectives';
import { ActionPriority, BusinessCase, CaseStatus, Objective, ObjectiveStatus, WeeklyReview, WeeklyReviewStatus } from '../src/models';
import { addDays, toDayKey } from '../src/rules/dates';
import { lastWeekStart, weekStartOf } from '../src/rules/strategy';
import { click, mount, settle, unmount } from './helpers/dom';
import { button, count, newRec, renderWith, setField, text } from './helpers/hub';

const offset = (days: number): string => addDays(toDayKey(new Date()), days);

const objective = (id: number, title: string, o: Partial<Objective> = {}): Objective => ({
  id, objectiveId: `OBJ-${id}`, title, description: '', ownerUpn: 'me@x.com', sponsorUpn: '', status: ObjectiveStatus.ACTIVE, priority: ActionPriority.MEDIUM, goal: 'A goal', ...o
});
const businessCase = (id: number, title: string, status: CaseStatus, cost: number, benefit: number): BusinessCase => ({
  id, caseId: `CASE-${id}`, title, problem: '', options: '', recommendation: '', risks: '', estimatedCost: cost, annualBenefit: benefit, ownerUpn: 'me@x.com', status, decisionNotes: ''
});
const weekly = (id: number, title: string, weekStart: string, status: WeeklyReviewStatus): WeeklyReview => ({
  id, reviewId: `WEEK-${id}`, title, weekStart, status, happened: '', wentWell: '', wentWrong: '', attention: '', decisions: '', risks: '', priorities: 'Close the order', stopDoing: '', startDoing: '', ownerUpn: 'me@x.com'
});

const testObjectives = async (): Promise<void> => {
  const data = {
    objectives: [
      objective(1, 'Raise satisfaction', { targetDate: offset(100) }),
      objective(2, 'Keep stock healthy', { targetDate: offset(-5) }),            // active and late
      objective(3, 'Old objective', { status: ObjectiveStatus.ACHIEVED })         // achieved: hidden
    ]
  };
  await mount(renderWith(React.createElement(Objectives), data));
  await settle();
  assert.ok(text().indexOf('Raise satisfaction') > -1 && text().indexOf('Keep stock healthy') > -1);
  assert.equal(text().indexOf('Old objective'), -1, 'an achieved objective is hidden by default');
  assert.equal(count('🔴'), 1, 'only the late objective is flagged');
  await unmount();

  await mount(renderWith(React.createElement(Objectives), data, newRec(), 'es'));
  await settle();
  assert.ok(text().indexOf('Nuevo objetivo') > -1, 'the screen in Spanish');
  await unmount();

  const rec = newRec();
  await mount(renderWith(React.createElement(Objectives), {}, rec));
  await settle();
  assert.ok(text().indexOf('There are no objectives yet') > -1);
  await click(button('New objective') as HTMLButtonElement);
  await settle();
  await setField('Title', 'Simplify the kiosk');
  await click(button('Save') as HTMLButtonElement);
  await settle(80);
  assert.equal(rec.created.length, 1);
  assert.equal(rec.created[0].Status, 'DRAFT');
  assert.equal(rec.created[0].Priority, 'MEDIUM');
  assert.equal(rec.created[0].OwnerUPN, 'me@x.com');
  assert.ok(String(rec.created[0].ObjectiveId).indexOf('OBJ-') === 0);
  await unmount();
};

const testBusinessCases = async (): Promise<void> => {
  const data = {
    businessCases: [
      businessCase(1, 'Buy iPads', CaseStatus.SUBMITTED, 151200, 90000),
      businessCase(2, 'Replace the chat tool', CaseStatus.APPROVED, 8000, 20000),
      businessCase(3, 'Redesign the kiosk', CaseStatus.DRAFT, 12000, 0)
    ]
  };
  await mount(renderWith(React.createElement(BusinessCases), data));
  await settle();
  assert.ok(text().indexOf('Buy iPads') > -1 && text().indexOf('Replace the chat tool') > -1 && text().indexOf('Redesign the kiosk') > -1);
  assert.ok(text().indexOf('-40 %') > -1, 'the return of the iPad case');
  assert.ok(text().indexOf('150 %') > -1, 'and of the chat tool');
  assert.ok(text().indexOf('-100 %') > -1, 'a case with no benefit loses what it costs');
  await unmount();

  const rec = newRec();
  await mount(renderWith(React.createElement(BusinessCases), {}, rec));
  await settle();
  assert.ok(text().indexOf('There are no business cases yet') > -1);
  await click(button('New business case') as HTMLButtonElement);
  await settle();
  await setField('Title', 'Cloud backup');
  await setField('Estimated cost', '10000');
  await setField('Benefit per year', '15000');
  await settle();
  assert.ok(text().indexOf('Return in the first year: 50 %. Payback: 8 months.') > -1, 'the return is shown while writing the case');
  await click(button('Save') as HTMLButtonElement);
  await settle(80);
  assert.equal(rec.created.length, 1);
  assert.equal(rec.created[0].EstimatedCost, 10000);
  assert.equal(rec.created[0].AnnualBenefit, 15000);
  assert.equal(rec.created[0].Status, 'DRAFT');
  assert.equal(rec.created[0].ApprovalStatus, 'NONE', 'the approval columns travel with the case');
  assert.equal(rec.created[0].DecisionDate, null);
  assert.ok(String(rec.created[0].CaseId).indexOf('CASE-') === 0);
  await unmount();
};

const testWeekly = async (): Promise<void> => {
  const monday = weekStartOf(toDayKey(new Date()));
  const twoWeeksAgo = addDays(monday, -14);

  await mount(renderWith(React.createElement(WeeklyReviews), { weeklyReviews: [weekly(1, 'Older review', twoWeeksAgo, WeeklyReviewStatus.COMPLETED)] }));
  await settle();
  assert.ok(text().indexOf('Older review') > -1, 'a completed review is shown without asking to show closed');
  assert.ok(text().indexOf(`There is no completed review for the week of ${lastWeekStart()}.`) > -1, 'the missing review of last week is pointed out');
  await unmount();

  await mount(renderWith(React.createElement(WeeklyReviews), { weeklyReviews: [weekly(1, 'Last week', addDays(monday, -7), WeeklyReviewStatus.COMPLETED)] }));
  await settle();
  assert.equal(text().indexOf('There is no completed review for the week'), -1, 'nothing to point out when last week is covered');
  await unmount();

  await mount(renderWith(React.createElement(WeeklyReviews), { weeklyReviews: [weekly(1, 'Older review', twoWeeksAgo, WeeklyReviewStatus.COMPLETED)] }, newRec(), 'es'));
  await settle();
  assert.ok(text().indexOf('Nueva revisión') > -1 && text().indexOf('No hay una revisión completada de la semana del') > -1, 'the screen in Spanish');
  await unmount();

  const rec = newRec();
  await mount(renderWith(React.createElement(WeeklyReviews), {}, rec));
  await settle();
  assert.ok(text().indexOf('There are no weekly reviews yet') > -1);
  assert.equal(text().indexOf('There is no completed review'), -1, 'someone who has never started one is not nagged');
  await click(button('New review') as HTMLButtonElement);
  await settle();
  await setField('What happened', 'Received the monthly figures.');
  await setField('Priorities for next week', 'Order the laptops.');
  await click(button('Save') as HTMLButtonElement);
  await settle(80);
  assert.equal(rec.created.length, 1);
  assert.equal(rec.created[0].Title, `Week of ${monday}`, 'the title starts as the week it covers');
  assert.equal(rec.created[0].WeekStart, `${monday}T12:00:00Z`);
  assert.equal(rec.created[0].Status, 'DRAFT');
  assert.equal(rec.created[0].Happened, 'Received the monthly figures.');
  assert.equal(rec.created[0].Priorities, 'Order the laptops.');
  assert.equal(rec.created[0].OwnerUPN, 'me@x.com');
  await unmount();
};

const run = async (): Promise<void> => {
  await testObjectives();
  await testBusinessCases();
  await testWeekly();
  console.log('strategy screen tests passed');
  process.exit(0);
};

run().catch(error => {
  console.error(error);
  process.exit(1);
});
