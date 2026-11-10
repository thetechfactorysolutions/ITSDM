import './helpers/globals';
import assert from 'node:assert/strict';
import * as React from 'react';
import Alerts from '../src/components/Alerts/Alerts';
import Initiatives from '../src/components/Initiatives/Initiatives';
import { ActionItem, ActionStatus, Initiative, InitiativeStatus as S } from '../src/models';
import { addDays, toDayKey } from '../src/rules/dates';
import { click, mount, settle, typeInto, unmount } from './helpers/dom';
import { button, newRec, renderWith, text } from './helpers/hub';

const day = (offset: number): string => addDays(toDayKey(new Date()), offset);

const init = (id: number, title: string, status: S): Initiative => ({
  id, initiativeId: `INIT-${id}`, title, description: '', status, ownerUpn: 'me@x.com', progressPct: 10, targetDate: day(30), sourceIdeaId: '', plannerPlanId: '', modified: '2026-11-05T10:00:00Z'
});
const items = [init(1, 'Alpha rollout', S.ACTIVE), init(2, 'Beta pilot', S.ACTIVE), init(3, 'Gamma review', S.ACTIVE), init(4, 'Delta cleanup', S.COMPLETED)];

const pick = async (label: string, option: string): Promise<void> => {
  await click(document.body.querySelector(`[aria-label="${label}"]`) as HTMLElement);
  await settle(200);
  const item = Array.from(document.body.querySelectorAll('.ms-Dropdown-item')).filter(b => (b.textContent ?? '').trim() === option)[0] as HTMLElement;
  assert.ok(item, `the option ${option}`);
  await click(item);
  await settle(200);
};
const searchBox = (): HTMLInputElement => document.body.querySelector('input[aria-label="Search"]') as HTMLInputElement;
const cards = (): HTMLElement[] => Array.from(document.body.querySelectorAll('[role="listitem"]')) as HTMLElement[];

const testSavedViews = async (): Promise<void> => {
  window.localStorage.clear();
  window.localStorage.setItem('itsdm.layout.default', '"table"');
  await mount(renderWith(React.createElement(Initiatives), { initiatives: items }));
  await settle();
  await typeInto(searchBox(), 'Alpha');
  await settle();
  await click(button('Remember this view…') as HTMLButtonElement);
  await settle(300);
  const name = document.body.querySelector('.ms-Dialog input') as HTMLInputElement;
  await click(Array.from(document.body.querySelectorAll('.ms-Dialog button')).filter(b => (b.textContent ?? '').trim() === 'Save')[0] as HTMLElement);
  await settle();
  assert.ok(text().indexOf('Write a name') > -1, 'a view needs a name');
  await typeInto(name, 'Only Alpha');
  await click(Array.from(document.body.querySelectorAll('.ms-Dialog button')).filter(b => (b.textContent ?? '').trim() === 'Save')[0] as HTMLElement);
  await settle(600);
  const saved = JSON.parse(window.localStorage.getItem('itsdm.views.IT_02_Initiatives') ?? '[]') as Array<{ name: string; search: string }>;
  assert.deepEqual(saved.map(v => [v.name, v.search]), [['Only Alpha', 'Alpha']]);

  // clear the search, then bring the view back
  await typeInto(searchBox(), '');
  await settle();
  assert.equal(searchBox().value, '');
  await pick('Views', 'Only Alpha');
  assert.equal(searchBox().value, 'Alpha', 'the saved view brings its search back');
  await unmount();
};

