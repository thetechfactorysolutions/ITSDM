import './helpers/globals';
import assert from 'node:assert/strict';
import * as React from 'react';
import Budgets from '../src/components/Finance/Budgets';
import Opex from '../src/components/Finance/Opex';
import Contracts from '../src/components/Vendors/Contracts';
import { HubDataContext, IHubData } from '../src/components/shared/HubData';
import { IListHookState } from '../src/hooks/useListItems';
import { I18nProvider, Language } from '../src/i18n/I18n';
import { AutoRenew, Budget, BudgetStatus, CapexItem, Contract, ContractStatus, ExpenseStatus, OpexFrequency, OpexItem } from '../src/models';
import { toDayKey } from '../src/rules/dates';
import { click, mount, settle, unmount } from './helpers/dom';

const addDays = (n: number): string => { const d = new Date(); d.setDate(d.getDate() + n); return toDayKey(d); };

const budget = (id: number, title: string, planned: number): Budget => ({
  id, budgetId: `BUD-${id}`, title, fiscalYear: 2026, description: '', status: BudgetStatus.APPROVED, plannedAmount: planned, ownerUpn: 'me@x.com'
});
const capex = (id: number, budgetId: string, amount: number, status: ExpenseStatus = ExpenseStatus.COMMITTED): CapexItem => ({
  id, capexId: `CAPEX-${id}`, title: `Capex ${id}`, description: '', status, amount, invoiceRef: '', ownerUpn: '', budgetId
});
const opex = (id: number, budgetId: string, amount: number, frequency: OpexFrequency): OpexItem => ({
  id, opexId: `OPEX-${id}`, title: `Opex ${id}`, description: '', status: ExpenseStatus.COMMITTED, amount, frequency, ownerUpn: '', budgetId
});
const contract = (id: number, title: string, status: ContractStatus, endInDays: number): Contract => ({
  id, contractId: `CON-${id}`, title, description: '', status, endDate: addDays(endInDays), noticeDays: 90, annualValue: 10000, autoRenew: AutoRenew.NO, ownerUpn: 'me@x.com'
});

interface IData { budgets?: Budget[]; capex?: CapexItem[]; opex?: OpexItem[]; contracts?: Contract[] }

const render = (Screen: React.FC, data: IData, created: Array<Record<string, unknown>> = [], language: Language = 'en'): React.ReactElement => {
  const list = <T,>(rows: T[]): IListHookState<T> => ({
    items: rows, loading: false, error: undefined, reload: async () => undefined,
    create: async payload => { created.push(payload); }, update: async () => undefined, remove: async () => undefined
  });
  const none = (): never => list([]) as never;
  const hub: IHubData = {
    service: { capabilities: { versioning: false, userSearch: 'known', attachments: false }, searchUsers: async () => [] } as unknown as IHubData['service'], userEmail: 'me@x.com',
    budgets: list(data.budgets ?? []), capex: list(data.capex ?? []), opex: list(data.opex ?? []), contracts: list(data.contracts ?? []),
    vendors: none(), projects: none(), initiatives: none(), meetings: none(), ideas: none(), actions: none(), notes: none(), risks: none(), decisions: none(), lessons: none(), reviews: none()
  };
  return React.createElement(I18nProvider, { language }, React.createElement(HubDataContext.Provider, { value: hub }, React.createElement(Screen)));
};

const text = (): string => document.body.textContent ?? '';
const button = (label: string): HTMLButtonElement | undefined =>
  Array.from(document.body.querySelectorAll('button')).filter(b => (b.textContent ?? '').trim() === label)[0] as HTMLButtonElement | undefined;

