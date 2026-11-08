import * as React from 'react';
import { Dropdown, IColumn, Text, TextField } from '@fluentui/react';
import { AppConfig } from '../../config/AppConfig';
import { csvDate, csvEnum, csvNumber, enumValues } from '../../entities/csvHelpers';
import { buildKpiPayload } from '../../entities/payloads';
import { TranslateFn, useT } from '../../i18n/I18n';
import { Kpi, KpiCategory, KpiDirection, KpiStatus } from '../../models';
import { generateBusinessId } from '../../rules/ids';
import { applyKpiMeasurement, getAllowedKpiStatuses, kpiHealth, KpiHealth, kpiTrend } from '../../rules/operations';
import { validateKpi } from '../../rules/validation';
import { formatNumber } from '../../utils/format';
import DateField from '../shared/DateField';
import { DetailFields } from '../shared/DetailSection';
import EntityScreen, { IFormContext } from '../shared/EntityScreen';
import { FormRow } from '../shared/FormGrid';
import { useHubData } from '../shared/HubData';
import LinkField from '../shared/LinkField';
import { useOperationsLinkOptions } from '../shared/linkOptions';
import { toOptions } from '../shared/options';
import UserField from '../shared/UserField';

const STATUSES = enumValues(KpiStatus);
const CATEGORIES = enumValues(KpiCategory);
const DIRECTIONS = enumValues(KpiDirection);

const HEALTH_MARK: Record<KpiHealth, string> = { ON_TARGET: '🟢', AT_RISK: '🟠', OFF_TARGET: '🔴' };
const TREND_MARK: Record<string, string> = { IMPROVING: '↗', WORSENING: '↘', STABLE: '→', UNKNOWN: '' };
const HEALTH_ORDER: KpiHealth[] = ['ON_TARGET', 'AT_RISK', 'OFF_TARGET'];

const searchFields = [(k: Kpi) => k.title, (k: Kpi) => k.description, (k: Kpi) => k.kpiId, (k: Kpi) => k.ownerUpn];
const sortAccessors = {
  kpiId: (k: Kpi) => k.kpiId, title: (k: Kpi) => k.title, category: (k: Kpi) => k.category, health: (k: Kpi) => HEALTH_ORDER.indexOf(kpiHealth(k)),
  currentValue: (k: Kpi) => k.currentValue, target: (k: Kpi) => k.target, measuredOn: (k: Kpi) => k.measuredOn
};
const csvColumns = [
  { header: 'Title', value: (k: Kpi) => k.title }, { header: 'KpiId', value: (k: Kpi) => k.kpiId }, { header: 'Description', value: (k: Kpi) => k.description },
  { header: 'Category', value: (k: Kpi) => k.category }, { header: 'Status', value: (k: Kpi) => k.status }, { header: 'Unit', value: (k: Kpi) => k.unit },
  { header: 'Direction', value: (k: Kpi) => k.direction }, { header: 'Target', value: (k: Kpi) => k.target }, { header: 'CurrentValue', value: (k: Kpi) => k.currentValue },
  { header: 'PreviousValue', value: (k: Kpi) => k.previousValue }, { header: 'MeasuredOn', value: (k: Kpi) => k.measuredOn }, { header: 'OwnerUPN', value: (k: Kpi) => k.ownerUpn },
  { header: 'ProjectId', value: (k: Kpi) => k.projectId }
];

const withUnit = (value: number, unit: string): string => `${formatNumber(value)}${unit ? ` ${unit}` : ''}`;

function makeColumns(t: TranslateFn): IColumn[] {
  return [
    { key: 'kpiId', name: t('field.kpiId'), fieldName: 'kpiId', minWidth: 110 },
    { key: 'title', name: t('field.kpiName'), fieldName: 'title', minWidth: 220 },
    { key: 'category', name: t('field.category'), minWidth: 90, onRender: (k: Kpi) => t(`kpiCategory.${k.category}`) },
    { key: 'health', name: t('field.health'), minWidth: 130, onRender: (k: Kpi) => `${HEALTH_MARK[kpiHealth(k)]} ${t(`kpiHealth.${kpiHealth(k)}`)}` },
    { key: 'currentValue', name: t('field.currentValue'), minWidth: 110, onRender: (k: Kpi) => `${withUnit(k.currentValue, k.unit)} ${TREND_MARK[kpiTrend(k)]}`.trim() },
    { key: 'target', name: t('field.target'), minWidth: 100, onRender: (k: Kpi) => withUnit(k.target, k.unit) },
    { key: 'measuredOn', name: t('field.measuredOn'), fieldName: 'measuredOn', minWidth: 100 }
  ];
}

