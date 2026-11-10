import assert from 'node:assert/strict';
import { boardColumns, dataQuality, itemsByDay, ISourceItems, monthGrid, moveTargets, shiftMonth, workloadByOwner } from '../src/rules/views3';

const NOW = new Date(2026, 10, 10);

// ---- board ----
{
  const items = [{ s: 'OPEN' }, { s: 'OPEN' }, { s: 'DONE' }];
  const cols = boardColumns(items, ['OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED'], i => i.s);
  assert.deepEqual(cols.map(c => [c.status, c.items.length]), [['OPEN', 2], ['IN_PROGRESS', 0], ['DONE', 1]], 'an open status is always a column; an empty closed one is not');
  assert.deepEqual(moveTargets('OPEN', ['OPEN', 'DONE'], ['A']), ['DONE']);
  assert.deepEqual(moveTargets('A', undefined, ['A', 'B']), ['B']);
}

// ---- calendar ----
{
  const weeks = monthGrid(2026, 10); // November 2026 starts on a Sunday
  assert.ok(weeks.length === 5 || weeks.length === 6);
  weeks.forEach(w => assert.equal(w.length, 7));
  assert.equal(weeks[0][0].key, '2026-10-26', 'the first week starts on the Monday before');
  assert.equal(weeks[0][6].key, '2026-11-01');
  assert.equal(weeks[0][6].inMonth, true);
  assert.equal(weeks[0][0].inMonth, false);
  const flat = weeks.reduce((all, w) => all.concat(w), []);
  assert.equal(flat.filter(d => d.inMonth).length, 30);
  assert.deepEqual(shiftMonth(2026, 11, 1), { year: 2027, month: 0 });
  assert.deepEqual(shiftMonth(2026, 0, -1), { year: 2025, month: 11 });
  const feb = monthGrid(2027, 1); // February 2027 starts on a Monday and has 28 days: exactly four weeks plus the fifth of March
  assert.ok(feb.length <= 5);
  const by = itemsByDay([{ dueDate: '2026-11-05' }, { dueDate: '2026-11-05T00:00:00Z' }, { title: 'none' }, { targetDate: '2026-11-06' }]);
  assert.equal(by['2026-11-05'].length, 2);
  assert.equal(by['2026-11-06'].length, 1);
}

// ---- workload and quality ----
{
  const src = (items: Array<Record<string, unknown>>): ISourceItems => ({ key: 'a', title: 'Actions', tab: 'actions', items, getStatus: i => String((i as { status: string }).status), getTitle: i => String((i as { title: string }).title) });
  const items = [
    { title: 'a1', status: 'OPEN', ownerUpn: 'Ana@x.com', dueDate: '2026-11-01', modified: '2026-11-09' },
    { title: 'a2', status: 'OPEN', ownerUpn: 'ana@x.com', dueDate: '2026-12-01', modified: '2026-11-09' },
    { title: 'b1', status: 'OPEN', ownerUpn: 'bob@x.com', modified: '2026-01-01' },
    { title: 'c1', status: 'DONE', ownerUpn: 'bob@x.com', dueDate: '2026-11-01' },
    { title: 'nobody', status: 'OPEN', dueDate: '2026-12-01', modified: '2026-11-09' },
    { title: 'A1', status: 'OPEN', ownerUpn: 'ana@x.com', dueDate: '2026-12-05', modified: '2026-11-09' }
  ];
  const load = workloadByOwner([src(items)], NOW);
  assert.deepEqual(load, [{ owner: 'ana@x.com', open: 3, late: 1 }, { owner: 'bob@x.com', open: 1, late: 0 }], 'case does not split a person; closed and ownerless are not counted');
  assert.equal(workloadByOwner([src(items)], NOW, 1).length, 1);

  const issues = dataQuality([src(items)], NOW);
  const of = (kind: string): { count: number; examples: string[] } | undefined => issues.filter(i => i.kind === kind)[0];
  assert.equal(of('noOwner')?.count, 1);
  assert.deepEqual(of('noOwner')?.examples, ['nobody']);
  assert.equal(of('noDue')?.count, 1, 'b1 has no date');
  assert.equal(of('duplicate')?.count, 1, 'a1 and A1');
  assert.equal(of('stale')?.count, 1, 'b1 was touched in January');
  assert.deepEqual(dataQuality([src([{ title: 'x', status: 'OPEN' }])], NOW), [], 'a list without owners or dates is not blamed for lacking them');
}

console.log('views3 tests passed');
