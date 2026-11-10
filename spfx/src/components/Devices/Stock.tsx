import * as React from 'react';
import { Dropdown, IColumn, Stack, Text, TextField } from '@fluentui/react';
import { AppConfig } from '../../config/AppConfig';
import { csvDate, csvEnum, csvNumber, enumValues } from '../../entities/csvHelpers';
import { buildStockPayload } from '../../entities/payloads';
import { TranslateFn, useT } from '../../i18n/I18n';
import { Country, StockCategory, StockItem, StockOwnership, StockStatus } from '../../models';
import { generateBusinessId } from '../../rules/ids';
import { IInsightsConfig } from '../shared/Insights';
import { coverage, fleetSize, isOrderLate, orderValue, projectedStock, stockLevel } from '../../rules/stock';
import { validateStock } from '../../rules/validation';
import { formatMoney } from '../../utils/format';
import { titleFor, titleMap } from '../../utils/lookup';
import DateField from '../shared/DateField';
import { DetailFields } from '../shared/DetailSection';
import EntityScreen, { IFormContext } from '../shared/EntityScreen';
import { FormRow } from '../shared/FormGrid';
import { useHubData } from '../shared/HubData';
import LinkField from '../shared/LinkField';
import { toOptions } from '../shared/options';

const STATUSES = enumValues(StockStatus);
const CATEGORIES = enumValues(StockCategory);
const COUNTRIES = enumValues(Country);
const OWNERSHIPS = enumValues(StockOwnership);

const searchFields = [(s: StockItem) => s.title, (s: StockItem) => s.notes, (s: StockItem) => s.stockId];
const sortAccessors = {
  title: (s: StockItem) => s.title, category: (s: StockItem) => CATEGORIES.indexOf(s.category), country: (s: StockItem) => s.country, onHand: (s: StockItem) => s.onHand,
  minLevel: (s: StockItem) => s.minLevel, onOrder: (s: StockItem) => s.onOrder, expectedOn: (s: StockItem) => s.expectedOn, level: (s: StockItem) => ['LOW', 'ORDERED', 'OK'].indexOf(stockLevel(s))
};
const csvColumns = [
  { header: 'Title', value: (s: StockItem) => s.title }, { header: 'StockId', value: (s: StockItem) => s.stockId }, { header: 'Category', value: (s: StockItem) => s.category },
  { header: 'Country', value: (s: StockItem) => s.country }, { header: 'OnHand', value: (s: StockItem) => s.onHand }, { header: 'MinLevel', value: (s: StockItem) => s.minLevel },
  { header: 'InUse', value: (s: StockItem) => s.inUse }, { header: 'OnOrder', value: (s: StockItem) => s.onOrder }, { header: 'ExpectedOn', value: (s: StockItem) => s.expectedOn },
  { header: 'UnitCost', value: (s: StockItem) => s.unitCost }, { header: 'Ownership', value: (s: StockItem) => s.ownership }, { header: 'VendorId', value: (s: StockItem) => s.vendorId },
  { header: 'Status', value: (s: StockItem) => s.status }, { header: 'Notes', value: (s: StockItem) => s.notes }
];

const levelText = (t: TranslateFn, item: StockItem): string => {
  const level = stockLevel(item);
  return level === 'LOW' ? `🔴 ${t('stock.low')}` : level === 'ORDERED' ? `🟠 ${t('stock.ordered')}` : '';
};

const makeColumns = (t: TranslateFn): IColumn[] => [
  { key: 'title', name: t('field.title'), fieldName: 'title', minWidth: 200 },
  { key: 'category', name: t('field.category'), minWidth: 90, onRender: (s: StockItem) => t(`stockCategory.${s.category}`) },
  { key: 'country', name: t('field.country'), minWidth: 70, onRender: (s: StockItem) => t(`country.${s.country}`) },
  { key: 'onHand', name: t('field.onHand'), fieldName: 'onHand', minWidth: 70 },
  { key: 'minLevel', name: t('field.minLevel'), fieldName: 'minLevel', minWidth: 60 },
  { key: 'onOrder', name: t('field.onOrder'), fieldName: 'onOrder', minWidth: 70 },
  { key: 'expectedOn', name: t('field.expectedOn'), minWidth: 110, onRender: (s: StockItem) => `${isOrderLate(s) ? '🔴 ' : ''}${s.expectedOn ?? ''}` },
  { key: 'level', name: t('field.stockLevel'), minWidth: 150, onRender: (s: StockItem) => levelText(t, s) }
];

