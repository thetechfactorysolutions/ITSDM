import * as React from 'react';
import { Dropdown, IColumn, Stack, TextField } from '@fluentui/react';
import { AppConfig } from '../../config/AppConfig';
import { csvEnum, csvNumber, enumValues } from '../../entities/csvHelpers';
import { buildBudgetPayload } from '../../entities/payloads';
import { TranslateFn, useT } from '../../i18n/I18n';
import { Budget, BudgetStatus } from '../../models';
import { budgetFigures, getAllowedBudgetStatuses, IBudgetFigures, opexAnnualAmount } from '../../rules/finance';
import { generateBusinessId } from '../../rules/ids';
import { validateBudget } from '../../rules/validation';
import { formatMoney, formatPercent } from '../../utils/format';
import { DetailFields, RelatedList } from '../shared/DetailSection';
import EntityScreen, { IFormContext } from '../shared/EntityScreen';
import { FormRow } from '../shared/FormGrid';
import { useHubData } from '../shared/HubData';
import { toOptions } from '../shared/options';
import UserField from '../shared/UserField';

const STATUSES = enumValues(BudgetStatus);

const csvColumns = [
  { header: 'Title', value: (b: Budget) => b.title }, { header: 'BudgetId', value: (b: Budget) => b.budgetId },
  { header: 'FiscalYear', value: (b: Budget) => b.fiscalYear }, { header: 'Description', value: (b: Budget) => b.description },
  { header: 'Status', value: (b: Budget) => b.status }, { header: 'PlannedAmount', value: (b: Budget) => b.plannedAmount },
  { header: 'OwnerUPN', value: (b: Budget) => b.ownerUpn }
];
const searchFields = [(b: Budget) => b.title, (b: Budget) => b.description, (b: Budget) => b.budgetId, (b: Budget) => b.ownerUpn, (b: Budget) => String(b.fiscalYear)];

