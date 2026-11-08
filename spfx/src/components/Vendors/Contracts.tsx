import * as React from 'react';
import { Dropdown, IColumn, Stack, TextField } from '@fluentui/react';
import { AppConfig } from '../../config/AppConfig';
import { csvDate, csvEnum, csvNumber, enumValues } from '../../entities/csvHelpers';
import { buildContractPayload } from '../../entities/payloads';
import { TranslateFn, useT } from '../../i18n/I18n';
import { AutoRenew, Contract, ContractStatus } from '../../models';
import { contractAlert, getAllowedContractStatuses, opexAnnualAmount } from '../../rules/finance';
import { generateBusinessId } from '../../rules/ids';
import { validateContract } from '../../rules/validation';
import { formatMoney } from '../../utils/format';
import { titleFor, titleMap } from '../../utils/lookup';
import DateField from '../shared/DateField';
import { DetailFields, RelatedList } from '../shared/DetailSection';
import EntityScreen, { IApprovalConfig, IFormContext } from '../shared/EntityScreen';
import { FormRow } from '../shared/FormGrid';
import { useHubData } from '../shared/HubData';
import LinkField from '../shared/LinkField';
import { useFinanceLinkOptions } from '../shared/linkOptions';
import { toOptions } from '../shared/options';
import UserField from '../shared/UserField';

const STATUSES = enumValues(ContractStatus);
const AUTO_RENEW = enumValues(AutoRenew);

/** Connects this screen to the approval rules in src/rules/approvals.ts. */
const approvalConfig: IApprovalConfig<Contract> = {
  entity: 'contracts',
  getBusinessId: item => item.contractId,
  proposeStatus: (item, status) => ({ ...item, status: status as ContractStatus })
};

const searchFields = [(c: Contract) => c.title, (c: Contract) => c.description, (c: Contract) => c.contractId, (c: Contract) => c.ownerUpn];
const csvColumns = [
  { header: 'Title', value: (c: Contract) => c.title }, { header: 'ContractId', value: (c: Contract) => c.contractId }, { header: 'Description', value: (c: Contract) => c.description },
  { header: 'Status', value: (c: Contract) => c.status }, { header: 'VendorId', value: (c: Contract) => c.vendorId }, { header: 'StartDate', value: (c: Contract) => c.startDate },
  { header: 'EndDate', value: (c: Contract) => c.endDate }, { header: 'NoticeDays', value: (c: Contract) => c.noticeDays }, { header: 'AnnualValue', value: (c: Contract) => c.annualValue },
  { header: 'AutoRenew', value: (c: Contract) => c.autoRenew }, { header: 'OwnerUPN', value: (c: Contract) => c.ownerUpn }, { header: 'ProjectId', value: (c: Contract) => c.projectId }
];

/** Text for the renewal column: nothing, "Renew in N days" or "Ended and not closed". */
const alertText = (t: TranslateFn, contract: Contract): string => {
  const info = contractAlert(contract);
  if (info.alert === 'LAPSED') {
    return `🔴 ${t('contract.lapsed', { days: Math.abs(info.daysLeft as number) })}`;
  }
  return info.alert === 'RENEWAL' ? `🟠 ${t('contract.renewIn', { days: info.daysLeft as number })}` : '';
};

