import * as React from 'react';
import { Dropdown, IColumn, TextField } from '@fluentui/react';
import { AppConfig } from '../../config/AppConfig';
import { csvEnum, csvNumber, enumValues } from '../../entities/csvHelpers';
import { buildPurchaseOrderPayload } from '../../entities/payloads';
import { useT } from '../../i18n/I18n';
import { PoStatus, PurchaseOrder } from '../../models';
import { generateBusinessId } from '../../rules/ids';
import { isApprover, poFigures } from '../../rules/purchases';
import { validatePurchaseOrder } from '../../rules/validation';
import { formatMoney } from '../../utils/format';
import { titleFor, titleMap } from '../../utils/lookup';
import { DetailFields } from '../shared/DetailSection';
import EntityScreen, { IFormContext } from '../shared/EntityScreen';
import { FormRow } from '../shared/FormGrid';
import { useHubData } from '../shared/HubData';
import LinkField from '../shared/LinkField';
import { toOptions } from '../shared/options';
import { usePurchaseRole } from './usePurchaseRole';

const STATUSES = enumValues(PoStatus);

const searchFields = [(p: PurchaseOrder) => p.title, (p: PurchaseOrder) => p.notes, (p: PurchaseOrder) => p.poId];
const sortAccessors = { title: (p: PurchaseOrder) => p.title, amount: (p: PurchaseOrder) => p.amount, status: (p: PurchaseOrder) => p.status };
const csvColumns = [
  { header: 'Title', value: (p: PurchaseOrder) => p.title }, { header: 'PoId', value: (p: PurchaseOrder) => p.poId }, { header: 'VendorId', value: (p: PurchaseOrder) => p.vendorId },
  { header: 'Amount', value: (p: PurchaseOrder) => p.amount }, { header: 'Status', value: (p: PurchaseOrder) => p.status }, { header: 'Notes', value: (p: PurchaseOrder) => p.notes }
];

const colour = (level: 'OK' | 'NEAR' | 'OVER'): string | undefined => (level === 'OVER' ? 'crimson' : level === 'NEAR' ? 'darkorange' : undefined);

