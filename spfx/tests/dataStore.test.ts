import assert from 'node:assert/strict';
import { AppConfig } from '../src/config/AppConfig';
import {
  createConflictError, DocumentStore, emptyDatabase, IDatabase, IDocumentPersistence, IPersistenceSnapshot, isConflictError
} from '../src/data/DocumentStore';
import { FileHandlePersistence, MemoryPersistence } from '../src/data/persistence';
import { FakeFile } from './helpers/fakeFile';
import { databaseFromSeed, SeedRows } from '../src/data/seed';
import {
  mapAction, mapArticle, mapBudget, mapCapex, mapChange, mapContract, mapDecision, mapIdea, mapIncident, mapInitiative, mapInteraction, mapKpi, mapLesson,
  mapFavorite, mapPurchase, mapPurchaseOrder, mapPurchaseRole, mapArea, mapCatalog, mapEntitlement, mapLink, mapMatter, mapCase, mapGenius, mapNps, mapObjective, mapWeekly, mapServiceMonth, mapStock, mapMeeting, mapNote, mapOpex, mapProject, mapReview, mapRisk, mapSkill, mapTraining, mapVendor
} from '../src/components/shared/mappers';
import seedJson from '../src/standalone/seed.json';

const user = { email: 'me@x.com', displayName: 'Me' };
const fixed = (iso: string): (() => Date) => () => new Date(iso);

const testCrud = async (): Promise<void> => {
  const store = new DocumentStore(new MemoryPersistence(), { user, now: fixed('2026-11-09T10:00:00Z') });
  assert.deepEqual((await store.getItems('IT_04_Actions')).items, [], 'a list that was never written is empty');

  const first = await store.createItem<Record<string, unknown>>('IT_04_Actions', { Title: 'A', Status: 'OPEN', Skipped: undefined });
  const second = await store.createItem<Record<string, unknown>>('IT_04_Actions', { Title: 'B' });
  assert.equal(first.Id, 1);
  assert.equal(second.Id, 2, 'ids count up');
  assert.equal(first.ID, 1, 'both Id and ID, as SharePoint returns');
  assert.equal(first.Created, '2026-11-09T10:00:00.000Z');
  assert.deepEqual(first.Editor, { Title: 'Me' }, 'the editor is shaped like an expanded SharePoint field');
  assert.equal('Skipped' in first, false, 'undefined values are not stored');

  await store.updateItem('IT_04_Actions', 1, { Status: 'DONE', Title: null });
  const updated = await store.getItem<Record<string, unknown>>('IT_04_Actions', 1);
  assert.equal(updated.Status, 'DONE');
  assert.equal(updated.Title, null, 'null clears a value, like SharePoint');
  assert.equal(updated.Id, 1, 'the id cannot be changed by a payload');

  await store.deleteItem('IT_04_Actions', 1);
  const rest = (await store.getItems<Record<string, unknown>>('IT_04_Actions')).items;
  assert.deepEqual(rest.map(i => i.Id), [2]);
  const third = await store.createItem<Record<string, unknown>>('IT_04_Actions', { Title: 'C' });
  assert.equal(third.Id, 3, 'a deleted id is never reused');

  await assert.rejects(() => store.updateItem('IT_04_Actions', 99, {}), /was not found/);
  await assert.rejects(() => store.deleteItem('IT_04_Actions', 99), /was not found/);
  await assert.rejects(() => store.getItem('IT_04_Actions', 99), /was not found/);
  await assert.rejects(() => store.getItems('IT_04_Actions', { filter: "Status eq 'OPEN'" }), /does not support filter/);

  // what comes back is a copy: changing it does not change the stored data
  const copy = (await store.getItems<Record<string, unknown>>('IT_04_Actions')).items;
  copy[0].Title = 'tampered';
  assert.equal((await store.getItem<Record<string, unknown>>('IT_04_Actions', 2)).Title, 'B');
};

const testQuery = async (): Promise<void> => {
  const store = new DocumentStore(new MemoryPersistence(), { user });
  for (const n of [3, 1, 2, 5, 4]) {
    await store.createItem('L', { Title: `T${n}`, N: n });
  }
  const sorted = await store.getItems<Record<string, unknown>>('L', { orderBy: { field: 'N' } });
  assert.deepEqual(sorted.items.map(i => i.N), [1, 2, 3, 4, 5]);
  const desc = await store.getItems<Record<string, unknown>>('L', { orderBy: { field: 'N', ascending: false }, top: 2 });
  assert.deepEqual(desc.items.map(i => i.N), [5, 4]);
  assert.equal(desc.hasNext, true);
  const page = await store.getItems<Record<string, unknown>>('L', { orderBy: { field: 'N' }, skip: 4, top: 2 });
  assert.deepEqual(page.items.map(i => i.N), [5]);
  assert.equal(page.hasNext, false);
};

