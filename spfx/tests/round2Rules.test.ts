import assert from 'node:assert/strict';
import { ActionItem, ActionPriority, ActionStatus, InitiativeStatus, ProjectStatus } from '../src/models';
import { parseCsv, csvToObjects, toCsv } from '../src/rules/csv';
import { applyView, DEFAULT_VIEW } from '../src/rules/tableView';
import {
  applyActionStatusEffects, getAllowedActionStatuses, getAllowedInitiativeStatuses, getAllowedProjectStatuses, isClosedStatus
} from '../src/rules/transitions';

const action = (o: Partial<ActionItem> = {}): ActionItem => ({
  actionId: 'A-1', title: 'T', description: '', status: ActionStatus.OPEN, priority: ActionPriority.LOW, ownerUpn: 'a@b.com', ...o
});

// ---------- transitions ----------
const testTransitions = (): void => {
  assert.deepEqual(getAllowedInitiativeStatuses(InitiativeStatus.DRAFT), [InitiativeStatus.DRAFT, InitiativeStatus.ACTIVE, InitiativeStatus.CANCELLED]);
  assert.equal(getAllowedInitiativeStatuses(InitiativeStatus.DRAFT).indexOf(InitiativeStatus.COMPLETED), -1, 'a draft cannot jump to completed');
  assert.ok(getAllowedInitiativeStatuses(InitiativeStatus.COMPLETED).indexOf(InitiativeStatus.ACTIVE) > -1, 'completed work can be reopened');
  assert.equal(getAllowedProjectStatuses(ProjectStatus.PLANNING).indexOf(ProjectStatus.COMPLETED), -1);
  assert.ok(getAllowedProjectStatuses(ProjectStatus.ACTIVE).indexOf(ProjectStatus.AT_RISK) > -1);
  assert.ok(getAllowedActionStatuses(ActionStatus.DONE).indexOf(ActionStatus.OPEN) > -1);
  assert.equal(getAllowedActionStatuses(ActionStatus.OPEN)[0], ActionStatus.OPEN, 'the current status is always first');
};

const testClosedStatuses = (): void => {
  for (const s of ['COMPLETED', 'CANCELLED', 'REJECTED', 'DONE', 'ARCHIVED']) {
    assert.equal(isClosedStatus(s), true, s);
  }
  for (const s of ['OPEN', 'ACTIVE', 'NEW', 'BLOCKED']) {
    assert.equal(isClosedStatus(s), false, s);
  }
};

const testCompletionDate = (): void => {
  const now = new Date(2026, 10, 8, 15);
  const done = applyActionStatusEffects(action({ status: ActionStatus.DONE }), ActionStatus.OPEN, now);
  assert.equal(done.completedDate, '2026-11-08');

  const kept = applyActionStatusEffects(action({ status: ActionStatus.DONE, completedDate: '2026-11-01' }), ActionStatus.OPEN, now);
  assert.equal(kept.completedDate, '2026-11-01', 'a date typed by the user is not overwritten');

  const reopened = applyActionStatusEffects(action({ status: ActionStatus.OPEN, completedDate: '2026-11-01' }), ActionStatus.DONE, now);
  assert.equal(reopened.completedDate, '', 'reopening clears the completion date');

  const untouched = action({ status: ActionStatus.IN_PROGRESS });
  assert.equal(applyActionStatusEffects(untouched, ActionStatus.OPEN, now), untouched, 'no change means the same object');
};

// ---------- table view ----------
interface IRow { id: number; title: string; status: string; owner: string; due?: string; amount: number }
const rows: IRow[] = [
  { id: 1, title: 'Migración de portátiles', status: 'ACTIVE', owner: 'ana@x.com', due: '2026-12-01', amount: 30 },
  { id: 2, title: 'Revisión de contrato', status: 'COMPLETED', owner: 'luis@x.com', due: '2026-10-01', amount: 5 },
  { id: 3, title: 'Plan de formación', status: 'ACTIVE', owner: 'ana@x.com', amount: 100 },
  { id: 4, title: 'Auditoría cancelada', status: 'CANCELLED', owner: 'luis@x.com', due: '2026-11-15', amount: 7 }
];
const run = (view: Partial<typeof DEFAULT_VIEW>): number[] =>
  applyView(rows, { ...DEFAULT_VIEW, ...view }, r => r.status, [r => r.title, r => r.owner],
    { title: r => r.title, due: r => r.due, amount: r => r.amount }).map(r => r.id);