/** Purchase orders: a number and an amount (typed by hand); what is left is worked out from the requests. */
const PurchaseOrders: React.FC = () => {
  const t = useT();
  const { service, purchaseOrders: state, purchases, vendors } = useHubData();
  const role = usePurchaseRole();
  const vendorOptions = React.useMemo(() => vendors.items.map(v => ({ id: v.vendorId, title: v.title })), [vendors.items]);
  const vendorTitles = React.useMemo(() => titleMap(vendors.items, v => v.vendorId), [vendors.items]);
  const approver = isApprover(role);

  const columns: IColumn[] = React.useMemo((): IColumn[] => {
    const money = (render: (p: PurchaseOrder) => number, level?: boolean): ((p: PurchaseOrder) => React.ReactNode) => (p: PurchaseOrder): React.ReactNode => (
      <span style={level ? { color: colour(poFigures(p, purchases.items).level), fontWeight: 600 } : undefined}>{formatMoney(render(p))}</span>
    );
    return [
      { key: 'title', name: t('field.poNumber'), fieldName: 'title', minWidth: 140 },
      { key: 'vendor', name: t('field.vendor'), minWidth: 140, onRender: (p: PurchaseOrder) => titleFor(vendorTitles, p.vendorId) },
      { key: 'amount', name: t('purchase.poAmount'), minWidth: 90, onRender: money(p => p.amount) },
      { key: 'spent', name: t('purchase.poSpent'), minWidth: 90, onRender: money(p => poFigures(p, purchases.items).spent) },
      { key: 'pending', name: t('purchase.poPending'), minWidth: 90, onRender: money(p => poFigures(p, purchases.items).pending) },
      { key: 'remaining', name: t('purchase.poRemaining'), minWidth: 90, onRender: money(p => poFigures(p, purchases.items).remaining, true) },
      { key: 'status', name: t('field.status'), fieldName: 'status', minWidth: 90 }
    ];
  }, [t, purchases.items, vendorTitles]);

  const newItem = React.useCallback((): PurchaseOrder => ({ poId: generateBusinessId('PO'), title: '', vendorId: '', amount: 0, status: PoStatus.OPEN, notes: '' }), []);

  const csvFromRow = React.useCallback((row: Record<string, string>): PurchaseOrder => ({
    poId: row.PoId || generateBusinessId('PO'), title: row.Title ?? row.PO ?? '', vendorId: row.VendorId ?? '', amount: csvNumber(row.Amount ?? row.Importe),
    status: csvEnum(row.Status, STATUSES, PoStatus.OPEN), notes: row.Notes ?? row.Notas ?? ''
  }), []);

  const renderForm = ({ form, setForm, errors, isEdit }: IFormContext<PurchaseOrder>): React.ReactNode => (
    <>
      <TextField label={t('field.poId')} value={form.poId} readOnly={isEdit} onChange={(_, v) => setForm(p => ({ ...p, poId: v ?? '' }))} />
      <Dropdown label={t('field.status')} selectedKey={form.status} options={toOptions(STATUSES, t)} onChange={(_, o) => setForm(p => ({ ...p, status: (o?.key as PoStatus) ?? PoStatus.OPEN }))} />
      <TextField label={t('field.poNumber')} required value={form.title} errorMessage={errors.title && t(errors.title)} onChange={(_, v) => setForm(p => ({ ...p, title: v ?? '' }))} />
      <TextField label={t('purchase.poAmount')} type="number" min={0} value={String(form.amount)} errorMessage={errors.amount && t(errors.amount)} onChange={(_, v) => setForm(p => ({ ...p, amount: v === undefined || v === '' ? 0 : Number(v) }))} />
      <LinkField label={t('field.vendor')} value={form.vendorId} options={vendorOptions} onChange={id => setForm(p => ({ ...p, vendorId: id }))} />
      <FormRow full><TextField label={t('field.notes')} multiline rows={2} value={form.notes} onChange={(_, v) => setForm(p => ({ ...p, notes: v ?? '' }))} /></FormRow>
    </>
  );

  const renderDetail = (po: PurchaseOrder): React.ReactNode => {
    const f = poFigures(po, purchases.items);
    return (
      <DetailFields rows={[
        { label: t('field.poNumber'), value: po.title },
        { label: t('field.status'), value: t(`status.${po.status}`) },
        { label: t('field.vendor'), value: po.vendorId ? `${titleFor(vendorTitles, po.vendorId)} (${po.vendorId})` : '' },
        { label: t('purchase.poAmount'), value: formatMoney(f.amount) },
        { label: t('purchase.poSpent'), value: formatMoney(f.spent) },
        { label: t('purchase.poPending'), value: formatMoney(f.pending) },
        { label: t('purchase.poRemaining'), value: formatMoney(f.remaining) },
        { label: t('field.notes'), value: po.notes }
      ]} />
    );
  };

  return (
    <EntityScreen<PurchaseOrder>
      textKey="purchaseOrders"
      listName={AppConfig.sharePoint.listNames.purchaseOrders}
      state={state}
      service={service}
      statuses={STATUSES}
      getStatus={p => p.status}
      getTitle={p => p.title}
      columns={columns}
      sortAccessors={sortAccessors}
      searchFields={searchFields}
      newItem={newItem}
      validate={validatePurchaseOrder}
      buildPayload={buildPurchaseOrderPayload}
      renderForm={renderForm}
      renderDetail={renderDetail}
      hideNew={!approver}
      hideImport={!approver}
      canEdit={() => approver}
      canDelete={() => approver}
      quickStatuses={() => (approver ? STATUSES : [])}
      hideArchive
      archiveStatus={PoStatus.CLOSED}
      canArchive={() => false}
      csvFileName="purchase-orders.csv"
      csvColumns={csvColumns}
      csvFromRow={csvFromRow}
    />
  );
};

export default PurchaseOrders;
