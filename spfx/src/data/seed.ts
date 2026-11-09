import { addDays, dayKeyToSharePoint, toDayKey } from '../rules/dates';
import { emptyDatabase, IDatabase, IStoreUser } from './DocumentStore';

/**
 * Sample data for the local mode. It comes from the same source as the SharePoint sample rows
 * (scripts/generate-assets.js writes src/standalone/seed.json), with each date saved as an offset
 * from today ("@day:-5" is five days ago) and resolved when the data is created, so the samples
 * never age.
 */
export type SeedRows = Record<string, Array<Record<string, unknown>>>;

const DAY_MARKER = /^@day:(-?\d+)$/;
// The owner written in the sample rows (scripts/generate-assets.js). It becomes the person using the app.
const SAMPLE_OWNER = 'demo.owner@example.com';

const resolveValue = (value: unknown, today: string, owner: string): unknown => {
  if (typeof value !== 'string') {
    return value;
  }
  if (value === SAMPLE_OWNER) {
    return owner;
  }
  const match = DAY_MARKER.exec(value);
  return match ? dayKeyToSharePoint(addDays(today, Number(match[1]))) : value;
};

export const databaseFromSeed = (seed: SeedRows, user: IStoreUser, now: Date = new Date()): IDatabase => {
  const database = emptyDatabase();
  const today = toDayKey(now);
  const stamp = now.toISOString();

  Object.keys(seed).forEach(listName => {
    const items = seed[listName].map((row, index) => {
      const item: Record<string, unknown> = {};
      Object.keys(row).forEach(key => { item[key] = resolveValue(row[key], today, user.email); });
      const id = index + 1;
      return { ...item, Id: id, ID: id, Created: stamp, Modified: stamp, Author: { Title: user.displayName }, Editor: { Title: user.displayName } };
    });
    database.lists[listName] = { nextId: items.length + 1, items };
  });

  return database;
};
