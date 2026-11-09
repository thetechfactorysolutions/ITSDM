import './helpers/globals';
import assert from 'node:assert/strict';
import * as React from 'react';
import { IDatabase } from '../src/data/DocumentStore';
import { IFileHandleLike } from '../src/data/persistence';
import { SeedRows } from '../src/data/seed';
import { IFileAccess } from '../src/standalone/fileAccess';
import StandaloneApp from '../src/standalone/StandaloneApp';
import seedJson from '../src/standalone/seed.json';
import { FakeFile } from './helpers/fakeFile';
import { click, mount, settle, unmount } from './helpers/dom';

const seed = seedJson as SeedRows;
const NOW = new Date(2026, 10, 9, 10);

const text = (): string => document.body.textContent ?? '';
const button = (label: string): HTMLButtonElement | undefined =>
  Array.from(document.body.querySelectorAll('button')).filter(b => (b.textContent ?? '').trim() === label)[0] as HTMLButtonElement | undefined;

const setField = async (label: string, value: string): Promise<void> => {
  const l = Array.from(document.body.querySelectorAll('label')).filter(x => (x.textContent ?? '').replace('*', '').trim() === label)[0] as HTMLLabelElement;
  assert.ok(l, `field "${label}" exists`);
  const input = document.getElementById(l.htmlFor) as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set as (v: string) => void;
  const { act } = await import('react-dom/test-utils');
  await act(async () => { setter.call(input, value); input.dispatchEvent(new window.Event('input', { bubbles: true })); });
};

interface IFakeFiles extends IFileAccess {
  remembered: IFileHandleLike | undefined;
  permissionAsked: number;
}

const fakeFiles = (file: FakeFile | undefined, supported: boolean = true, last?: FakeFile): IFakeFiles => {
  const files: IFakeFiles = {
    supported,
    remembered: undefined,
    permissionAsked: 0,
    openFile: async () => file,
    createFile: async () => file,
    lastFile: async () => last,
    rememberFile: async handle => { files.remembered = handle; },
    ensurePermission: async () => { files.permissionAsked++; return true; }
  };
  return files;
};

const render = (files: IFileAccess): React.ReactElement => React.createElement(StandaloneApp, { seed, files, now: () => NOW });

const testStartScreenAndDemo = async (): Promise<void> => {
  window.localStorage.clear();
  await mount(render(fakeFiles(undefined)));
  await settle();
  assert.ok(text().indexOf('Your data stays in a file you choose') > -1, 'the start screen explains where the data goes');

  // the email is required before anything starts
  await click(button('Try it with sample data (nothing is saved)') as HTMLButtonElement);
  await settle();
  assert.ok(text().indexOf('Enter a valid email to continue.') > -1);
  assert.equal(text().indexOf('Management dashboard'), -1, 'nothing started');

  await setField('Your email', 'me@x.com');
  await click(button('Try it with sample data (nothing is saved)') as HTMLButtonElement);
  await settle(200);
  assert.ok(text().indexOf('Management dashboard') > -1, 'the dashboard opens');
  assert.ok(text().indexOf('Sample data · me@x.com') > -1, 'the header shows the mode and the person');
  assert.ok(text().indexOf('Changes stay in this page only') > -1, 'a warning says nothing is saved');
  assert.ok(text().indexOf('Teams telephony rollout') > -1 || text().indexOf('Pending approvals') > -1, 'it shows the sample data');
  assert.ok(/Pending approvals\s*4/.test(text()), 'the four sample approvals are counted');
  assert.ok(/Late trainings\s*1/.test(text()), 'the new people lists are in the dashboard too');
  assert.ok(/Inbox\s*2/.test(text()) && /Open matters\s*3/.test(text()), 'the inbox and the open matters are in the dashboard');

  const saved = JSON.parse(window.localStorage.getItem('itsdm.settings') ?? '{}') as { email: string };
  assert.equal(saved.email, 'me@x.com', 'the email is remembered for next time');

  await click(button('Close') as HTMLButtonElement);
  await settle();
  assert.ok(text().indexOf('Your data stays in a file you choose') > -1, 'closing goes back to the start');
  await unmount();
};

