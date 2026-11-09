import { AppConfig } from '../config/AppConfig';
import { Area, AreaStatus, Entitlement, EntitlementStatus, LinkItem, LinkStatus, Matter, MatterStatus } from '../models';
import { dayKeyFromValue, toDayKey } from './dates';
import { daysBetween } from './finance';

/** Rules for matters (the inbox), areas, links and warranties and licences. Pure, so they are tested without a screen. */

// ---------------------------------------------------------------- matters

/** Classified and still being worked on. */
const WORKING: MatterStatus[] = [MatterStatus.OPEN, MatterStatus.IN_PROGRESS, MatterStatus.WAITING];

const MATTER_TRANSITIONS: Record<MatterStatus, MatterStatus[]> = {
  [MatterStatus.INBOX]: [MatterStatus.OPEN, MatterStatus.IN_PROGRESS, MatterStatus.WAITING, MatterStatus.DONE, MatterStatus.DISCARDED],
  [MatterStatus.OPEN]: [MatterStatus.IN_PROGRESS, MatterStatus.WAITING, MatterStatus.DONE, MatterStatus.DISCARDED],
  [MatterStatus.IN_PROGRESS]: [MatterStatus.OPEN, MatterStatus.WAITING, MatterStatus.DONE, MatterStatus.DISCARDED],
  [MatterStatus.WAITING]: [MatterStatus.OPEN, MatterStatus.IN_PROGRESS, MatterStatus.DONE, MatterStatus.DISCARDED],
  [MatterStatus.DONE]: [MatterStatus.OPEN],
  [MatterStatus.DISCARDED]: [MatterStatus.INBOX, MatterStatus.OPEN]
};

/** The current status plus every status it may move to. */
export const getAllowedMatterStatuses = (current: MatterStatus): MatterStatus[] => [current].concat(MATTER_TRANSITIONS[current]);

export const isInbox = (matter: Pick<Matter, 'status'>): boolean => matter.status === MatterStatus.INBOX;

/** Classified and not finished: the "open" view. The inbox is not counted here. */
export const isMatterOpen = (matter: Pick<Matter, 'status'>): boolean => WORKING.indexOf(matter.status) > -1;

/** Done or discarded: the history. */
export const isMatterClosed = (matter: Pick<Matter, 'status'>): boolean => matter.status === MatterStatus.DONE || matter.status === MatterStatus.DISCARDED;

/** An open matter whose due date has passed (the due day itself is still in time). */
export const isMatterOverdue = (matter: Matter, now: Date = new Date()): boolean => {
  const due = dayKeyFromValue(matter.dueDate);
  return isMatterOpen(matter) && !!due && due < toDayKey(now);
};

/** The day it entered the inbox: the day it was received, or else the day it was created. */
const arrivalDay = (matter: Matter): string | undefined => dayKeyFromValue(matter.receivedOn) ?? dayKeyFromValue(matter.created);

/** An inbox item that has waited longer than the allowed days without being classified. */
export const isInboxStale = (matter: Matter, now: Date = new Date(), staleDays: number = AppConfig.matters.inboxStaleDays): boolean => {
  const arrived = arrivalDay(matter);
  return isInbox(matter) && !!arrived && daysBetween(arrived, toDayKey(now)) > staleDays;
};

/** Days since the item arrived, or undefined when there is no date to count from. */
export const matterAgeDays = (matter: Matter, now: Date = new Date()): number | undefined => {
  const arrived = arrivalDay(matter);
  return arrived ? Math.max(0, daysBetween(arrived, toDayKey(now))) : undefined;
};

/** What a matter is without an area has to be: in the inbox. With an area it goes straight to open. */
export const statusForNewMatter = (areaId: string | undefined): MatterStatus => (areaId && areaId.trim() ? MatterStatus.OPEN : MatterStatus.INBOX);

/** The date it was closed (today) is filled in when a matter is done or discarded, and cleared when it is reopened. */
export const applyMatterEffects = (matter: Matter, previousStatus: MatterStatus | undefined, now: Date = new Date()): Matter => {
  const closed = isMatterClosed(matter);
  const wasClosed = previousStatus !== undefined && isMatterClosed({ status: previousStatus });
  if (closed && !wasClosed && !matter.closedOn) {
    return { ...matter, closedOn: toDayKey(now) };
  }
  if (!closed && wasClosed) {
    return { ...matter, closedOn: '' };
  }
  return matter;
};

// ---------------------------------------------------------------- areas

