import './helpers/globals';
import assert from 'node:assert/strict';
import * as React from 'react';
import { act } from 'react-dom/test-utils';
import CommandPalette from '../src/components/App/CommandPalette';
import Dashboard from '../src/components/Dashboard/Dashboard';
import { INav, INavSeed, NavContext } from '../src/components/shared/Nav';
import Vendors from '../src/components/Vendors/Vendors';
import { click, mount, settle, typeInto, unmount } from './helpers/dom';
import { button, newRec, renderWith, text } from './helpers/hub';

const vendor = (id: number, title: string): Record<string, unknown> => ({ id, vendorId: `VEN-${id}`, title, description: '', status: 'ACTIVE', category: 'HARDWARE', contactName: '', contactEmail: '', website: '', ownerUpn: 'me@x.com' });

const withNav = (element: React.ReactElement, nav: INav): React.ReactElement => React.createElement(NavContext.Provider, { value: nav }, element);

const press = async (target: EventTarget, init: KeyboardEventInit): Promise<void> => {
  await act(async () => { target.dispatchEvent(new window.KeyboardEvent('keydown', { bubbles: true, ...init })); });
};

const testPalette = async (): Promise<void> => {
  const went: Array<{ tab: string; seed?: INavSeed }> = [];
  const nav: INav = { goTo: (tab, seed) => { went.push({ tab, seed }); }, clearSeed: () => undefined };
  const data = { vendors: [vendor(1, 'Lyreco'), vendor(2, 'Bechtle')], projects: [{ id: 1, projectId: 'PROJ-1', title: 'Helpdesk renewal' }] };
  await mount(withNav(renderWith(React.createElement(CommandPalette), data), nav));
  await settle();
  assert.ok(button('Search · Ctrl+K'), 'the button in the header');
  assert.equal(text().indexOf('Quick search'), -1, 'closed at the start');

  await press(document, { key: 'k', ctrlKey: true });
  await settle();
  assert.ok(text().indexOf('Quick search') > -1, 'Ctrl+K opens it');
  assert.ok(text().indexOf('Vendors') > -1 && text().indexOf('Projects') > -1, 'without text, the tabs');
  assert.equal(text().indexOf('Lyreco'), -1, 'records only when something is typed');

  const input = document.body.querySelector('input[aria-label="Type a tab or a title…"]') as HTMLInputElement;
  assert.ok(input, 'the box is there');
  await typeInto(input, 'lyr');
  await settle();
  assert.ok(text().indexOf('Lyreco') > -1 && text().indexOf('Bechtle') === -1, 'filtered while typing');

  await press(input, { key: 'Enter' });
  await settle(600);
  assert.deepEqual(went, [{ tab: 'vendors', seed: { listName: 'IT_09_Vendors', search: 'Lyreco' } }], 'a record opens its tab with the search filled in');
  assert.equal(text().indexOf('Quick search'), -1, 'and it closes');

  // a tab, with the arrows
  await press(document, { key: 'k', ctrlKey: true });
  await settle();
  const box = document.body.querySelector('input[aria-label="Type a tab or a title…"]') as HTMLInputElement;
  await typeInto(box, 'proj');
  await settle();
  await press(box, { key: 'ArrowDown' });
  await press(box, { key: 'Enter' });
  await settle();
  assert.equal(went.length, 2);
  assert.equal(went[1].tab, 'projects');
  await unmount();
};

const testSeed = async (): Promise<void> => {
  window.localStorage.clear();
  let cleared = 0;
  const seed: INavSeed = { listName: 'IT_09_Vendors', search: 'Bechtle' };
  const nav: INav = { goTo: () => undefined, seed, clearSeed: () => { cleared++; } };
  await mount(withNav(renderWith(React.createElement(Vendors), { vendors: [vendor(1, 'Lyreco'), vendor(2, 'Bechtle')] }), nav));
  await settle();
  const search = document.body.querySelector('input[aria-label="Search"]') as HTMLInputElement;
  assert.equal(search.value, 'Bechtle', 'the screen opens already searching for it');
  assert.ok(cleared >= 1, 'and the search is used up');
  const rows = Array.from(document.body.querySelectorAll('[role="row"]')).map(r => r.textContent ?? '');
  assert.ok(rows.some(r => r.indexOf('Bechtle') > -1) && !rows.some(r => r.indexOf('Lyreco') > -1), 'only that record');
  await unmount();

  // a search meant for another list is left alone
  cleared = 0;
  await mount(withNav(renderWith(React.createElement(Vendors), { vendors: [vendor(1, 'Lyreco')] }), { ...nav, seed: { listName: 'IT_10_Contracts', search: 'x' } }));
  await settle();
  assert.equal((document.body.querySelector('input[aria-label="Search"]') as HTMLInputElement).value, '');
  assert.equal(cleared, 0);
  await unmount();
};

const testDashboardFavorites = async (): Promise<void> => {
  const went: Array<{ tab: string; seed?: INavSeed }> = [];
  const nav: INav = { goTo: (tab, seed) => { went.push({ tab, seed }); }, clearSeed: () => undefined };
  await mount(withNav(renderWith(React.createElement(Dashboard), {}, newRec()), nav));
  await settle();
  assert.ok(text().indexOf('Star the things you use most') > -1, 'no favourites yet: it says how');
  await unmount();

  const favorites = [
    { id: 1, title: 'Lyreco', listName: 'IT_09_Vendors', itemKey: '1', userUpn: 'me@x.com' },
    { id: 2, title: 'Not mine', listName: 'IT_09_Vendors', itemKey: '2', userUpn: 'ana@x.com' }
  ];
  await mount(withNav(renderWith(React.createElement(Dashboard), { favorites }, newRec()), nav));
  await settle();
  assert.ok(text().indexOf('My favorites') > -1 && text().indexOf('Lyreco') > -1);
  assert.equal(text().indexOf('Not mine'), -1, 'only my stars');
  const pill = Array.from(document.body.querySelectorAll('button')).filter(b => (b.textContent ?? '').indexOf('Lyreco') > -1)[0] as HTMLButtonElement;
  await click(pill);
  assert.deepEqual(went, [{ tab: 'vendors', seed: { listName: 'IT_09_Vendors', search: 'Lyreco' } }], 'a favourite opens its list with the search filled in');
  await unmount();
};

const run = async (): Promise<void> => {
  await testPalette();
  await testSeed();
  await testDashboardFavorites();
  console.log('command palette tests passed');
  process.exit(0);
};

run().catch(error => {
  console.error(error);
  process.exit(1);
});
