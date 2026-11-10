import { dayKeyFromValue, toDayKey } from './dates';
import { isClosedStatus } from './transitions';

/**
 * What the summary strip of a list shows, worked out from the items already loaded. Pure, so it is
 * tested without a screen. The lists are different models, so the fields are read by name: the ones a
 * list does not have are simply not there.
 */

export interface IBar {
  key: string;
  count: number;
}

type Row = Record<string, unknown>;

export const readField = (item: unknown, field: string): string => {
  const value = (item as Row)[field];
  return typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : '';
};

/** Fields a list is split by, in the order they are looked at. */
export const GROUP_FIELDS = ['category', 'vendorId', 'ownerUpn', 'priority', 'severity', 'country', 'kind', 'areaId'];

/** Where the person in charge is written, depending on the list. */
const OWNER_FIELDS = ['ownerUpn', 'assignedTo', 'personUpn', 'requestedBy'];
const DUE_FIELDS = ['dueDate', 'targetDate', 'endDate', 'followUpDate', 'plannedDate', 'reviewDate', 'expectedOn'];

const same = (a: string, b: string): boolean => a.trim().toLowerCase() === b.trim().toLowerCase();

export const ownerOfItem = (item: unknown): string => {
  for (const field of OWNER_FIELDS) {
    const value = readField(item, field);
    if (value) {
      return value;
    }
  }
  return '';
};

export const isMine = (item: unknown, email: string): boolean => {
  const owner = ownerOfItem(item);
  return owner !== '' && same(owner, email);
};

export const dueDateOfItem = (item: unknown): string | undefined => {
  for (const field of DUE_FIELDS) {
    const day = dayKeyFromValue(readField(item, field));
    if (day) {
      return day;
    }
  }
  return undefined;
};

/** True when the list has a date by which things are due (decided by looking at its items). */
export const hasDueDates = (items: unknown[]): boolean => items.some(i => dueDateOfItem(i) !== undefined);

export const isPastDue = (item: unknown, status: string, now: Date = new Date()): boolean => {
  const due = dueDateOfItem(item);
  return !!due && due < toDayKey(now) && !isClosedStatus(status);
};

export const isOpenItem = (status: string): boolean => status !== '' && !isClosedStatus(status);

export const updatedWithin = (item: unknown, days: number, now: Date = new Date()): boolean => {
  const day = dayKeyFromValue(readField(item, 'modified'));
  if (!day) {
    return false;
  }
  const limit = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days);
  return day >= toDayKey(limit);
};

/** How many items per value, most frequent first; the empty value is not counted. Ties keep alphabetical order. */
export const countBy = <T,>(items: T[], by: (item: T) => string | string[] | undefined, top: number = 5): IBar[] => {
  const counts: Record<string, number> = {};
  items.forEach(item => {
    const value = by(item);
    (Array.isArray(value) ? value : [value]).forEach(v => {
      const key = (v ?? '').trim();
      if (key) {
        counts[key] = (counts[key] ?? 0) + 1;
      }
    });
  });
  return Object.keys(counts)
    .map(key => ({ key, count: counts[key] }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
    .slice(0, top);
};

/** The statuses that have items, in the order the screen lists them. */
export const statusCounts = <T,>(items: T[], getStatus: (item: T) => string, statuses: string[]): IBar[] =>
  statuses
    .map(key => ({ key, count: items.filter(i => getStatus(i) === key).length }))
    .filter(bar => bar.count > 0);

/**
 * The fields (from GROUP_FIELDS) worth a chart in this list: at least two different values and some
 * repetition, so a column where every value is different is left out. At most `max`, the most varied
 * first.
 */
export const autoGroupFields = (items: unknown[], max: number = 2): string[] => {
  if (items.length < 4) {
    return [];
  }
  const found = GROUP_FIELDS
    .map(field => {
      const bars = countBy(items, i => readField(i, field), 1000);
      const filled = bars.reduce((sum, b) => sum + b.count, 0);
      return { field, distinct: bars.length, repeated: bars.length > 0 && bars[0].count > 1, filled };
    })
    .filter(g => g.distinct >= 2 && g.repeated && g.filled >= items.length / 2);
  return found.slice(0, max).map(g => g.field);
};

/** The most recently modified items first. */
export const recentlyUpdated = <T,>(items: T[], count: number = 5): T[] =>
  items
    .filter(i => readField(i, 'modified') !== '')
    .sort((a, b) => readField(b, 'modified').localeCompare(readField(a, 'modified')))
    .slice(0, count);