const testTwoWindows = async (): Promise<void> => {
  // two stores on the same document, like two tabs: each sees the other's changes and ids never clash
  const shared = new MemoryPersistence();
  const a = new DocumentStore(shared, { user });
  const b = new DocumentStore(shared, { user: { email: 'you@x.com', displayName: 'You' } });
  assert.deepEqual((await b.getItems('L')).items, []);

  const fromA = await a.createItem<Record<string, unknown>>('L', { Title: 'from A' });
  const fromB = await b.createItem<Record<string, unknown>>('L', { Title: 'from B' });
  assert.equal(fromA.Id, 1);
  assert.equal(fromB.Id, 2, 'B built on top of what A saved instead of overwriting it');
  assert.deepEqual((await a.getItems<Record<string, unknown>>('L')).items.map(i => i.Title), ['from A', 'from B'], 'A reads B\'s change');
  assert.deepEqual((await b.getItem<Record<string, unknown>>('L', 2)).Editor, { Title: 'You' });
};

/** A persistence that lets somebody else save right before this one does. */
class RacingPersistence implements IDocumentPersistence {
  public saves = 0;
  public constructor(private readonly _inner: MemoryPersistence, private readonly _raceTimes: number) {}
  public stat(): Promise<string> { return this._inner.stat(); }
  public load(): Promise<IPersistenceSnapshot> { return this._inner.load(); }
  public async save(database: IDatabase, expectedVersion: string): Promise<string> {
    this.saves++;
    if (this.saves <= this._raceTimes) {
      const other = (await this._inner.load()).database;
      other.lists.OTHER = { nextId: 2, items: [{ Id: 1, Title: 'somebody else' }] };
      this._inner.writeExternally(other);
    }
    return this._inner.save(database, expectedVersion);
  }
}

const testConflicts = async (): Promise<void> => {
  const inner = new MemoryPersistence();
  const racing = new RacingPersistence(inner, 1);
  const store = new DocumentStore(racing, { user });
  await store.createItem('L', { Title: 'mine' });
  assert.equal(racing.saves, 2, 'the first save lost the race and was repeated on the new document');
  const after = (await inner.load()).database;
  assert.equal(after.lists.L.items.length, 1, 'my item is saved');
  assert.equal(after.lists.OTHER.items.length, 1, 'and the other change was not overwritten');

  const always = new DocumentStore(new RacingPersistence(new MemoryPersistence(), 99), { user, maxAttempts: 3 });
  await assert.rejects(() => always.createItem('L', { Title: 'never' }), /keeps changing/);

  const failing: IDocumentPersistence = {
    stat: async () => '1',
    load: async () => ({ database: emptyDatabase(), version: '1' }),
    save: async () => { throw new Error('disk full'); }
  };
  await assert.rejects(() => new DocumentStore(failing, { user }).createItem('L', {}), /disk full/, 'other failures are not retried or hidden');

  assert.equal(isConflictError(createConflictError('x')), true);
  assert.equal(isConflictError(new Error('x')), false);
};

const testFilePersistence = async (): Promise<void> => {
  const file = new FakeFile();
  const store = new DocumentStore(new FileHandlePersistence(file), { user, now: fixed('2026-11-09T10:00:00Z') });

  // an empty file is a new, empty database
  assert.deepEqual((await store.getItems('IT_04_Actions')).items, []);
  await store.createItem('IT_04_Actions', { Title: 'In a file' });
  const saved = JSON.parse(file.text) as IDatabase;
  assert.equal(saved.format, 1);
  assert.equal(saved.lists.IT_04_Actions.items[0].Title, 'In a file');
  assert.equal(file.modified, 1001, 'written once');

  // a second app instance reading the same file sees the data
  const reopened = new DocumentStore(new FileHandlePersistence(file), { user });
  assert.equal((await reopened.getItems<Record<string, unknown>>('IT_04_Actions')).items[0].Title, 'In a file');

  // somebody (OneDrive sync, another window) changes the file between our read and our save
  const persistence = new FileHandlePersistence(file);
  const snapshot = await persistence.load();
  file.modified++;
  await assert.rejects(() => persistence.save(snapshot.database, snapshot.version), (e: unknown) => isConflictError(e));

  // a failed write leaves the old content and reports the error
  const before = file.text;
  file.failNextWrite = true;
  await assert.rejects(() => store.createItem('IT_04_Actions', { Title: 'lost' }), /disk full/);
  assert.equal(file.text, before, 'the file was not left half written');

  // files that are not ours are refused with a clear message
  file.text = 'not json';
  await assert.rejects(() => new FileHandlePersistence(file).load(), /is not a valid data file/);
  file.text = '{"hello":1}';
  await assert.rejects(() => new FileHandlePersistence(file).load(), /is not an IT Management Hub data file/);
};

