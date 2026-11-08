import { IApprovalState } from './Approval';

/** Shared by CAPEX and OPEX entries. */
export enum ExpenseStatus {
  PLANNED = 'PLANNED',
  COMMITTED = 'COMMITTED',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED'
}

export enum OpexFrequency {
  ONE_OFF = 'ONE_OFF',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  ANNUAL = 'ANNUAL'
}

export interface CapexItem {
  id?: number;
  capexId: string;
  title: string;
  description: string;
  status: ExpenseStatus;
  amount: number;
  expenseDate?: string;
  invoiceRef: string;
  ownerUpn: string;
  budgetId?: string;
  projectId?: string;
  vendorId?: string;
  created?: string;
  modified?: string;
  editor?: string;
  approval?: IApprovalState;
}

export interface OpexItem {
  id?: number;
  opexId: string;
  title: string;
  description: string;
  status: ExpenseStatus;
  /** Amount of each occurrence; the annual amount is this times the frequency. */
  amount: number;
  frequency: OpexFrequency;
  expenseDate?: string;
  ownerUpn: string;
  budgetId?: string;
  projectId?: string;
  vendorId?: string;
  contractId?: string;
  created?: string;
  modified?: string;
  editor?: string;
  approval?: IApprovalState;
}
