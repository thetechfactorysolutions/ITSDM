import './helpers/globals';
import assert from 'node:assert/strict';
import * as React from 'react';
import Import from '../src/components/Import/Import';
import { HubDataContext, IHubData } from '../src/components/shared/HubData';
import { I18nProvider } from '../src/i18n/I18n';
import { click, findButton, mount, settle, setupDom, typeInto, unmount } from './helpers/dom';

setupDom();

interface ICall { op: string; list: string; payload?: Record<string, unknown>; id?: number }

const emptyList = (): IHubData['ideas'] => ({
  items: [], loading: false, error: undefined,
  reload: async () => undefined, create: async () => undefined, update: async () => undefined, remove: async () => undefined
});

const makeHub = (calls: ICall[], failTitles: string[] = []): IHubData => {
  let next = 500;
  const service = {
    searchUsers: async (query: string) => (query === 'Luis García' ? [{ displayName: 'Luis García', email: 'luis@x.com' }] : []),
    createItem: async (list: string, payload: Record<string, unknown>) => {
      if (failTitles.indexOf(String(payload.Title)) > -1) {
        throw new Error('SharePoint said no');
      }
      calls.push({ op: 'create', list, payload });
      return { Id: next++ };
    },
    updateItem: async (list: string, id: number, payload: Record<string, unknown>) => { calls.push({ op: 'update', list, id, payload }); },
    deleteItem: async () => undefined
  };
  return {
    service: service as unknown as IHubData['service'], userEmail: 'me@x.com',
    ideas: emptyList(), initiatives: emptyList() as never, projects: emptyList() as never, actions: emptyList() as never,
    meetings: emptyList() as never, notes: emptyList() as never,
    risks: emptyList() as never, decisions: emptyList() as never, lessons: emptyList() as never, reviews: emptyList() as never
  };
};

const RESULT = JSON.stringify({
  meeting: { title: 'Weekly sync', date: '2026-11-06' },
  projects: [{ title: 'Laptop refresh', owner: 'ana@x.com' }],
  actions: [
    { title: 'Send order', owner: 'Luis García', dueDate: '2026-11-13', project: 'Laptop refresh' },
    { title: 'Call the vendor', owner: 'Someone Unknown' }
  ],
  notes: [{ title: 'Budget approved', category: 'DECISION' }]
});

const render = (hub: IHubData): React.ReactElement =>
  React.createElement(I18nProvider, { language: 'en' },
    React.createElement(HubDataContext.Provider, { value: hub }, React.createElement(Import)));

const resultBox = (root: HTMLElement): HTMLTextAreaElement =>
  root.querySelector('textarea[placeholder^="{"]') as HTMLTextAreaElement;

