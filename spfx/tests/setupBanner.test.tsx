import './helpers/globals';
import assert from 'node:assert/strict';
import * as React from 'react';
import SetupBanner, { LIST_DEFS } from '../src/components/App/SetupBanner';
import { IListDef } from '../src/provisioning/fieldXml';
import { IListProvisioner } from '../src/provisioning/provision';
import { click, mount, settle, unmount } from './helpers/dom';
import { button, newRec, renderWith, text } from './helpers/hub';

const fakeSite = (existing: string[], failOn?: string): IListProvisioner & { created: string[]; fields: number } => {
  const site = {
    created: [] as string[],
    fields: 0,
    titles: existing.slice(),
    getListTitles: async (): Promise<string[]> => site.titles.slice(),
    createList: async (list: IListDef): Promise<void> => {
      if (list.title === failOn) { throw new Error('Access denied'); }
      site.titles.push(list.title);
      site.created.push(list.title);
    },
    getFieldNames: async (): Promise<string[]> => [],
    addField: async (): Promise<void> => { site.fields++; }
  };
  return site;
};

const render = (provisioner: IListProvisioner | undefined, reloaded: { count: number }, language: 'en' | 'es' = 'en'): React.ReactElement =>
  renderWith(React.createElement(SetupBanner), {}, newRec(), language, { provisioner, reloadAll: undefined } as never);

const run = async (): Promise<void> => {
  // a store that cannot create lists (the local mode): nothing to show
  await mount(render(undefined, { count: 0 }));
  await settle();
  assert.equal(text().indexOf('lists are missing'), -1);
  assert.equal(button('Create the missing lists'), undefined);
  await unmount();

  // everything is there: nothing to show
  const complete = fakeSite(LIST_DEFS.map(d => d.title));
  await mount(render(complete, { count: 0 }));
  await settle();
  assert.equal(button('Create the missing lists'), undefined, 'no banner when no list is missing');
  await unmount();

  // some lists missing: the banner says how many and creates only those
  const existing = LIST_DEFS.slice(0, 22).map(d => d.title);
  const missing = LIST_DEFS.length - 22;
  const site = fakeSite(existing);
  await mount(render(site, { count: 0 }));
  await settle();
  assert.ok(text().indexOf('Some lists are missing on this site.') > -1);
  assert.ok(text().indexOf(`${missing} list(s) to create`) > -1, 'it counts the lists to create');
  assert.ok(text().indexOf(LIST_DEFS[22].title) > -1, 'and names the first ones');
  await click(button('Create the missing lists') as HTMLButtonElement);
  await settle(200);
  assert.equal(site.created.length, missing, 'only the missing lists are created');
  assert.deepEqual(site.created, LIST_DEFS.slice(22).map(d => d.title));
  assert.ok(site.fields > 100, 'with their columns');
  assert.ok(text().indexOf(`${missing} list(s) created.`) > -1);
  assert.equal(button('Create the missing lists'), undefined, 'the banner is gone');
  await unmount();

  // no permission: it says so and keeps offering
  const denied = fakeSite(existing, LIST_DEFS[25].title);
  await mount(render(denied, { count: 0 }, 'es'));
  await settle();
  assert.ok(text().indexOf('Faltan algunas listas en este sitio.') > -1, 'the banner in Spanish');
  await click(button('Crear las listas que faltan') as HTMLButtonElement);
  await settle(200);
  assert.ok(text().indexOf(`${LIST_DEFS[25].title}: Access denied`) > -1, 'the failed list and the reason are shown');
  assert.ok(button('Crear las listas que faltan'), 'and it can be tried again');
  await unmount();

  console.log('setup banner tests passed');
  process.exit(0);
};

run().catch(error => {
  console.error(error);
  process.exit(1);
});
