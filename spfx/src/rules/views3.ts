import { dueDateOfItem, isOpenItem, ownerOfItem, readField } from './insights';
import { toDayKey } from './dates';
import { isClosedStatus } from './transitions';
import { daysBetween } from './visual';

/**
 * Rules of the board (columns by status), the calendar (a month by due date), the workload by person and
 * the data-quality check. Pure, so they are tested without a screen.
 */

// ---------- board ----------

export interface IBoardColumn<T> {
  status: string;
  items: T[];
}

/**
 * One column per status, in the order the list defines them. Closed statuses only appear when they have
 * something to show; open ones always do, so there is a place to drop an item into.
 */
export const boardColumns = <T,>(items: T[], statuses: string[], statusOf: (item: T) => string): Array<IBoardColumn<T>> =>
  statuses
    .map(status => ({ status, items: items.filter(i => statusOf(i) === status) }))
    .filter(c => c.items.length > 0 || !isClosedStatus(c.status));

/** The statuses an item can be moved to from the board (not its own). */
export const moveTargets = (current: string, allowed: string[] | undefined, all: string[]): string[] =>
  (allowed ?? all).filter(s => s !== current);

// ---------- calendar ----------

export interface ICalendarDay {
  key: string;
  day: number;
  inMonth: boolean;
}

const pad2 = (n: number): string => (n < 10 ? `0${n}` : String(n));
const keyOf = (date: Date): string => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

/** The weeks of a month (Monday first), each with 7 days; days of the neighbouring months fill the first and last week. */
export const monthGrid = (year: number, month: number): ICalendarDay[][] => {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset);
  const weeks: ICalendarDay[][] = [];
  for (let w = 0; w < 6; w++) {
    const week: ICalendarDay[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d);
      week.push({ key: keyOf(date), day: date.getDate(), inMonth: date.getMonth() === month });
    }
    weeks.push(week);
  }
  // a sixth week that is all of the next month is not shown
  return weeks[5].every(day => !day.inMonth) ? weeks.slice(0, 5) : weeks;
};

export const shiftMonth = (year: number, month: number, delta: number): { year: number; month: number } => {
  const date = new Date(year, month + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
};

export const itemsByDay = <T,>(items: T[]): Record<string, T[]> => {
  const map: Record<string, T[]> = {};
  items.forEach(item => {
    const day = dueDateOfItem(item);
    if (day) {
      (map[day] = map[day] ?? []).push(item);
    }
  });
  return map;
};

// ---------- workload ----------

export interface ISourceItems {
  key: string;
  title: string;
  tab: string;
  items: unknown[];
  getStatus: (item: unknown) => string;
  getTitle: (item: unknown) => string;
}

export interface IWorkload {
  owner: string;
  open: number;
  late: number;
}

/** Open items per person across the lists, the busiest first. Items without a person are not counted. */
export const workloadByOwner = (sources: ISourceItems[], now: Date = new Date(), top: number = 8): IWorkload[] => {
  const today = toDayKey(now);
  const table: Record<string, IWorkload> = {};
  sources.forEach(source => {
    source.items.forEach(item => {
      const owner = ownerOfItem(item).toLowerCase();
      if (!owner || !isOpenItem(source.getStatus(item))) {
        return;
      }
      const row = (table[owner] = table[owner] ?? { owner, open: 0, late: 0 });
      row.open += 1;
      const due = dueDateOfItem(item);
      if (due && due < today) {
        row.late += 1;
      }
    });
  });
  return Object.keys(table).map(k => table[k]).sort((a, b) => b.open - a.open || b.late - a.late || a.owner.localeCompare(b.owner)).slice(0, top);
};

// ---------- data quality ----------

export type QualityKind = 'noOwner' | 'noDue' | 'duplicate' | 'stale';

export interface IQualityIssue {
  kind: QualityKind;
  source: string;
  title: string;
  tab: string;
  count: number;
  /** A few titles to start with. */
  examples: string[];
}

const STALE_DAYS = 90;
const EXAMPLES = 5;

/**
 * What is worth tidying: open records nobody owns (in lists that have owners), open records without a
 * date (in lists that have dates), titles that appear twice, and open records nobody touched for 90 days.
 */
export const dataQuality = (sources: ISourceItems[], now: Date = new Date()): IQualityIssue[] => {
  const today = toDayKey(now);
  const issues: IQualityIssue[] = [];
  sources.forEach(source => {
    const open = source.items.filter(i => isOpenItem(source.getStatus(i)));
    const push = (kind: QualityKind, found: unknown[]): void => {
      if (found.length > 0) {
        issues.push({ kind, source: source.key, title: source.title, tab: source.tab, count: found.length, examples: found.slice(0, EXAMPLES).map(source.getTitle) });
      }
    };
    if (source.items.some(i => ownerOfItem(i) !== '')) {
      push('noOwner', open.filter(i => ownerOfItem(i) === ''));
    }
    if (source.items.some(i => dueDateOfItem(i) !== undefined)) {
      push('noDue', open.filter(i => dueDateOfItem(i) === undefined));
    }
    const seen: Record<string, unknown[]> = {};
    source.items.forEach(i => {
      const t = source.getTitle(i).trim().toLowerCase();
      if (t) {
        (seen[t] = seen[t] ?? []).push(i);
      }
    });
    push('duplicate', Object.keys(seen).filter(k => seen[k].length > 1).map(k => seen[k][0]));
    push('stale', open.filter(i => {
      const raw = readField(i, 'modified');
      const day = raw ? raw.slice(0, 10) : '';
      const ago = day ? daysBetween(day, today) : undefined;
      return ago !== undefined && ago > STALE_DAYS;
    }));
  });
  return issues;
};
