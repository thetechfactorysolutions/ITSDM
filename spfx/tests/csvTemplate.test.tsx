import './helpers/globals';
import assert from 'node:assert/strict';
import * as React from 'react';
import Actions from '../src/components/Actions/Actions';
import { parseCsv, toCsv } from '../src/rules/csv';
import { click, mount, settle, unmount } from './helpers/dom';
import { jsdomWindow } from './helpers/globals';
import { button, newRec, renderWith } from './helpers/hub';

/** The import panel offers a ready-to-fill file: the column names of the screen and one example row. */

let captured: Blob | undefined;
let downloadedAs = '';
const urlApi = URL as unknown as { createObjectURL: (blob: Blob) => string; revokeObjectURL: (url: string) => void };
urlApi.createObjectURL = (blob: Blob): string => { captured = blob; return 'blob:test'; };
urlApi.revokeObjectURL = (): void => undefined;
(jsdomWindow.HTMLAnchorElement.prototype as unknown as { click: () => void }).click = function click(this: HTMLAnchorElement): void { downloadedAs = this.download; };

const downloadTemplate = async (language: 'en' | 'es'): Promise<string> => {
  captured = undefined;
  await mount(renderWith(React.createElement(Actions), {}, newRec(), language));
  await settle();
  await click(button(language === 'en' ? 'Import CSV' : 'Importar CSV') as HTMLButtonElement);
  await settle();
  await click(button(language === 'en' ? 'Download a template' : 'Descargar una plantilla') as HTMLButtonElement);
  await settle();
  assert.ok(captured, 'a file was offered');
  const bytes = new Uint8Array(await (captured as Blob).arrayBuffer());
  assert.deepEqual(Array.from(bytes.slice(0, 3)), [0xef, 0xbb, 0xbf], 'a byte order mark so Excel reads accents');
  const text = await (captured as Blob).text();
  await unmount();
  return text;
};

const testSeparator = (): void => {
  const columns = [{ header: 'A', value: (x: { a: string }) => x.a }, { header: 'B', value: (x: { a: string }) => x.a }];
  assert.equal(toCsv([{ a: 'x' }], columns), 'A,B\r\nx,x');
  assert.equal(toCsv([{ a: 'x' }], columns, ';'), 'A;B\r\nx;x');
  assert.equal(toCsv([{ a: 'a;b' }], columns, ';'), 'A;B\r\n"a;b";"a;b"', 'a cell with the separator is quoted');
  assert.deepEqual(parseCsv(toCsv([{ a: 'a,b' }], columns, ';')), [['A', 'B'], ['a,b', 'a,b']], 'what is written with ; is read back');
};

const run = async (): Promise<void> => {
  testSeparator();

  const english = await downloadTemplate('en');
  assert.equal(downloadedAs, 'template-actions.csv');
  const rowsEn = parseCsv(english);
  assert.equal(rowsEn.length, 2, 'the column names and one example row');
  assert.deepEqual(rowsEn[0].slice(0, 3), ['Title', 'ActionId', 'InitiativeId'], 'the same column names the import expects');
  assert.ok(rowsEn[0].indexOf('Status') > -1 && rowsEn[0].indexOf('DueDate') > -1);
  const status = rowsEn[1][rowsEn[0].indexOf('Status')];
  assert.equal(status, 'OPEN', 'the example row shows the code to use');
  assert.ok(rowsEn[1][rowsEn[0].indexOf('ActionId')].indexOf('ACT-') === 0, 'with a generated id');
  assert.equal(rowsEn[1][rowsEn[0].indexOf('OwnerUPN')], 'me@x.com', 'and the person importing as the owner');

  const spanish = await downloadTemplate('es');
  const first = spanish.replace(String.fromCharCode(0xfeff), '').split(/\r?\n/)[0];
  assert.ok(first.indexOf(';') > -1 && first.indexOf(',') === -1, 'in Spanish the columns are separated by ; so Excel opens them in columns');
  assert.deepEqual(parseCsv(spanish)[0], rowsEn[0], 'and they read back as the same columns');

  console.log('csv template tests passed');
  process.exit(0);
};

run().catch(error => {
  console.error(error);
  process.exit(1);
});
