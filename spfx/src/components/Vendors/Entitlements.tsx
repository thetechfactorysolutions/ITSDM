import * as React from 'react';
import { Dropdown, IColumn, TextField } from '@fluentui/react';
import { AppConfig } from '../../config/AppConfig';
import { csvDate, csvEnum, csvNumber, enumValues } from '../../entities/csvHelpers';
import { buildEntitlementPayload } from '../../entities/payloads';
import { TranslateFn, useT } from '../../i18n/I18n';
import { Entitlement, EntitlementStatus, EntitlementType } from '../../models';
import { generateBusinessId } from '../../rules/ids';
import { entitlementAlert, getAllowedEntitlementStatuses } from '../../rules/matters';
import { validateEntitlement } from '../../rules/validation';
import { formatMoney } from '../../utils/format';
import { titleFor, titleMap } from '../../utils/lookup';
import DateField from '../shared/DateField';
import { DetailFields } from '../shared/DetailSection';
import EntityScreen, { IFormContext } from '../shared/EntityScreen';
import { FormRow } from '../shared/FormGrid';
import { useHubData } from '../shared/HubData';
import LinkField from '../shared/LinkField';
import { useFinanceLinkOptions } from '../shared/linkOptions';
import { toOptions } from '../shared/options';
import UserField from '../shared/UserField';

const STATUSES = enumValues(EntitlementStatus);
const TYPES = enumValues(EntitlementType);

const searchFields = [(e: Entitlement) => e.title, (e: Entitlement) => e.product, (e: Entitlement) => e.reference, (e: Entitlement) => e.entitlementId, (e: Entitlement) => e.notes];
const csvColumns = [
  { header: 'Title', value: (e: Entitlement) => e.title }, { header: 'EntitlementId', value: (e: Entitlement) => e.entitlementId }, { header: 'EntitlementType', value: (e: Entitlement) => e.type },
  { header: 'Status', value: (e: Entitlement) => e.status }, { header: 'Product', value: (e: Entitlement) => e.product }, { header: 'Reference', value: (e: Entitlement) => e.reference },
  { header: 'Quantity', value: (e: Entitlement) => e.quantity }, { header: 'StartDate', value: (e: Entitlement) => e.startDate }, { header: 'EndDate', value: (e: Entitlement) => e.endDate },
  { header: 'NoticeDays', value: (e: Entitlement) => e.noticeDays }, { header: 'AnnualCost', value: (e: Entitlement) => e.annualCost }, { header: 'VendorId', value: (e: Entitlement) => e.vendorId },
  { header: 'ContractId', value: (e: Entitlement) => e.contractId }, { header: 'OwnerUPN', value: (e: Entitlement) => e.ownerUpn }, { header: 'Notes', value: (e: Entitlement) => e.notes }
];

/** Text for the renewal column: nothing, "Renew in N days" or "Ended and not closed". */
const alertText = (t: TranslateFn, entitlement: Entitlement): string => {
  const info = entitlementAlert(entitlement);
  if (info.alert === 'LAPSED') {
    return `🔴 ${t('entitlement.lapsed', { days: Math.abs(info.daysLeft as number) })}`;
  }
  return info.alert === 'RENEWAL' ? `🟠 ${t('entitlement.renewIn', { days: info.daysLeft as number })}` : '';
};

