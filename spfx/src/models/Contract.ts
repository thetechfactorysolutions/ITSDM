import { IApprovalState } from './Approval';

export enum ContractStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  TERMINATED = 'TERMINATED'
}

export enum AutoRenew {
  NO = 'NO',
  YES = 'YES'
}

export interface Contract {
  id?: number;
  contractId: string;
  title: string;
  description: string;
  status: ContractStatus;
  vendorId?: string;
  startDate?: string;
  endDate?: string;
  /** Days before the end date by which a renewal decision is needed. */
  noticeDays: number;
  annualValue: number;
  autoRenew: AutoRenew;
  ownerUpn: string;
  projectId?: string;
  created?: string;
  modified?: string;
  editor?: string;
  approval?: IApprovalState;
}
