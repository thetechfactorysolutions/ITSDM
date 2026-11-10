import { dayKeyFromValue, fromDayKey, toDayKey } from './dates';

/**
 * How things look in the tables and charts: an emoji and a colour for a status, a priority or a due
 * date, initials for a person, weekly buckets for the activity chart. Pure, so it is tested without a
 * screen; the components only draw what this says.
 */

export type LookTone = 'good' | 'info' | 'warning' | 'danger' | 'neutral';

export interface ILook {
  emoji: string;
  tone: LookTone;
}

const STATUS_LOOKS: Record<string, ILook> = {
  NEW: { emoji: '🆕', tone: 'info' },
  INBOX: { emoji: '📥', tone: 'info' },
  IDEA: { emoji: '💡', tone: 'info' },
  PROPOSED: { emoji: '📝', tone: 'info' },
  REQUESTED: { emoji: '🙋', tone: 'warning' },
  SUBMITTED: { emoji: '📨', tone: 'info' },
  OPEN: { emoji: '🟢', tone: 'info' },
  LOGGED: { emoji: '🗒️', tone: 'neutral' },
  PENDING: { emoji: '⏳', tone: 'warning' },
  WAITING: { emoji: '⏳', tone: 'warning' },
  FOLLOW_UP: { emoji: '🔔', tone: 'warning' },
  CONTACTED: { emoji: '📞', tone: 'info' },
  SCHEDULED: { emoji: '📅', tone: 'info' },
  IN_PROGRESS: { emoji: '🚧', tone: 'info' },
  IN_REVIEW: { emoji: '🔎', tone: 'warning' },
  UNDER_REVIEW: { emoji: '🔎', tone: 'warning' },
  REVIEWED: { emoji: '🔎', tone: 'good' },
  MITIGATING: { emoji: '🛡️', tone: 'warning' },
  BLOCKED: { emoji: '⛔', tone: 'danger' },
  ORDERED: { emoji: '🛒', tone: 'info' },
  COMMITTED: { emoji: '🤝', tone: 'info' },
  ACCEPTED: { emoji: '👍', tone: 'good' },
  APPROVED: { emoji: '✅', tone: 'good' },
  PUBLISHED: { emoji: '📣', tone: 'good' },
  DECIDED: { emoji: '⚖️', tone: 'good' },
  RECEIVED: { emoji: '📦', tone: 'good' },
  DELIVERED: { emoji: '📦', tone: 'good' },
  PAID: { emoji: '💶', tone: 'good' },
  RESOLVED: { emoji: '✔️', tone: 'good' },
  IMPLEMENTED: { emoji: '🚀', tone: 'good' },
  APPLIED: { emoji: '✔️', tone: 'good' },
  ACHIEVED: { emoji: '🏆', tone: 'good' },
  COMPLETED: { emoji: '🎉', tone: 'good' },
  DONE: { emoji: '🎉', tone: 'good' },
  CLOSED: { emoji: '🔒', tone: 'neutral' },
  RENEWED: { emoji: '🔁', tone: 'good' },
  NOT_REQUIRED: { emoji: '➖', tone: 'neutral' },
  ARCHIVED: { emoji: '🗄️', tone: 'neutral' },
  SUPERSEDED: { emoji: '🗄️', tone: 'neutral' },
  RETIRED: { emoji: '🪦', tone: 'neutral' },
  INACTIVE: { emoji: '💤', tone: 'neutral' },
  ACTIVE: { emoji: '🟢', tone: 'good' },
  EXPIRED: { emoji: '⌛', tone: 'danger' },
  TERMINATED: { emoji: '🛑', tone: 'danger' },
  REJECTED: { emoji: '❌', tone: 'danger' },
  CANCELLED: { emoji: '🚫', tone: 'neutral' },
  DISCARDED: { emoji: '🗑️', tone: 'neutral' }
};

export const statusLook = (status: string): ILook => STATUS_LOOKS[status] ?? { emoji: '▫️', tone: 'neutral' };

