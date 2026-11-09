import './helpers/globals';
import assert from 'node:assert/strict';
import * as React from 'react';
import Projects from '../src/components/Projects/Projects';
import { HubDataContext, IHubData } from '../src/components/shared/HubData';
import { IListHookState } from '../src/hooks/useListItems';
import { I18nProvider } from '../src/i18n/I18n';
import { ApprovalStatus, IApprovalState, Project, ProjectRiskLevel, ProjectStatus } from '../src/models';
import { EMPTY_APPROVAL } from '../src/rules/approvals';
import { click, mount, settle, unmount } from './helpers/dom';

interface IUpdate { id: number; payload: Record<string, unknown> }

const project = (approval: IApprovalState = EMPTY_APPROVAL, o: Partial<Project> = {}): Project => ({
  id: 1, projectId: 'PROJ-1', initiativeId: '', title: 'Telephony rollout', description: '', status: ProjectStatus.PLANNING, ownerUpn: 'me@x.com',
  startDate: '', endDate: '', budgetAmount: 100000, forecastAmount: 100000, riskLevel: ProjectRiskLevel.LOW, plannerPlanId: '', approval, ...o
});

const makeHub = (projects: Project[], updates: IUpdate[], created: Array<Record<string, unknown>> = []): IHubData => {
  const list = <T,>(items: T[]): IListHookState<T> => ({
    items, loading: false, error: undefined, reload: async () => undefined,
    create: async payload => { created.push(payload); },
    update: async (id, payload) => { updates.push({ id, payload }); },
    remove: async () => undefined
  });
  const none = (): never => list([]) as never;
  return {
    service: { capabilities: { versioning: false, userSearch: 'known', attachments: false }, searchUsers: async () => [], createItem: async () => ({}) } as unknown as IHubData['service'], userEmail: 'me@x.com',
    projects: list(projects), ideas: none(), initiatives: none(), actions: none(), meetings: none(), notes: none(),
    risks: none(), decisions: none(), lessons: none(), reviews: none()
  };
};

const render = (hub: IHubData): React.ReactElement =>
  React.createElement(I18nProvider, { language: 'en' }, React.createElement(HubDataContext.Provider, { value: hub }, React.createElement(Projects)));

const text = (): string => document.body.textContent ?? '';
const button = (label: string, within: ParentNode = document.body): HTMLButtonElement | undefined =>
  Array.from(within.querySelectorAll('button')).filter(b => (b.textContent ?? '').trim() === label)[0] as HTMLButtonElement | undefined;

const selectRowAndEdit = async (): Promise<void> => {
  const row = Array.from(document.body.querySelectorAll('[role="row"]')).filter(r => (r.textContent ?? '').indexOf('Telephony rollout') > -1)[0];
  await click(row.querySelector('[role="gridcell"]') as Element);
  await settle();
  await click(Array.from(document.body.querySelectorAll('button')).filter(b => (b.textContent ?? '').trim() === 'Edit')[0]);
  await settle();
};

const setField = async (label: string, value: string): Promise<void> => {
  const labelEl = Array.from(document.body.querySelectorAll('label')).filter(l => (l.textContent ?? '').trim() === label)[0] as HTMLLabelElement;
  assert.ok(labelEl, `field "${label}" exists`);
  const input = document.getElementById(labelEl.htmlFor) as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set as (v: string) => void;
  const { act } = await import('react-dom/test-utils');
  await act(async () => { setter.call(input, value); input.dispatchEvent(new window.Event('input', { bubbles: true })); });
};

const save = async (): Promise<void> => {
  await click(button('Save') as HTMLButtonElement);
  await settle(80);
};

const testBlockedThenRequested = async (): Promise<void> => {
  window.localStorage.setItem('itsdm.lastApprover', 'boss@x.com');
  const updates: IUpdate[] = [];
  await mount(render(makeHub([project()], updates)));
  await settle();
  await selectRowAndEdit();

  // a change that goes over the margin cannot be saved without approval
  await setField('Forecast', '120000');
  await save();
  assert.equal(updates.length, 0, 'nothing was saved');
  assert.ok(text().indexOf('This change needs approval: Forecast over budget') > -1, 'the reason is explained');
  assert.ok(button('Request approval'), 'and the way forward is offered');

  // the request is saved on its own, without the blocked change
  await click(button('Request approval') as HTMLButtonElement);
  await settle(80);
  assert.equal(updates.length, 1);
  const payload = updates[0].payload;
  assert.equal(payload.ApprovalStatus, 'PENDING');
  assert.equal(payload.ApprovalRule, 'project.overBudget');
  assert.equal(payload.Approver, 'boss@x.com');
  assert.equal(payload.ForecastAmount, undefined, 'the forecast change was not applied');
  assert.equal(payload.Title, undefined, 'only the approval columns were written');
  assert.ok(text().indexOf('Approval requested from boss@x.com') > -1);

  // the message to the approver is ready to send
  const mail = Array.from(document.body.querySelectorAll('a')).filter(a => (a.textContent ?? '').trim() === 'Open email')[0] as HTMLAnchorElement;
  assert.ok(mail && mail.href.indexOf('mailto:boss%40x.com') === 0, 'a ready-made email');
  assert.ok(decodeURIComponent(mail.href).indexOf('Telephony rollout') > -1, 'it names the project');
  await unmount();
};

