import * as React from 'react';
import { Dropdown, IColumn, Text, TextField } from '@fluentui/react';
import { AppConfig } from '../../config/AppConfig';
import { csvDate, csvEnum, csvNumber, enumValues } from '../../entities/csvHelpers';
import { buildOpexPayload } from '../../entities/payloads';
import { TranslateFn, useT } from '../../i18n/I18n';
import { ExpenseStatus, OpexFrequency, OpexItem } from '../../models';
import { getAllowedExpenseStatuses, opexAnnualAmount } from '../../rules/finance';
import { generateBusinessId } from '../../rules/ids';
import { validateOpex } from '../../rules/validation';
import { formatMoney } from '../../utils/format';
import { titleFor, titleMap } from '../../utils/lookup';
import DateField from '../shared/DateField';
import { DetailFields } from '../shared/DetailSection';
import EntityScreen, { IApprovalConfig, IFormContext } from '../shared/EntityScreen';
import { FormRow } from '../shared/FormGrid';
import { useHubData } from '../shared/HubData';
import LinkField from '../shared/LinkField';
import { useFinanceLinkOptions } from '../shared/linkOptions';
import { toOptions } from '../shared/options';
import UserField from '../shared/UserField';

const STATUSES = enumValues(ExpenseStatus);
const FREQUENCIES = enumValues(OpexFrequency);

/** Connects this screen to the approval rules in src/rules/approvals.ts. */
const approvalConfig: IApprovalConfig<OpexItem> = {
  entity: 'opex',
  getBusinessId: item => item.opexId,
  proposeStatus: (item, status) => ({ ...item, status: status as ExpenseStatus })
};

const csvColumns = [
  { header: 'Title', value: (o: OpexItem) => o.title }, { header: 'OpexId', value: (o: OpexItem) => o.opexId },
  { header: 'Description', value: (o: OpexItem) => o.description }, { header: 'Status', value: (o: OpexItem) => o.status },
  { header: 'Amount', value: (o: OpexItem) => o.amount }, { header: 'Frequency', value: (o: OpexItem) => o.frequency },
  { header: 'ExpenseDate', value: (o: OpexItem) => o.expenseDate }, { header: 'OwnerUPN', value: (o: OpexItem) => o.ownerUpn },
  { header: 'BudgetId', value: (o: OpexItem) => o.budgetId }, { header: 'ProjectId', value: (o: OpexItem) => o.projectId },
  { header: 'VendorId', value: (o: OpexItem) => o.vendorId }, { header: 'ContractId', value: (o: OpexItem) => o.contractId }
];
const searchFields = [(o: OpexItem) => o.title, (o: OpexItem) => o.description, (o: OpexItem) => o.opexId];
const sortAccessors = {
  opexId: (o: OpexItem) => o.opexId, title: (o: OpexItem) => o.title, status: (o: OpexItem) => o.status, amount: (o: OpexItem) => o.amount,
  annual: (o: OpexItem) => opexAnnualAmount(o), frequency: (o: OpexItem) => FREQUENCIES.indexOf(o.frequency), budgetId: (o: OpexItem) => o.budgetId
};

