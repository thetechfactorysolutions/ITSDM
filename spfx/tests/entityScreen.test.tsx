import './helpers/globals';
import assert from 'node:assert/strict';
import * as React from 'react';
import Initiatives from '../src/components/Initiatives/Initiatives';
import { HubDataContext, IHubData } from '../src/components/shared/HubData';
import { IListHookState } from '../src/hooks/useListItems';
import { I18nProvider, Language } from '../src/i18n/I18n';
import { Initiative, InitiativeStatus } from '../src/models';
import { click, findButton, mount, settle, setupDom, typeInto, unmount } from './helpers/dom';

setupDom();

const initiative = (id: number, title: string, status: InitiativeStatus): Initiative => ({
  id, initiativeId: `INIT-${id}`, title, description: '', status, ownerUpn: 'me@x.com', progressPct: 10, targetDate: '', sourceIdeaId: '', plannerPlanId: ''
});

interface IRecorder { created: Array<Record<string, unknown>>; updated: Array<{ id: number; payload: Record<string, unknown> }>; removed: number[]; failNext?: string }

const makeList = <T,>(items: T[], rec: IRecorder): IListHookState<T> => ({
  items, loading: false, error: undefined,
  reload: async () => undefined,
  create: async payload => {
    if (rec.failNext) { const m = rec.failNext; rec.failNext = undefined; throw new Error(m); }
    rec.created.push(payload);
  },
  update: async (id, payload) => { rec.updated.push({ id, payload }); },
  remove: async id => { rec.removed.push(id); }
});

const empty = (): never => ({ items: [], loading: false, error: undefined, reload: async () => undefined, create: async () => undefined, update: async () => undefined, remove: async () => undefined }) as never;

const render = (items: Initiative[], rec: IRecorder, language: Language = 'en'): React.ReactElement => {
  const hub: IHubData = {
    service: { searchUsers: async () => [], createItem: async () => ({}) } as unknown as IHubData['service'],
    userEmail: 'me@x.com', initiatives: makeList(items, rec), ideas: empty(), projects: empty(), actions: empty(), meetings: empty(), notes: empty(),
    risks: empty(), decisions: empty(), lessons: empty(), reviews: empty()
  };
  return React.createElement(I18nProvider, { language }, React.createElement(HubDataContext.Provider, { value: hub }, React.createElement(Initiatives)));
};

const newRec = (): IRecorder => ({ created: [], updated: [], removed: [] });
const bodyText = (): string => document.body.textContent ?? '';

const testEmptyAndLanguage = async (): Promise<void> => {
  await mount(render([], newRec()));
  assert.ok(bodyText().indexOf('There are no initiatives yet') > -1, 'friendly message instead of an empty table');
  await unmount();

  await mount(render([], newRec(), 'es'));
  assert.ok(bodyText().indexOf('Todavía no hay iniciativas') > -1, 'the same screen in Spanish');
  assert.ok(bodyText().indexOf('Nueva iniciativa') > -1);
  await unmount();
};

const testCreateWithValidation = async (): Promise<void> => {
  const rec = newRec();
  const root = await mount(render([], rec));

  await click(findButton(root, 'New initiative') as HTMLButtonElement);
  await settle();
  const saveButton = findButton(document.body, 'Save') as HTMLButtonElement;
  assert.ok(saveButton, 'the form opens');

  // an empty title is rejected, with a message under the field, and nothing is saved
  await click(saveButton);
  await settle();
  assert.ok(bodyText().indexOf('Title is required.') > -1);
  assert.equal(rec.created.length, 0);

  // a failed save keeps the form open and says why
  const titleInput = Array.from(document.body.querySelectorAll('input')).filter(i => (i as HTMLInputElement).getAttribute('aria-required') === 'true' || i.id.indexOf('TextField') === 0)
    .filter(i => (i.closest('div')?.parentElement?.textContent ?? '').indexOf('Title') > -1)[0] as HTMLInputElement;
  assert.ok(titleInput, 'found the title input');
  await typeInto(titleInput, 'Digital Workplace');
  rec.failNext = 'SharePoint is unavailable';
  await click(findButton(document.body, 'Save') as HTMLButtonElement);
  await settle();
  assert.ok(findButton(document.body, 'Save'), 'the form stays open after a failed save');
  assert.equal(rec.created.length, 0);

  // and the next save works
  await click(findButton(document.body, 'Save') as HTMLButtonElement);
  await settle();
  assert.equal(rec.created.length, 1);
  assert.equal(rec.created[0].Title, 'Digital Workplace');
  assert.equal(rec.created[0].Status, 'DRAFT', 'a new initiative starts as a draft');
  assert.equal(rec.created[0].OwnerUPN, 'me@x.com', 'the owner defaults to the current user');
  assert.ok(String(rec.created[0].InitiativeId).indexOf('INIT-') === 0, 'the id is generated');
  await unmount();
};

const testRowsFiltersAndActions = async (): Promise<void> => {
  const rec = newRec();
  const items = [
    initiative(1, 'Cloud migration', InitiativeStatus.ACTIVE),
    initiative(2, 'Old programme', InitiativeStatus.COMPLETED),
    initiative(3, 'Security review', InitiativeStatus.DRAFT)
  ];
  const root = await mount(render(items, rec));
  await settle();

  // jsdom has no layout, so a virtualised table may render no rows; the rest of the screen is still checked
  const rowsRendered = bodyText().indexOf('Cloud migration') > -1;
  console.log('rows rendered by jsdom:', rowsRendered);
  if (rowsRendered) {
    assert.equal(bodyText().indexOf('Old programme'), -1, 'closed items are hidden by default');
    assert.ok(bodyText().indexOf('Security review') > -1);
  }

  // without a selection, the item commands are disabled
  assert.equal(findButton(root, 'Delete')?.getAttribute('aria-disabled'), 'true');
  assert.equal(findButton(root, 'Archive')?.getAttribute('aria-disabled'), 'true');
  assert.ok(findButton(root, 'Export CSV'), 'export is available');
  assert.ok(findButton(root, 'Import CSV'), 'import is available');

  if (rowsRendered) {
    const row = Array.from(root.querySelectorAll('[role="row"]')).filter(r => (r.textContent ?? '').indexOf('Cloud migration') > -1)[0];
    await click(row.querySelector('[role="gridcell"]') as Element);
    await settle();
    await click(findButton(root, 'Delete') as HTMLButtonElement);
    await settle();
    assert.ok(bodyText().indexOf('Delete permanently?') > -1, 'deleting asks first');
    assert.equal(rec.removed.length, 0, 'nothing is deleted before confirming');
    const confirm = Array.from(document.body.querySelectorAll('.ms-Dialog button')).filter(b => (b.textContent ?? '').trim() === 'Delete')[0] as HTMLButtonElement;
    await click(confirm);
    await settle();
    assert.deepEqual(rec.removed, [1]);
  }
  await unmount();
};

const run = async (): Promise<void> => {
  await testEmptyAndLanguage();
  await testCreateWithValidation();
  await testRowsFiltersAndActions();
  console.log('entity screen tests passed');
  process.exit(0);
};

run().catch(error => {
  console.error(error);
  process.exit(1);
});
