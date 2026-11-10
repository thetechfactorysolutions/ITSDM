import assert from 'node:assert/strict';
import { autoGroupFields, countBy, dueDateOfItem, hasDueDates, isMine, isOpenItem, isPastDue, ownerOfItem, recentlyUpdated, statusCounts, updatedWithin } from '../src/rules/insights';

const NOW = new Date(2026, 10, 10);

interface IRow { title: string; status: string; category?: string; ownerUpn?: string; dueDate?: string; vendorId?: string; modified?: string }
const row = (over: Partial<IRow>): IRow => ({ title: 't', status: 'OPEN', ...over });

const testOwners = (): void => {
  assert.equal(ownerOfItem({ ownerUpn: 'ana@x.com' }), 'ana@x.com');
  assert.equal(ownerOfItem({ assignedTo: 'bob@x.com' }), 'bob@x.com');
  assert.equal(ownerOfItem({ requestedBy: 'Luis' }), 'Luis');
  assert.equal(ownerOfItem({ title: 'x' }), '');
  assert.ok(isMine({ ownerUpn: 'ANA@x.com' }, 'ana@x.com'), 'case does not matter');
  assert.ok(!isMine({ ownerUpn: 'bob@x.com' }, 'ana@x.com'));
  assert.ok(!isMine({ title: 'no owner' }, ''), 'an item without owner is nobody\'s');
};

const testDates = (): void => {
  assert.equal(dueDateOfItem({ dueDate: '2026-11-01' }), '2026-11-01');
  assert.equal(dueDateOfItem({ targetDate: '2026-12-01T00:00:00Z' }), '2026-12-01');
  assert.equal(dueDateOfItem({ title: 'x' }), undefined);
  assert.ok(hasDueDates([{ title: 'a' }, { endDate: '2026-11-01' }]));
  assert.ok(!hasDueDates([{ title: 'a' }]));
  assert.ok(isPastDue({ dueDate: '2026-11-01' }, 'OPEN', NOW));
  assert.ok(!isPastDue({ dueDate: '2026-11-01' }, 'DONE', NOW), 'closed things are not late');
  assert.ok(!isPastDue({ dueDate: '2026-11-10' }, 'OPEN', NOW), 'today is not late');
  assert.ok(!isPastDue({ title: 'x' }, 'OPEN', NOW));
  assert.ok(isOpenItem('OPEN') && !isOpenItem('DONE') && !isOpenItem(''));
  assert.ok(updatedWithin({ modified: '2026-11-07T10:00:00Z' }, 7, NOW));
  assert.ok(!updatedWithin({ modified: '2026-10-01T10:00:00Z' }, 7, NOW));
  assert.ok(!updatedWithin({}, 7, NOW));
};

const testCounts = (): void => {
  const items = [row({ category: 'Cables' }), row({ category: 'Audio' }), row({ category: 'Cables' }), row({ category: ' ' }), row({ category: 'Cables' }), row({ category: 'Audio' })];
  assert.deepEqual(countBy(items, i => i.category), [{ key: 'Cables', count: 3 }, { key: 'Audio', count: 2 }], 'most frequent first, blanks left out');
  assert.equal(countBy(items, i => i.category, 1).length, 1);
  assert.deepEqual(countBy([{ tags: ['a', 'b'] }, { tags: ['a'] }], i => i.tags), [{ key: 'a', count: 2 }, { key: 'b', count: 1 }], 'a list of values counts each');
  assert.deepEqual(countBy([row({ category: 'B' }), row({ category: 'A' })], i => i.category), [{ key: 'A', count: 1 }, { key: 'B', count: 1 }], 'ties alphabetical');

  const rows = [row({ status: 'DONE' }), row({ status: 'OPEN' }), row({ status: 'OPEN' })];
  assert.deepEqual(statusCounts(rows, r => r.status, ['OPEN', 'BLOCKED', 'DONE']), [{ key: 'OPEN', count: 2 }, { key: 'DONE', count: 1 }], 'in the screen\'s order, without the empty ones');
};

const testAutoGroups = (): void => {
  const items = [
    row({ category: 'Cables', ownerUpn: 'a@x.com', vendorId: 'V1' }), row({ category: 'Cables', ownerUpn: 'b@x.com', vendorId: 'V2' }),
    row({ category: 'Audio', ownerUpn: 'c@x.com', vendorId: 'V3' }), row({ category: 'Audio', ownerUpn: 'd@x.com', vendorId: 'V4' })
  ];
  assert.deepEqual(autoGroupFields(items), ['category'], 'owners and vendors are all different: no chart for them');
  assert.deepEqual(autoGroupFields(items.slice(0, 3)), [], 'too few items for a chart');
  const more = items.concat([row({ category: 'Cables', ownerUpn: 'a@x.com', vendorId: 'V1' })]);
  assert.deepEqual(autoGroupFields(more, 2), ['category', 'vendorId'], 'at most two, in the usual order');
  assert.deepEqual(autoGroupFields(more, 3), ['category', 'vendorId', 'ownerUpn']);
  assert.deepEqual(autoGroupFields([row({}), row({}), row({}), row({})]), [], 'nothing to split by');
  assert.deepEqual(autoGroupFields([row({ category: 'A' }), row({ category: 'A' }), row({ category: 'A' }), row({ category: 'A' })]), [], 'one value is not a chart');
};

const testRecent = (): void => {
  const items = [row({ title: 'old', modified: '2026-01-01T00:00:00Z' }), row({ title: 'new', modified: '2026-11-09T00:00:00Z' }), row({ title: 'none' }), row({ title: 'mid', modified: '2026-06-01T00:00:00Z' })];
  assert.deepEqual(recentlyUpdated(items, 2).map(i => i.title), ['new', 'mid']);
  assert.deepEqual(recentlyUpdated(items).map(i => i.title), ['new', 'mid', 'old'], 'items never modified are left out');
};

testOwners();
testDates();
testCounts();
testAutoGroups();
testRecent();
console.log('insights tests passed');
