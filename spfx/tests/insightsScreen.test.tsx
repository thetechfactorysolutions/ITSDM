import './helpers/globals';
import assert from 'node:assert/strict';
import * as React from 'react';
import Initiatives from '../src/components/Initiatives/Initiatives';
import Vendors from '../src/components/Vendors/Vendors';
import { Favorite, Initiative, InitiativeStatus as S } from '../src/models';
import { addDays, toDayKey } from '../src/rules/dates';
import { click, mount, settle, unmount } from './helpers/dom';
import { button, newRec, renderWith, text } from './helpers/hub';

const day = (offset: number): string => addDays(toDayKey(new Date()), offset);

const init = (id: number, title: string, status: S, ownerUpn: string, targetOffset: number | undefined, over: Partial<Initiative> = {}): Initiative => ({
  id, initiativeId: `INIT-${id}`, title, description: '', status, ownerUpn, progressPct: 10, targetDate: targetOffset === undefined ? '' : day(targetOffset), sourceIdeaId: '', plannerPlanId: '',
  modified: `2026-11-0${(id % 9) + 1}T10:00:00Z`, ...over
});

const items = [
  init(1, 'Alpha rollout', S.ACTIVE, 'me@x.com', -5),
  init(2, 'Beta pilot', S.ACTIVE, 'ana@x.com', -2),
  init(3, 'Gamma review', S.ACTIVE, 'me@x.com', 30),
  init(4, 'Delta cleanup', S.ACTIVE, 'ana@x.com', 40),
  init(5, 'Epsilon study', S.BLOCKED, 'bob@x.com', 10),
  init(6, 'Zeta merge', S.BLOCKED, 'ana@x.com', 20),
  init(7, 'Eta archive', S.ON_HOLD, 'me@x.com', undefined),
  init(8, 'Theta launch', S.ACTIVE, 'me@x.com', 50),
  init(9, 'Iota finished', S.COMPLETED, 'me@x.com', -30)
];

const stat = (label: string): HTMLButtonElement | undefined =>
  Array.from(document.body.querySelectorAll('button')).filter(b => (b.getAttribute('aria-label') ?? '').indexOf(`${label}: `) === 0)[0] as HTMLButtonElement | undefined;
const labelled = (label: string): HTMLButtonElement | undefined =>
  Array.from(document.body.querySelectorAll('button')).filter(b => b.getAttribute('aria-label') === label)[0] as HTMLButtonElement | undefined;

const testStrip = async (): Promise<void> => {
  window.localStorage.clear();
  await mount(renderWith(React.createElement(Initiatives), { initiatives: items }));
  await settle();
  assert.ok(text().indexOf('Summary') > -1, 'every list opens with its summary');
  assert.equal(stat('Total')?.getAttribute('aria-label'), 'Total: 9');
  assert.equal(stat('Open')?.getAttribute('aria-label'), 'Open: 8', 'the completed one is not open');
  assert.equal(stat('Past due')?.getAttribute('aria-label'), 'Past due: 2', 'two active ones are late; the completed one is not');
  assert.equal(stat('Mine')?.getAttribute('aria-label'), 'Mine: 5');
  assert.ok(text().indexOf('Recently updated') > -1, 'a long list also shows what changed lately');
  assert.ok(labelled('ana@x.com: 3'), 'what is most used: the owners');

  // pressing a figure filters the table, pressing it again clears
  assert.ok(text().indexOf('Gamma review') > -1);
  await click(stat('Past due') as HTMLButtonElement);
  await settle();
  assert.ok(text().indexOf('Filter: Past due') > -1, 'the filter is shown');
  const rows = Array.from(document.body.querySelectorAll('[role="row"]')).map(r => r.textContent ?? '').filter(r => r.indexOf('Gamma review') > -1 || r.indexOf('Alpha rollout') > -1);
  assert.equal(rows.length, 1, 'only the late items stay in the table');
  assert.ok(rows[0].indexOf('Alpha rollout') > -1);
  await click(button('Filter: Past due ✕') as HTMLButtonElement);
  await settle();
  assert.equal(text().indexOf('Filter: Past due'), -1);

  // a bar filters too
  await click(labelled('ana@x.com: 3') as HTMLButtonElement);
  await settle();
  const anaRows = Array.from(document.body.querySelectorAll('[role="row"]')).map(r => r.textContent ?? '').filter(r => r.indexOf('Beta pilot') > -1 || r.indexOf('Alpha rollout') > -1);
  assert.equal(anaRows.length, 1);
  assert.ok(anaRows[0].indexOf('Beta pilot') > -1);
  await unmount();

  // folding is remembered
  await mount(renderWith(React.createElement(Initiatives), { initiatives: items }));
  await settle();
  await click(button('▾ Summary') as HTMLButtonElement);
  await settle();
  assert.equal(stat('Total'), undefined, 'folded');
  await unmount();
  await mount(renderWith(React.createElement(Initiatives), { initiatives: items }));
  await settle();
  assert.equal(stat('Total'), undefined, 'and it stays folded the next time');
  await unmount();
  window.localStorage.clear();

  await mount(renderWith(React.createElement(Initiatives), { initiatives: items }, newRec(), 'es'));
  await settle();
  assert.ok(text().indexOf('Resumen') > -1 && stat('Vencidos'), 'in Spanish');
  await unmount();
};

