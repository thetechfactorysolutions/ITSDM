import * as React from 'react';
import { ComboBox, DefaultButton, Dropdown, IColumn, Stack, Text, TextField } from '@fluentui/react';
import { AppConfig } from '../../config/AppConfig';
import { csvNumber, enumValues } from '../../entities/csvHelpers';
import { buildPurchasePayload } from '../../entities/payloads';
import { TranslateFn, useT } from '../../i18n/I18n';
import { ApprovalStatus, Purchase, PurchaseStatus } from '../../models';
import { dayKeyToSharePoint, toDayKey } from '../../rules/dates';
import { generateBusinessId } from '../../rules/ids';
import {
  allowedStatuses, applyPurchaseEffects, canCreatePurchase, canDeletePurchase, canEditPurchase, canSeeAll, categoriesUsed, editableGroups, FieldGroup, filterPurchases, importedDay,
  importedPurchaseStatus, isApprover, isOwnPurchase, poFigures, purchaseAmount, purchaseChangeProblem, requestsToApprove, sumAmount
} from '../../rules/purchases';
import { validatePurchase } from '../../rules/validation';
import { formatMoney } from '../../utils/format';
import { titleFor, titleMap } from '../../utils/lookup';
import ApprovalDecisionDialog from '../shared/ApprovalDecisionDialog';
import DateField from '../shared/DateField';
import { DetailFields } from '../shared/DetailSection';
import EntityScreen, { IFormContext } from '../shared/EntityScreen';
import { FormRow } from '../shared/FormGrid';
import { useHubData } from '../shared/HubData';
import LinkField from '../shared/LinkField';
import { toOptions } from '../shared/options';
import { IInsightsConfig } from '../shared/Insights';
import { Card, Section, StatCard } from '../shared/ui';
import { usePurchaseRole } from './usePurchaseRole';

const STATUSES = enumValues(PurchaseStatus);

const searchFields = [(p: Purchase) => p.title, (p: Purchase) => p.requestedBy, (p: Purchase) => p.poNumber, (p: Purchase) => p.category, (p: Purchase) => p.notes, (p: Purchase) => p.purchaseId];
const sortAccessors = {
  title: (p: Purchase) => p.title, quantity: (p: Purchase) => p.quantity, requestedBy: (p: Purchase) => p.requestedBy, requestedOn: (p: Purchase) => p.requestedOn, amount: (p: Purchase) => p.amount,
  poNumber: (p: Purchase) => p.poNumber, receivedOn: (p: Purchase) => p.receivedOn, status: (p: Purchase) => p.status, category: (p: Purchase) => p.category
};
const csvColumns = [
  { header: 'Quantity', value: (p: Purchase) => p.quantity }, { header: 'Title', value: (p: Purchase) => p.title }, { header: 'RequestedBy', value: (p: Purchase) => p.requestedBy },
  { header: 'RequestedOn', value: (p: Purchase) => p.requestedOn }, { header: 'Amount', value: (p: Purchase) => p.amount }, { header: 'PoNumber', value: (p: Purchase) => p.poNumber },
  { header: 'ReceivedOn', value: (p: Purchase) => p.receivedOn }, { header: 'Notes', value: (p: Purchase) => p.notes }, { header: 'Status', value: (p: Purchase) => p.status },
  { header: 'UnitPrice', value: (p: Purchase) => p.unitPrice }, { header: 'Category', value: (p: Purchase) => p.category }, { header: 'VendorId', value: (p: Purchase) => p.vendorId },
  { header: 'OrderedOn', value: (p: Purchase) => p.orderedOn }, { header: 'Reason', value: (p: Purchase) => p.reason }, { header: 'PurchaseId', value: (p: Purchase) => p.purchaseId }
];

/** The first of these columns that has a value: the template's names, or the ones of the old app (in Spanish). */
const pick = (row: Record<string, string>, ...names: string[]): string => {
  for (const name of names) {
    const value = row[name];
    if (value !== undefined && value.trim() !== '') {
      return value.trim();
    }
  }
  return '';
};

