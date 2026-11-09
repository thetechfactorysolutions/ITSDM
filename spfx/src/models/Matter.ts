export enum MatterStatus {
  /** Arrived (by a flow or by hand) and not classified yet. */
  INBOX = 'INBOX',
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING = 'WAITING',
  DONE = 'DONE',
  DISCARDED = 'DISCARDED'
}

export enum MatterPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/** Where the matter came from. */
export enum MatterSource {
  MANUAL = 'MANUAL',
  EMAIL = 'EMAIL',
  TEAMS = 'TEAMS',
  OTHER = 'OTHER'
}

/**
 * Anything that asks for attention: an email, a Teams message, a request, a deadline. It starts
 * in the inbox and is classified by giving it an area.
 */
export interface Matter {
  id?: number;
  matterId: string;
  title: string;
  /** What arrived or what has to be done. */
  description: string;
  /** Ongoing notes written by the owner. */
  notes: string;
  status: MatterStatus;
  priority: MatterPriority;
  /** The area it belongs to (business id of an Area). Empty while it is in the inbox. */
  areaId?: string;
  source: MatterSource;
  /** Link to the original message, or any reference to where it came from. */
  sourceRef: string;
  /** Who sent it. */
  sender: string;
  receivedOn?: string;
  dueDate?: string;
  closedOn?: string;
  ownerUpn: string;
  projectId?: string;
  contractId?: string;
  incidentId?: string;
  vendorId?: string;
  created?: string;
  modified?: string;
  editor?: string;
}
