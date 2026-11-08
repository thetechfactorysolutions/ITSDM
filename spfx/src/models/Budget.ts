export enum BudgetStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  CLOSED = 'CLOSED'
}

export interface Budget {
  id?: number;
  budgetId: string;
  title: string;
  /** The year the budget covers. */
  fiscalYear: number;
  description: string;
  status: BudgetStatus;
  plannedAmount: number;
  ownerUpn: string;
  created?: string;
  modified?: string;
  editor?: string;
}
