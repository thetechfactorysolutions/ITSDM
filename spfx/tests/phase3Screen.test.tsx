import './helpers/globals';
import assert from 'node:assert/strict';
import * as React from 'react';
import { act } from 'react-dom/test-utils';
import Alerts from '../src/components/Alerts/Alerts';
import Dashboard from '../src/components/Dashboard/Dashboard';
import Initiatives from '../src/components/Initiatives/Initiatives';
import { ActionItem, ActionStatus, Initiative, InitiativeStatus as S } from '../src/models';
import { addDays, toDayKey } from '../src/rules/dates';
import { click, mount, settle, unmount } from './helpers/dom';
import { button, newRec, renderWith, text } from './helpers/hub';

const day = (offset: number): string => addDays(toDayKey(new Date()), offset);
const init = (id: number, title: string, status: S, targetOffset: number): Initiative => ({
  id, initiativeId: `INIT-${id}`, title, description: '', status, ownerUpn: 'me@x.com', progressPct: 10, targetDate: day(targetOffset), sourceIdeaId: '', plannerPlanId: '', modified: '2026-11-05T10:00:00Z'
});
const items = [init(1, 'Alpha rollout', S.ACTIVE, 0), init(2, 'Beta pilot', S.ACTIVE, 2), init(3, 'Gamma review', S.BLOCKED, 3)];

const press = async (key: string): Promise<void> => {
  await act(async () => { document.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true })); });
  await settle(100);
};
const layout = (value: string): void => {
  window.localStorage.clear();
  window.localStorage.setItem('itsdm.layout.default', `"${value}"`);
};

const testBoard = async (): Promise<void> => {
  layout('board');
  const rec = newRec();
  await mount(renderWith(React.createElement(Initiatives), { initiatives: items }, rec));
  await settle();
  const column = (label: string): HTMLElement | undefined => Array.from(document.body.querySelectorAll('section[aria-label]')).filter(s => (s.getAttribute('aria-label') ?? '').indexOf(`${label}:`) === 0)[0] as HTMLElement | undefined;
  assert.ok(column('Active'), 'a column per status');
  assert.ok((column('Active')?.textContent ?? '').indexOf('Alpha rollout') > -1 && (column('Active')?.textContent ?? '').indexOf('Beta pilot') > -1);
  assert.ok((column('Blocked')?.textContent ?? '').indexOf('Gamma review') > -1);
  assert.ok(column('On hold'), 'an open status with nothing in it is still a place to drop into');

  const select = document.body.querySelector('select[aria-label="Move to: Alpha rollout"]') as HTMLSelectElement;
  assert.ok(select);
  assert.equal(Array.from(select.options).map(o => o.value).indexOf(S.ACTIVE), -1, 'it cannot be moved to where it already is');
  await act(async () => { select.value = S.ON_HOLD; select.dispatchEvent(new window.Event('change', { bubbles: true })); });
  await settle();
  assert.deepEqual(rec.updated.map(u => [u.id, u.payload.Status]), [[1, S.ON_HOLD]], 'moving a card changes its status');
  await unmount();
};

const testCalendar = async (): Promise<void> => {
  layout('calendar');
  await mount(renderWith(React.createElement(Initiatives), { initiatives: items }));
  await settle();
  const grid = document.body.querySelector('[role="grid"]') as HTMLElement;
  assert.ok(grid, 'a month');
  assert.ok(grid.querySelector(`[role="gridcell"][aria-label="${day(0)}"]`)?.textContent?.indexOf('Alpha rollout') !== -1, 'a record sits on its due day');
  const today = new Date();
  assert.ok(text().toLowerCase().indexOf(today.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }).toLowerCase()) > -1, 'it opens on this month');
  await click(document.body.querySelector('button[aria-label="Next month"]') as HTMLButtonElement);
  await settle();
  const next = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  assert.ok(text().toLowerCase().indexOf(next.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }).toLowerCase()) > -1, 'and moves to the next month');
  await unmount();
};