const testPeopleSearch = async (): Promise<void> => {
  const store = new DocumentStore(new MemoryPersistence(), { user });
  await store.createItem('IT_04_Actions', { Title: 'a', OwnerUPN: 'ana@x.com' });
  await store.createItem('IT_13_Incidents', { Title: 'b', AssignedTo: 'luis@x.com', ReportedBy: 'ana@x.com' });
  await store.createItem('IT_04_Actions', { Title: 'c', Description: 'not-a-person@x.com' });
  assert.deepEqual(await store.searchUsers(''), []);
  assert.deepEqual((await store.searchUsers('a')).map(u => u.email), ['ana@x.com'], 'only people columns count, without repeats');
  assert.deepEqual((await store.searchUsers('x.com')).map(u => u.email), ['ana@x.com', 'luis@x.com', 'me@x.com'], 'the user themself is offered too');
  assert.deepEqual((await store.searchUsers('new.person@y.com')).map(u => u.email), ['new.person@y.com'], 'a typed email is offered as it is');
  assert.equal((await store.searchUsers('x.com', 2)).length, 2, 'limited');
  assert.equal(store.capabilities.versioning, false);
  assert.equal(store.capabilities.userSearch, 'known');
};

const testSeed = async (): Promise<void> => {
  const seed = seedJson as SeedRows;
  const names = Object.keys(AppConfig.sharePoint.listNames).map(k => (AppConfig.sharePoint.listNames as unknown as Record<string, string>)[k]);
  assert.deepEqual(Object.keys(seed).sort(), names.sort(), 'the seed has every list the app uses');

  const database = databaseFromSeed(seed, { email: 'me@x.com', displayName: 'Me' }, new Date(2026, 10, 9, 15));
  const actions = database.lists.IT_04_Actions.items;
  assert.equal(actions[0].Id, 1);
  assert.equal(actions[0].OwnerUPN, 'me@x.com', 'the sample owner is the person using the app');
  assert.equal(actions[0].DueDate, '2026-11-04T12:00:00Z', 'five days before the 9th, at noon UTC (the day is what matters)');
  assert.equal(database.lists.IT_04_Actions.nextId, actions.length + 1);
  const stale = JSON.stringify(database).indexOf('@day:');
  assert.equal(stale, -1, 'no date marker is left');
  assert.equal(JSON.stringify(database).indexOf('demo.owner@example.com'), -1);

  // the sample data is read by the same mappers as the SharePoint rows: every row maps and keeps its title
  const mappers: Record<string, (r: Record<string, unknown>) => { title: string }> = {
    IT_01_Ideas: mapIdea, IT_02_Initiatives: mapInitiative, IT_03_Projects: mapProject, IT_04_Actions: mapAction, IT_05_KPIs: mapKpi, IT_06_Budgets: mapBudget,
    IT_07_CAPEX: mapCapex, IT_08_OPEX: mapOpex, IT_09_Vendors: mapVendor, IT_10_Contracts: mapContract, IT_11_Risks: mapRisk, IT_12_Decisions: mapDecision,
    IT_13_Incidents: mapIncident, IT_14_Interactions: mapInteraction, IT_15_ChangeRequests: mapChange, IT_16_TeamSkills: mapSkill, IT_17_TrainingPlans: mapTraining,
    IT_18_KnowledgeBase: mapArticle, IT_19_Reviews: mapReview, IT_20_LessonsLearned: mapLesson, IT_21_Meetings: mapMeeting, IT_22_Notes: mapNote,
    IT_23_Matters: mapMatter, IT_24_Areas: mapArea, IT_25_Links: mapLink, IT_26_Entitlements: mapEntitlement,
    IT_27_NpsResponses: mapNps, IT_28_ServiceMonths: mapServiceMonth, IT_29_Catalog: mapCatalog,
    IT_30_Stock: mapStock, IT_31_GeniusSessions: mapGenius,
    IT_32_Objectives: mapObjective, IT_33_BusinessCases: mapCase, IT_34_WeeklyReviews: mapWeekly,
    IT_35_PurchaseOrders: mapPurchaseOrder, IT_36_Purchases: mapPurchase, IT_37_PurchaseRoles: mapPurchaseRole, IT_38_Favorites: mapFavorite
  };
  assert.deepEqual(Object.keys(mappers).sort(), names.sort(), 'this test covers every list');
  for (const list of Object.keys(mappers)) {
    for (const item of database.lists[list].items) {
      const mapped = mappers[list](item);
      assert.equal(mapped.title, item.Title, `${list}: ${String(item.Title)} maps`);
      assert.equal((mapped as { id?: number }).id, item.Id);
    }
  }
};

const run = async (): Promise<void> => {
  await testCrud();
  await testQuery();
  await testTwoWindows();
  await testConflicts();
  await testFilePersistence();
  await testPeopleSearch();
  await testSeed();
  console.log('data store tests passed');
};

run().catch(error => {
  console.error(error);
  process.exit(1);
});
