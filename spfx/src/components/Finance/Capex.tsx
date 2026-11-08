import * as React from 'react';
import { Dropdown, IColumn, TextField } from '@fluentui/react';
import { AppConfig } from '../../config/AppConfig';
import { csvDate, csvEnum, csvNumber, enumValues } from '../../entities/csvHelpers';
import { buildCapexPayload } from '../../entities/payloads';
import { TranslateFn, useT } from '../../i18n/I18n';
import { CapexItem, ExpenseStatus } from '../../models';
import { getAllowedExpenseStatuses } from '../../rules/finance';
import { generateBusinessId } from '../../rules/ids';
import { validateCapex } from '../../rules/validation';
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

/** Connects this screen to the approval rules in src/rules/approvals.ts. */
const approvalConfig: IApprovalConfig<CapexItem> = {
  entity: 'capex',
  getBusinessId: item => item.capexId,
  proposeStatus: (item, status) => ({ ...item, status: status as ExpenseStatus })
};

const csvColumns = [
  { header: 'Title', value: (c: CapexItem) => c.title }, { header: 'CapexId', value: (c: CapexItem) => c.capexId },
  { header: 'Description', value: (c: CapexItem) => c.description }, { header: 'Status', value: (c: CapexItem) => c.status },
  { header: 'Amount', value: (c: CapexItem) => c.amount }, { header: 'ExpenseDate', value: (c: CapexItem) => c.expenseDate },
  { header: 'InvoiceRef', value: (c: CapexItem) => c.invoiceRef }, { header: 'OwnerUPN', value: (c: CapexItem) => c.ownerUpn },
  { header: 'BudgetId', value: (c: CapexItem) => c.budgetId }, { header: 'ProjectId', value: (c: CapexItem) => c.projectId }, { header: 'VendorId', value: (c: CapexItem) => c.vendorId }
];
const searchFields = [(c: CapexItem) => c.title, (c: CapexItem) => c.description, (c: CapexItem) => c.capexId, (c: CapexItem) => c.invoiceRef];