/** Active areas in the order the user set, then by name. Archived ones are kept for history but not offered. */
export const activeAreas = (areas: Area[]): Area[] => areas
  .filter(area => area.status === AreaStatus.ACTIVE)
  .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));

// ---------------------------------------------------------------- links

/** Only plain web addresses may be stored and opened: a `javascript:` or `data:` address would run code. */
export const isSafeUrl = (url: string): boolean => {
  const text = url.trim();
  if (!/^https?:\/\/[^\s/$.?#][^\s]*$/i.test(text)) {
    return false;
  }
  try {
    const parsed = new URL(text);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname.length > 0;
  } catch {
    return false;
  }
};

/** The categories already used, without repeats and sorted, to suggest them in the form. */
export const linkCategories = (links: LinkItem[]): string[] => {
  const seen: Record<string, boolean> = {};
  links.forEach(link => {
    const name = link.category.trim();
    if (name) {
      seen[name] = true;
    }
  });
  return Object.keys(seen).sort((a, b) => a.localeCompare(b));
};

export interface ILinkGroup {
  category: string;
  links: LinkItem[];
}

/** Active links grouped by category (those without one go last under `fallback`), pinned first inside each group. */
export const groupLinksByCategory = (links: LinkItem[], fallback: string): ILinkGroup[] => {
  const groups: Record<string, LinkItem[]> = {};
  links.filter(link => link.status === LinkStatus.ACTIVE).forEach(link => {
    const name = link.category.trim() || fallback;
    groups[name] = (groups[name] ?? []).concat(link);
  });
  return Object.keys(groups)
    .sort((a, b) => (a === fallback ? 1 : b === fallback ? -1 : a.localeCompare(b)))
    .map(category => ({
      category,
      links: groups[category].sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.title.localeCompare(b.title))
    }));
};

// ---------------------------------------------------------------- warranties and licences

const ENTITLEMENT_TRANSITIONS: Record<EntitlementStatus, EntitlementStatus[]> = {
  [EntitlementStatus.ACTIVE]: [EntitlementStatus.EXPIRED, EntitlementStatus.RENEWED, EntitlementStatus.CANCELLED],
  [EntitlementStatus.EXPIRED]: [EntitlementStatus.ACTIVE, EntitlementStatus.RENEWED, EntitlementStatus.CANCELLED],
  [EntitlementStatus.RENEWED]: [EntitlementStatus.ACTIVE],
  [EntitlementStatus.CANCELLED]: [EntitlementStatus.ACTIVE]
};

export const getAllowedEntitlementStatuses = (current: EntitlementStatus): EntitlementStatus[] => [current].concat(ENTITLEMENT_TRANSITIONS[current]);

export type EntitlementAlert = 'NONE' | 'RENEWAL' | 'LAPSED';

export interface IEntitlementInfo {
  alert: EntitlementAlert;
  /** Days until it ends; negative once it has. Undefined without an end date. */
  daysLeft: number | undefined;
}

/** Same criterion as contracts: only an active one is checked; lapsed when it ended and was never closed, renewal inside its notice period. */
export const entitlementAlert = (entitlement: Entitlement, now: Date = new Date()): IEntitlementInfo => {
  const end = dayKeyFromValue(entitlement.endDate);
  if (!end) {
    return { alert: 'NONE', daysLeft: undefined };
  }

  const daysLeft = daysBetween(toDayKey(now), end);
  if (entitlement.status !== EntitlementStatus.ACTIVE) {
    return { alert: 'NONE', daysLeft };
  }
  if (daysLeft < 0) {
    return { alert: 'LAPSED', daysLeft };
  }
  return { alert: daysLeft <= entitlement.noticeDays ? 'RENEWAL' : 'NONE', daysLeft };
};

export const needsEntitlementAttention = (entitlement: Entitlement, now: Date = new Date()): boolean => entitlementAlert(entitlement, now).alert !== 'NONE';

/**
 * The statuses a matter may be moved to from a table or a status picker. A matter without an
 * area cannot be moved into the classified states (that needs an area, chosen in the form).
 */
export const allowedMatterStatusesFor = (matter: Pick<Matter, 'status' | 'areaId'>): MatterStatus[] => {
  const allowed = getAllowedMatterStatuses(matter.status);
  if (matter.areaId && matter.areaId.trim()) {
    return allowed;
  }
  return allowed.filter(status => status === matter.status || status === MatterStatus.INBOX || status === MatterStatus.DONE || status === MatterStatus.DISCARDED);
};