const PRIORITY_LOOKS: Record<string, ILook> = {
  CRITICAL: { emoji: '🔥', tone: 'danger' },
  HIGH: { emoji: '🟠', tone: 'warning' },
  MEDIUM: { emoji: '🟡', tone: 'info' },
  LOW: { emoji: '🟢', tone: 'good' }
};

/** Priority and severity share the same four levels; anything else is not decorated. */
export const priorityLook = (value: string): ILook | undefined => PRIORITY_LOOKS[value];

/** Fields where a screen writes the person in charge, and the dates by which things are due. */
export const OWNER_COLUMNS = ['ownerUpn', 'assignedTo', 'personUpn', 'requestedBy'];
export const DUE_COLUMNS = ['dueDate', 'targetDate', 'endDate', 'followUpDate', 'plannedDate', 'reviewDate', 'expectedOn'];

const dayNumber = (key: string): number | undefined => {
  const date = fromDayKey(key);
  return date ? Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000) : undefined;
};

/** Whole days from `from` to `to` (both YYYY-MM-DD); positive when `to` is later. */
export const daysBetween = (from: string, to: string): number | undefined => {
  const a = dayNumber(from);
  const b = dayNumber(to);
  return a === undefined || b === undefined ? undefined : b - a;
};

export type DueKind = 'late' | 'today' | 'soon' | 'later';

export interface IDueLook {
  kind: DueKind;
  /** Days left (negative when late). */
  days: number;
  emoji: string;
  tone: LookTone;
}

/** What to show next to a due date: late, today, in the coming week, or later. Closed items show nothing. */
export const dueLook = (value: string | undefined, closed: boolean, now: Date = new Date()): IDueLook | undefined => {
  const day = dayKeyFromValue(value ?? '');
  if (!day || closed) {
    return undefined;
  }
  const days = daysBetween(toDayKey(now), day);
  if (days === undefined) {
    return undefined;
  }
  if (days < 0) {
    return { kind: 'late', days, emoji: '🔥', tone: 'danger' };
  }
  if (days === 0) {
    return { kind: 'today', days, emoji: '⏰', tone: 'warning' };
  }
  if (days <= 7) {
    return { kind: 'soon', days, emoji: '📅', tone: 'info' };
  }
  return { kind: 'later', days, emoji: '🗓️', tone: 'neutral' };
};

/** Two letters for a round badge: "ana.lopez@x.com" → "AL", "Ana López" → "AL", "" → "?". */
export const initialsOf = (text: string): string => {
  const name = text.trim().split('@')[0];
  const parts = name.split(/[\s._-]+/).filter(p => p !== '');
  if (parts.length === 0) {
    return '?';
  }
  const letters = parts.length === 1 ? parts[0].slice(0, 2) : parts[0].charAt(0) + parts[1].charAt(0);
  return letters.toUpperCase();
};

/**
 * How many items were modified in each of the last `weeks` weeks, oldest first (the last number is the
 * current week, counted as the last 7 days). Items without a date, or older, are left out.
 */
export const weeklyActivity = (items: unknown[], weeks: number = 8, now: Date = new Date()): number[] => {
  const today = toDayKey(now);
  const buckets: number[] = [];
  for (let i = 0; i < weeks; i++) {
    buckets.push(0);
  }
  items.forEach(item => {
    const raw = (item as Record<string, unknown>).modified;
    const day = dayKeyFromValue(typeof raw === 'string' ? raw : '');
    const ago = day ? daysBetween(day, today) : undefined;
    if (ago !== undefined && ago >= 0) {
      const index = weeks - 1 - Math.floor(ago / 7);
      if (index >= 0) {
        buckets[index] += 1;
      }
    }
  });
  return buckets;
};

export interface ISlice {
  key: string;
  count: number;
  /** Share of the whole, 0 to 1. */
  share: number;
}

/** The share of each count over the total; zero counts are dropped. */
export const slicesOf = (counts: Array<{ key: string; count: number }>): ISlice[] => {
  const total = counts.reduce((sum, c) => sum + c.count, 0);
  return total === 0 ? [] : counts.filter(c => c.count > 0).map(c => ({ key: c.key, count: c.count, share: c.count / total }));
};