const makeColumns = (t: TranslateFn): IColumn[] => [
  { key: 'quantity', name: t('field.quantity'), minWidth: 60, maxWidth: 80, onRender: (p: Purchase) => String(p.quantity) },
  { key: 'title', name: t('field.product'), fieldName: 'title', minWidth: 200 },
  { key: 'requestedBy', name: t('field.requestedBy'), fieldName: 'requestedBy', minWidth: 150 },
  { key: 'requestedOn', name: t('field.requestedOn'), fieldName: 'requestedOn', minWidth: 90 },
  { key: 'amount', name: t('field.amount'), minWidth: 80, onRender: (p: Purchase) => formatMoney(p.amount) },
  { key: 'poNumber', name: t('field.poNumber'), fieldName: 'poNumber', minWidth: 90 },
  { key: 'category', name: t('field.category'), fieldName: 'category', minWidth: 100 },
  { key: 'receivedOn', name: t('field.receivedOn'), fieldName: 'receivedOn', minWidth: 90 },
  { key: 'notes', name: t('field.notes'), fieldName: 'notes', minWidth: 140 },
  { key: 'status', name: t('field.status'), fieldName: 'status', minWidth: 120 }
];

/** Purchase requests: asked for, approved, ordered and received, charged to a purchase order. */
const Purchases: React.FC = () => {
  const t = useT();
  const { service, userEmail, purchases: state, purchaseOrders, vendors } = useHubData();
  const role = usePurchaseRole();
  const columns = React.useMemo(() => makeColumns(t), [t]);
  const vendorOptions = React.useMemo(() => vendors.items.map(v => ({ id: v.vendorId, title: v.title })), [vendors.items]);
  const vendorTitles = React.useMemo(() => titleMap(vendors.items, v => v.vendorId), [vendors.items]);
  const categories = React.useMemo(() => categoriesUsed(state.items), [state.items]);

  const [poNumber, setPoNumber] = React.useState<string>('');
  const [from, setFrom] = React.useState<string>('');
  const [to, setTo] = React.useState<string>('');
  const [deciding, setDeciding] = React.useState<{ purchase: Purchase; decision: ApprovalStatus.APPROVED | ApprovalStatus.REJECTED } | undefined>();
  const [decisionError, setDecisionError] = React.useState<string | undefined>();

  // What this person may see, and what the filters above the table leave.
  const scope = React.useCallback(
    (p: Purchase): boolean => (canSeeAll(role) || isOwnPurchase(p, userEmail)) && filterPurchases([p], { poNumber, from, to }).length === 1,
    [role, userEmail, poNumber, from, to]
  );
  const scoped = React.useMemo(() => state.items.filter(scope), [state.items, scope]);
  const counted = scoped.filter(p => p.status !== PurchaseStatus.REJECTED && p.status !== PurchaseStatus.CANCELLED);
  const toApprove = requestsToApprove(scoped);
  const chosenPo = purchaseOrders.items.filter(po => po.title === poNumber)[0];
  const figures = chosenPo ? poFigures(chosenPo, state.items) : undefined;

  const insights: IInsightsConfig<Purchase> = {
    stats: items => {
      const waiting = items.filter(p => p.status === PurchaseStatus.REQUESTED);
      const arriving = items.filter(p => p.status === PurchaseStatus.APPROVED || p.status === PurchaseStatus.ORDERED);
      return [
        { key: 'toApprove', label: t('dashboard.purchasesToApprove'), icon: 'shield', tone: waiting.length > 0 ? 'warning' : 'good', count: waiting.length, chip: { key: 'toApprove', label: t('dashboard.purchasesToApprove'), test: (p: Purchase) => p.status === PurchaseStatus.REQUESTED } },
        { key: 'arriving', label: t('dashboard.purchasesToReceive'), icon: 'box', tone: 'info', count: arriving.length, chip: { key: 'arriving', label: t('dashboard.purchasesToReceive'), test: (p: Purchase) => p.status === PurchaseStatus.APPROVED || p.status === PurchaseStatus.ORDERED } }
      ];
    }
  };

  const newItem = React.useCallback((): Purchase => ({
    purchaseId: generateBusinessId('PUR'), title: '', quantity: 1, unitPrice: 0, amount: 0, category: '', vendorId: '', poNumber: '', status: PurchaseStatus.REQUESTED,
    requestedBy: userEmail, requestedOn: toDayKey(new Date()), orderedOn: '', receivedOn: '', decisionBy: '', decisionDate: '', decisionNotes: '', reason: '', notes: ''
  }), [userEmail]);

  // The old app's columns are accepted too (Cantidad, Producto, Usuario, Fecha Pedido, Importe, PO, Fecha Recibido, Notas, Recibido).
  const csvFromRow = React.useCallback((row: Record<string, string>): Purchase => {
    const quantity = pick(row, 'Quantity', 'Cantidad');
    const unitPrice = csvNumber(pick(row, 'UnitPrice', 'PrecioUnitario', 'Precio'));
    const receivedOn = importedDay(pick(row, 'ReceivedOn', 'Fecha Recibido', 'FechaRecibido'));
    const quantityNumber = quantity === '' ? 1 : csvNumber(quantity);
    return {
      purchaseId: pick(row, 'PurchaseId') || generateBusinessId('PUR'), title: pick(row, 'Title', 'Producto', 'Product'), quantity: quantityNumber, unitPrice,
      amount: purchaseAmount(quantityNumber, unitPrice, csvNumber(pick(row, 'Amount', 'Importe'))), category: pick(row, 'Category', 'Categoria', 'Categoría'), vendorId: pick(row, 'VendorId'),
      poNumber: pick(row, 'PoNumber', 'PO'), status: importedPurchaseStatus(pick(row, 'Status', 'Estado', 'Recibido'), receivedOn ? PurchaseStatus.RECEIVED : PurchaseStatus.ORDERED),
      requestedBy: pick(row, 'RequestedBy', 'Usuario', 'User') || userEmail, requestedOn: importedDay(pick(row, 'RequestedOn', 'Fecha Pedido', 'FechaPedido')),
      orderedOn: importedDay(pick(row, 'OrderedOn')), receivedOn, decisionBy: '', decisionDate: '', decisionNotes: '', reason: pick(row, 'Reason', 'Motivo'), notes: pick(row, 'Notes', 'Notas')
    };
  }, [userEmail]);

  const checkBeforeSave = (form: Purchase, original: Purchase | undefined): string | undefined => {
    const problem = purchaseChangeProblem(form, original, role, userEmail);
    return problem ? t(problem) : undefined;
  };

  const decide = (comment: string): void => {
    const current = deciding;
    setDeciding(undefined);
    if (!current || !current.purchase.id) {
      return;
    }
    setDecisionError(undefined);
    state.update(current.purchase.id, {
      Status: current.decision === ApprovalStatus.APPROVED ? PurchaseStatus.APPROVED : PurchaseStatus.REJECTED,
      DecisionBy: userEmail, DecisionDate: dayKeyToSharePoint(toDayKey(new Date())), DecisionNotes: comment
    }).catch(err => setDecisionError(err instanceof Error ? err.message : t('common.unknownError')));
  };

  const renderForm = ({ form, setForm, errors, original }: IFormContext<Purchase>): React.ReactNode => {
    const groups = editableGroups(role, original, userEmail);
    const can = (g: FieldGroup): boolean => groups.indexOf(g) > -1;
    const statuses = allowedStatuses(role, original, userEmail);
    const shownAmount = form.unitPrice > 0 ? purchaseAmount(form.quantity, form.unitPrice, form.amount) : form.amount;
    const poOptions = purchaseOrders.items.map(po => ({ key: po.title, text: po.title }));
    return (
      <>
        <TextField label={t('field.purchaseId')} value={form.purchaseId} readOnly />
        <Dropdown label={t('field.status')} disabled={statuses.length <= 1} selectedKey={form.status} options={toOptions(statuses, t)} onChange={(_, o) => setForm(p => ({ ...p, status: (o?.key as PurchaseStatus) ?? p.status }))} />
        <FormRow full><TextField label={t('field.product')} required disabled={!can('request')} value={form.title} errorMessage={errors.title && t(errors.title)} onChange={(_, v) => setForm(p => ({ ...p, title: v ?? '' }))} /></FormRow>
        <TextField label={t('field.quantity')} type="number" min={1} required disabled={!can('request')} value={String(form.quantity)} errorMessage={errors.quantity && t(errors.quantity)} onChange={(_, v) => setForm(p => ({ ...p, quantity: v === undefined || v === '' ? 0 : Number(v) }))} />
        <TextField label={t('field.unitPrice')} type="number" min={0} disabled={!can('request')} value={String(form.unitPrice)} errorMessage={errors.unitPrice && t(errors.unitPrice)} onChange={(_, v) => setForm(p => ({ ...p, unitPrice: v === undefined || v === '' ? 0 : Number(v) }))} />
        <TextField label={t('field.amount')} type="number" min={0} disabled={!can('request') || form.unitPrice > 0} value={String(shownAmount)} errorMessage={errors.amount && t(errors.amount)} onChange={(_, v) => setForm(p => ({ ...p, amount: v === undefined || v === '' ? 0 : Number(v) }))} />
        <ComboBox
          label={t('field.category')}
          allowFreeform
          autoComplete="on"
          disabled={!can('request')}
          text={form.category}
          options={categories.map(c => ({ key: c, text: c }))}
          onChange={(_, option, __, value) => setForm(p => ({ ...p, category: option ? String(option.key) : (value ?? '') }))}
        />
        <LinkField label={t('field.vendor')} disabled={!can('request')} value={form.vendorId} options={vendorOptions} onChange={id => setForm(p => ({ ...p, vendorId: id }))} />
        <ComboBox
          label={t('field.poNumber')}
          allowFreeform
          autoComplete="on"
          disabled={!can('tracking')}
          text={form.poNumber}
          options={poOptions}
          onChange={(_, option, __, value) => setForm(p => ({ ...p, poNumber: option ? String(option.key) : (value ?? '') }))}
        />
        <FormRow full><TextField label={t('field.reason')} multiline rows={2} disabled={!can('request')} value={form.reason} onChange={(_, v) => setForm(p => ({ ...p, reason: v ?? '' }))} /></FormRow>
        <TextField label={t('field.requestedBy')} disabled={!can('record')} value={form.requestedBy} onChange={(_, v) => setForm(p => ({ ...p, requestedBy: v ?? '' }))} />
        <DateField label={t('field.requestedOn')} disabled={!can('record')} value={form.requestedOn} errorMessage={errors.requestedOn && t(errors.requestedOn)} onChange={v => setForm(p => ({ ...p, requestedOn: v }))} />
        <DateField label={t('field.orderedOn')} disabled={!can('tracking')} value={form.orderedOn} errorMessage={errors.orderedOn && t(errors.orderedOn)} onChange={v => setForm(p => ({ ...p, orderedOn: v }))} />
        <DateField label={t('field.receivedOn')} disabled={!can('tracking')} value={form.receivedOn} errorMessage={errors.receivedOn && t(errors.receivedOn)} onChange={v => setForm(p => ({ ...p, receivedOn: v }))} />
        <FormRow full><TextField label={t('field.decisionNotes')} multiline rows={2} disabled={!can('record')} value={form.decisionNotes} onChange={(_, v) => setForm(p => ({ ...p, decisionNotes: v ?? '' }))} /></FormRow>
        <FormRow full><TextField label={t('field.notes')} multiline rows={2} disabled={!can('tracking')} value={form.notes} onChange={(_, v) => setForm(p => ({ ...p, notes: v ?? '' }))} /></FormRow>
      </>
    );
  };

  const renderDetail = (p: Purchase): React.ReactNode => (
    <DetailFields rows={[
      { label: t('field.purchaseId'), value: p.purchaseId },
      { label: t('field.status'), value: t(`status.${p.status}`) },
      { label: t('field.product'), value: p.title },
      { label: t('field.quantity'), value: String(p.quantity) },
      { label: t('field.unitPrice'), value: p.unitPrice > 0 ? formatMoney(p.unitPrice) : '' },
      { label: t('field.amount'), value: formatMoney(p.amount) },
      { label: t('field.category'), value: p.category },
      { label: t('field.vendor'), value: p.vendorId ? `${titleFor(vendorTitles, p.vendorId)} (${p.vendorId})` : '' },
      { label: t('field.poNumber'), value: p.poNumber },
      { label: t('field.reason'), value: p.reason },
      { label: t('field.requestedBy'), value: p.requestedBy },
      { label: t('field.requestedOn'), value: p.requestedOn ?? '' },
      { label: t('field.decisionBy'), value: p.decisionBy },
      { label: t('field.decisionDate'), value: p.decisionDate ?? '' },
      { label: t('field.decisionNotes'), value: p.decisionNotes },
      { label: t('field.orderedOn'), value: p.orderedOn ?? '' },
      { label: t('field.receivedOn'), value: p.receivedOn ?? '' },
      { label: t('field.notes'), value: p.notes },
      { label: t('common.modifiedBy'), value: `${(p.modified ?? '').slice(0, 10)} ${p.editor ?? ''}`.trim() }
    ]} />
  );

  const extra = (
    <Stack tokens={{ childrenGap: 16 }}>
      {isApprover(role) && toApprove.length > 0 && (
        <Card title={t('purchase.toApprove', { count: toApprove.length })}>
          <Stack tokens={{ childrenGap: 8 }}>
            {toApprove.map(p => (
              <Stack key={p.id ?? p.purchaseId} horizontal wrap verticalAlign="center" tokens={{ childrenGap: 12 }}>
                <Stack.Item grow styles={{ root: { minWidth: 220 } }}>
                  <Text block><strong>{p.quantity} × {p.title}</strong> · {formatMoney(p.amount)}</Text>
                  <Text block variant="small">{p.requestedBy} · {p.requestedOn ?? ''}{p.reason ? ` · ${p.reason}` : ''}</Text>
                </Stack.Item>
                <Stack horizontal tokens={{ childrenGap: 8 }}>
                  <DefaultButton text={t('approval.approve')} iconProps={{ iconName: 'CheckMark' }} ariaLabel={`${t('approval.approve')}: ${p.title}`} onClick={() => setDeciding({ purchase: p, decision: ApprovalStatus.APPROVED })} />
                  <DefaultButton text={t('approval.reject')} iconProps={{ iconName: 'Cancel' }} ariaLabel={`${t('approval.reject')}: ${p.title}`} onClick={() => setDeciding({ purchase: p, decision: ApprovalStatus.REJECTED })} />
                </Stack>
              </Stack>
            ))}
          </Stack>
        </Card>
      )}
      {decisionError && <Text styles={{ root: { color: 'crimson' } }}>{decisionError}</Text>}

      <Stack horizontal wrap verticalAlign="end" tokens={{ childrenGap: 12 }}>
        <Dropdown
          label={t('purchase.choosePo')}
          selectedKey={poNumber}
          options={[{ key: '', text: t('purchase.allPos') }].concat(purchaseOrders.items.map(po => ({ key: po.title, text: po.title })))}
          styles={{ root: { minWidth: 200 } }}
          onChange={(_, o) => setPoNumber(o ? String(o.key) : '')}
        />
        <DateField label={t('purchase.from')} value={from} onChange={setFrom} />
        <DateField label={t('purchase.to')} value={to} onChange={setTo} />
      </Stack>
      <Section title={figures ? `${t('purchase.po')}: ${poNumber}` : t('purchase.summary')}>
        <StatCard icon="wallet" label={t('purchase.total')} value={sumAmount(counted)} tone="info" />
        {figures && <StatCard icon="scale" label={t('purchase.poAmount')} value={figures.amount} tone="info" />}
        {figures && <StatCard icon="check" label={t('purchase.poSpent')} value={figures.spent} tone={figures.level === 'OVER' ? 'danger' : figures.level === 'NEAR' ? 'warning' : 'good'} />}
        {figures && <StatCard icon="clock" label={t('purchase.poPending')} value={figures.pending} tone={figures.pending > 0 ? 'warning' : 'good'} />}
        {figures && <StatCard icon="alert" label={t('purchase.poRemaining')} value={figures.remaining} tone={figures.level === 'OVER' ? 'danger' : figures.level === 'NEAR' ? 'warning' : 'good'} />}
      </Section>
    </Stack>
  );

  return (
    <>
      <EntityScreen<Purchase>
        textKey="purchases"
        listName={AppConfig.sharePoint.listNames.purchases}
        state={state}
        service={service}
        statuses={STATUSES}
        getStatus={p => p.status}
        getTitle={p => p.title}
        columns={columns}
        sortAccessors={sortAccessors}
        searchFields={searchFields}
        insights={insights}
        newItem={newItem}
        validate={validatePurchase}
        buildPayload={buildPurchasePayload}
        prepareForSave={(form, original) => applyPurchaseEffects(form, original, userEmail)}
        checkBeforeSave={checkBeforeSave}
        renderForm={renderForm}
        renderDetail={renderDetail}
        scope={scope}
        hideNew={!canCreatePurchase(role)}
        hideImport={!isApprover(role)}
        canEdit={p => canEditPurchase(role, p, userEmail)}
        canDelete={() => canDeletePurchase(role)}
        quickStatuses={p => allowedStatuses(role, p, userEmail)}
        quickPayload={(item, status) => {
          const next = applyPurchaseEffects({ ...item, status: status as PurchaseStatus }, item, userEmail);
          return {
            Status: status, DecisionBy: next.decisionBy, DecisionDate: dayKeyToSharePoint(next.decisionDate),
            OrderedOn: dayKeyToSharePoint(next.orderedOn), ReceivedOn: dayKeyToSharePoint(next.receivedOn)
          };
        }}
        hideArchive
        archiveStatus={PurchaseStatus.CANCELLED}
        canArchive={() => false}
        hideAttachments={false}
        extraContent={extra}
        csvFileName="purchases.csv"
        csvColumns={csvColumns}
        csvFromRow={csvFromRow}
      />
      <ApprovalDecisionDialog decision={deciding ? deciding.decision : undefined} title={deciding ? deciding.purchase.title : ''} onConfirm={decide} onCancel={() => setDeciding(undefined)} />
    </>
  );
};

export default Purchases;
