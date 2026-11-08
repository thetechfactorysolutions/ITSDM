import assert from 'node:assert/strict';
import {
  AutoRenew, Budget, BudgetStatus, CapexItem, Contract, ContractStatus, ExpenseStatus, OpexFrequency, OpexItem, Vendor, VendorCategory, VendorStatus
} from '../src/models';
import {
  budgetFigures, budgetLevel, contractAlert, countsAgainstBudget, daysBetween, getAllowedBudgetStatuses, getAllowedContractStatuses, getAllowedExpenseStatuses,
  getAllowedVendorStatuses, isCommitted, isLiveBudget, needsContractAttention, opexAnnualAmount
} from '../src/rules/finance';
import { evaluateChange } from '../src/rules/approvals';
import { isClosedStatus } from '../src/rules/transitions';
import { hasErrors, validateBudget, validateCapex, validateContract, validateOpex, validateVendor } from '../src/rules/validation';
import { buildBudgetPayload, buildCapexPayload, buildContractPayload, buildOpexPayload, buildVendorPayload } from '../src/entities/payloads';
import { mapBudget, mapCapex, mapContract, mapOpex, mapVendor } from '../src/components/shared/mappers';

const budget = (o: Partial<Budget> = {}): Budget => ({ budgetId: 'B-1', title: 'Budget', fiscalYear: 2026, description: '', status: BudgetStatus.APPROVED, plannedAmount: 100000, ownerUpn: 'a@b.com', ...o });
const capex = (o: Partial<CapexItem> = {}): CapexItem => ({ capexId: 'C-1', title: 'Capex', description: '', status: ExpenseStatus.COMMITTED, amount: 10000, invoiceRef: '', ownerUpn: '', budgetId: 'B-1', ...o });
const opex = (o: Partial<OpexItem> = {}): OpexItem => ({ opexId: 'O-1', title: 'Opex', description: '', status: ExpenseStatus.COMMITTED, amount: 1000, frequency: OpexFrequency.MONTHLY, ownerUpn: '', budgetId: 'B-1', ...o });
const contract = (o: Partial<Contract> = {}): Contract => ({
  contractId: 'K-1', title: 'Contract', description: '', status: ContractStatus.ACTIVE, endDate: '2026-12-31', noticeDays: 90, annualValue: 10000, autoRenew: AutoRenew.NO, ownerUpn: 'a@b.com', ...o
});
const vendor = (o: Partial<Vendor> = {}): Vendor => ({
  vendorId: 'V-1', title: 'Vendor', description: '', status: VendorStatus.ACTIVE, category: VendorCategory.SOFTWARE, contactName: '', contactEmail: '', website: '', ownerUpn: '', ...o
});

// ---------------------------------------------------------------- expenses
const testAnnualAmount = (): void => {
  assert.equal(opexAnnualAmount({ amount: 1000, frequency: OpexFrequency.MONTHLY }), 12000);
  assert.equal(opexAnnualAmount({ amount: 1000, frequency: OpexFrequency.QUARTERLY }), 4000);
  assert.equal(opexAnnualAmount({ amount: 1000, frequency: OpexFrequency.ANNUAL }), 1000);
  assert.equal(opexAnnualAmount({ amount: 1000, frequency: OpexFrequency.ONE_OFF }), 1000);
  assert.equal(countsAgainstBudget(ExpenseStatus.CANCELLED), false);
  assert.equal(countsAgainstBudget(ExpenseStatus.PLANNED), true, 'planned spending already counts');
  assert.equal(isCommitted(ExpenseStatus.COMMITTED) && isCommitted(ExpenseStatus.PAID), true);
  assert.equal(isCommitted(ExpenseStatus.PLANNED) || isCommitted(ExpenseStatus.CANCELLED), false);
};

// ---------------------------------------------------------------- budget figures
const testBudgetLevels = (): void => {
  assert.equal(budgetLevel(100, 50), 'OK');
  assert.equal(budgetLevel(100, 89.99), 'OK');
  assert.equal(budgetLevel(100, 90), 'NEAR', 'from 90% it is near the limit');
  assert.equal(budgetLevel(100, 100), 'NEAR', 'exactly the budget is not over');
  assert.equal(budgetLevel(100, 100.01), 'OVER');
  assert.equal(budgetLevel(0, 0), 'OK');
  assert.equal(budgetLevel(0, 5), 'OVER', 'spending with nothing planned is over');
};

