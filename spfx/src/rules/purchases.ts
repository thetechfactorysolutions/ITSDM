import { AppConfig } from '../config/AppConfig';
import { Purchase, PurchaseOrder, PurchaseRoleEntry, PurchaseRoleType, PurchaseStatus, PoStatus } from '../models';
import { dayKeyFromValue, toDayKey } from './dates';

/** Rules for purchase requests, purchase orders and who may do what. Pure, so they are tested without a screen. */

const round2 = (value: number): number => Math.round(value * 100) / 100;

const same = (a: string | undefined, b: string | undefined): boolean => (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase();

// ----- roles -----

/**
 * The role of a person. While nobody is an approver yet, everybody is (the case of one person using
 * the app); once one approver is recorded the list decides, and anyone not in it is a requester.
 */
export const roleOf = (email: string, roles: PurchaseRoleEntry[]): PurchaseRoleType => {
  if (!roles.some(r => r.role === PurchaseRoleType.APPROVER)) {
    return PurchaseRoleType.APPROVER;
  }
  const entry = roles.filter(r => same(r.userUpn, email))[0];
  return entry ? entry.role : PurchaseRoleType.REQUESTER;
};

export const isApprover = (role: PurchaseRoleType): boolean => role === PurchaseRoleType.APPROVER;
export const canCreatePurchase = (role: PurchaseRoleType): boolean => role !== PurchaseRoleType.VIEWER;
/** The requester sees only what they asked for; everybody else sees everything. */
export const canSeeAll = (role: PurchaseRoleType): boolean => role !== PurchaseRoleType.REQUESTER;
export const isOwnPurchase = (purchase: Purchase, email: string): boolean => same(purchase.requestedBy, email);

export const visiblePurchases = (items: Purchase[], email: string, role: PurchaseRoleType): Purchase[] =>
  canSeeAll(role) ? items : items.filter(p => isOwnPurchase(p, email));

/** Groups of fields: the request itself, the record of who asked and decided, and the follow-up of the order. */
export type FieldGroup = 'request' | 'record' | 'tracking';

export const editableGroups = (role: PurchaseRoleType, purchase: Purchase | undefined, email: string): FieldGroup[] => {
  if (role === PurchaseRoleType.VIEWER) {
    return [];
  }
  if (role === PurchaseRoleType.APPROVER) {
    return ['request', 'record', 'tracking'];
  }
  if (!purchase) {
    return ['request'];
  }
  if (role === PurchaseRoleType.BUYER) {
    return purchase.status === PurchaseStatus.APPROVED || purchase.status === PurchaseStatus.ORDERED ? ['tracking'] : [];
  }
  return purchase.status === PurchaseStatus.REQUESTED && isOwnPurchase(purchase, email) ? ['request'] : [];
};

export const canEditPurchase = (role: PurchaseRoleType, purchase: Purchase, email: string): boolean => editableGroups(role, purchase, email).length > 0;

export const canDeletePurchase = (role: PurchaseRoleType): boolean => isApprover(role);

/** The statuses a purchase may be set to, including the one it has. */
export const allowedStatuses = (role: PurchaseRoleType, purchase: Purchase | undefined, email: string): PurchaseStatus[] => {
  const current = purchase ? purchase.status : PurchaseStatus.REQUESTED;
  const stay = [current];
  if (role === PurchaseRoleType.VIEWER) {
    return stay;
  }
  const approver = isApprover(role);
  const buyer = role === PurchaseRoleType.BUYER;
  const own = !!purchase && isOwnPurchase(purchase, email);
  switch (current) {
    case PurchaseStatus.REQUESTED:
      if (approver) {
        return [PurchaseStatus.REQUESTED, PurchaseStatus.APPROVED, PurchaseStatus.REJECTED, PurchaseStatus.CANCELLED];
      }
      return own ? [PurchaseStatus.REQUESTED, PurchaseStatus.CANCELLED] : stay;
    case PurchaseStatus.APPROVED:
      if (approver) {
        return [PurchaseStatus.APPROVED, PurchaseStatus.ORDERED, PurchaseStatus.RECEIVED, PurchaseStatus.CANCELLED];
      }
      return buyer ? [PurchaseStatus.APPROVED, PurchaseStatus.ORDERED] : stay;
    case PurchaseStatus.ORDERED:
      if (approver) {
        return [PurchaseStatus.ORDERED, PurchaseStatus.APPROVED, PurchaseStatus.RECEIVED, PurchaseStatus.CANCELLED];
      }
      return buyer ? [PurchaseStatus.ORDERED, PurchaseStatus.RECEIVED] : stay;
    case PurchaseStatus.RECEIVED:
      return approver ? [PurchaseStatus.RECEIVED, PurchaseStatus.ORDERED] : stay;
    default:
      return approver ? [current, PurchaseStatus.REQUESTED] : stay;
  }
};

// ----- money -----

/** Quantity times unit price when there is a unit price; otherwise the amount that was written. */
export const purchaseAmount = (quantity: number, unitPrice: number, amount: number): number =>
  unitPrice > 0 ? round2(quantity * unitPrice) : round2(amount);

/** The statuses that use up the money of a purchase order. */
export const countsAgainstPo = (status: PurchaseStatus): boolean =>
  status === PurchaseStatus.APPROVED || status === PurchaseStatus.ORDERED || status === PurchaseStatus.RECEIVED;

export const sumAmount = (items: Purchase[]): number => round2(items.reduce((sum, p) => sum + p.amount, 0));

export type PoLevel = 'OK' | 'NEAR' | 'OVER';

export interface IPoFigures {
  amount: number;
  spent: number;
  /** Asked for with this PO but not yet approved. */
  pending: number;
  remaining: number;
  level: PoLevel;
}

export const poFigures = (po: PurchaseOrder, purchases: Purchase[]): IPoFigures => {
  const mine = purchases.filter(p => p.poNumber.trim() !== '' && same(p.poNumber, po.title));
  const spent = sumAmount(mine.filter(p => countsAgainstPo(p.status)));
  const pending = sumAmount(mine.filter(p => p.status === PurchaseStatus.REQUESTED));
  const level: PoLevel = po.amount <= 0 ? 'OK' : spent > po.amount ? 'OVER' : spent / po.amount >= AppConfig.purchases.nearRatio ? 'NEAR' : 'OK';
  return { amount: po.amount, spent, pending, remaining: round2(po.amount - spent), level };
};

export const isPoOpen = (po: PurchaseOrder): boolean => po.status === PoStatus.OPEN;

/** Open orders at or past their warning level (what to look at on the dashboard). */
export const posToWatch = (pos: PurchaseOrder[], purchases: Purchase[]): PurchaseOrder[] =>
  pos.filter(po => isPoOpen(po) && poFigures(po, purchases).level !== 'OK');

// ----- lists for the screens -----

export const requestsToApprove = (items: Purchase[]): Purchase[] => items.filter(p => p.status === PurchaseStatus.REQUESTED);

/** Approved or ordered, and not here yet. */
export const awaitingDelivery = (items: Purchase[]): Purchase[] =>
  items.filter(p => p.status === PurchaseStatus.APPROVED || p.status === PurchaseStatus.ORDERED);

/** The categories already used, without repeats and ignoring case, for the suggestions. */
export const categoriesUsed = (items: Purchase[]): string[] => {
  const seen: Record<string, string> = {};
  items.forEach(p => {
    const name = p.category.trim();
    if (name && !seen[name.toLowerCase()]) {
      seen[name.toLowerCase()] = name;
    }
  });
  return Object.keys(seen).map(k => seen[k]).sort((a, b) => a.localeCompare(b));
};

export interface IPurchaseFilter {
  poNumber?: string;
  from?: string;
  to?: string;
}

/** Filter by PO and by the day it was asked for (inclusive). */
export const filterPurchases = (items: Purchase[], filter: IPurchaseFilter): Purchase[] =>
  items.filter(p => {
    if (filter.poNumber && !same(p.poNumber, filter.poNumber)) {
      return false;
    }
    const day = p.requestedOn ?? '';
    if (filter.from && (!day || day < filter.from)) {
      return false;
    }
    return !(filter.to && (!day || day > filter.to));
  });

// ----- saving -----

/**
 * What changes together with the form: the amount, who asked and when, who decided and when, and the
 * day it was ordered or received (only when empty, so a date typed by hand is kept).
 */
export const applyPurchaseEffects = (form: Purchase, original: Purchase | undefined, email: string, now: Date = new Date()): Purchase => {
  const today = toDayKey(now);
  const next: Purchase = { ...form, amount: purchaseAmount(form.quantity, form.unitPrice, form.amount) };
  if (!original) {
    next.requestedBy = form.requestedBy.trim() || email;
    next.requestedOn = form.requestedOn || today;
  }
  const from = original ? original.status : undefined;
  if (next.status !== from) {
    if ((next.status === PurchaseStatus.APPROVED || next.status === PurchaseStatus.REJECTED) && from === PurchaseStatus.REQUESTED) {
      next.decisionBy = email;
      next.decisionDate = today;
    }
    if (next.status === PurchaseStatus.ORDERED && !next.orderedOn) {
      next.orderedOn = today;
    }
    if (next.status === PurchaseStatus.RECEIVED && !next.receivedOn) {
      next.receivedOn = today;
    }
  }
  return next;
};

/**
 * Stops a change the role may not make: a status it cannot set, or a field of a group it cannot edit.
 * Returns the translation key of the problem, or undefined. This hides nothing from SharePoint: it keeps the screen honest.
 */
export const purchaseChangeProblem = (form: Purchase, original: Purchase | undefined, role: PurchaseRoleType, email: string): string | undefined => {
  if (!original) {
    if (!canCreatePurchase(role)) {
      return 'purchase.cannotCreate';
    }
    return !isApprover(role) && form.status !== PurchaseStatus.REQUESTED ? 'purchase.statusNotAllowed' : undefined;
  }
  const groups = editableGroups(role, original, email);
  const touches = (fields: Array<keyof Purchase>): boolean => fields.some(f => String(form[f] ?? '') !== String(original[f] ?? ''));
  if (groups.indexOf('request') === -1 && touches(['title', 'quantity', 'unitPrice', 'amount', 'category', 'vendorId', 'reason'])) {
    return 'purchase.fieldsLocked';
  }
  if (groups.indexOf('record') === -1 && touches(['requestedBy', 'requestedOn', 'decisionNotes'])) {
    return 'purchase.fieldsLocked';
  }
  if (groups.indexOf('tracking') === -1 && touches(['poNumber', 'orderedOn', 'receivedOn', 'notes'])) {
    return 'purchase.fieldsLocked';
  }
  return form.status !== original.status && allowedStatuses(role, original, email).indexOf(form.status) === -1 ? 'purchase.statusNotAllowed' : undefined;
};

/** "Sí", "yes", "recibido"... → received; anything else with a value → ordered; an empty value → the default. */
export const importedPurchaseStatus = (value: string | undefined, fallback: PurchaseStatus): PurchaseStatus => {
  const raw = (value ?? '').trim().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (!raw) {
    return fallback;
  }
  if (raw === 'SI' || raw === 'YES' || raw === 'Y' || raw === 'TRUE' || raw === '1' || raw === 'RECIBIDO' || raw === 'RECEIVED') {
    return PurchaseStatus.RECEIVED;
  }
  if (raw === 'NO' || raw === 'N' || raw === 'FALSE' || raw === '0' || raw === 'PEDIDO') {
    return PurchaseStatus.ORDERED;
  }
  const known = (Object.keys(PurchaseStatus) as Array<keyof typeof PurchaseStatus>).map(k => PurchaseStatus[k]).filter(s => s === raw)[0];
  return known ?? fallback;
};

/**
 * A day from a spreadsheet: 2026-10-28, 28/10/2026, 28-10-2026 or "Wed, Oct 28, 2026". What cannot be read is
 * kept as it came, so the normal validation points at it in the preview.
 */
export const importedDay = (value: string | undefined): string => {
  const text = (value ?? '').trim();
  if (!text) {
    return '';
  }
  const dmy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(text);
  if (dmy) {
    const date = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
    return date.getDate() === Number(dmy[1]) && date.getMonth() === Number(dmy[2]) - 1 ? toDayKey(date) : text;
  }
  const iso = dayKeyFromValue(text);
  if (iso) {
    return iso;
  }
  const parsed = new Date(text);
  return isNaN(parsed.getTime()) ? text : toDayKey(parsed);
};