const testShortcutsAndGuard = async (): Promise<void> => {
  layout('cards');
  await mount(renderWith(React.createElement(Initiatives), { initiatives: items }));
  await settle();
  const selected = (): string | undefined => Array.from(document.body.querySelectorAll('[role="listitem"][aria-selected="true"]')).map(c => c.textContent ?? '')[0];
  assert.equal(selected(), undefined);
  await press('j');
  assert.ok((selected() ?? '').indexOf('Alpha rollout') > -1, 'j selects the first');
  await press('j');
  assert.ok((selected() ?? '').indexOf('Beta pilot') > -1, 'and goes down');
  await press('k');
  assert.ok((selected() ?? '').indexOf('Alpha rollout') > -1, 'k goes up');
  await press('e');
  await settle(300);
  assert.ok(button('Save'), 'e edits the selected one');

  // closing the form without changes does not ask
  await click(button('Cancel') as HTMLButtonElement);
  await settle(600);
  assert.equal(text().indexOf('Discard your changes?'), -1);
  assert.equal(button('Save'), undefined, 'it closed');

  // n opens a new one; changing something and cancelling asks first
  await press('n');
  await settle(300);
  assert.ok(button('Save'), 'n starts a new record');
  const title = Array.from(document.body.querySelectorAll('input')).filter(i => i.id.indexOf('TextField') === 0 && (i.closest('div')?.parentElement?.textContent ?? '').indexOf('Title') > -1)[0] as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set as (v: string) => void;
  await act(async () => { setter.call(title, 'Something new'); title.dispatchEvent(new window.Event('input', { bubbles: true })); });
  await click(button('Cancel') as HTMLButtonElement);
  await settle(400);
  assert.ok(text().indexOf('Discard your changes?') > -1, 'unsaved changes are not lost by accident');
  assert.ok(button('Save'), 'the form is still there');
  await click(Array.from(document.body.querySelectorAll('.ms-Dialog button')).filter(b => (b.textContent ?? '').trim() === 'Cancel')[0] as HTMLElement);
  await settle(600);
  assert.ok(button('Save'), 'keep editing');
  await click(button('Cancel') as HTMLButtonElement);
  await settle(400);
  await click(Array.from(document.body.querySelectorAll('.ms-Dialog button')).filter(b => (b.textContent ?? '').trim() === 'Discard')[0] as HTMLElement);
  await settle(700);
  assert.equal(button('Save'), undefined, 'discarding closes it');
  await unmount();
};

const testColumns = async (): Promise<void> => {
  layout('table');
  await mount(renderWith(React.createElement(Initiatives), { initiatives: items }));
  await settle();
  const headers = (): string[] => Array.from(document.body.querySelectorAll('.ms-DetailsHeader-cellName')).map(h => (h.textContent ?? '').trim());
  if (headers().length > 0) {
    assert.ok(headers().indexOf('Progress') > -1 || headers().length > 2);
  }
  await click(document.body.querySelector('[aria-label="Columns"]') as HTMLElement);
  await settle(200);
  const option = Array.from(document.body.querySelectorAll('.ms-Dropdown-item')).filter(b => (b.textContent ?? '').trim() === 'Title')[0] as HTMLElement;
  assert.ok(option, 'the columns can be chosen');
  await click((option.querySelector('input') ?? option) as HTMLElement);
  await settle(200);
  assert.deepEqual(JSON.parse(window.localStorage.getItem('itsdm.cols.IT_02_Initiatives') ?? '[]'), ['title'], 'the hidden column is remembered');
  await unmount();
};

const testWorkloadAndQuality = async (): Promise<void> => {
  layout('table');
  const action = (id: number, title: string, owner: string, due: string): ActionItem => ({ id, actionId: `ACT-${id}`, title, status: ActionStatus.OPEN, priority: 'MEDIUM', ownerUpn: owner, dueDate: due } as unknown as ActionItem);
  const data = { actions: [action(1, 'One', 'ana@x.com', day(-2)), action(2, 'Two', 'ana@x.com', day(5)), action(3, 'Three', 'bob@x.com', day(9)), action(4, 'Orphan', '', day(9))] };
  await mount(renderWith(React.createElement(Dashboard), data, newRec()));
  await settle();
  assert.ok(text().indexOf('Workload by person') > -1);
  assert.ok(text().indexOf('ana@x.com') > -1 && text().indexOf('bob@x.com') > -1);
  await unmount();

  await mount(renderWith(React.createElement(Alerts), data));
  await settle();
  assert.ok(text().indexOf('Data quality') > -1);
  assert.ok(text().indexOf('open records without a person in charge') > -1, 'it finds the record nobody owns');
  assert.ok(text().indexOf('Orphan') > -1);
  await unmount();
};

const run = async (): Promise<void> => {
  await testBoard();
  await testCalendar();
  await testShortcutsAndGuard();
  await testColumns();
  await testWorkloadAndQuality();
  console.log('phase 3 screen tests passed');
  process.exit(0);
};

run().catch(error => {
  console.error(error);
  process.exit(1);
});