const testFullFlow = async (): Promise<void> => {
  const calls: ICall[] = [];
  const root = await mount(render(makeHub(calls)));

  // step 1: the instruction can be copied and nothing is created yet
  assert.ok(findButton(root, 'Copy instruction'), 'the copy button is there');
  assert.ok((root.textContent ?? '').indexOf('1. Copy the instruction') > -1);
  assert.equal(findButton(root, 'Review what will be created')?.disabled, true, 'cannot review an empty result');

  // an unusable result is explained, not silently ignored
  await typeInto(resultBox(root), 'sorry, I cannot do that');
  await click(findButton(root, 'Review what will be created') as HTMLButtonElement);
  assert.ok((root.textContent ?? '').indexOf('does not contain the expected data') > -1, 'a clear message for text without data');
  assert.equal(calls.length, 0);

  // step 2: a good result gives a preview with warnings, and still creates nothing
  await typeInto(resultBox(root), `Here it is:\n\`\`\`json\n${RESULT}\n\`\`\``);
  await click(findButton(root, 'Review what will be created') as HTMLButtonElement);
  await settle(80); // owner lookup runs here

  const text = root.textContent ?? '';
  assert.ok(text.indexOf('3. Review and confirm') > -1, 'moved to the preview');
  assert.ok(text.indexOf('Weekly sync') > -1 && text.indexOf('Laptop refresh') > -1 && text.indexOf('Budget approved') > -1);
  assert.ok(text.indexOf('Someone Unknown') > -1, 'the person who could not be found is flagged');
  assert.equal(text.indexOf('Luis García" in the directory'), -1, 'the person who was found is not flagged');
  assert.equal(calls.length, 0, 'nothing is created before the user confirms');

  const checkboxes = Array.from(root.querySelectorAll('input[type="checkbox"]')) as HTMLInputElement[];
  assert.equal(checkboxes.length, 5, 'meeting + project + 2 actions + note');
  assert.equal(checkboxes.every(c => c.checked), true, 'everything starts included');
  assert.ok(findButton(root, 'Create 5 items'), 'the button says how many will be created');

  // the user unticks one action: it must not be created
  const callVendor = checkboxes.filter(c => (c.closest('div')?.textContent ?? '').indexOf('Call the vendor') > -1)[0];
  await click(callVendor);
  assert.ok(findButton(root, 'Create 4 items'), 'the count follows the checkboxes');

  // step 3: create
  await click(findButton(root, 'Create 4 items') as HTMLButtonElement);
  await settle(120);

  const created = calls.filter(c => c.op === 'create');
  assert.deepEqual(created.map(c => c.list), ['IT_21_Meetings', 'IT_03_Projects', 'IT_04_Actions', 'IT_22_Notes']);
  const action = created.filter(c => c.list === 'IT_04_Actions')[0].payload as Record<string, unknown>;
  assert.equal(action.OwnerUPN, 'luis@x.com', 'the name was resolved to the person found in the directory');
  assert.equal(action.Status, 'OPEN');
  assert.equal(String(action.DueDate), '2026-11-13T12:00:00Z');
  assert.ok(String(action.Description).indexOf('[Source: MEET-') > -1, 'linked back to the meeting');
  assert.ok(String(action.ProjectId).indexOf('PROJ-') === 0, 'linked to the project of the same result');
  assert.ok(calls.some(c => c.op === 'update' && c.list === 'IT_21_Meetings'), 'the meeting records what was created');

  const done = root.textContent ?? '';
  assert.ok(done.indexOf('3 items created, 0 failed') > -1, `summary shown, got: ${done.slice(0, 200)}`);
  assert.ok(findButton(root, 'Import another meeting'), 'can start again');
  await unmount();
};

const testPartialFailureCanBeRetried = async (): Promise<void> => {
  const calls: ICall[] = [];
  const hub = makeHub(calls, ['Budget approved']);
  const root = await mount(render(hub));

  await typeInto(resultBox(root), RESULT);
  await click(findButton(root, 'Review what will be created') as HTMLButtonElement);
  await settle(80);
  await click(findButton(root, 'Create 5 items') as HTMLButtonElement);
  await settle(120);

  let text = root.textContent ?? '';
  assert.ok(text.indexOf('failed') > -1 && text.indexOf('SharePoint said no') > -1, 'the failure is reported with its reason');
  assert.ok(text.indexOf('Budget approved') > -1);
  const retry = findButton(root, 'Retry the failed ones');
  assert.ok(retry, 'a retry button is offered');

  // the problem is fixed on the SharePoint side; retrying creates only what failed and not the meeting again
  (hub.service as unknown as { createItem: unknown }).createItem = async (list: string, payload: Record<string, unknown>) => {
    calls.push({ op: 'create', list, payload });
    return { Id: 900 };
  };
  const before = calls.filter(c => c.op === 'create').length;
  await click(retry as HTMLButtonElement);
  await settle(120);
  const retried = calls.filter(c => c.op === 'create').slice(before);
  assert.deepEqual(retried.map(c => c.list), ['IT_22_Notes'], 'only the failed note is created again');
  text = root.textContent ?? '';
  assert.ok(text.indexOf('4 items created, 0 failed') > -1, `the totals include both attempts, got: ${text.slice(0, 200)}`);
  await unmount();
};

const run = async (): Promise<void> => {
  await testFullFlow();
  await testPartialFailureCanBeRetried();
  console.log('import screen tests passed');
  process.exit(0);
};

run().catch(error => {
  console.error(error);
  process.exit(1);
});
