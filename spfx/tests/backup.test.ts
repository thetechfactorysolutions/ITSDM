import assert from 'node:assert/strict';
import { DocumentStore } from '../src/data/DocumentStore';
import { MemoryPersistence } from '../src/data/persistence';
import { databaseFromSeed, SeedRows } from '../src/data/seed';
import { countRecords, planFor, readEverything, restoreBackup } from '../src/data/backupRestore';
import { buildBackup, parseBackup, payloadFor, planRestore, restoreOrder } from '../src/rules/backup';
import { IListDef } from '../src/provisioning/fieldXml';
import listSchema from '../src/provisioning/listSchema.json';
import seedJson from '../src/standalone/seed.json';

const DEFS = listSchema as unknown as IListDef[];
const user = { email: 'me@x.com', displayName: 'Me' };
const ACTIONS = 'IT_04_Actions';
const VENDORS = 'IT_09_Vendors';

const testRules = (): void => {
  assert.equal(parseBackup('not json').errorKey, 'backup.errNotJson');
  assert.equal(parseBackup('{"a":1}').errorKey, 'backup.errShape');
  assert.equal(parseBackup('{"lists":{"X":{"items":"no"}}}').errorKey, 'backup.errShape');
  const ok = parseBackup('﻿{"format":1,"lists":{"IT_04_Actions":{"nextId":3,"items":[{"Id":1,"Title":"A"}]}}}');
  assert.ok(ok.backup, 'a BOM is tolerated');
  assert.equal(ok.backup?.lists[ACTIONS].items.length, 1);

  assert.deepEqual(restoreOrder(['IT_38_Favorites', 'IT_04_Actions', 'IT_39_FileLinks', 'IT_09_Vendors']), ['IT_04_Actions', 'IT_09_Vendors', 'IT_38_Favorites', 'IT_39_FileLinks'], 'pointers go last');

  const favDef = DEFS.filter(d => d.title === 'IT_38_Favorites')[0];
  const mapped = { [ACTIONS]: { '5': 2 } };
  assert.deepEqual(payloadFor(favDef, { Id: 1, Title: 'x', ListName: ACTIONS, ItemKey: '5', UserUPN: 'me@x.com' }, mapped), { Title: 'x', ListName: ACTIONS, ItemKey: '2', UserUPN: 'me@x.com' }, 'a favourite follows its record to the new id');
  assert.equal(payloadFor(favDef, { Id: 1, Title: 'x', ListName: ACTIONS, ItemKey: '9', UserUPN: 'me@x.com' }, mapped), undefined, 'a pointer to a record that was not restored is dropped');

  const actionsDef = DEFS.filter(d => d.title === ACTIONS)[0];
  const payload = payloadFor(actionsDef, { Id: 4, ID: 4, Title: 'T', Status: 'OPEN', DueDate: '', Editor: { Title: 'x' }, 'odata.etag': '1' }, {}) as Record<string, unknown>;
  assert.equal(payload.Title, 'T');
  assert.equal(payload.Status, 'OPEN');
  assert.equal('Id' in payload, false, 'ids are never written');
  assert.equal('Editor' in payload, false, 'system columns are not written');
  assert.equal('DueDate' in payload, false, 'an empty date is left out');

  const backup = buildBackup(DEFS, { [ACTIONS]: [{ Id: 7, Title: 'A', Junk: 1, 'odata.type': 'x', Modified: '2026-01-01T00:00:00Z' }] }, 'test');
  assert.equal(backup.lists[ACTIONS].nextId, 8);
  assert.deepEqual(backup.lists[ACTIONS].items[0], { Id: 7, Title: 'A', Modified: '2026-01-01T00:00:00Z' }, 'only what the app knows');
  assert.equal(Object.keys(backup.lists).length, DEFS.length, 'every list is in the copy, even the empty ones');

  const rows = planRestore(backup, DEFS, { [VENDORS]: 3 });
  assert.equal(rows.filter(r => r.title === ACTIONS)[0].action, 'restore');
  assert.equal(rows.filter(r => r.title === VENDORS)[0].action, 'nothing');
  const filled = planRestore({ ...backup, lists: { ...backup.lists, [VENDORS]: { nextId: 2, items: [{ Id: 1, Title: 'V' }] } } }, DEFS, { [VENDORS]: 3 });
  assert.equal(filled.filter(r => r.title === VENDORS)[0].action, 'skipFilled', 'a list with data is not filled again');
};

