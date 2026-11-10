import './helpers/globals';
import assert from 'node:assert/strict';
import * as React from 'react';
import BackupPanel from '../src/components/Help/BackupPanel';
import FileLinksSection from '../src/components/shared/FileLinksSection';
import { click, mount, settle, typeInto, unmount } from './helpers/dom';
import { button, newRec, renderWith, text } from './helpers/hub';

const LIST = 'IT_04_Actions';
const link = (id: number, title: string, listName: string, itemKey: string, url: string): Record<string, unknown> => ({ id, title, listName, itemKey, url });

const testSection = async (): Promise<void> => {
  const rec = newRec();
  const data = {
    fileLinks: [
      link(1, 'Offer Lyreco.pdf', LIST, '5', 'https://x-my.sharepoint.com/personal/ana/Documents/Offer%20Lyreco.pdf'),
      link(2, 'Other record.xlsx', LIST, '6', 'https://x-my.sharepoint.com/a/b.xlsx')
    ]
  };
  await mount(renderWith(React.createElement(FileLinksSection, { listName: LIST, itemId: 5 }), data, rec));
  await settle();
  assert.ok(text().indexOf('Linked files') > -1);
  assert.ok(text().indexOf('Offer Lyreco.pdf') > -1, 'the files of this record');
  assert.ok(text().indexOf('📕') > -1, 'with the emoji of their kind');
  assert.equal(text().indexOf('Other record.xlsx'), -1, 'and not the ones of other records');
  const anchor = document.body.querySelector('a[href^="https://x-my"]') as HTMLAnchorElement;
  assert.equal(anchor.getAttribute('target'), '_blank');
  assert.ok((anchor.getAttribute('rel') ?? '').indexOf('noopener') > -1, 'links open safely');

  const fields = Array.from(document.body.querySelectorAll('input')) as HTMLInputElement[];
  assert.equal(button('Link file')?.getAttribute('disabled') !== null, true, 'nothing to add yet');

  // a link that is not a web link is refused
  await typeInto(fields[0], 'javascript:alert(1)');
  await click(button('Link file') as HTMLButtonElement);
  await settle();
  assert.ok(text().indexOf('Paste a web link') > -1);
  assert.equal(rec.created.length, 0);

  // the same file twice is refused
  await typeInto(fields[0], 'https://x-my.sharepoint.com/personal/ana/Documents/Offer%20Lyreco.pdf/');
  await click(button('Link file') as HTMLButtonElement);
  await settle();
  assert.ok(text().indexOf('already linked') > -1);
  assert.equal(rec.created.length, 0);

  // a good one is saved with a name taken from the link
  await typeInto(fields[0], 'https://x-my.sharepoint.com/personal/ana/Documents/Budget%202027.xlsx');
  await click(button('Link file') as HTMLButtonElement);
  await settle();
  assert.deepEqual(rec.created, [{ Title: 'Budget 2027.xlsx', ListName: LIST, ItemKey: '5', Url: 'https://x-my.sharepoint.com/personal/ana/Documents/Budget%202027.xlsx' }]);
  await unmount();

  // a record that is not saved yet cannot have files
  await mount(renderWith(React.createElement(FileLinksSection, { listName: LIST, itemId: undefined }), data));
  await settle();
  assert.ok(text().indexOf('Save the record first') > -1);
  assert.equal(button('Link file'), undefined);
  await unmount();

  // Spanish
  await mount(renderWith(React.createElement(FileLinksSection, { listName: LIST, itemId: 5 }), data, newRec(), 'es'));
  await settle();
  assert.ok(text().indexOf('Archivos enlazados') > -1);
  await unmount();
};

const testBackupPanel = async (): Promise<void> => {
  await mount(renderWith(React.createElement(BackupPanel)));
  await settle();
  assert.ok(button('Download a full backup'), 'the copy can be downloaded');
  assert.ok(button('Restore from a backup file'), 'and a copy can be restored');
  assert.ok(text().indexOf('Not included') > -1, 'it says what the copy does not carry');
  await unmount();
};

const run = async (): Promise<void> => {
  await testSection();
  await testBackupPanel();
  console.log('file links screen tests passed');
  process.exit(0);
};

run().catch(error => {
  console.error(error);
  process.exit(1);
});
