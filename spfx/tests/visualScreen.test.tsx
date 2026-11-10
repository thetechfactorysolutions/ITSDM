import './helpers/globals';
import assert from 'node:assert/strict';
import * as React from 'react';
import Initiatives from '../src/components/Initiatives/Initiatives';
import { Initiative, InitiativeStatus as S } from '../src/models';
import { addDays, toDayKey } from '../src/rules/dates';
import { click, mount, settle, unmount } from './helpers/dom';
import { button, newRec, renderWith, text } from './helpers/hub';

const day = (offset: number): string => addDays(toDayKey(new Date()), offset);

const init = (id: number, title: string, status: S, ownerUpn: string, targetOffset: number): Initiative => ({
  id, initiativeId: `INIT-${id}`, title, description: '', status, ownerUpn, progressPct: 10, targetDate: day(targetOffset), sourceIdeaId: '', plannerPlanId: '', modified: '2026-11-05T10:00:00Z'
});

const items = [
  init(1, 'Alpha rollout', S.ACTIVE, 'ana.lopez@x.com', -5),
  init(2, 'Beta pilot', S.BLOCKED, 'me@x.com', 0),
  init(3, 'Gamma review', S.ACTIVE, 'me@x.com', 3),
  init(4, 'Delta cleanup', S.ACTIVE, 'me@x.com', 60)
];

const cards = (): HTMLElement[] => Array.from(document.body.querySelectorAll('[role="listitem"]')) as HTMLElement[];
const cardOf = (title: string): HTMLElement => cards().filter(c => (c.textContent ?? '').indexOf(title) > -1)[0];

const testCards = async (): Promise<void> => {
  window.localStorage.clear();
  const rec = newRec();
  await mount(renderWith(React.createElement(Initiatives), { initiatives: items }, rec));
  await settle();
  assert.equal(cards().length, 4, 'a list opens as cards, one per item');
  assert.equal(button('Cards')?.getAttribute('aria-pressed'), 'true');

  assert.ok(text().indexOf('4 in total · 4 open') > -1, 'the head of the screen says what is in it');
  const alpha = cardOf('Alpha rollout').textContent ?? '';
  assert.ok(alpha.indexOf('🚀') > -1, 'each card carries the emoji of its list');
  assert.ok(alpha.indexOf('5 d late') > -1, 'a late item says how late');
  assert.ok(alpha.indexOf('Active') > -1 && alpha.indexOf('🟢') > -1, 'the status has its emoji');
  assert.ok(alpha.indexOf('AL') > -1, 'and the owner a badge with the initials');
  assert.ok((cardOf('Beta pilot').textContent ?? '').indexOf('Today') > -1);
  assert.ok((cardOf('Gamma review').textContent ?? '').indexOf('in 3 d') > -1);
  assert.equal((cardOf('Delta cleanup').textContent ?? '').indexOf(' d'), -1, 'something far away says nothing');

  // selecting a card enables the commands
  assert.equal(button('Archive')?.getAttribute('aria-disabled'), 'true');
  await click(cardOf('Gamma review'));
  await settle();
  assert.equal(cardOf('Gamma review').getAttribute('aria-selected'), 'true');
  assert.notEqual(button('Archive')?.getAttribute('aria-disabled'), 'true');

  // archive, then undo
  await click(button('Archive') as HTMLButtonElement);
  await settle(600);
  const confirm = Array.from(document.body.querySelectorAll('.ms-Dialog button')).filter(b => (b.textContent ?? '').trim() === 'Archive')[0] as HTMLButtonElement;
  await click(confirm);
  await settle();
  assert.equal(rec.updated.length, 1);
  assert.equal(rec.updated[0].payload.Status, S.CANCELLED);
  assert.ok(text().indexOf('"Gamma review" archived.') > -1, 'it says what happened');
  await click(button('Undo') as HTMLButtonElement);
  await settle();
  assert.equal(rec.updated.length, 2, 'undo saves the change back');
  assert.equal(rec.updated[1].id, 3);
  assert.equal(rec.updated[1].payload.Status, S.ACTIVE, 'to the status it had');
  assert.equal(text().indexOf('"Gamma review" archived.'), -1, 'and the bar goes away');
  await unmount();

  // the choice is there the next time
  await mount(renderWith(React.createElement(Initiatives), { initiatives: items }));
  await settle();
  assert.equal(cards().length, 4);
  await click(button('Table') as HTMLButtonElement);
  await settle();
  assert.equal(cards().length, 0, 'back to the table');
  assert.equal(window.localStorage.getItem('itsdm.layout.default'), '"table"', 'and the choice becomes the one for the other lists');
  assert.equal(window.localStorage.getItem('itsdm.layout.IT_02_Initiatives'), '"table"');
  await unmount();
};

const testTableLook = async (): Promise<void> => {
  window.localStorage.clear();
  window.localStorage.setItem('itsdm.layout.default', '"table"');
  await mount(renderWith(React.createElement(Initiatives), { initiatives: items }));
  await settle();
  const rows = Array.from(document.body.querySelectorAll('[role="row"]')).map(r => r.textContent ?? '');
  if (rows.some(r => r.indexOf('Alpha rollout') > -1)) {
    const alpha = rows.filter(r => r.indexOf('Alpha rollout') > -1)[0];
    assert.ok(alpha.indexOf('5 d late') > -1, 'the table shows the late chip too');
  }
  // the chart of statuses and the activity strip are part of the summary
  assert.ok(document.body.querySelector('svg[role="img"] circle'), 'a ring of statuses');
  assert.ok(text().indexOf('Activity, last 8 weeks') > -1);
  await unmount();
};

const run = async (): Promise<void> => {
  await testCards();
  await testTableLook();
  console.log('visual screen tests passed');
  process.exit(0);
};

run().catch(error => {
  console.error(error);
  process.exit(1);
});