const Kpis: React.FC = () => {
  const t = useT();
  const { service, userEmail, kpis: state, projects } = useHubData();
  const { projectOptions } = useOperationsLinkOptions();
  const columns = React.useMemo(() => makeColumns(t), [t]);

  const newItem = React.useCallback((): Kpi => ({
    kpiId: generateBusinessId('KPI'), title: '', description: '', category: KpiCategory.SERVICE, status: KpiStatus.ACTIVE, unit: '', direction: KpiDirection.HIGHER,
    target: 0, currentValue: 0, previousValue: undefined, measuredOn: '', ownerUpn: userEmail, projectId: ''
  }), [userEmail]);

  const csvFromRow = React.useCallback((row: Record<string, string>): Kpi => ({
    kpiId: row.KpiId || generateBusinessId('KPI'), title: row.Title ?? '', description: row.Description ?? '', category: csvEnum(row.Category, CATEGORIES, KpiCategory.OTHER),
    status: csvEnum(row.Status, STATUSES, KpiStatus.ACTIVE), unit: row.Unit ?? '', direction: csvEnum(row.Direction, DIRECTIONS, KpiDirection.HIGHER), target: csvNumber(row.Target),
    currentValue: csvNumber(row.CurrentValue), previousValue: row.PreviousValue ? csvNumber(row.PreviousValue) : undefined, measuredOn: csvDate(row.MeasuredOn), ownerUpn: row.OwnerUPN || userEmail, projectId: row.ProjectId ?? ''
  }), [userEmail]);

  const checkBeforeSave = (form: Kpi, original: Kpi | undefined): string | undefined => {
    const base = original ? original.status : KpiStatus.ACTIVE;
    return getAllowedKpiStatuses(base).indexOf(form.status) === -1
      ? t('common.invalidTransition', { from: t(`status.${base}`), to: t(`status.${form.status}`) })
      : undefined;
  };

  const renderForm = ({ form, setForm, errors, original, isEdit, service: svc }: IFormContext<Kpi>): React.ReactNode => {
    const base = original ? original.status : KpiStatus.ACTIVE;
    const health = kpiHealth(form);
    const trend = kpiTrend(form);
    return (
      <>
        <TextField label={t('field.kpiId')} value={form.kpiId} readOnly={isEdit} onChange={(_, v) => setForm(p => ({ ...p, kpiId: v ?? '' }))} />
        <Dropdown label={t('field.status')} selectedKey={form.status} options={toOptions(getAllowedKpiStatuses(base), t)} onChange={(_, o) => setForm(p => ({ ...p, status: (o?.key as KpiStatus) ?? base }))} />
        <FormRow full><TextField label={t('field.kpiName')} required value={form.title} errorMessage={errors.title && t(errors.title)} onChange={(_, v) => setForm(p => ({ ...p, title: v ?? '' }))} /></FormRow>
        <FormRow full><TextField label={t('field.description')} multiline rows={2} value={form.description} onChange={(_, v) => setForm(p => ({ ...p, description: v ?? '' }))} /></FormRow>
        <Dropdown label={t('field.category')} selectedKey={form.category} options={toOptions(CATEGORIES, t, 'kpiCategory')} onChange={(_, o) => setForm(p => ({ ...p, category: (o?.key as KpiCategory) ?? KpiCategory.OTHER }))} />
        <TextField label={t('field.unit')} value={form.unit} onChange={(_, v) => setForm(p => ({ ...p, unit: v ?? '' }))} />
        <Dropdown label={t('field.direction')} selectedKey={form.direction} options={toOptions(DIRECTIONS, t, 'kpiDirection')} onChange={(_, o) => setForm(p => ({ ...p, direction: (o?.key as KpiDirection) ?? KpiDirection.HIGHER }))} />
        <TextField label={t('field.target')} type="number" value={String(form.target)} errorMessage={errors.target && t(errors.target)} onChange={(_, v) => setForm(p => ({ ...p, target: Number(v ?? 0) }))} />
        <TextField label={t('field.currentValue')} type="number" value={String(form.currentValue)} errorMessage={errors.currentValue && t(errors.currentValue)} onChange={(_, v) => setForm(p => ({ ...p, currentValue: Number(v ?? 0) }))} />
        <TextField label={t('field.previousValue')} type="number" value={form.previousValue === undefined ? '' : String(form.previousValue)} errorMessage={errors.previousValue && t(errors.previousValue)}
          onChange={(_, v) => setForm(p => ({ ...p, previousValue: v === undefined || v === '' ? undefined : Number(v) }))} />
        <FormRow full><Text>{t('field.health')}: <strong>{HEALTH_MARK[health]} {t(`kpiHealth.${health}`)}</strong>{trend !== 'UNKNOWN' && <> · {TREND_MARK[trend]} {t(`kpiTrend.${trend}`)}</>}</Text></FormRow>
        <DateField label={t('field.measuredOn')} value={form.measuredOn} errorMessage={errors.measuredOn && t(errors.measuredOn)} onChange={v => setForm(p => ({ ...p, measuredOn: v }))} />
        <UserField label={t('field.owner')} service={svc} value={form.ownerUpn} errorMessage={errors.ownerUpn && t(errors.ownerUpn)} onChange={e => setForm(p => ({ ...p, ownerUpn: e }))} />
        <LinkField label={t('field.project')} value={form.projectId} options={projectOptions} onChange={id => setForm(p => ({ ...p, projectId: id }))} />
      </>
    );
  };

  const renderDetail = (k: Kpi): React.ReactNode => {
    const project = projects.items.filter(p => p.projectId === k.projectId)[0];
    const health = kpiHealth(k);
    const trend = kpiTrend(k);
    return (
      <DetailFields rows={[
        { label: t('field.kpiId'), value: k.kpiId },
        { label: t('field.status'), value: t(`status.${k.status}`) },
        { label: t('field.category'), value: t(`kpiCategory.${k.category}`) },
        { label: t('field.description'), value: k.description },
        { label: t('field.direction'), value: t(`kpiDirection.${k.direction}`) },
        { label: t('field.health'), value: `${HEALTH_MARK[health]} ${t(`kpiHealth.${health}`)}` },
        { label: t('field.currentValue'), value: withUnit(k.currentValue, k.unit) },
        { label: t('field.target'), value: withUnit(k.target, k.unit) },
        { label: t('field.previousValue'), value: k.previousValue === undefined ? '' : withUnit(k.previousValue, k.unit) },
        { label: t('field.trend'), value: trend === 'UNKNOWN' ? '' : `${TREND_MARK[trend]} ${t(`kpiTrend.${trend}`)}` },
        { label: t('field.measuredOn'), value: k.measuredOn },
        { label: t('field.owner'), value: k.ownerUpn },
        { label: t('field.project'), value: project ? `${project.title} (${project.projectId})` : k.projectId },
        { label: t('common.modifiedBy'), value: `${(k.modified ?? '').slice(0, 10)} ${k.editor ?? ''}`.trim() }
      ]} />
    );
  };

  return (
    <EntityScreen<Kpi>
      textKey="kpis"
      listName={AppConfig.sharePoint.listNames.kpis}
      state={state}
      service={service}
      statuses={STATUSES}
      getStatus={k => k.status}
      getTitle={k => k.title}
      columns={columns}
      sortAccessors={sortAccessors}
      searchFields={searchFields}
      newItem={newItem}
      validate={validateKpi}
      buildPayload={buildKpiPayload}
      prepareForSave={(form, original) => applyKpiMeasurement(form, original)}
      checkBeforeSave={checkBeforeSave}
      renderForm={renderForm}
      renderDetail={renderDetail}
      quickStatuses={k => getAllowedKpiStatuses(k.status)}
      archiveStatus={KpiStatus.RETIRED}
      canArchive={k => k.status !== KpiStatus.RETIRED}
      csvFileName="kpis.csv"
      csvColumns={csvColumns}
      csvFromRow={csvFromRow}
    />
  );
};

export default Kpis;
