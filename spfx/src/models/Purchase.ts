export enum PurchaseStatus {
  REQUESTED = 'REQUESTED',
  APPROVED = 'APPROVED',
  ORDERED = 'ORDERED',
  RECEIVED = 'RECEIVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

export enum PoStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED'
}

/** What a person may do with purchases. Kept in the list of roles; see rules/purchases.ts. */
export enum PurchaseRoleType {
  APPROVER = 'APPROVER',
  BUYER = 'BUYER',
  REQUESTER = 'REQUESTER',
  VIEWER = 'VIEWER'
}

/** One request, from the moment someone asks until it arrives. */
export interface Purchase {
  id?: number;
  purchaseId: string;
  /** What is asked for. */
  title: string;
  quantity: number;
  unitPrice: number;
  /** Total. Quantity times unit price when there is a unit price, otherwise the amount written. */
  amount: number;
  /** Free text; the screens suggest the ones already used. */
  category: string;
  vendorId?: string;
  /** The number of the purchase order it is charged to (the title of a PurchaseOrder). */
  poNumber: string;
  status: PurchaseStatus;
  requestedBy: string;
  requestedOn?: string;
  orderedOn?: string;
  receivedOn?: string;
  decisionBy: string;
  decisionDate?: string;
  decisionNotes: string;
  reason: string;
  notes: string;
  created?: string;
  modified?: string;
  editor?: string;
}

/** A purchase order: a sum of money with a number, that requests are charged to. */
export interface PurchaseOrder {
  id?: number;
  poId: string;
  /** The number of the order, as the supplier knows it. */
  title: string;
  vendorId?: string;
  amount: number;
  status: PoStatus;
  notes: string;
  created?: string;
  modified?: string;
  editor?: string;
}

/** Who can do what with purchases. */
export interface PurchaseRoleEntry {
  id?: number;
  /** A name to recognise the person. */
  title: string;
  userUpn: string;
  role: PurchaseRoleType;
  notes: string;
  created?: string;
  modified?: string;
  editor?: string;
}
