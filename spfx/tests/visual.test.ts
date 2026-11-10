import assert from 'node:assert/strict';
import { dueLook, daysBetween, initialsOf, priorityLook, slicesOf, statusLook, weeklyActivity } from '../src/rules/visual';
import { CLOSED_STATUSES } from '../src/rules/transitions';

const NOW = new Date(2026, 10, 10);

const testLooks = (): void => {
  assert.equal(statusLook('APPROVED').tone, 'good');
  assert.equal(statusLook('BLOCKED').tone, 'danger');
  assert.equal(statusLook('IN_PROGRESS').emoji, '🚧');
  assert.deepEqual(statusLook('SOMETHING_NEW'), { emoji: '▫️', tone: 'neutral' }, 'unknown statuses still get a look');
  CLOSED_STATUSES.forEach(s => assert.notEqual(statusLook(s).emoji, '▫️', `${s} has its own emoji`));
  assert.equal(priorityLook('CRITICAL')?.tone, 'danger');
  assert.equal(priorityLook('LOW')?.tone, 'good');
  assert.equal(priorityLook('whatever'), undefined);
};

const testDue = (): void => {
  assert.equal(daysBetween('2026-11-10', '2026-11-13'), 3);
  assert.equal(daysBetween('2026-11-10', '2026-11-01'), -9);
  assert.equal(daysBetween('2026-10-31', '2026-11-01'), 1, 'across a month');
  assert.equal(daysBetween('x', '2026-11-01'), undefined);
  assert.deepEqual(dueLook('2026-11-08', false, NOW)?.kind, 'late');
  assert.equal(dueLook('2026-11-08', false, NOW)?.days, -2);
  assert.equal(dueLook('2026-11-10', false, NOW)?.kind, 'today');
  assert.equal(dueLook('2026-11-17', false, NOW)?.kind, 'soon');
  assert.equal(dueLook('2026-11-18', false, NOW)?.kind, 'later');
  assert.equal(dueLook('2026-11-01', true, NOW), undefined, 'a closed item is never late');
  assert.equal(dueLook('', false, NOW), undefined);
  assert.equal(dueLook(undefined, false, NOW), undefined);
  assert.equal(dueLook('2026-11-17T00:00:00Z', false, NOW)?.kind, 'soon', 'SharePoint dates work too');
};

const testInitials = (): void => {
  assert.equal(initialsOf('ana.lopez@x.com'), 'AL');
  assert.equal(initialsOf('Ana López'), 'AL');
  assert.equal(initialsOf('bob@x.com'), 'BO');
  assert.equal(initialsOf(''), '?');
  assert.equal(initialsOf('  '), '?');
};

const testActivity = (): void => {
  const items = [
    { modified: '2026-11-10T08:00:00Z' },
    { modified: '2026-11-04' },
    { modified: '2026-11-03' },
    { modified: '2026-10-20' },
    { modified: '2026-10-01' },
    { modified: '2025-01-01' },
    { modified: '2026-12-01' },
    { title: 'no date' }
  ];
  const weeks = weeklyActivity(items, 4, NOW);
  assert.equal(weeks.length, 4);
  assert.deepEqual(weeks, [1, 0, 1, 2], 'oldest first; the last number is the last 7 days; the future and the old are left out');
  assert.deepEqual(weeklyActivity([], 3, NOW), [0, 0, 0]);
};

const testSlices = (): void => {
  const slices = slicesOf([{ key: 'a', count: 3 }, { key: 'b', count: 1 }, { key: 'c', count: 0 }]);
  assert.deepEqual(slices.map(s => s.key), ['a', 'b'], 'zero counts are dropped');
  assert.equal(slices[0].share, 0.75);
  assert.deepEqual(slicesOf([{ key: 'a', count: 0 }]), []);
};

testLooks();
testDue();
testInitials();
testActivity();
testSlices();
console.log('visual tests passed');