const testPendingBlocksAndDecisionIsRecorded = async (): Promise<void> => {
  const pending: IApprovalState = { ...EMPTY_APPROVAL, ruleId: 'project.overBudget', status: ApprovalStatus.PENDING, approver: 'boss@x.com', requestedOn: '2026-11-07' };
  const updates: IUpdate[] = [];
  await mount(render(makeHub([project(pending)], updates)));
  await settle();
  assert.ok(text().indexOf('Pending') > -1, 'the table marks it as waiting');
  await selectRowAndEdit();

  await setField('Forecast', '120000');
  await save();
  assert.equal(updates.length, 0, 'still blocked while waiting');
  assert.ok(text().indexOf('Waiting for the approval of boss@x.com') > -1);

  // approve, with a comment
  await click(button('Approve') as HTMLButtonElement);
  await settle();
  const dialog = document.body.querySelector('.ms-Dialog') as HTMLElement;
  assert.ok(dialog, 'asks for a comment first');
  await click(button('Approve', dialog) as HTMLButtonElement);
  await settle(80);
  assert.equal(updates.length, 1);
  assert.equal(updates[0].payload.ApprovalStatus, 'APPROVED');
  assert.equal(updates[0].payload.ApprovalDecidedBy, 'me@x.com');
  assert.equal(updates[0].payload.ApprovalRule, 'project.overBudget', 'the rule it was given for is kept');
  await unmount();
};

const testApprovedChangeGoesThroughOnce = async (): Promise<void> => {
  const approved: IApprovalState = { ...EMPTY_APPROVAL, ruleId: 'project.overBudget', status: ApprovalStatus.APPROVED, approver: 'boss@x.com', decidedBy: 'boss@x.com', decidedOn: '2026-11-08' };
  const updates: IUpdate[] = [];
  await mount(render(makeHub([project(approved)], updates)));
  await settle();
  await selectRowAndEdit();

  await setField('Forecast', '120000');
  await save();
  assert.equal(updates.length, 1, 'the approved change is saved');
  assert.equal(updates[0].payload.ForecastAmount, 120000);
  assert.equal(updates[0].payload.ApprovalStatus, 'NONE', 'and the approval is used up');
  assert.equal(updates[0].payload.ApprovalRule, '');
  await unmount();
};

const testNewItemCannotSkipTheRule = async (): Promise<void> => {
  const updates: IUpdate[] = [];
  const created: Array<Record<string, unknown>> = [];
  await mount(render(makeHub([], updates, created)));
  await settle();
  await click(Array.from(document.body.querySelectorAll('button')).filter(b => (b.textContent ?? '').trim() === 'New project')[0]);
  await settle();

  const { act } = await import('react-dom/test-utils');
  const titleLabel = Array.from(document.body.querySelectorAll('label')).filter(l => (l.textContent ?? '').trim() === 'Title')[0] as HTMLLabelElement;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set as (v: string) => void;
  await act(async () => { const i = document.getElementById(titleLabel.htmlFor) as HTMLInputElement; setter.call(i, 'Big one'); i.dispatchEvent(new window.Event('input', { bubbles: true })); });
  await setField('Budget', '200000');
  await setField('Forecast', '200000');
  // creating it already over the margin is the same as asking to skip the approval
  await setField('Forecast', '260000');
  await save();
  assert.equal(created.length, 0, 'not created');
  assert.ok(text().indexOf('Create it first in a state that does not need it') > -1, 'told what to do instead');
  await unmount();
};

const run = async (): Promise<void> => {
  await testBlockedThenRequested();
  await testPendingBlocksAndDecisionIsRecorded();
  await testApprovedChangeGoesThroughOnce();
  await testNewItemCannotSkipTheRule();
  console.log('approval screen tests passed');
  process.exit(0);
};

run().catch(error => {
  console.error(error);
  process.exit(1);
});
