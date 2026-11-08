export enum ApprovalStatus {
  NONE = 'NONE',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

/**
 * The single approval an item can have at a time. `ruleId` says what is being approved
 * (an id from APPROVAL_RULES); dates are YYYY-MM-DD, empty when not set.
 */
export interface IApprovalState {
  ruleId: string;
  status: ApprovalStatus;
  approver: string;
  requestedOn: string;
  decidedOn: string;
  decidedBy: string;
  comment: string;
}