const Capex: React.FC = () => {
  const t = useT();
  const { service, userEmail, capex: state, budgets, vendors, projects } = useHubData();
  const { budgetOptions, vendorOptions, projectOptions } = useFinanceLinkOptions();

  const budgetTitles = React.useMemo(() => titleMap(budgets.items, b => b.budgetId), [budgets.items]);
  const vendorTitles = React.useMemo(() => titleMap(vendors.items, v => v.vendorId), [vendors.items]);

  const columns: IColumn[] = React.useMemo((): IColumn[] => makeColumns(t, id => titleFor(budgetTitles, id), id => titleFor(vendorTitles, id)), [t, budgetTitles, vendorTitles]);
  const sortAccessors = React.useMemo(() => ({
    capexId: (c: CapexItem) => c.capexId, title: (c: CapexItem) => c.title, status: (c: CapexItem) => c.status, amount: (c: CapexItem) => c.amount,
    expenseDate: (c: CapexItem) => c.expenseDate, budgetId: (c: CapexItem) => c.budgetId
  }), []);

  const newItem = React.useCallback((): CapexItem => ({
    capexId: generateBusinessId('CAPEX'), title: '', description: '', status: ExpenseStatus.PLANNED, amount: 0, expenseDate: '', invoiceRef: '',
    ownerUpn: userEmail, budgetId: '', projectId: '', vendorId: ''
  }), [userEmail]);

  const csvFromRow = React.useCallback((row: Record<string, string>): CapexItem => ({
    capexId: row.CapexId || generateBusinessId('CAPEX'), title: row.Title ?? '', description: row.Description ?? '', status: csvEnum(row.Status, STATUSES, ExpenseStatus.PLANNED),
    amount: csvNumber(row.Amount), expenseDate: csvDate(row.ExpenseDate), invoiceRef: row.InvoiceRef ?? '', ownerUpn: row.OwnerUPN || userEmail,
    budgetId: row.BudgetId ?? '', projectId: row.ProjectId ?? '', vendorId: row.VendorId ?? ''
  }), [userEmail]);

  const checkBeforeSave = (form: CapexItem, original: CapexItem | undefined): string | undefined => {
    const base = original ? original.status : ExpenseStatus.PLANNED;
    return getAllowedExpenseStatuses(base).indexOf(form.status) === -1
      ? t('common.invalidTransition', { from: t(`status.${base}`), to: t(`status.${form.status}`) })
      : undefined;
  };

  const renderForm = ({ form, setForm, errors, original, isEdit, service: svc }: IFormContext<CapexItem>): React.ReactNode => {
    const base = original ? original.status : ExpenseStatus.PLANNED;
    return (
      <>
        <TextField label={t('field.capexId')} value={form.capexId} readOnly={isEdit} onChange={(_, v) => setForm(p => ({ ...p, capexId: v ?? '' }))} />
        <Dropdown label={t('field.status')} selectedKey={form.status} options={toOptions(getAllowedExpenseStatuses(base), t)} onChange={(_, o) => setForm(p => ({ ...p, status: (o?.key as ExpenseStatus) ?? base }))} />
        <FormRow full><TextField label={t('field.title')} required value={form.title} errorMessage={errors.title && t(errors.title)} onChange={(_, v) => setForm(p => ({ ...p, title: v ?? '' }))} /></FormRow>
        <FormRow full><TextField label={t('field.description')} multiline rows={3} value={form.description} onChange={(_, v) => setForm(p => ({ ...p, description: v ?? '' }))} /></FormRow>
        <TextField label={t('field.amount')} type="number" min={0} value={String(form.amount)} errorMessage={errors.amount && t(errors.amount)} onChange={(_, v) => setForm(p => ({ ...p, amount: Number(v ?? 0) }))} />
        <DateField label={t('field.expenseDate')} value={form.expenseDate} errorMessage={errors.expenseDate && t(errors.expenseDate)} onChange={v => setForm(p => ({ ...p, expenseDate: v }))} />
        <TextField label={t('field.invoiceRef')} value={form.invoiceRef} onChange={(_, v) => setForm(p => ({ ...p, invoiceRef: v ?? '' }))} />
        <UserField label={t('field.owner')} service={svc} value={form.ownerUpn} errorMessage={errors.ownerUpn && t(errors.ownerUpn)} onChange={e => setForm(p => ({ ...p, ownerUpn: e }))} />
        <LinkField label={t('field.budget')} value={form.budgetId} options={budgetOptions} onChange={id => setForm(p => ({ ...p, budgetId: id }))} />
        <LinkField label={t('field.project')} value={form.projectId} options={projectOptions} onChange={id => setForm(p => ({ ...p, projectId: id }))} />
        <LinkField label={t('field.vendor')} value={form.vendorId} options={vendorOptions} onChange={id => setForm(p => ({ ...p, vendorId: id }))} />
      </>
    );
  };

  const renderDetail = (c: CapexItem): React.ReactNode => {
    const budget = budgets.items.filter(b => b.budgetId === c.budgetId)[0];
    const project = projects.items.filter(p => p.projectId === c.projectId)[0];
    const vendor = vendors.items.filter(v => v.vendorId === c.vendorId)[0];
    return (
      <DetailFields rows={[
        { label: t('field.capexId'), value: c.capexId },
        { label: t('field.status'), value: t(`status.${c.status}`) },
        { label: t('field.description'), value: c.description },
        { label: t('field.amount'), value: formatMoney(c.amount) },
        { label: t('field.expenseDate'), value: c.expenseDate },
        { label: t('field.invoiceRef'), value: c.invoiceRef },
        { label: t('field.owner'), value: c.ownerUpn },
        { label: t('field.budget'), value: budget ? `${budget.title} (${budget.budgetId})` : c.budgetId },
        { label: t('field.project'), value: project ? `${project.title} (${project.projectId})` : c.projectId },
        { label: t('field.vendor'), value: vendor ? `${vendor.title} (${vendor.vendorId})` : c.vendorId },
        { label: t('common.modifiedBy'), value: `${(c.modified ?? '').slice(0, 10)} ${c.editor ?? ''}`.trim() }
      ]} />
    );
  };

  return (
    <EntityScreen<CapexItem>
      textKey="capex"
      listName={AppConfig.sharePoint.listNames.capex}
      state={state}
      service={service}
      statuses={STATUSES}
      getStatus={c => c.status}
      getTitle={c => c.title}
      columns={columns}
      sortAccessors={sortAccessors}
      searchFields={searchFields}
      newItem={newItem}
      validate={validateCapex}
      buildPayload={buildCapexPayload}
      checkBeforeSave={checkBeforeSave}
      renderForm={renderForm}
      renderDetail={renderDetail}
      approval={approvalConfig}
      quickStatuses={c => getAllowedExpenseStatuses(c.status)}
      archiveStatus={ExpenseStatus.CANCELLED}
      canArchive={c => getAllowedExpenseStatuses(c.status).indexOf(ExpenseStatus.CANCELLED) > -1 && c.status !== ExpenseStatus.CANCELLED}
      csvFileName="capex.csv"
      csvColumns={csvColumns}
      csvFromRow={csvFromRow}
    />
  );
};

function makeColumns(t: TranslateFn, budgetTitle: (id: string | undefined) => string, vendorTitle: (id: string | undefined) => string): IColumn[] {
  return [
    { key: 'capexId', name: t('field.capexId'), fieldName: 'capexId', minWidth: 120 },
    { key: 'title', name: t('field.title'), fieldName: 'title', minWidth: 200 },
    { key: 'status', name: t('field.status'), fieldName: 'status', minWidth: 120 },
    { key: 'amount', name: t('field.amount'), minWidth: 100, onRender: (c: CapexItem) => formatMoney(c.amount) },
    { key: 'expenseDate', name: t('field.expenseDate'), fieldName: 'expenseDate', minWidth: 100 },
    { key: 'budgetId', name: t('field.budget'), minWidth: 140, onRender: (c: CapexItem) => budgetTitle(c.budgetId) },
    { key: 'vendor', name: t('field.vendor'), minWidth: 140, onRender: (c: CapexItem) => vendorTitle(c.vendorId) }
  ];
}

export default Capex;