const testBudgetFigures = (): void => {
  const figures = budgetFigures(budget(),
    [capex({ amount: 40000, status: ExpenseStatus.PAID }), capex({ capexId: 'C-2', amount: 20000, status: ExpenseStatus.PLANNED })],
    [opex({ amount: 1000, frequency: OpexFrequency.MONTHLY, status: ExpenseStatus.COMMITTED })]);
  assert.equal(figures.planned, 100000);
  assert.equal(figures.committed, 72000, '40000 + 20000 + 1000 x 12');
  assert.equal(figures.paid, 40000, 'only paid expenses are paid');
  assert.equal(figures.remaining, 28000);
  assert.equal(figures.usedRatio, 0.72);
  assert.equal(figures.level, 'OK');

  const ignored = budgetFigures(budget(),
    [capex({ amount: 90000, status: ExpenseStatus.CANCELLED }), capex({ capexId: 'C-3', amount: 90000, budgetId: 'B-OTHER' })],
    [opex({ amount: 5000, status: ExpenseStatus.CANCELLED })]);
  assert.equal(ignored.committed, 0, 'cancelled expenses and expenses of other budgets do not count');

  const over = budgetFigures(budget({ plannedAmount: 60000 }), [], [opex({ amount: 6500, frequency: OpexFrequency.MONTHLY })]);
  assert.equal(over.committed, 78000);
  assert.equal(over.level, 'OVER');
  assert.equal(over.remaining, -18000, 'remaining goes negative when over');

  const empty = budgetFigures(budget({ plannedAmount: 0 }), [], []);
  assert.equal(empty.usedRatio, 0, 'no division by zero');
  assert.equal(isLiveBudget(budget({ status: BudgetStatus.CLOSED })), false);
  assert.equal(isLiveBudget(budget({ status: BudgetStatus.DRAFT })), true);
};

// ---------------------------------------------------------------- contracts
const testDays = (): void => {
  assert.equal(daysBetween('2026-11-08', '2026-11-18'), 10);
  assert.equal(daysBetween('2026-11-08', '2026-11-08'), 0);
  assert.equal(daysBetween('2026-11-08', '2026-11-01'), -7);
  assert.equal(daysBetween('2026-12-31', '2027-01-01'), 1, 'across a year change');
  assert.equal(daysBetween('2028-02-28', '2028-03-01'), 2, 'a leap year has a 29th of February');
};

const testContractAlert = (): void => {
  const now = new Date(2026, 10, 8, 15);
  assert.deepEqual(contractAlert(contract({ endDate: '2027-06-30' }), now).alert, 'NONE', 'far from the end');
  assert.equal(contractAlert(contract({ endDate: '2027-02-06' }), now).alert, 'RENEWAL', '90 days left is within the notice');
  assert.equal(contractAlert(contract({ endDate: '2027-02-07' }), now).alert, 'NONE', '91 days left is not yet');
  assert.equal(contractAlert(contract({ endDate: '2026-11-08' }), now).alert, 'RENEWAL', 'ending today still needs a decision');
  assert.equal(contractAlert(contract({ endDate: '2026-11-07' }), now).alert, 'LAPSED', 'ended yesterday but never closed');
  assert.equal(contractAlert(contract({ endDate: '2026-11-07' }), now).daysLeft, -1);
  assert.equal(contractAlert(contract({ endDate: '2026-12-01', noticeDays: 10 }), now).alert, 'NONE', 'the notice period is per contract');
  assert.equal(contractAlert(contract({ endDate: '2026-11-20', status: ContractStatus.DRAFT }), now).alert, 'NONE', 'only active contracts are checked');
  assert.equal(contractAlert(contract({ endDate: '2026-11-01', status: ContractStatus.EXPIRED }), now).alert, 'NONE', 'an expired one is already closed');
  assert.equal(contractAlert(contract({ endDate: '' }), now).alert, 'NONE');
  assert.equal(contractAlert(contract({ endDate: '' }), now).daysLeft, undefined);
  assert.equal(needsContractAttention(contract({ endDate: '2026-11-20' }), now), true);
};

