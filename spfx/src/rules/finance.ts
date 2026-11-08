import { Budget, BudgetStatus, CapexItem, Contract, ContractStatus, ExpenseStatus, OpexFrequency, OpexItem, VendorStatus } from '../models';
import { dayKeyFromValue, toDayKey } from './dates';

/** Rules for budgets, expenses, vendors and contracts. Pure, so they are tested without a screen. */

// ---------------------------------------------------------------- expenses

const OCCURRENCES_PER_YEAR: Record<OpexFrequency, number> = {
  [OpexFrequency.ONE_OFF]: 1,
  [OpexFrequency.MONTHLY]: 12,
  [OpexFrequency.QUARTERLY]: 4,
  [OpexFrequency.ANNUAL]: 1
};

/** What an OPEX entry costs over a year: the amount of one occurrence times how many happen. */
export const opexAnnualAmount = (opex: Pick<OpexItem, 'amount' | 'frequency'>): number => opex.amount * OCCURRENCES_PER_YEAR[opex.frequency];

/** A cancelled expense does not count against a budget. */
export const countsAgainstBudget = (status: ExpenseStatus): boolean => status !== ExpenseStatus.CANCELLED;

/** Committed or paid: the money is spoken for. */
export const isCommitted = (status: ExpenseStatus): boolean => status === ExpenseStatus.COMMITTED || status === ExpenseStatus.PAID;

// ---------------------------------------------------------------- budget figures

export type BudgetLevel = 'OK' | 'NEAR' | 'OVER';

export interface IBudgetFigures {
  planned: number;
  /** CAPEX amounts plus annualised OPEX, without the cancelled ones. */
  committed: number;
  /** The part of it already paid. */
  paid: number;
  remaining: number;
  /** committed / planned, or 0 when nothing is planned. */
  usedRatio: number;
  level: BudgetLevel;
}

export const NEAR_LIMIT_RATIO = 0.9;

/** OK up to 90% used, NEAR from 90% up to 100%, OVER above 100%. A budget with nothing planned but spending is OVER. */
export const budgetLevel = (planned: number, committed: number): BudgetLevel => {
  if (planned <= 0) {
    return committed > 0 ? 'OVER' : 'OK';
  }
  const ratio = committed / planned;
  return ratio > 1 ? 'OVER' : ratio >= NEAR_LIMIT_RATIO ? 'NEAR' : 'OK';
};

/** Figures of one budget from the expenses that point at it by id. */
export const budgetFigures = (budget: Budget, capex: CapexItem[], opex: OpexItem[]): IBudgetFigures => {
  const ownCapex = capex.filter(c => c.budgetId === budget.budgetId && countsAgainstBudget(c.status));
  const ownOpex = opex.filter(o => o.budgetId === budget.budgetId && countsAgainstBudget(o.status));

  const committed = ownCapex.reduce((sum, c) => sum + c.amount, 0) + ownOpex.reduce((sum, o) => sum + opexAnnualAmount(o), 0);
  const paid = ownCapex.filter(c => c.status === ExpenseStatus.PAID).reduce((sum, c) => sum + c.amount, 0)
    + ownOpex.filter(o => o.status === ExpenseStatus.PAID).reduce((sum, o) => sum + opexAnnualAmount(o), 0);

  return {
    planned: budget.plannedAmount,
    committed,
    paid,
    remaining: budget.plannedAmount - committed,
    usedRatio: budget.plannedAmount > 0 ? committed / budget.plannedAmount : 0,
    level: budgetLevel(budget.plannedAmount, committed)
  };
};

/** Budgets that are still in play: closed ones are history. */
export const isLiveBudget = (budget: Pick<Budget, 'status'>): boolean => budget.status !== BudgetStatus.CLOSED;

// ---------------------------------------------------------------- contracts

const dayNumber = (key: string): number => {
  const parts = key.split('-');
  return Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])) / 86400000;
};