const testBudgetFiguresInTheTable = async (): Promise<void> => {
  const data: IData = {
    budgets: [budget(1, 'Infrastructure', 500000), budget(2, 'Cloud', 60000), budget(3, 'Quiet', 100000)],
    // Infrastructure: 205,000 + 140,000 + 125,000 = 470,000 of 500,000 -> 94% (the cancelled 99,999 does not count)
    // Cloud: 12 x 6,500 = 78,000 of 60,000 -> 130%      Quiet: nothing -> 0%
    capex: [capex(1, 'BUD-1', 205000), capex(2, 'BUD-1', 99999, ExpenseStatus.CANCELLED)],
    opex: [opex(1, 'BUD-1', 140000, OpexFrequency.ANNUAL), opex(3, 'BUD-1', 125000, OpexFrequency.ANNUAL), opex(2, 'BUD-2', 6500, OpexFrequency.MONTHLY)]
  };

  await mount(render(Budgets, data));
  await settle();
  assert.ok(text().indexOf('94% · Near the limit') > -1, 'a budget at 94% is near the limit');
  assert.ok(text().indexOf('130% · Over budget') > -1, 'a budget at 130% is over');
  assert.ok(text().indexOf('0% · On track') > -1, 'a budget with no spending is on track');
  await unmount();

  await mount(render(Budgets, data, [], 'es'));
  await settle();
  assert.ok(text().indexOf('130% · Superado') > -1, 'the level is shown in Spanish');
  assert.ok(text().indexOf('Nuevo presupuesto') > -1);
  await unmount();
};

const testContractRenewalColumn = async (): Promise<void> => {
  const data: IData = {
    contracts: [
      contract(1, 'Renews soon', ContractStatus.ACTIVE, 30),
      contract(2, 'Far away', ContractStatus.ACTIVE, 400),
      contract(3, 'Ended not closed', ContractStatus.ACTIVE, -5),
      contract(4, 'Still a draft', ContractStatus.DRAFT, 10)
    ]
  };
  await mount(render(Contracts, data));
  await settle();
  assert.ok(text().indexOf('Renew in 30 day(s)') > -1, 'an active contract within its notice period is flagged');
  assert.ok(text().indexOf('Ended 5 day(s) ago, not closed') > -1, 'an ended contract that was never closed is flagged');
  const flags = (text().match(/Renew in|Ended \d/g) ?? []).length;
  assert.equal(flags, 2, 'neither the far one nor the draft is flagged');
  await unmount();
};

const testNewOpexShowsAnnualAmountAndStartsPlanned = async (): Promise<void> => {
  const created: Array<Record<string, unknown>> = [];
  await mount(render(Opex, {}, created));
  await settle();
  assert.ok(text().indexOf('There is no OPEX yet') > -1);

  await click(button('New OPEX') as HTMLButtonElement);
  await settle();
  const { act } = await import('react-dom/test-utils');
  const setField = async (label: string, value: string): Promise<void> => {
    const l = Array.from(document.body.querySelectorAll('label')).filter(x => (x.textContent ?? '').trim() === label)[0] as HTMLLabelElement;
    assert.ok(l, `field "${label}" exists`);
    const input = document.getElementById(l.htmlFor) as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set as (v: string) => void;
    await act(async () => { setter.call(input, value); input.dispatchEvent(new window.Event('input', { bubbles: true })); });
  };
  await setField('Title', 'Support contract');
  await setField('Amount per occurrence', '4200');
  assert.match(text(), /Annual amount:\s*50[.,\s]?400/, 'a monthly 4,200 shows 50,400 a year');

  await click(button('Save') as HTMLButtonElement);
  await settle(80);
  assert.equal(created.length, 1);
  assert.equal(created[0].Status, 'PLANNED', 'a new expense starts as planned');
  assert.equal(created[0].Frequency, 'MONTHLY');
  assert.equal(created[0].Amount, 4200);
  assert.equal(created[0].ApprovalStatus, 'NONE');
  await unmount();
};

const run = async (): Promise<void> => {
  await testBudgetFiguresInTheTable();
  await testContractRenewalColumn();
  await testNewOpexShowsAnnualAmountAndStartsPlanned();
  console.log('finance screen tests passed');
  process.exit(0);
};

run().catch(error => {
  console.error(error);
  process.exit(1);
});