// ---------------------------------------------------------------- status rules
const testTransitions = (): void => {
  assert.deepEqual(getAllowedBudgetStatuses(BudgetStatus.DRAFT), [BudgetStatus.DRAFT, BudgetStatus.APPROVED]);
  assert.equal(getAllowedBudgetStatuses(BudgetStatus.DRAFT).indexOf(BudgetStatus.CLOSED), -1, 'a draft cannot be closed');
  assert.ok(getAllowedBudgetStatuses(BudgetStatus.CLOSED).indexOf(BudgetStatus.APPROVED) > -1, 'a closed budget can be reopened');

  assert.ok(getAllowedExpenseStatuses(ExpenseStatus.PLANNED).indexOf(ExpenseStatus.PAID) === -1, 'a plan is committed before it is paid');
  assert.ok(getAllowedExpenseStatuses(ExpenseStatus.COMMITTED).indexOf(ExpenseStatus.PAID) > -1);
  assert.ok(getAllowedExpenseStatuses(ExpenseStatus.CANCELLED).indexOf(ExpenseStatus.PLANNED) > -1);

  assert.equal(getAllowedVendorStatuses(VendorStatus.ACTIVE).length, 3);
  assert.deepEqual(getAllowedContractStatuses(ContractStatus.TERMINATED), [ContractStatus.TERMINATED], 'a terminated contract is final');
  assert.ok(getAllowedContractStatuses(ContractStatus.EXPIRED).indexOf(ContractStatus.ACTIVE) > -1, 'an expired contract can be renewed');
  assert.equal(getAllowedContractStatuses(ContractStatus.DRAFT).indexOf(ContractStatus.EXPIRED), -1);

  for (const s of ['INACTIVE', 'EXPIRED', 'TERMINATED']) {
    assert.equal(isClosedStatus(s), true, s);
  }
  for (const s of ['PLANNED', 'COMMITTED', 'PAID', 'DRAFT', 'UNDER_REVIEW']) {
    assert.equal(isClosedStatus(s), false, s);
  }
};

// ---------------------------------------------------------------- approvals for spending
const testSpendApprovals = (): void => {
  const ids = (r: { required: Array<{ id: string }> }): string[] => r.required.map(x => x.id);

  const small = capex({ status: ExpenseStatus.PLANNED, amount: 49999 });
  assert.deepEqual(ids(evaluateChange('capex', small, { ...small, status: ExpenseStatus.COMMITTED })), [], 'below the threshold');
  const big = capex({ status: ExpenseStatus.PLANNED, amount: 50000 });
  assert.deepEqual(ids(evaluateChange('capex', big, { ...big, status: ExpenseStatus.COMMITTED })), ['capex.commit'], 'a commitment of 50,000 needs approval');
  assert.deepEqual(ids(evaluateChange('capex', big, { ...big, status: ExpenseStatus.PAID })), ['capex.commit'], 'paying it straight away is the same');
  assert.deepEqual(ids(evaluateChange('capex', big, { ...big, status: ExpenseStatus.CANCELLED })), [], 'cancelling is free');
  const committed = capex({ status: ExpenseStatus.COMMITTED, amount: 80000 });
  assert.deepEqual(ids(evaluateChange('capex', committed, { ...committed, status: ExpenseStatus.PAID })), [], 'committed to paid does not ask twice');

  const monthly = opex({ status: ExpenseStatus.PLANNED, amount: 4200, frequency: OpexFrequency.MONTHLY });
  assert.deepEqual(ids(evaluateChange('opex', monthly, { ...monthly, status: ExpenseStatus.COMMITTED })), ['opex.commit'], '4,200 a month is 50,400 a year');
  const cheap = opex({ status: ExpenseStatus.PLANNED, amount: 4100, frequency: OpexFrequency.MONTHLY });
  assert.deepEqual(ids(evaluateChange('opex', cheap, { ...cheap, status: ExpenseStatus.COMMITTED })), [], '4,100 a month is 49,200 a year');

  const draft = contract({ status: ContractStatus.DRAFT, annualValue: 50000 });
  assert.deepEqual(ids(evaluateChange('contracts', draft, { ...draft, status: ContractStatus.ACTIVE })), ['contract.activate']);
  assert.deepEqual(ids(evaluateChange('contracts', { ...draft, annualValue: 49999 }, { ...draft, annualValue: 49999, status: ContractStatus.ACTIVE })), []);
  const active = contract({ status: ContractStatus.ACTIVE, annualValue: 90000 });
  assert.deepEqual(ids(evaluateChange('contracts', active, { ...active, endDate: '2027-12-31' })), [], 'editing an active contract is free');
  const renewed = contract({ status: ContractStatus.EXPIRED, annualValue: 90000 });
  assert.deepEqual(ids(evaluateChange('contracts', renewed, { ...renewed, status: ContractStatus.ACTIVE })), ['contract.activate'], 'renewing counts as activating again');

  // a new expense created already committed cannot skip the approval
  const created = evaluateChange('capex', undefined, capex({ status: ExpenseStatus.COMMITTED, amount: 90000 }));
  assert.equal(created.needsExistingItem, true);
};