const Opex: React.FC = () => {
  const t = useT();
  const { service, userEmail, opex: state, budgets, vendors, projects, contracts } = useHubData();
  const { budgetOptions, vendorOptions, projectOptions, contractOptions } = useFinanceLinkOptions();

  const budgetTitles = React.useMemo(() => titleMap(budgets.items, b => b.budgetId), [budgets.items]);
  const columns: IColumn[] = React.useMemo((): IColumn[] => makeColumns(t, id => titleFor(budgetTitles, id)), [t, budgetTitles]);

  const newItem = React.useCallback((): OpexItem => ({
    opexId: generateBusinessId('OPEX'), title: '', description: '', status: ExpenseStatus.PLANNED, amount: 0, frequency: OpexFrequency.MONTHLY, expenseDate: '',
    ownerUpn: userEmail, budgetId: '', projectId: '', vendorId: '', contractId: ''
  }), [userEmail]);

  const csvFromRow = React.useCallback((row: Record<string, string>): OpexItem => ({
    opexId: row.OpexId || generateBusinessId('OPEX'), title: row.Title ?? '', description: row.Description ?? '', status: csvEnum(row.Status, STATUSES, ExpenseStatus.PLANNED),
    amount: csvNumber(row.Amount), frequency: csvEnum(row.Frequency, FREQUENCIES, OpexFrequency.ONE_OFF), expenseDate: csvDate(row.ExpenseDate), ownerUpn: row.OwnerUPN || userEmail,
    budgetId: row.BudgetId ?? '', projectId: row.ProjectId ?? '', vendorId: row.VendorId ?? '', contractId: row.ContractId ?? ''
  }), [userEmail]);

  const checkBeforeSave = (form: OpexItem, original: OpexItem | undefined): string | undefined => {
    const base = original ? original.status : ExpenseStatus.PLANNED;
    return getAllowedExpenseStatuses(base).indexOf(form.status) === -1
      ? t('common.invalidTransition', { from: t(`status.${base}`), to: t(`status.${form.status}`) })
      : undefined;
  };

  const renderForm = ({ form, setForm, errors, original, isEdit, service: svc }: IFormContext<OpexItem>): React.ReactNode => {
    const base = original ? original.status : ExpenseStatus.PLANNED;
    return (
      <>
        <TextField label={t('field.opexId')} value={form.opexId} readOnly={isEdit} onChange={(_, v) => setForm(p => ({ ...p, opexId: v ?? '' }))} />
        <Dropdown label={t('field.status')} selectedKey={form.status} options={toOptions(getAllowedExpenseStatuses(base), t)} onChange={(_, o) => setForm(p => ({ ...p, status: (o?.key as ExpenseStatus) ?? base }))} />
        <FormRow full><TextField label={t('field.title')} required value={form.title} errorMessage={errors.title && t(errors.title)} onChange={(_, v) => setForm(p => ({ ...p, title: v ?? '' }))} /></FormRow>
        <FormRow full><TextField label={t('field.description')} multiline rows={3} value={form.description} onChange={(_, v) => setForm(p => ({ ...p, description: v ?? '' }))} /></FormRow>
        <TextField label={t('field.amountPerOccurrence')} type="number" min={0} value={String(form.amount)} errorMessage={errors.amount && t(errors.amount)} onChange={(_, v) => setForm(p => ({ ...p, amount: Number(v ?? 0) }))} />
        <Dropdown label={t('field.frequency')} selectedKey={form.frequency} options={toOptions(FREQUENCIES, t, 'frequency')} onChange={(_, o) => setForm(p => ({ ...p, frequency: (o?.key as OpexFrequency) ?? OpexFrequency.ONE_OFF }))} />
        <FormRow full><Text>{t('field.annualAmount')}: <strong>{formatMoney(opexAnnualAmount(form))}</strong></Text></FormRow>
        <DateField label={t('field.expenseDate')} value={form.expenseDate} errorMessage={errors.expenseDate && t(errors.expenseDate)} onChange={v => setForm(p => ({ ...p, expenseDate: v }))} />
        <UserField label={t('field.owner')} service={svc} value={form.ownerUpn} errorMessage={errors.ownerUpn && t(errors.ownerUpn)} onChange={e => setForm(p => ({ ...p, ownerUpn: e }))} />
        <LinkField label={t('field.budget')} value={form.budgetId} options={budgetOptions} onChange={id => setForm(p => ({ ...p, budgetId: id }))} />
        <LinkField label={t('field.project')} value={form.projectId} options={projectOptions} onChange={id => setForm(p => ({ ...p, projectId: id }))} />
        <LinkField label={t('field.vendor')} value={form.vendorId} options={vendorOptions} onChange={id => setForm(p => ({ ...p, vendorId: id }))} />
        <LinkField label={t('field.contract')} value={form.contractId} options={contractOptions} onChange={id => setForm(p => ({ ...p, contractId: id }))} />
      </>
    );
  };

  const renderDetail = (o: OpexItem): React.ReactNode => {
    const budget = budgets.items.filter(b => b.budgetId === o.budgetId)[0];
    const project = projects.items.filter(p => p.projectId === o.projectId)[0];
    const vendor = vendors.items.filter(v => v.vendorId === o.vendorId)[0];
    const contract = contracts.items.filter(c => c.contractId === o.contractId)[0];
    return (
      <DetailFields rows={[
        { label: t('field.opexId'), value: o.opexId },
        { label: t('field.status'), value: t(`status.${o.status}`) },
        { label: t('field.description'), value: o.description },
        { label: t('field.amountPerOccurrence'), value: formatMoney(o.amount) },
        { label: t('field.frequency'), value: t(`frequency.${o.frequency}`) },
        { label: t('field.annualAmount'), value: formatMoney(opexAnnualAmount(o)) },
        { label: t('field.expenseDate'), value: o.expenseDate },
        { label: t('field.owner'), value: o.ownerUpn },
        { label: t('field.budget'), value: budget ? `${budget.title} (${budget.budgetId})` : o.budgetId },
        { label: t('field.project'), value: project ? `${project.title} (${project.projectId})` : o.projectId },
        { label: t('field.vendor'), value: vendor ? `${vendor.title} (${vendor.vendorId})` : o.vendorId },
        { label: t('field.contract'), value: contract ? `${contract.title} (${contract.contractId})` : o.contractId },
        { label: t('common.modifiedBy'), value: `${(o.modified ?? '').slice(0, 10)} ${o.editor ?? ''}`.trim() }
      ]} />
    );
  };

  return (
    <EntityScreen<OpexItem>
      textKey="opex"
      listName={AppConfig.sharePoint.listNames.opex}
      state={state}
      service={service}
      statuses={STATUSES}
      getStatus={o => o.status}
      getTitle={o => o.title}
      columns={columns}
      sortAccessors={sortAccessors}
      searchFields={searchFields}
      newItem={newItem}
      validate={validateOpex}
      buildPayload={buildOpexPayload}
      checkBeforeSave={checkBeforeSave}
      renderForm={renderForm}
      renderDetail={renderDetail}
      approval={approvalConfig}
      quickStatuses={o => getAllowedExpenseStatuses(o.status)}
      archiveStatus={ExpenseStatus.CANCELLED}
      canArchive={o => getAllowedExpenseStatuses(o.status).indexOf(ExpenseStatus.CANCELLED) > -1 && o.status !== ExpenseStatus.CANCELLED}
      csvFileName="opex.csv"
      csvColumns={csvColumns}
      csvFromRow={csvFromRow}
    />
  );
};

function makeColumns(t: TranslateFn, budgetTitle: (id: string | undefined) => string): IColumn[] {
  return [
    { key: 'opexId', name: t('field.opexId'), fieldName: 'opexId', minWidth: 120 },
    { key: 'title', name: t('field.title'), fieldName: 'title', minWidth: 200 },
    { key: 'status', name: t('field.status'), fieldName: 'status', minWidth: 120 },
    { key: 'amount', name: t('field.amountPerOccurrence'), minWidth: 110, onRender: (o: OpexItem) => formatMoney(o.amount) },
    { key: 'frequency', name: t('field.frequency'), minWidth: 90, onRender: (o: OpexItem) => t(`frequency.${o.frequency}`) },
    { key: 'annual', name: t('field.annualAmount'), minWidth: 100, onRender: (o: OpexItem) => formatMoney(opexAnnualAmount(o)) },
    { key: 'budgetId', name: t('field.budget'), minWidth: 140, onRender: (o: OpexItem) => budgetTitle(o.budgetId) }
  ];
}

export default Opex;