/** Whole calendar days from `from` to `to` (negative when `to` is earlier). */
export const daysBetween = (from: string, to: string): number => Math.round(dayNumber(to) - dayNumber(from));

export type ContractAlert = 'NONE' | 'RENEWAL' | 'LAPSED';

export interface IContractStatusInfo {
  alert: ContractAlert;
  /** Days until the end date; negative once it has passed. Undefined without an end date. */
  daysLeft: number | undefined;
}

/**
 * Only an ACTIVE contract is checked. It is LAPSED when its end date has passed but it was never
 * closed, and due for RENEWAL when the days left are within its notice period.
 */
export const contractAlert = (contract: Contract, now: Date = new Date()): IContractStatusInfo => {
  const end = dayKeyFromValue(contract.endDate);
  if (!end) {
    return { alert: 'NONE', daysLeft: undefined };
  }

  const daysLeft = daysBetween(toDayKey(now), end);
  if (contract.status !== ContractStatus.ACTIVE) {
    return { alert: 'NONE', daysLeft };
  }

  if (daysLeft < 0) {
    return { alert: 'LAPSED', daysLeft };
  }

  return { alert: daysLeft <= contract.noticeDays ? 'RENEWAL' : 'NONE', daysLeft };
};

export const needsContractAttention = (contract: Contract, now: Date = new Date()): boolean => contractAlert(contract, now).alert !== 'NONE';

// ---------------------------------------------------------------- status changes

const BUDGET_TRANSITIONS: Record<BudgetStatus, BudgetStatus[]> = {
  [BudgetStatus.DRAFT]: [BudgetStatus.APPROVED],
  [BudgetStatus.APPROVED]: [BudgetStatus.CLOSED],
  [BudgetStatus.CLOSED]: [BudgetStatus.APPROVED]
};

const EXPENSE_TRANSITIONS: Record<ExpenseStatus, ExpenseStatus[]> = {
  [ExpenseStatus.PLANNED]: [ExpenseStatus.COMMITTED, ExpenseStatus.CANCELLED],
  [ExpenseStatus.COMMITTED]: [ExpenseStatus.PLANNED, ExpenseStatus.PAID, ExpenseStatus.CANCELLED],
  [ExpenseStatus.PAID]: [ExpenseStatus.COMMITTED],
  [ExpenseStatus.CANCELLED]: [ExpenseStatus.PLANNED]
};

const VENDOR_TRANSITIONS: Record<VendorStatus, VendorStatus[]> = {
  [VendorStatus.ACTIVE]: [VendorStatus.UNDER_REVIEW, VendorStatus.INACTIVE],
  [VendorStatus.UNDER_REVIEW]: [VendorStatus.ACTIVE, VendorStatus.INACTIVE],
  [VendorStatus.INACTIVE]: [VendorStatus.ACTIVE, VendorStatus.UNDER_REVIEW]
};

const CONTRACT_TRANSITIONS: Record<ContractStatus, ContractStatus[]> = {
  [ContractStatus.DRAFT]: [ContractStatus.ACTIVE, ContractStatus.TERMINATED],
  [ContractStatus.ACTIVE]: [ContractStatus.EXPIRED, ContractStatus.TERMINATED],
  [ContractStatus.EXPIRED]: [ContractStatus.ACTIVE],
  [ContractStatus.TERMINATED]: []
};

/** The current status plus every status it may move to. */
export const getAllowedBudgetStatuses = (current: BudgetStatus): BudgetStatus[] => [current].concat(BUDGET_TRANSITIONS[current]);
export const getAllowedExpenseStatuses = (current: ExpenseStatus): ExpenseStatus[] => [current].concat(EXPENSE_TRANSITIONS[current]);
export const getAllowedVendorStatuses = (current: VendorStatus): VendorStatus[] => [current].concat(VENDOR_TRANSITIONS[current]);
export const getAllowedContractStatuses = (current: ContractStatus): ContractStatus[] => [current].concat(CONTRACT_TRANSITIONS[current]);
