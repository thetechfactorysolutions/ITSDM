export enum EntitlementType {
  WARRANTY = 'WARRANTY',
  LICENSE = 'LICENSE',
  SUPPORT = 'SUPPORT',
  SUBSCRIPTION = 'SUBSCRIPTION'
}

export enum EntitlementStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  /** Replaced by a new one: closed history. */
  RENEWED = 'RENEWED',
  CANCELLED = 'CANCELLED'
}

/** A warranty, licence, support plan or subscription that ends on a date and has to be renewed or let go. */
export interface Entitlement {
  id?: number;
  entitlementId: string;
  title: string;
  type: EntitlementType;
  status: EntitlementStatus;
  /** What it covers, e.g. "ThinkPad T14, lot of March". */
  product: string;
  /** Serial number or order reference. Never a licence key. */
  reference: string;
  quantity: number;
  startDate?: string;
  endDate?: string;
  /** Days before the end date from which it is flagged. */
  noticeDays: number;
  annualCost: number;
  vendorId?: string;
  contractId?: string;
  ownerUpn: string;
  notes: string;
  created?: string;
  modified?: string;
  editor?: string;
}