const numberField = (t: TranslateFn, label: string, value: number, error: string | undefined, onChange: (next: number) => void): React.ReactNode => (
  <TextField label={label} type="number" min={0} value={String(value)} errorMessage={error && t(error)} onChange={(_, v) => onChange(v === undefined || v === '' ? 0 : Number(v))} />
);

/** The devices on the shelf, in use and on order, with an alarm when the stock runs low. */
const Stock: React.FC = () => {
  const t = useT();
  const stockInsights: IInsightsConfig<StockItem> = {
    stats: items => {
      const low = items.filter(i => stockLevel(i) === 'LOW');
      const late = items.filter(i => isOrderLate(i));
      return [
        { key: 'low', label: t('dashboard.lowStock'), icon: 'box', tone: low.length > 0 ? 'danger' : 'good', count: low.length, chip: { key: 'low', label: t('dashboard.lowStock'), test: (i: StockItem) => stockLevel(i) === 'LOW' } },
        { key: 'lateOrders', label: t('stock.lateOrders'), icon: 'clock', tone: late.length > 0 ? 'warning' : 'good', count: late.length, chip: { key: 'lateOrders', label: t('stock.lateOrders'), test: (i: StockItem) => isOrderLate(i) } }
      ];
    }
  };
  const { service, stock: state, vendors } = useHubData();
  const columns = React.useMemo(() => makeColumns(t), [t]);
  const vendorOptions = React.useMemo(() => vendors.items.map(v => ({ id: v.vendorId, title: v.title })), [vendors.items]);
  const vendorTitles = React.useMemo(() => titleMap(vendors.items, v => v.vendorId), [vendors.items]);

  const newItem = React.useCallback((): StockItem => ({
    stockId: generateBusinessId('STK'), title: '', category: StockCategory.LAPTOP, country: Country.ES, onHand: 0, minLevel: 0, inUse: 0, onOrder: 0, expectedOn: '', unitCost: 0,
    ownership: StockOwnership.RENTED, vendorId: '', status: StockStatus.ACTIVE, notes: ''
  }), []);

  const csvFromRow = React.useCallback((row: Record<string, string>): StockItem => ({
    stockId: row.StockId || generateBusinessId('STK'), title: row.Title ?? '', category: csvEnum(row.Category, CATEGORIES, StockCategory.OTHER), country: csvEnum(row.Country, COUNTRIES, Country.ES),
    onHand: csvNumber(row.OnHand), minLevel: csvNumber(row.MinLevel), inUse: csvNumber(row.InUse), onOrder: csvNumber(row.OnOrder), expectedOn: csvDate(row.ExpectedOn), unitCost: csvNumber(row.UnitCost),
    ownership: csvEnum(row.Ownership, OWNERSHIPS, StockOwnership.RENTED), vendorId: row.VendorId ?? '', status: csvEnum(row.Status, STATUSES, StockStatus.ACTIVE), notes: row.Notes ?? ''
  }), []);

  const renderForm = ({ form, setForm, errors, isEdit }: IFormContext<StockItem>): React.ReactNode => (
    <>
      <TextField label={t('field.stockId')} value={form.stockId} readOnly={isEdit} onChange={(_, v) => setForm(p => ({ ...p, stockId: v ?? '' }))} />
      <Dropdown label={t('field.status')} selectedKey={form.status} options={toOptions(STATUSES, t)} onChange={(_, o) => setForm(p => ({ ...p, status: (o?.key as StockStatus) ?? StockStatus.ACTIVE }))} />
      <FormRow full><TextField label={t('field.title')} required value={form.title} errorMessage={errors.title && t(errors.title)} onChange={(_, v) => setForm(p => ({ ...p, title: v ?? '' }))} /></FormRow>
      <Dropdown label={t('field.category')} selectedKey={form.category} options={toOptions(CATEGORIES, t, 'stockCategory')} onChange={(_, o) => setForm(p => ({ ...p, category: (o?.key as StockCategory) ?? StockCategory.OTHER }))} />
      <Dropdown label={t('field.country')} selectedKey={form.country} options={toOptions(COUNTRIES, t, 'country')} onChange={(_, o) => setForm(p => ({ ...p, country: (o?.key as Country) ?? Country.ES }))} />
      {numberField(t, t('field.onHand'), form.onHand, errors.onHand, v => setForm(p => ({ ...p, onHand: v })))}
      {numberField(t, t('field.minLevel'), form.minLevel, errors.minLevel, v => setForm(p => ({ ...p, minLevel: v })))}
      {numberField(t, t('field.inUse'), form.inUse, errors.inUse, v => setForm(p => ({ ...p, inUse: v })))}
      {numberField(t, t('field.onOrder'), form.onOrder, errors.onOrder, v => setForm(p => ({ ...p, onOrder: v })))}
      <DateField label={t('field.expectedOn')} value={form.expectedOn} errorMessage={errors.expectedOn && t(errors.expectedOn)} onChange={v => setForm(p => ({ ...p, expectedOn: v }))} />
      {numberField(t, t('field.unitCost'), form.unitCost, errors.unitCost, v => setForm(p => ({ ...p, unitCost: v })))}
      <Dropdown label={t('field.ownership')} selectedKey={form.ownership} options={toOptions(OWNERSHIPS, t, 'stockOwnership')} onChange={(_, o) => setForm(p => ({ ...p, ownership: (o?.key as StockOwnership) ?? StockOwnership.RENTED }))} />
      <LinkField label={t('field.vendor')} value={form.vendorId} options={vendorOptions} onChange={id => setForm(p => ({ ...p, vendorId: id }))} />
      <FormRow full><TextField label={t('field.notes')} multiline rows={3} value={form.notes} onChange={(_, v) => setForm(p => ({ ...p, notes: v ?? '' }))} /></FormRow>
    </>
  );

  const renderDetail = (s: StockItem): React.ReactNode => (
    <DetailFields rows={[
      { label: t('field.stockId'), value: s.stockId },
      { label: t('field.stockLevel'), value: levelText(t, s) || t('stock.fine') },
      { label: t('field.category'), value: t(`stockCategory.${s.category}`) },
      { label: t('field.country'), value: t(`country.${s.country}`) },
      { label: t('field.onHand'), value: s.onHand },
      { label: t('field.minLevel'), value: s.minLevel },
      { label: t('stock.coverage'), value: coverage(s) === undefined ? '—' : `${coverage(s)}x` },
      { label: t('field.inUse'), value: s.inUse },
      { label: t('stock.fleet'), value: fleetSize(s) },
      { label: t('field.onOrder'), value: s.onOrder },
      { label: t('stock.projected'), value: projectedStock(s) },
      { label: t('field.expectedOn'), value: `${isOrderLate(s) ? '🔴 ' : ''}${s.expectedOn ?? ''}`.trim() },
      { label: t('field.unitCost'), value: formatMoney(s.unitCost) },
      { label: t('stock.orderValue'), value: formatMoney(orderValue(s)) },
      { label: t('field.ownership'), value: t(`stockOwnership.${s.ownership}`) },
      { label: t('field.vendor'), value: s.vendorId ? `${titleFor(vendorTitles, s.vendorId)} (${s.vendorId})` : '' },
      { label: t('field.notes'), value: s.notes },
      { label: t('common.modifiedBy'), value: `${(s.modified ?? '').slice(0, 10)} ${s.editor ?? ''}`.trim() }
    ]} />
  );

  const low = state.items.filter(s => stockLevel(s) === 'LOW').length;

  return (
    <EntityScreen<StockItem>
      textKey="stock"
      listName={AppConfig.sharePoint.listNames.stock}
      state={state}
      service={service}
      statuses={STATUSES}
      getStatus={s => s.status}
      getTitle={s => s.title}
      columns={columns}
      sortAccessors={sortAccessors}
      searchFields={searchFields}
      insights={stockInsights}
      newItem={newItem}
      validate={validateStock}
      buildPayload={buildStockPayload}
      renderForm={renderForm}
      renderDetail={renderDetail}
      quickStatuses={() => STATUSES}
      archiveStatus={StockStatus.ARCHIVED}
      canArchive={s => s.status === StockStatus.ACTIVE}
      hideAttachments
      initialView={{ sortKey: 'level', sortDescending: false }}
      extraContent={low > 0 ? <Stack><Text>{t('stock.lowSummary', { count: low })}</Text></Stack> : undefined}
      csvFileName="stock.csv"
      csvColumns={csvColumns}
      csvFromRow={csvFromRow}
    />
  );
};

export default Stock;
