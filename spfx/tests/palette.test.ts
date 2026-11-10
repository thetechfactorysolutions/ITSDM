import assert from 'node:assert/strict';
import { IPaletteEntry, searchEntries } from '../src/rules/palette';

const tab = (key: string, label: string): IPaletteEntry => ({ key: `tab:${key}`, label, kind: 'Tab', tab: key });
const rec = (key: string, label: string, kind: string, tabKey: string): IPaletteEntry => ({ key, label, kind, tab: tabKey, listName: `L_${tabKey}`, search: label });

const entries = [
  tab('vendors', 'Vendors'), tab('projects', 'Projects'), tab('purchases', 'Orders'),
  rec('r1', 'Lyreco', 'Vendor', 'vendors'), rec('r2', 'Bechtle orders', 'Vendor', 'vendors'), rec('r3', 'Helpdesk renewal project', 'Project', 'projects'),
  rec('r4', 'Cables Lyreco', 'Order', 'purchases')
];

assert.deepEqual(searchEntries(entries, '').map(e => e.key), ['tab:vendors', 'tab:projects', 'tab:purchases'], 'without text, the tabs');
assert.deepEqual(searchEntries(entries, 'lyr').map(e => e.key), ['r1', 'r4'], 'what starts with the text goes first');
assert.deepEqual(searchEntries(entries, 'LYRECO cab').map(e => e.key), ['r4'], 'every word must match, whatever the case');
assert.deepEqual(searchEntries(entries, 'vendor').map(e => e.key), ['tab:vendors', 'r1', 'r2'], 'the kind is searched too, and the tab goes first');
assert.deepEqual(searchEntries(entries, 'renewal').map(e => e.key), ['r3']);
assert.deepEqual(searchEntries(entries, 'zzz'), []);
assert.equal(searchEntries(entries, 'o', 2).length, 2, 'a limit');
assert.deepEqual(searchEntries([rec('a', 'Reunión de revisión', 'Note', 'notes')], 'revision').map(e => e.key), ['a'], 'accents are ignored');
assert.deepEqual(searchEntries(entries, 'order').map(e => e.key), ['tab:purchases', 'r2', 'r4'], 'a word inside the label counts');

console.log('palette tests passed');