const Contracts: React.FC = () => {
  const t = useT();
  const { service, userEmail, contracts: state, vendors, opex, projects } = useHubData();
  const { vendorOptions, projectOptions } = useFinanceLinkOptions();

  const vendorTitles = React.useMemo(() => titleMap(vendors.items, v => v.vendorId), [vendors.items]);
  const columns: IColumn[] = React.useMemo((): IColumn[] => makeColumns(t, id => titleFor(vendorTitles, id)), [t, vendorTitles]);
  const sortAccessors = React.useMemo(() => ({
    contractId: (c: Contract) => c.contractId, title: (c: Contract) => c.title, vendorId: (c: Contract) => titleFor(vendorTitles, c.vendorId), status: (c: Contract) => c.status,
    endDate: (c: Contract) => c.endDate, annualValue: (c: Contract) => c.annualValue, alert: (c: Contract) => contractAlert(c).daysLeft
  }), [vendorTitles]);

  const newItem = React.useCallback((): Contract => ({
    contractId: generateBusinessId('CON'), title: '', description: '', status: ContractStatus.DRAFT, vendorId: '', startDate: '', endDate: '', noticeDays: 90,
    annualValue: 0, autoRenew: AutoRenew.NO, ownerUpn: userEmail, projectId: ''
  }), [userEmail]);

  const csvFromRow = React.useCallback((row: Record<string, string>): Contract => ({
    contractId: row.ContractId || generateBusinessId('CON'), title: row.Title ?? '', description: row.Description ?? '', status: csvEnum(row.Status, STATUSES, ContractStatus.DRAFT),
    vendorId: row.VendorId ?? '', startDate: csvDate(row.StartDate), endDate: csvDate(row.EndDate), noticeDays: row.NoticeDays ? csvNumber(row.NoticeDays) : 90,
    annualValue: csvNumber(row.AnnualValue), autoRenew: csvEnum(row.AutoRenew, AUTO_RENEW, AutoRenew.NO), ownerUpn: row.OwnerUPN || userEmail, projectId: row.ProjectId ?? ''
  }), [userEmail]);

  const checkBeforeSave = (form: Contract, original: Contract | undefined): string | undefined => {
    const base = original ? original.status : ContractStatus.DRAFT;
    return getAllowedContractStatuses(base).indexOf(form.status) === -1
      ? t('common.invalidTransition', { from: t(`status.${base}`), to: t(`status.${form.status}`) })
      : undefined;
  };

  const renderForm = ({ form, setForm, errors, original, isEdit, service: svc }: IFormContext<Contract>): React.ReactNode => {
    const base = original ? original.status : ContractStatus.DRAFT;
    return (
      <>
        <TextField label={t('field.contractId')} value={form.contractId} readOnly={isEdit} onChange={(_, v) => setForm(p => ({ ...p, contractId: v ?? '' }))} />
        <Dropdown label={t('field.status')} selectedKey={form.status} options={toOptions(getAllowedContractStatuses(base), t)} onChange={(_, o) => setForm(p => ({ ...p, status: (o?.key as ContractStatus) ?? base }))} />
        <FormRow full><TextField label={t('field.title')} required value={form.title} errorMessage={errors.title && t(errors.title)} onChange={(_, v) => setForm(p => ({ ...p, title: v ?? '' }))} /></FormRow>
        <FormRow full><TextField label={t('field.description')} multiline rows={3} value={form.description} onChange={(_, v) => setForm(p => ({ ...p, description: v ?? '' }))} /></FormRow>
        <LinkField label={t('field.vendor')} value={form.vendorId} options={vendorOptions} onChange={id => setForm(p => ({ ...p, vendorId: id }))} />
        <UserField label={t('field.owner')} required service={svc} value={form.ownerUpn} errorMessage={errors.ownerUpn && t(errors.ownerUpn)} onChange={e => setForm(p => ({ ...p, ownerUpn: e }))} />
        <DateField label={t('field.startDate')} value={form.startDate} errorMessage={errors.startDate && t(errors.startDate)} onChange={v => setForm(p => ({ ...p, startDate: v }))} />
        <DateField label={t('field.endDate')} value={form.endDate} errorMessage={errors.endDate && t(errors.endDate)} onChange={v => setForm(p => ({ ...p, endDate: v }))} />
        <TextField label={t('field.noticeDays')} type="number" min={0} max={365} value={String(form.noticeDays)} errorMessage={errors.noticeDays && t(errors.noticeDays)} onChange={(_, v) => setForm(p => ({ ...p, noticeDays: Number(v ?? 0) }))} />
        <TextField label={t('field.annualValue')} type="number" min={0} value={String(form.annualValue)} errorMessage={errors.annualValue && t(errors.annualValue)} onChange={(_, v) => setForm(p => ({ ...p, annualValue: Number(v ?? 0) }))} />
        <Dropdown label={t('field.autoRenew')} selectedKey={form.autoRenew} options={toOptions(AUTO_RENEW, t, 'autoRenew')} onChange={(_, o) => setForm(p => ({ ...p, autoRenew: (o?.key as AutoRenew) ?? AutoRenew.NO }))} />
        <LinkField label={t('field.project')} value={form.projectId} options={projectOptions} onChange={id => setForm(p => ({ ...p, projectId: id }))} />
      </>
    );
  };

  const renderDetail = (c: Contract): React.ReactNode => {
    const vendor = vendors.items.filter(v => v.vendorId === c.vendorId)[0];
    const project = projects.items.filter(p => p.projectId === c.projectId)[0];
    const myOpex = opex.items.filter(o => o.contractId === c.contractId);
    const alert = alertText(t, c);
    return (
      <Stack tokens={{ childrenGap: 16 }}>
        <DetailFields rows={[
          { label: t('field.contractId'), value: c.contractId },
          { label: t('field.status'), value: t(`status.${c.status}`) },
          { label: t('contract.renewal'), value: alert },
          { label: t('field.vendor'), value: vendor ? `${vendor.title} (${vendor.vendorId})` : c.vendorId },
          { label: t('field.description'), value: c.description },
          { label: t('field.startDate'), value: c.startDate },
          { label: t('field.endDate'), value: c.endDate },
          { label: t('field.noticeDays'), value: c.noticeDays },
          { label: t('field.annualValue'), value: formatMoney(c.annualValue) },
          { label: t('field.autoRenew'), value: t(`autoRenew.${c.autoRenew}`) },
          { label: t('field.owner'), value: c.ownerUpn },
          { label: t('field.project'), value: project ? `${project.title} (${project.projectId})` : c.projectId },
          { label: t('common.modifiedBy'), value: `${(c.modified ?? '').slice(0, 10)} ${c.editor ?? ''}`.trim() }
        ]} />
        <RelatedList title={t('nav.opex')} items={myOpex.map(o => ({ key: o.opexId, title: o.title, meta: `${formatMoney(opexAnnualAmount(o))} / ${t('budget.perYear')} · ${t(`status.${o.status}`)}` }))} />
      </Stack>
    );
  };

  return (
    <EntityScreen<Contract>
      textKey="contracts"
      listName={AppConfig.sharePoint.listNames.contracts}
      state={state}
      service={service}
      statuses={STATUSES}
      getStatus={c => c.status}
      getTitle={c => c.title}
      columns={columns}
      sortAccessors={sortAccessors}
      searchFields={searchFields}
      newItem={newItem}
      validate={validateContract}
      buildPayload={buildContractPayload}
      checkBeforeSave={checkBeforeSave}
      renderForm={renderForm}
      renderDetail={renderDetail}
      approval={approvalConfig}
      quickStatuses={c => getAllowedContractStatuses(c.status)}
      hideArchive
      archiveStatus={ContractStatus.TERMINATED}
      canArchive={() => false}
      csvFileName="contracts.csv"
      csvColumns={csvColumns}
      csvFromRow={csvFromRow}
    />
  );
};

function makeColumns(t: TranslateFn, vendorTitle: (id: string | undefined) => string): IColumn[] {
  return [
    { key: 'contractId', name: t('field.contractId'), fieldName: 'contractId', minWidth: 120 },
    { key: 'title', name: t('field.title'), fieldName: 'title', minWidth: 200 },
    { key: 'vendorId', name: t('field.vendor'), minWidth: 140, onRender: (c: Contract) => vendorTitle(c.vendorId) },
    { key: 'status', name: t('field.status'), fieldName: 'status', minWidth: 120 },
    { key: 'endDate', name: t('field.endDate'), fieldName: 'endDate', minWidth: 100 },
    { key: 'annualValue', name: t('field.annualValue'), minWidth: 100, onRender: (c: Contract) => formatMoney(c.annualValue) },
    { key: 'alert', name: t('contract.renewal'), minWidth: 170, onRender: (c: Contract) => alertText(t, c) }
  ];
}

export default Contracts;