/** Warranties, licences, support plans and subscriptions that end on a date, with the same renewal warning as contracts. */
const Entitlements: React.FC = () => {
  const t = useT();
  const { service, userEmail, entitlements: state, vendors, contracts } = useHubData();
  const { vendorOptions, contractOptions } = useFinanceLinkOptions();
  const vendorTitles = React.useMemo(() => titleMap(vendors.items, v => v.vendorId), [vendors.items]);

  const columns = React.useMemo((): IColumn[] => [
    { key: 'title', name: t('field.title'), fieldName: 'title', minWidth: 200 },
    { key: 'type', name: t('field.entitlementType'), minWidth: 100, onRender: (e: Entitlement) => t(`entitlementType.${e.type}`) },
    { key: 'vendorId', name: t('field.vendor'), minWidth: 130, onRender: (e: Entitlement) => titleFor(vendorTitles, e.vendorId) },
    { key: 'status', name: t('field.status'), fieldName: 'status', minWidth: 110 },
    { key: 'endDate', name: t('field.endDate'), fieldName: 'endDate', minWidth: 100 },
    { key: 'annualCost', name: t('field.annualCost'), minWidth: 90, onRender: (e: Entitlement) => formatMoney(e.annualCost) },
    { key: 'alert', name: t('entitlement.renewal'), minWidth: 170, onRender: (e: Entitlement) => alertText(t, e) }
  ], [t, vendorTitles]);

  const sortAccessors = React.useMemo(() => ({
    title: (e: Entitlement) => e.title, type: (e: Entitlement) => TYPES.indexOf(e.type), vendorId: (e: Entitlement) => titleFor(vendorTitles, e.vendorId), status: (e: Entitlement) => e.status,
    endDate: (e: Entitlement) => e.endDate, annualCost: (e: Entitlement) => e.annualCost, alert: (e: Entitlement) => entitlementAlert(e).daysLeft
  }), [vendorTitles]);

  const newItem = React.useCallback((): Entitlement => ({
    entitlementId: generateBusinessId('ENT'), title: '', type: EntitlementType.WARRANTY, status: EntitlementStatus.ACTIVE, product: '', reference: '', quantity: 1, startDate: '', endDate: '',
    noticeDays: AppConfig.entitlements.defaultNoticeDays, annualCost: 0, vendorId: '', contractId: '', ownerUpn: userEmail, notes: ''
  }), [userEmail]);

  const csvFromRow = React.useCallback((row: Record<string, string>): Entitlement => ({
    entitlementId: row.EntitlementId || generateBusinessId('ENT'), title: row.Title ?? '', type: csvEnum(row.EntitlementType, TYPES, EntitlementType.WARRANTY),
    status: csvEnum(row.Status, STATUSES, EntitlementStatus.ACTIVE), product: row.Product ?? '', reference: row.Reference ?? '', quantity: row.Quantity ? csvNumber(row.Quantity) : 1,
    startDate: csvDate(row.StartDate), endDate: csvDate(row.EndDate), noticeDays: row.NoticeDays ? csvNumber(row.NoticeDays) : AppConfig.entitlements.defaultNoticeDays,
    annualCost: csvNumber(row.AnnualCost), vendorId: row.VendorId ?? '', contractId: row.ContractId ?? '', ownerUpn: row.OwnerUPN || userEmail, notes: row.Notes ?? ''
  }), [userEmail]);

  const checkBeforeSave = (form: Entitlement, original: Entitlement | undefined): string | undefined => {
    const base = original ? original.status : EntitlementStatus.ACTIVE;
    return getAllowedEntitlementStatuses(base).indexOf(form.status) === -1
      ? t('common.invalidTransition', { from: t(`status.${base}`), to: t(`status.${form.status}`) })
      : undefined;
  };

  const renderForm = ({ form, setForm, errors, original, isEdit, service: svc }: IFormContext<Entitlement>): React.ReactNode => {
    const base = original ? original.status : EntitlementStatus.ACTIVE;
    return (
      <>
        <TextField label={t('field.entitlementId')} value={form.entitlementId} readOnly={isEdit} onChange={(_, v) => setForm(p => ({ ...p, entitlementId: v ?? '' }))} />
        <Dropdown label={t('field.status')} selectedKey={form.status} options={toOptions(getAllowedEntitlementStatuses(base), t)} onChange={(_, o) => setForm(p => ({ ...p, status: (o?.key as EntitlementStatus) ?? base }))} />
        <FormRow full><TextField label={t('field.title')} required value={form.title} errorMessage={errors.title && t(errors.title)} onChange={(_, v) => setForm(p => ({ ...p, title: v ?? '' }))} /></FormRow>
        <Dropdown label={t('field.entitlementType')} selectedKey={form.type} options={toOptions(TYPES, t, 'entitlementType')} onChange={(_, o) => setForm(p => ({ ...p, type: (o?.key as EntitlementType) ?? EntitlementType.WARRANTY }))} />
        <TextField label={t('field.product')} value={form.product} onChange={(_, v) => setForm(p => ({ ...p, product: v ?? '' }))} />
        <TextField label={t('field.reference')} description={t('entitlement.keyWarning')} value={form.reference} onChange={(_, v) => setForm(p => ({ ...p, reference: v ?? '' }))} />
        <TextField label={t('field.quantity')} type="number" min={0} value={String(form.quantity)} errorMessage={errors.quantity && t(errors.quantity)} onChange={(_, v) => setForm(p => ({ ...p, quantity: v === undefined || v === '' ? 0 : Number(v) }))} />
        <LinkField label={t('field.vendor')} value={form.vendorId} options={vendorOptions} onChange={id => setForm(p => ({ ...p, vendorId: id }))} />
        <LinkField label={t('field.contract')} value={form.contractId} options={contractOptions} onChange={id => setForm(p => ({ ...p, contractId: id }))} />
        <UserField label={t('field.owner')} required service={svc} value={form.ownerUpn} errorMessage={errors.ownerUpn && t(errors.ownerUpn)} onChange={e => setForm(p => ({ ...p, ownerUpn: e }))} />
        <DateField label={t('field.startDate')} value={form.startDate} errorMessage={errors.startDate && t(errors.startDate)} onChange={v => setForm(p => ({ ...p, startDate: v }))} />
        <DateField label={t('field.endDate')} value={form.endDate} errorMessage={errors.endDate && t(errors.endDate)} onChange={v => setForm(p => ({ ...p, endDate: v }))} />
        <TextField label={t('field.noticeDays')} type="number" min={0} max={365} value={String(form.noticeDays)} errorMessage={errors.noticeDays && t(errors.noticeDays)} onChange={(_, v) => setForm(p => ({ ...p, noticeDays: Number(v ?? 0) }))} />
        <TextField label={t('field.annualCost')} type="number" min={0} value={String(form.annualCost)} errorMessage={errors.annualCost && t(errors.annualCost)} onChange={(_, v) => setForm(p => ({ ...p, annualCost: v === undefined || v === '' ? 0 : Number(v) }))} />
        <FormRow full><TextField label={t('field.notes')} multiline rows={3} value={form.notes} onChange={(_, v) => setForm(p => ({ ...p, notes: v ?? '' }))} /></FormRow>
      </>
    );
  };

  const renderDetail = (e: Entitlement): React.ReactNode => {
    const vendor = vendors.items.filter(v => v.vendorId === e.vendorId)[0];
    const contract = contracts.items.filter(c => c.contractId === e.contractId)[0];
    return (
      <DetailFields rows={[
        { label: t('field.entitlementId'), value: e.entitlementId },
        { label: t('field.status'), value: t(`status.${e.status}`) },
        { label: t('entitlement.renewal'), value: alertText(t, e) },
        { label: t('field.entitlementType'), value: t(`entitlementType.${e.type}`) },
        { label: t('field.product'), value: e.product },
        { label: t('field.reference'), value: e.reference },
        { label: t('field.quantity'), value: e.quantity },
        { label: t('field.vendor'), value: vendor ? `${vendor.title} (${vendor.vendorId})` : e.vendorId },
        { label: t('field.contract'), value: contract ? `${contract.title} (${contract.contractId})` : e.contractId },
        { label: t('field.startDate'), value: e.startDate },
        { label: t('field.endDate'), value: e.endDate },
        { label: t('field.noticeDays'), value: e.noticeDays },
        { label: t('field.annualCost'), value: formatMoney(e.annualCost) },
        { label: t('field.owner'), value: e.ownerUpn },
        { label: t('field.notes'), value: e.notes },
        { label: t('common.modifiedBy'), value: `${(e.modified ?? '').slice(0, 10)} ${e.editor ?? ''}`.trim() }
      ]} />
    );
  };

  return (
    <EntityScreen<Entitlement>
      textKey="entitlements"
      listName={AppConfig.sharePoint.listNames.entitlements}
      state={state}
      service={service}
      statuses={STATUSES}
      getStatus={e => e.status}
      getTitle={e => e.title}
      columns={columns}
      sortAccessors={sortAccessors}
      searchFields={searchFields}
      newItem={newItem}
      validate={validateEntitlement}
      buildPayload={buildEntitlementPayload}
      checkBeforeSave={checkBeforeSave}
      renderForm={renderForm}
      renderDetail={renderDetail}
      quickStatuses={e => getAllowedEntitlementStatuses(e.status)}
      hideArchive
      archiveStatus={EntitlementStatus.CANCELLED}
      canArchive={() => false}
      csvFileName="entitlements.csv"
      csvColumns={csvColumns}
      csvFromRow={csvFromRow}
    />
  );
};

export default Entitlements;