// ---------------------------------------------------------------- validation
const testValidation = (): void => {
  assert.equal(hasErrors(validateBudget(budget())), false);
  assert.equal(validateBudget(budget({ fiscalYear: 26 })).fiscalYear, 'validation.yearInvalid');
  assert.equal(validateBudget(budget({ fiscalYear: 2026.5 })).fiscalYear, 'validation.yearInvalid');
  assert.equal(validateBudget(budget({ plannedAmount: -1 })).plannedAmount, 'validation.cannotBeNegative');
  assert.equal(validateBudget(budget({ ownerUpn: '' })).ownerUpn, 'validation.ownerRequired');

  assert.equal(validateCapex(capex({ amount: NaN })).amount, 'validation.mustBeNumber');
  assert.equal(validateCapex(capex({ expenseDate: '2026-13-01' })).expenseDate, 'validation.dateInvalid');
  assert.equal(hasErrors(validateOpex(opex())), false, 'an expense needs no owner');
  assert.equal(validateOpex(opex({ ownerUpn: 'nobody' })).ownerUpn, 'validation.ownerInvalid');

  assert.equal(validateVendor(vendor({ contactEmail: 'not-an-email' })).contactEmail, 'validation.contactInvalid');
  assert.equal(hasErrors(validateVendor(vendor({ contactEmail: 'sales@vendor.com' }))), false);

  assert.equal(hasErrors(validateContract(contract())), false);
  assert.equal(validateContract(contract({ startDate: '2026-06-01', endDate: '2026-01-01' })).endDate, 'validation.endBeforeStart');
  assert.equal(validateContract(contract({ noticeDays: 400 })).noticeDays, 'validation.noticeDaysRange');
  assert.equal(validateContract(contract({ noticeDays: -1 })).noticeDays, 'validation.noticeDaysRange');
  assert.equal(validateContract(contract({ noticeDays: 30.5 })).noticeDays, 'validation.noticeDaysRange');
  assert.equal(validateContract(contract({ ownerUpn: '' })).ownerUpn, 'validation.ownerRequired');
};

// ---------------------------------------------------------------- what is written and read
const testPayloadsAndMappers = (): void => {
  const o = buildOpexPayload(opex({ frequency: OpexFrequency.QUARTERLY, contractId: 'K-1', expenseDate: '2026-11-08' }));
  assert.equal(o.Frequency, 'QUARTERLY');
  assert.equal(o.ContractId, 'K-1');
  assert.equal(o.ExpenseDate, '2026-11-08T12:00:00Z');
  assert.equal(o.ApprovalStatus, 'NONE', 'spending carries the approval columns');
  assert.equal(buildCapexPayload(capex()).ApprovalStatus, 'NONE');
  assert.equal(buildContractPayload(contract({ noticeDays: 60, autoRenew: AutoRenew.YES })).NoticeDays, 60);
  assert.equal(buildContractPayload(contract()).AutoRenew, 'NO');
  assert.equal(buildBudgetPayload(budget()).FiscalYear, 2026);
  assert.equal('ApprovalStatus' in buildBudgetPayload(budget()), false, 'budgets and vendors have no approval columns');
  assert.equal('ApprovalStatus' in buildVendorPayload(vendor()), false);

  assert.equal(mapContract({ NoticeDays: 30 }).noticeDays, 30);
  assert.equal(mapContract({}).noticeDays, 90, 'a contract without a notice period gets the default');
  assert.equal(mapContract({ Status: 'WEIRD' }).status, ContractStatus.DRAFT);
  assert.equal(mapOpex({ Frequency: 'MONTHLY', Amount: 5, ApprovalStatus: 'PENDING' }).approval?.status, 'PENDING');
  assert.equal(mapCapex({}).status, ExpenseStatus.PLANNED);
  assert.equal(mapBudget({ FiscalYear: 2027, PlannedAmount: 1200 }).fiscalYear, 2027);
  assert.equal(mapVendor({ Category: 'CLOUD', Status: 'UNDER_REVIEW' }).category, VendorCategory.CLOUD);
  assert.equal(mapVendor({}).status, VendorStatus.ACTIVE);
};

testAnnualAmount();
testBudgetLevels();
testBudgetFigures();
testDays();
testContractAlert();
testTransitions();
testSpendApprovals();
testValidation();
testPayloadsAndMappers();
console.log('finance tests passed');