const testFavorites = async (): Promise<void> => {
  window.localStorage.clear();
  const rec = newRec();
  await mount(renderWith(React.createElement(Initiatives), { initiatives: items }, rec));
  await settle();
  await click(labelled('Add to favorites: Gamma review') as HTMLButtonElement);
  await settle();
  assert.equal(rec.created.length, 1);
  assert.deepEqual(rec.created[0], { Title: 'Gamma review', ListName: 'IT_02_Initiatives', ItemKey: '3', UserUPN: 'me@x.com' });
  await unmount();

  // stars of this person, in this list: counted, listed, and filterable
  const favorites: Favorite[] = [
    { id: 10, title: 'Gamma review', listName: 'IT_02_Initiatives', itemKey: '3', userUpn: 'me@x.com' },
    { id: 11, title: 'Beta pilot', listName: 'IT_02_Initiatives', itemKey: '2', userUpn: 'ana@x.com' },
    { id: 12, title: 'Other list', listName: 'IT_03_Projects', itemKey: '3', userUpn: 'me@x.com' }
  ];
  const rec2 = newRec();
  await mount(renderWith(React.createElement(Initiatives), { initiatives: items, favorites }, rec2));
  await settle();
  assert.equal(stat('Favorites')?.getAttribute('aria-label'), 'Favorites: 1', 'only my stars in this list');
  assert.ok(labelled('Remove from favorites: Gamma review'), 'the star is on');
  assert.ok(labelled('Add to favorites: Beta pilot'), 'somebody else\'s star is not mine');
  await click(stat('Favorites') as HTMLButtonElement);
  await settle();
  const favRows = Array.from(document.body.querySelectorAll('[role="row"]')).map(r => r.textContent ?? '').filter(r => r.indexOf('Alpha rollout') > -1 || r.indexOf('Gamma review') > -1);
  assert.equal(favRows.length, 1, 'only the favourite stays');
  await unmount();
};

const testVendors = async (): Promise<void> => {
  window.localStorage.clear();
  const vendor = (id: number, title: string): Record<string, unknown> => ({ id, vendorId: `VEN-${id}`, title, description: '', status: 'ACTIVE', category: 'HARDWARE', contactName: '', contactEmail: '', website: '', ownerUpn: 'me@x.com' });
  const data = {
    vendors: [vendor(1, 'Lyreco'), vendor(2, 'Bechtle'), vendor(3, 'Quiet Co')],
    incidents: [{ id: 1, status: 'OPEN', vendorId: 'VEN-2' }, { id: 2, status: 'OPEN', vendorId: 'VEN-2' }, { id: 3, status: 'RESOLVED', vendorId: 'VEN-1' }],
    purchases: [{ id: 1, status: 'REQUESTED', vendorId: 'VEN-1' }, { id: 2, status: 'RECEIVED', vendorId: 'VEN-1' }, { id: 3, status: 'RECEIVED', vendorId: 'VEN-1' }]
  };
  await mount(renderWith(React.createElement(Vendors), data));
  await settle();
  assert.equal(stat('With something pending')?.getAttribute('aria-label'), 'With something pending: 2', 'Bechtle has open incidents and Lyreco a purchase to approve');
  assert.ok(text().indexOf('Most used') > -1 && text().indexOf('Most pending') > -1, 'the main vendors and the ones with most pending');
  assert.ok(labelled('Bechtle: 2'), 'Bechtle has two pending things');
  assert.ok(labelled('Lyreco: 4'), 'Lyreco is the most used: four records mention it');
  await click(stat('With something pending') as HTMLButtonElement);
  await settle();
  const quiet = Array.from(document.body.querySelectorAll('[role="row"]')).map(r => r.textContent ?? '').filter(r => r.indexOf('Quiet Co') > -1);
  assert.equal(quiet.length, 0, 'the vendor with nothing pending leaves the table');
  await unmount();
};

const run = async (): Promise<void> => {
  await testVendors();
  await testStrip();
  await testFavorites();
  console.log('insights screen tests passed');
  process.exit(0);
};

run().catch(error => {
  console.error(error);
  process.exit(1);
});