const testMigration = async (): Promise<void> => {
  // the old site: the sample data, with a hole in the ids and a star and a file on records that are not the first
  const source = new DocumentStore(new MemoryPersistence(databaseFromSeed(seedJson as unknown as SeedRows, user, new Date(2026, 10, 9))), { user });
  const before = (await source.getItems<Record<string, unknown>>(ACTIONS)).items;
  assert.ok(before.length >= 4);
  await source.deleteItem(ACTIONS, 1);
  const kept = (await source.getItems<Record<string, unknown>>(ACTIONS)).items;
  const third = kept[2];
  await source.createItem('IT_38_Favorites', { Title: String(third.Title), ListName: ACTIONS, ItemKey: String(third.Id), UserUPN: 'me@x.com' });
  await source.createItem('IT_39_FileLinks', { Title: 'Offer.pdf', ListName: ACTIONS, ItemKey: String(third.Id), Url: 'https://x-my.sharepoint.com/a/Offer.pdf' });
  await source.createItem('IT_38_Favorites', { Title: 'ghost', ListName: ACTIONS, ItemKey: '9999', UserUPN: 'me@x.com' });

  const { backup, unreadable } = await readEverything(source, DEFS, 'test');
  assert.equal(unreadable.length, 0);
  // the file survives a round trip through text
  const text = JSON.stringify(backup);
  const parsed = parseBackup(text).backup;
  assert.ok(parsed);

  // the new site: nothing in it
  const target = new DocumentStore(new MemoryPersistence(), { user });
  assert.equal((await planFor(target, parsed as typeof backup, DEFS)).filter(r => r.action === 'restore').length > 20, true);
  const progress: string[] = [];
  const result = await restoreBackup(target, parsed as typeof backup, DEFS, p => progress.push(p.list));
  assert.deepEqual(result.failed, []);
  assert.ok(progress.length > 20, 'progress is reported');
  assert.equal(result.dropped, 1, 'the star on a record that does not exist is dropped');

  const after = await countRecords(target, DEFS);
  const sourceCounts = await countRecords(source, DEFS);
  DEFS.forEach(def => {
    const expected = def.title === 'IT_38_Favorites' ? sourceCounts[def.title] - 1 : sourceCounts[def.title];
    assert.equal(after[def.title], expected, `${def.title} has what it had`);
  });

  // same records, same titles, in the same order; the ids start again from 1
  const moved = (await target.getItems<Record<string, unknown>>(ACTIONS)).items;
  assert.deepEqual(moved.map(i => i.Title), kept.map(i => i.Title));
  assert.deepEqual(moved.map(i => i.Id), kept.map((_, i) => i + 1), 'ids are the new site\'s own');
  const star = (await target.getItems<Record<string, unknown>>('IT_38_Favorites')).items[0];
  assert.equal(star.ItemKey, '3', 'the star points at the same record, by its new id');
  assert.equal(moved[Number(star.ItemKey) - 1].Title, third.Title);
  const file = (await target.getItems<Record<string, unknown>>('IT_39_FileLinks')).items[0];
  assert.equal(file.ItemKey, '3');
  assert.equal(file.Url, 'https://x-my.sharepoint.com/a/Offer.pdf');

  // restoring again changes nothing: no duplicates
  const again = await restoreBackup(target, parsed as typeof backup, DEFS);
  assert.equal(Object.keys(again.created).length, 0);
  assert.deepEqual(await countRecords(target, DEFS), after);

  // a list that fails is reported and the others still go
  const flaky = new DocumentStore(new MemoryPersistence(), { user });
  const realCreate = flaky.createItem.bind(flaky);
  (flaky as unknown as { createItem: typeof flaky.createItem }).createItem = (async (list: string, payload: Record<string, unknown>) => {
    if (list === VENDORS) {
      throw new Error('boom');
    }
    return realCreate(list, payload);
  }) as typeof flaky.createItem;
  const partial = await restoreBackup(flaky, parsed as typeof backup, DEFS);
  assert.deepEqual(partial.failed, [{ list: VENDORS, error: 'boom' }]);
  assert.ok((await countRecords(flaky, DEFS))[ACTIONS] > 0, 'the other lists were still copied');
};

const run = async (): Promise<void> => {
  testRules();
  await testMigration();
  console.log('backup tests passed');
};

run().catch(error => {
  console.error(error);
  process.exit(1);
});
