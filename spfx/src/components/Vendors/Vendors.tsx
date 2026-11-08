import * as React from 'react';
import { Dropdown, IColumn, Stack, TextField } from '@fluentui/react';
import { AppConfig } from '../../config/AppConfig';
import { csvEnum, enumValues } from '../../entities/csvHelpers';
import { buildVendorPayload } from '../../entities/payloads';
import { TranslateFn, useT } from '../../i18n/I18n';
import { Vendor, VendorCategory, VendorStatus } from '../../models';
import { getAllowedVendorStatuses, opexAnnualAmount } from '../../rules/finance';
import { generateBusinessId } from '../../rules/ids';
import { validateVendor } from '../../rules/validation';
import { formatMoney } from '../../utils/format';
import { DetailFields, RelatedList } from '../shared/DetailSection';
import EntityScreen, { IFormContext } from '../shared/EntityScreen';
import { FormRow } from '../shared/FormGrid';
import { useHubData } from '../shared/HubData';
import { toOptions } from '../shared/options';
import UserField from '../shared/UserField';

const STATUSES = enumValues(VendorStatus);
const CATEGORIES = enumValues(VendorCategory);

const makeColumns = (t: TranslateFn): IColumn[] => [
  { key: 'vendorId', name: t('field.vendorId'), fieldName: 'vendorId', minWidth: 120 },
  { key: 'title', name: t('field.vendorName'), fieldName: 'title', minWidth: 200 },
  { key: 'category', name: t('field.category'), minWidth: 120, onRender: (v: Vendor) => t(`vendorCategory.${v.category}`) },
  { key: 'status', name: t('field.status'), fieldName: 'status', minWidth: 120 },
  { key: 'contactName', name: t('field.contactName'), fieldName: 'contactName', minWidth: 140 },
  { key: 'ownerUpn', name: t('field.owner'), fieldName: 'ownerUpn', minWidth: 160 }
];
const sortAccessors = {
  vendorId: (v: Vendor) => v.vendorId, title: (v: Vendor) => v.title, category: (v: Vendor) => v.category, status: (v: Vendor) => v.status,
  contactName: (v: Vendor) => v.contactName, ownerUpn: (v: Vendor) => v.ownerUpn
};
const searchFields = [(v: Vendor) => v.title, (v: Vendor) => v.description, (v: Vendor) => v.vendorId, (v: Vendor) => v.contactName, (v: Vendor) => v.contactEmail];
const csvColumns = [
  { header: 'Title', value: (v: Vendor) => v.title }, { header: 'VendorId', value: (v: Vendor) => v.vendorId }, { header: 'Description', value: (v: Vendor) => v.description },
  { header: 'Status', value: (v: Vendor) => v.status }, { header: 'Category', value: (v: Vendor) => v.category }, { header: 'ContactName', value: (v: Vendor) => v.contactName },
  { header: 'ContactEmail', value: (v: Vendor) => v.contactEmail }, { header: 'Website', value: (v: Vendor) => v.website }, { header: 'OwnerUPN', value: (v: Vendor) => v.ownerUpn }
];