const testSpanish = async (): Promise<void> => {
  window.localStorage.setItem('itsdm.settings', JSON.stringify({ name: 'Ana', email: 'ana@x.com', language: 'es' }));
  await mount(render(fakeFiles(undefined)));
  await settle();
  assert.ok(text().indexOf('Tus datos se quedan en un archivo que eliges') > -1);
  await click(button('Probar con datos de ejemplo (no se guarda nada)') as HTMLButtonElement);
  await settle(200);
  assert.ok(text().indexOf('Datos de ejemplo · ana@x.com') > -1);
  assert.ok(text().indexOf('Panel de gestión') > -1 || text().indexOf('Panel') > -1, 'the app is in Spanish');
  await unmount();
};

const testCreateAndResume = async (): Promise<void> => {
  window.localStorage.setItem('itsdm.settings', JSON.stringify({ name: '', email: 'me@x.com', language: 'en' }));
  const file = new FakeFile();
  const files = fakeFiles(file);
  await mount(render(files));
  await settle();

  // a new file, started with the sample data
  await click(button('Create a new data file') as HTMLButtonElement);
  await settle(250);
  assert.ok(text().indexOf('File: data.json · me@x.com') > -1, 'the header shows the file');
  assert.equal(text().indexOf('Changes stay in this page only'), -1, 'no warning: it is saved to the file');
  assert.equal(files.remembered, file, 'the file is remembered for next time');
  const saved = JSON.parse(file.text) as IDatabase;
  assert.equal(saved.format, 1);
  assert.equal(Object.keys(saved.lists).length, 29, 'all 29 lists were written');
  assert.equal(saved.lists.IT_04_Actions.items[0].OwnerUPN, 'me@x.com');

  // a change made in the app is written to the file
  const modifiedBefore = file.modified;
  await click(button('Actions') as HTMLButtonElement);
  await settle();
  await click(button('New action') as HTMLButtonElement);
  await settle();
  await setField('Title', 'Written to the file');
  await click(button('Save') as HTMLButtonElement);
  await settle(250);
  assert.ok(file.modified > modifiedBefore, 'the file was written');
  const afterSave = JSON.parse(file.text) as IDatabase;
  assert.ok(afterSave.lists.IT_04_Actions.items.some(i => i.Title === 'Written to the file'));
  await unmount();

  // next time the same file is offered, and opening it needs one click to grant permission again
  const again = fakeFiles(undefined, true, file);
  await mount(render(again));
  await settle();
  const resume = button('Continue with data.json');
  assert.ok(resume, 'the last file is offered');
  await click(resume as HTMLButtonElement);
  await settle(250);
  assert.equal(again.permissionAsked, 1, 'permission was requested from the click');
  assert.ok(text().indexOf('File: data.json') > -1);
  assert.ok(text().indexOf('Management dashboard') > -1);
  await unmount();
};

const testOpenWrongFile = async (): Promise<void> => {
  window.localStorage.setItem('itsdm.settings', JSON.stringify({ name: '', email: 'me@x.com', language: 'en' }));
  const wrong = new FakeFile();
  wrong.name = 'notes.json';
  wrong.text = '{"hello":1}';
  await mount(render(fakeFiles(wrong)));
  await settle();
  await click(button('Open a data file') as HTMLButtonElement);
  await settle(100);
  assert.ok(text().indexOf('"notes.json" is not an IT Management Hub data file.') > -1, 'a clear message, and the app stays on the start screen');
  assert.equal(text().indexOf('Management dashboard'), -1);
  await unmount();
};

const testBrowserWithoutFileAccess = async (): Promise<void> => {
  window.localStorage.setItem('itsdm.settings', JSON.stringify({ name: '', email: 'me@x.com', language: 'en' }));
  await mount(render(fakeFiles(undefined, false)));
  await settle();
  assert.ok(text().indexOf('This browser cannot open files directly') > -1);
  assert.equal(button('Open a data file'), undefined, 'the file buttons are hidden');
  assert.equal(button('Create a new data file'), undefined);
  assert.ok(button('Try it with sample data (nothing is saved)'), 'the demo and the backup copy are still there');
  assert.ok(text().indexOf('Open a backup copy (.json)') > -1);
  await unmount();
};

const run = async (): Promise<void> => {
  await testStartScreenAndDemo();
  await testSpanish();
  await testCreateAndResume();
  await testOpenWrongFile();
  await testBrowserWithoutFileAccess();
  console.log('standalone app tests passed');
  process.exit(0);
};

run().catch(error => {
  console.error(error);
  process.exit(1);
});