const Budgets: React.FC = () => {
  const t = useT();
  const { service, userEmail, budgets: state, capex, opex } = useHubData();

  const figuresOf = React.useCallback((b: Budget): IBudgetFigures => budgetFigures(b, capex.items, opex.items), [capex.items, opex.items]);

  const columns: IColumn[] = React.useMemo((): IColumn[] => makeColumns(t, figuresOf), [t, figuresOf]);
  const sortAccessors = React.useMemo(() => ({
    budgetId: (b: Budget) => b.budgetId, title: (b: Budget) => b.title, fiscalYear: (b: Budget) => b.fiscalYear, status: (b: Budget) => b.status,
    plannedAmount: (b: Budget) => b.plannedAmount, committed: (b: Budget) => figuresOf(b).committed, used: (b: Budget) => figuresOf(b).usedRatio
  }), [figuresOf]);

  const newItem = React.useCallback((): Budget => ({
    budgetId: generateBusinessId('BUD'), title: '', fiscalYear: new Date().getFullYear(), description: '', status: BudgetStatus.DRAFT, plannedAmount: 0, ownerUpn: userEmail
  }), [userEmail]);

  const csvFromRow = React.useCallback((row: Record<string, string>): Budget => ({
    budgetId: row.BudgetId || generateBusinessId('BUD'), title: row.Title ?? '', fiscalYear: csvNumber(row.FiscalYear) || new Date().getFullYear(),
    description: row.Description ?? '', status: csvEnum(row.Status, STATUSES, BudgetStatus.DRAFT), plannedAmount: csvNumber(row.PlannedAmount), ownerUpn: row.OwnerUPN || userEmail
  }), [userEmail]);

  const checkBeforeSave = (form: Budget, original: Budget | undefined): string | undefined => {
    const base = original ? original.status : BudgetStatus.DRAFT;
    return getAllowedBudgetStatuses(base).indexOf(form.status) === -1
      ? t('common.invalidTransition', { from: t(`status.${base}`), to: t(`status.${form.status}`) })
      : undefined;
  };

  const renderForm = ({ form, setForm, errors, original, isEdit, service: svc }: IFormContext<Budget>): React.ReactNode => {
    const base = original ? original.status : BudgetStatus.DRAFT;
    return (
      <>
        <TextField label={t('field.budgetId')} value={form.budgetId} readOnly={isEdit} onChange={(_, v) => setForm(p => ({ ...p, budgetId: v ?? '' }))} />
        <Dropdown label={t('field.status')} selectedKey={form.status} options={toOptions(getAllowedBudgetStatuses(base), t)} onChange={(_, o) => setForm(p => ({ ...p, status: (o?.key as BudgetStatus) ?? base }))} />
        <FormRow full><TextField label={t('field.title')} required value={form.title} errorMessage={errors.title && t(errors.title)} onChange={(_, v) => setForm(p => ({ ...p, title: v ?? '' }))} /></FormRow>
        <TextField label={t('field.fiscalYear')} type="number" value={String(form.fiscalYear)} errorMessage={errors.fiscalYear && t(errors.fiscalYear)} onChange={(_, v) => setForm(p => ({ ...p, fiscalYear: Number(v ?? 0) }))} />
        <TextField label={t('field.plannedAmount')} type="number" min={0} value={String(form.plannedAmount)} errorMessage={errors.plannedAmount && t(errors.plannedAmount)} onChange={(_, v) => setForm(p => ({ ...p, plannedAmount: Number(v ?? 0) }))} />
        <UserField label={t('field.owner')} required service={svc} value={form.ownerUpn} errorMessage={errors.ownerUpn && t(errors.ownerUpn)} onChange={e => setForm(p => ({ ...p, ownerUpn: e }))} />
        <FormRow full><TextField label={t('field.description')} multiline rows={3} value={form.description} onChange={(_, v) => setForm(p => ({ ...p, description: v ?? '' }))} /></FormRow>
      </>
    );
  };

  const renderDetail = (budget: Budget): React.ReactNode => {
    const f = figuresOf(budget);
    const ownCapex = capex.items.filter(c => c.budgetId === budget.budgetId);
    const ownOpex = opex.items.filter(o => o.budgetId === budget.budgetId);
    return (
      <Stack tokens={{ childrenGap: 16 }}>
        <DetailFields rows={[
          { label: t('field.budgetId'), value: budget.budgetId },
          { label: t('field.status'), value: t(`status.${budget.status}`) },
          { label: t('field.fiscalYear'), value: budget.fiscalYear },
          { label: t('field.description'), value: budget.description },
          { label: t('field.owner'), value: budget.ownerUpn },
          { label: t('field.plannedAmount'), value: formatMoney(f.planned) },
          { label: t('budget.committed'), value: formatMoney(f.committed) },
          { label: t('budget.paid'), value: formatMoney(f.paid) },
          { label: t('budget.remaining'), value: formatMoney(f.remaining) },
          { label: t('budget.used'), value: `${formatPercent(f.usedRatio)} · ${t(`budgetLevel.${f.level}`)}` },
          { label: t('common.modifiedBy'), value: `${(budget.modified ?? '').slice(0, 10)} ${budget.editor ?? ''}`.trim() }
        ]} />
        <RelatedList title={t('nav.capex')} items={ownCapex.map(c => ({ key: c.capexId, title: c.title, meta: `${formatMoney(c.amount)} · ${t(`status.${c.status}`)}` }))} />
        <RelatedList title={t('nav.opex')} items={ownOpex.map(o => ({ key: o.opexId, title: o.title, meta: `${formatMoney(opexAnnualAmount(o))} / ${t('budget.perYear')} · ${t(`status.${o.status}`)}` }))} />
      </Stack>
    );
  };

  return (
    <EntityScreen<Budget>
      textKey="budgets"
      listName={AppConfig.sharePoint.listNames.budgets}
      state={state}
      service={service}
      statuses={STATUSES}
      getStatus={b => b.status}
      getTitle={b => b.title}
      columns={columns}
      sortAccessors={sortAccessors}
      searchFields={searchFields}
      newItem={newItem}
      validate={validateBudget}
      buildPayload={buildBudgetPayload}
      checkBeforeSave={checkBeforeSave}
      renderForm={renderForm}
      renderDetail={renderDetail}
      quickStatuses={b => getAllowedBudgetStatuses(b.status)}
      archiveStatus={BudgetStatus.CLOSED}
      canArchive={b => getAllowedBudgetStatuses(b.status).indexOf(BudgetStatus.CLOSED) > -1 && b.status !== BudgetStatus.CLOSED}
      csvFileName="budgets.csv"
      csvColumns={csvColumns}
      csvFromRow={csvFromRow}
    />
  );
};

function makeColumns(t: TranslateFn, figuresOf: (b: Budget) => IBudgetFigures): IColumn[] {
  const mark: Record<string, string> = { OK: '🟢', NEAR: '🟠', OVER: '🔴' };
  return [
    { key: 'budgetId', name: t('field.budgetId'), fieldName: 'budgetId', minWidth: 120 },
    { key: 'title', name: t('field.title'), fieldName: 'title', minWidth: 200 },
    { key: 'fiscalYear', name: t('field.fiscalYear'), fieldName: 'fiscalYear', minWidth: 70 },
    { key: 'status', name: t('field.status'), fieldName: 'status', minWidth: 120 },
    { key: 'plannedAmount', name: t('field.plannedAmount'), minWidth: 100, onRender: (b: Budget) => formatMoney(b.plannedAmount) },
    { key: 'committed', name: t('budget.committed'), minWidth: 100, onRender: (b: Budget) => formatMoney(figuresOf(b).committed) },
    {
      key: 'used', name: t('budget.used'), minWidth: 150,
      onRender: (b: Budget) => { const f = figuresOf(b); return `${mark[f.level]} ${formatPercent(f.usedRatio)} · ${t(`budgetLevel.${f.level}`)}`; }
    }
  ];
}

export default Budgets;