const testBulk = async (): Promise<void> => {
  window.localStorage.clear();
  window.localStorage.setItem('itsdm.layout.default', '"cards"');
  const rec = newRec();
  await mount(renderWith(React.createElement(Initiatives), { initiatives: items }, rec));
  await settle();
  assert.equal(document.body.querySelectorAll('input[type="checkbox"][aria-label^="Select:"]').length, 0, 'no tick boxes until asked');
  const label = Array.from(document.body.querySelectorAll('label')).filter(l => (l.textContent ?? '').trim() === 'Select several')[0] as HTMLLabelElement;
  const mode = document.getElementById(label.htmlFor) as HTMLElement;
  await click(mode);
  await settle();
  const boxes = Array.from(document.body.querySelectorAll('input[type="checkbox"][aria-label^="Select:"]')) as HTMLInputElement[];
  assert.equal(boxes.length, 3, 'one tick box per card shown (the completed one is hidden)');
  await click(boxes[0]);
  await click(boxes[1]);
  await settle();
  assert.ok(text().indexOf('2 selected') > -1);

  await pick('Change status', 'On hold');
  assert.deepEqual(rec.updated.map(u => [u.id, u.payload.Status]), [[1, S.ON_HOLD], [2, S.ON_HOLD]], 'both chosen records changed');
  assert.ok(text().indexOf('Changed 2') > -1, 'it says how many');
  assert.ok(text().indexOf('2 records are now On hold') > -1);
  await click(button('Undo') as HTMLButtonElement);
  await settle();
  assert.deepEqual(rec.updated.slice(2).map(u => [u.id, u.payload.Status]), [[1, S.ACTIVE], [2, S.ACTIVE]], 'undo puts them back');
  await unmount();
};

const testAlerts = async (): Promise<void> => {
  window.localStorage.clear();
  const action = (id: number, title: string, status: ActionStatus, due: string): ActionItem => ({ id, actionId: `ACT-${id}`, title, status, priority: 'MEDIUM', ownerUpn: 'ana@x.com', dueDate: due } as unknown as ActionItem);
  const data = { actions: [action(1, 'Late thing', ActionStatus.OPEN, day(-3)), action(2, 'Today thing', ActionStatus.OPEN, day(0)), action(3, 'Done thing', ActionStatus.DONE, day(-9))] };
  await mount(renderWith(React.createElement(Alerts), data));
  await settle();
  assert.ok(text().indexOf('1 late · 1 due today · 0 due this week') > -1, 'the totals');
  assert.ok(text().indexOf('Late thing') > -1 && text().indexOf('Today thing') > -1);
  assert.equal(text().indexOf('Done thing'), -1, 'closed ones are not alerts');
  const mail = Array.from(document.body.querySelectorAll('a')).filter(a => (a.getAttribute('href') ?? '').startsWith('mailto:me@x.com'))[0];
  assert.ok(mail, 'a mail to the user');
  assert.ok(decodeURIComponent(mail.getAttribute('href') ?? '').indexOf('Late thing') > -1, 'with the summary in it');

  // the flow
  const calls: Array<{ url: string; body: string; mode?: string }> = [];
  (globalThis as unknown as { fetch: unknown }).fetch = async (url: string, init: { body: string; mode?: string }) => { calls.push({ url, body: init.body, mode: init.mode }); return {}; };
  await click(button('Send the summary to the flow now') as HTMLButtonElement);
  await settle();
  assert.ok(text().indexOf('Paste the secure link') > -1);
  assert.equal(calls.length, 0, 'nothing is sent without a link');
  const field = Array.from(document.body.querySelectorAll('input')).filter(i => (i as HTMLInputElement).placeholder.indexOf('https://prod') === 0)[0] as HTMLInputElement;
  await typeInto(field, 'http://insecure.example.com/x');
  await click(button('Send the summary to the flow now') as HTMLButtonElement);
  await settle();
  assert.equal(calls.length, 0, 'an insecure link is refused');
  await typeInto(field, 'https://prod-1.westeurope.logic.azure.com/workflows/abc');
  await click(button('Send the summary to the flow now') as HTMLButtonElement);
  await settle();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].mode, 'no-cors');
  const sent = JSON.parse(calls[0].body) as { late: number; text: string; user: string };
  assert.equal(sent.late, 1);
  assert.equal(sent.user, 'me@x.com');
  assert.ok(sent.text.indexOf('Late thing') > -1);
  assert.ok(text().indexOf('Sent.') > -1);
  assert.equal(window.localStorage.getItem('itsdm.webhook'), '"https://prod-1.westeurope.logic.azure.com/workflows/abc"', 'the link is remembered in this browser');
  await unmount();
};

const run = async (): Promise<void> => {
  await testSavedViews();
  await testBulk();
  await testAlerts();
  console.log('phase 2 screen tests passed');
  process.exit(0);
};

run().catch(error => {
  console.error(error);
  process.exit(1);
});