const testClosedHiddenByDefault = (): void => {
  assert.deepEqual(run({}), [1, 3]);
  assert.deepEqual(run({ showClosed: true }), [1, 2, 3, 4]);
  assert.deepEqual(run({ status: 'COMPLETED' }), [2], 'choosing a closed status shows it without "show closed"');
};

const testSearch = (): void => {
  assert.deepEqual(run({ search: 'ana', showClosed: true }), [1, 3]);
  assert.deepEqual(run({ search: 'REVISION', showClosed: true }), [2], 'ignores case and accents');
  assert.deepEqual(run({ search: 'plan formacion' }), [3], 'every word must match');
  assert.deepEqual(run({ search: 'zzz' }), []);
};

const testSort = (): void => {
  assert.deepEqual(run({ showClosed: true, sortKey: 'amount' }), [2, 4, 1, 3]);
  assert.deepEqual(run({ showClosed: true, sortKey: 'amount', sortDescending: true }), [3, 1, 4, 2]);
  assert.deepEqual(run({ showClosed: true, sortKey: 'due' }), [2, 4, 1, 3], 'empty dates last when ascending');
  assert.deepEqual(run({ showClosed: true, sortKey: 'due', sortDescending: true }), [1, 4, 2, 3], 'empty dates still last when descending');
  assert.deepEqual(run({ showClosed: true, sortKey: 'title' }), [4, 1, 3, 2]);
  assert.deepEqual(run({ showClosed: true, sortKey: 'unknown' }), [1, 2, 3, 4], 'an unknown sort key keeps the order');
};

// ---------- csv ----------
const testCsvRoundTrip = (): void => {
  const cols = [
    { header: 'Title', value: (r: IRow) => r.title },
    { header: 'Notes', value: (r: IRow) => (r.id === 1 ? 'says "hi", ok\nsecond line' : '') }
  ];
  const text = toCsv(rows.slice(0, 2), cols);
  const parsed = parseCsv(text);
  assert.deepEqual(parsed[0], ['Title', 'Notes']);
  assert.equal(parsed[1][1], 'says "hi", ok\nsecond line');
  assert.equal(parsed.length, 3);
};

const testCsvFormulaInjection = (): void => {
  const text = toCsv([{ v: '=HYPERLINK("http://evil")' }, { v: '-5' }, { v: '+34 600' }], [{ header: 'V', value: (r: { v: string }) => r.v }]);
  const lines = text.split('\r\n');
  assert.ok(lines[1].indexOf("'=") > -1, 'a formula is neutralised');
  assert.equal(lines[2], '-5', 'a plain negative number is left alone');
  assert.ok(lines[3].indexOf("'+34") > -1, 'a text starting with + is neutralised');
};

const testCsvParsing = (): void => {
  assert.deepEqual(parseCsv('a;b\r\n1;2\r\n'), [['a', 'b'], ['1', '2']], 'semicolon from Spanish Excel');
  assert.deepEqual(parseCsv('﻿a,b\n1,2'), [['a', 'b'], ['1', '2']], 'BOM is dropped');
  assert.deepEqual(parseCsv('a,b\n\n1,2\n'), [['a', 'b'], ['1', '2']], 'blank lines are skipped');
  assert.deepEqual(csvToObjects(parseCsv('Title, Status\nHello ,OPEN')), [{ Title: 'Hello', Status: 'OPEN' }]);
  assert.deepEqual(csvToObjects([]), []);
};

testTransitions();
testClosedStatuses();
testCompletionDate();
testClosedHiddenByDefault();
testSearch();
testSort();
testCsvRoundTrip();
testCsvFormulaInjection();
testCsvParsing();
console.log('round2 rules tests passed');
