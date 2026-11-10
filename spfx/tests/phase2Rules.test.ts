import assert from 'node:assert/strict';
import { planBulkStatus } from '../src/rules/bulk';
import { buildDigest, digestText, isWebhookUrl, mailtoLink, webhookPayload } from '../src/rules/digest';
import { cleanName, MAX_VIEWS, parseViews, removeView, saveView, toTableView } from '../src/rules/savedViews';
import { DEFAULT_VIEW } from '../src/rules/tableView';

// ---- saved views ----
{
  const view = { ...DEFAULT_VIEW, search: 'lyreco', status: 'OPEN', sortKey: 'due', sortDescending: true };
  assert.equal(cleanName('  My   late  '), 'My late');
  assert.equal(saveView([], '   ', view, undefined, 'a').error, 'empty');
  const one = saveView([], ' Mine ', view, 'late', 'v1');
  assert.deepEqual(one.views.map(v => [v.id, v.name, v.chipKey]), [['v1', 'Mine', 'late']]);
  const again = saveView(one.views, 'MINE', { ...view, search: 'other' }, undefined, 'v2');
  assert.equal(again.views.length, 1, 'the same name updates the view');
  assert.equal(again.views[0].id, 'v1', 'and keeps its id');
  assert.equal(again.views[0].search, 'other');
  assert.equal(removeView(again.views, 'v1').length, 0);
  assert.deepEqual(toTableView(again.views[0]), { search: 'other', status: 'OPEN', showClosed: false, sortKey: 'due', sortDescending: true });
  let full = one.views;
  for (let i = 0; i < MAX_VIEWS; i++) { full = saveView(full, `n${i}`, view, undefined, `i${i}`).views; }
  assert.equal(full.length, MAX_VIEWS);
  assert.equal(saveView(full, 'one more', view, undefined, 'z').error, 'tooMany');
  assert.deepEqual(parseViews('nonsense'), []);
  assert.deepEqual(parseViews([{ id: 1, name: 'x' }, null, { id: 'a', name: '  ' }, { id: 'b', name: 'Ok', showClosed: true, junk: 1 }]), [{ id: 'b', name: 'Ok', search: '', status: '', showClosed: true, sortKey: undefined, sortDescending: false, chipKey: undefined }]);
}

// ---- bulk ----
{
  const items = [{ id: 1, s: 'OPEN' }, { id: 2, s: 'DONE' }, { id: 3, s: 'OPEN' }, { id: 4, s: 'OPEN' }];
  const plan = planBulkStatus(items, 'DONE', i => i.s, i => (i.id === 3 ? ['OPEN'] : undefined), i => i.id === 4);
  assert.deepEqual(plan.apply.map(i => i.id), [1]);
  assert.deepEqual(plan.skipped.map(s => [s.item.id, s.reason]), [[2, 'same'], [3, 'notAllowed'], [4, 'needsApproval']]);
}

// ---- digest ----
{
  const now = new Date(2026, 10, 10);
  const items = [
    { title: 'late one', status: 'OPEN', dueDate: '2026-11-05', ownerUpn: 'ana@x.com' },
    { title: 'today', status: 'OPEN', dueDate: '2026-11-10' },
    { title: 'soon', status: 'OPEN', dueDate: '2026-11-14' },
    { title: 'later', status: 'OPEN', dueDate: '2026-12-30' },
    { title: 'closed late', status: 'DONE', dueDate: '2026-11-01' },
    { title: 'no date', status: 'OPEN' }
  ];
  const digest = buildDigest([
    { key: 'a', title: 'Actions', tab: 'actions', items, getStatus: i => (i as { status: string }).status, getTitle: i => (i as { title: string }).title },
    { key: 'b', title: 'Empty', tab: 'x', items: [], getStatus: () => '', getTitle: () => '' }
  ], now);
  assert.deepEqual(digest.totals, { late: 1, today: 1, soon: 1 });
  assert.equal(digest.sections.length, 1, 'a list with nothing to say is left out');
  assert.equal(digest.sections[0].late[0].days, -5);
  const text = digestText(digest, { title: 'Digest', late: 'Late', today: 'Today', soon: 'This week', none: 'All clear' }, '10 Nov');
  assert.ok(text.indexOf('- Late: late one (2026-11-05, ana@x.com)') > -1);
  assert.ok(text.indexOf('- Today: today (2026-11-10)') > -1);
  assert.equal(text.indexOf('closed late'), -1);
  assert.ok(digestText({ sections: [], totals: { late: 0, today: 0, soon: 0 } }, { title: 'D', late: '', today: '', soon: '', none: 'All clear' }, 'x').indexOf('All clear') > -1);

  const link = mailtoLink('me@x.com', 'Hi & bye', 'line1\nline2');
  assert.ok(link.startsWith('mailto:me@x.com?subject=Hi%20%26%20bye&body=line1%0Aline2'));
  const long = mailtoLink('', 's', ('x'.repeat(100) + '\n').repeat(40));
  assert.ok(long.length < 2400, 'a long body is cut');
  assert.ok(decodeURIComponent(long).endsWith('…'));
  const payload = webhookPayload(digest, text, 'me@x.com', now);
  assert.equal(payload.late, 1);
  assert.equal((payload.sections as unknown[]).length, 1);
  assert.ok(isWebhookUrl('https://prod-12.westeurope.logic.azure.com/workflows/x'));
  assert.ok(!isWebhookUrl('http://x.com'));
  assert.ok(!isWebhookUrl('javascript:alert(1)'));
  assert.ok(!isWebhookUrl(''));
}
console.log('phase 2 rules tests passed');