const Vendors: React.FC = () => {
  const t = useT();
  const { service, userEmail, vendors: state, contracts, capex, opex } = useHubData();
  const columns = React.useMemo(() => makeColumns(t), [t]);

  const newItem = React.useCallback((): Vendor => ({
    vendorId: generateBusinessId('VEN'), title: '', description: '', status: VendorStatus.ACTIVE, category: VendorCategory.SOFTWARE,
    contactName: '', contactEmail: '', website: '', ownerUpn: userEmail
  }), [userEmail]);

  const csvFromRow = React.useCallback((row: Record<string, string>): Vendor => ({
    vendorId: row.VendorId || generateBusinessId('VEN'), title: row.Title ?? '', description: row.Description ?? '', status: csvEnum(row.Status, STATUSES, VendorStatus.ACTIVE),
    category: csvEnum(row.Category, CATEGORIES, VendorCategory.OTHER), contactName: row.ContactName ?? '', contactEmail: row.ContactEmail ?? '', website: row.Website ?? '', ownerUpn: row.OwnerUPN ?? ''
  }), []);

  const checkBeforeSave = (form: Vendor, original: Vendor | undefined): string | undefined => {
    const base = original ? original.status : VendorStatus.ACTIVE;
    return getAllowedVendorStatuses(base).indexOf(form.status) === -1
      ? t('common.invalidTransition', { from: t(`status.${base}`), to: t(`status.${form.status}`) })
      : undefined;
  };

  const renderForm = ({ form, setForm, errors, original, isEdit, service: svc }: IFormContext<Vendor>): React.ReactNode => {
    const base = original ? original.status : VendorStatus.ACTIVE;
    return (
      <>
        <TextField label={t('field.vendorId')} value={form.vendorId} readOnly={isEdit} onChange={(_, v) => setForm(p => ({ ...p, vendorId: v ?? '' }))} />
        <Dropdown label={t('field.status')} selectedKey={form.status} options={toOptions(getAllowedVendorStatuses(base), t)} onChange={(_, o) => setForm(p => ({ ...p, status: (o?.key as VendorStatus) ?? base }))} />
        <FormRow full><TextField label={t('field.vendorName')} required value={form.title} errorMessage={errors.title && t(errors.title)} onChange={(_, v) => setForm(p => ({ ...p, title: v ?? '' }))} /></FormRow>
        <FormRow full><TextField label={t('field.description')} multiline rows={3} value={form.description} onChange={(_, v) => setForm(p => ({ ...p, description: v ?? '' }))} /></FormRow>
        <Dropdown label={t('field.category')} selectedKey={form.category} options={toOptions(CATEGORIES, t, 'vendorCategory')} onChange={(_, o) => setForm(p => ({ ...p, category: (o?.key as VendorCategory) ?? VendorCategory.OTHER }))} />
        <TextField label={t('field.website')} value={form.website} onChange={(_, v) => setForm(p => ({ ...p, website: v ?? '' }))} />
        <TextField label={t('field.contactName')} value={form.contactName} onChange={(_, v) => setForm(p => ({ ...p, contactName: v ?? '' }))} />
        <TextField label={t('field.contactEmail')} value={form.contactEmail} errorMessage={errors.contactEmail && t(errors.contactEmail)} onChange={(_, v) => setForm(p => ({ ...p, contactEmail: v ?? '' }))} />
        <UserField label={t('field.relationshipOwner')} service={svc} value={form.ownerUpn} errorMessage={errors.ownerUpn && t(errors.ownerUpn)} onChange={e => setForm(p => ({ ...p, ownerUpn: e }))} />
      </>
    );
  };

  const renderDetail = (vendor: Vendor): React.ReactNode => {
    const myContracts = contracts.items.filter(c => c.vendorId === vendor.vendorId);
    const myCapex = capex.items.filter(c => c.vendorId === vendor.vendorId);
    const myOpex = opex.items.filter(o => o.vendorId === vendor.vendorId);
    return (
      <Stack tokens={{ childrenGap: 16 }}>
        <DetailFields rows={[
          { label: t('field.vendorId'), value: vendor.vendorId },
          { label: t('field.status'), value: t(`status.${vendor.status}`) },
          { label: t('field.category'), value: t(`vendorCategory.${vendor.category}`) },
          { label: t('field.description'), value: vendor.description },
          { label: t('field.contactName'), value: vendor.contactName },
          { label: t('field.contactEmail'), value: vendor.contactEmail },
          { label: t('field.website'), value: vendor.website },
          { label: t('field.relationshipOwner'), value: vendor.ownerUpn },
          { label: t('common.modifiedBy'), value: `${(vendor.modified ?? '').slice(0, 10)} ${vendor.editor ?? ''}`.trim() }
        ]} />
        <RelatedList title={t('nav.contracts')} items={myContracts.map(c => ({ key: c.contractId, title: c.title, meta: `${t(`status.${c.status}`)} · ${formatMoney(c.annualValue)} / ${t('budget.perYear')}` }))} />
        <RelatedList title={t('nav.capex')} items={myCapex.map(c => ({ key: c.capexId, title: c.title, meta: `${formatMoney(c.amount)} · ${t(`status.${c.status}`)}` }))} />
        <RelatedList title={t('nav.opex')} items={myOpex.map(o => ({ key: o.opexId, title: o.title, meta: `${formatMoney(opexAnnualAmount(o))} / ${t('budget.perYear')} · ${t(`status.${o.status}`)}` }))} />
      </Stack>
    );
  };

  return (
    <EntityScreen<Vendor>
      textKey="vendors"
      listName={AppConfig.sharePoint.listNames.vendors}
      state={state}
      service={service}
      statuses={STATUSES}
      getStatus={v => v.status}
      getTitle={v => v.title}
      columns={columns}
      sortAccessors={sortAccessors}
      searchFields={searchFields}
      newItem={newItem}
      validate={validateVendor}
      buildPayload={buildVendorPayload}
      checkBeforeSave={checkBeforeSave}
      renderForm={renderForm}
      renderDetail={renderDetail}
      quickStatuses={v => getAllowedVendorStatuses(v.status)}
      archiveStatus={VendorStatus.INACTIVE}
      canArchive={v => v.status !== VendorStatus.INACTIVE}
      csvFileName="vendors.csv"
      csvColumns={csvColumns}
      csvFromRow={csvFromRow}
    />
  );
};

export default Vendors;
