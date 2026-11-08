import * as React from 'react';
import { Dropdown, IColumn, TextField } from '@fluentui/react';
import { AppConfig } from '../../config/AppConfig';
import { csvDate, csvEnum, enumValues } from '../../entities/csvHelpers';
import { buildChangePayload } from '../../entities/payloads';
import { TranslateFn, useT } from '../../i18n/I18n';
import { ChangeRequest, ChangeStatus, ChangeType, RiskScale } from '../../models';
import { dayKeyToSharePoint } from '../../rules/dates';
import { generateBusinessId } from '../../rules/ids';
import { applyChangeEffects, getAllowedChangeStatuses } from '../../rules/operations';
import { validateChange } from '../../rules/validation';
import DateField from '../shared/DateField';
import { DetailFields } from '../shared/DetailSection';
import EntityScreen, { IApprovalConfig, IFormContext } from '../shared/EntityScreen';
import { FormRow } from '../shared/FormGrid';
import { useHubData } from '../shared/HubData';
import LinkField from '../shared/LinkField';
import { useOperationsLinkOptions } from '../shared/linkOptions';
import { toOptions } from '../shared/options';
import UserField from '../shared/UserField';

const STATUSES = enumValues(ChangeStatus);
const TYPES = enumValues(ChangeType);
const RISKS = enumValues(RiskScale);

/** Connects this screen to the approval rules in src/rules/approvals.ts. */
const approvalConfig: IApprovalConfig<ChangeRequest> = {
  entity: 'changes',
  getBusinessId: item => item.changeId,
  proposeStatus: (item, status) => ({ ...item, status: status as ChangeStatus })
};

const searchFields = [(c: ChangeRequest) => c.title, (c: ChangeRequest) => c.description, (c: ChangeRequest) => c.reason, (c: ChangeRequest) => c.changeId, (c: ChangeRequest) => c.ownerUpn];
const sortAccessors = {
  changeId: (c: ChangeRequest) => c.changeId, title: (c: ChangeRequest) => c.title, changeType: (c: ChangeRequest) => TYPES.indexOf(c.changeType),
  risk: (c: ChangeRequest) => RISKS.indexOf(c.risk), status: (c: ChangeRequest) => c.status, plannedDate: (c: ChangeRequest) => c.plannedDate, ownerUpn: (c: ChangeRequest) => c.ownerUpn
};
const csvColumns = [
  { header: 'Title', value: (c: ChangeRequest) => c.title }, { header: 'ChangeId', value: (c: ChangeRequest) => c.changeId }, { header: 'Description', value: (c: ChangeRequest) => c.description },
  { header: 'Reason', value: (c: ChangeRequest) => c.reason }, { header: 'Status', value: (c: ChangeRequest) => c.status }, { header: 'ChangeType', value: (c: ChangeRequest) => c.changeType },
  { header: 'Risk', value: (c: ChangeRequest) => c.risk }, { header: 'PlannedDate', value: (c: ChangeRequest) => c.plannedDate }, { header: 'ImplementedDate', value: (c: ChangeRequest) => c.implementedDate },
  { header: 'BackoutPlan', value: (c: ChangeRequest) => c.backoutPlan }, { header: 'OwnerUPN', value: (c: ChangeRequest) => c.ownerUpn }, { header: 'ProjectId', value: (c: ChangeRequest) => c.projectId }
];

function makeColumns(t: TranslateFn): IColumn[] {
  return [
    { key: 'changeId', name: t('field.changeId'), fieldName: 'changeId', minWidth: 120 },
    { key: 'title', name: t('field.title'), fieldName: 'title', minWidth: 200 },
    { key: 'changeType', name: t('field.changeType'), minWidth: 100, onRender: (c: ChangeRequest) => t(`changeType.${c.changeType}`) },
    { key: 'risk', name: t('field.changeRisk'), minWidth: 80, onRender: (c: ChangeRequest) => t(`impact.${c.risk}`) },
    { key: 'status', name: t('field.status'), fieldName: 'status', minWidth: 120 },
    { key: 'plannedDate', name: t('field.plannedDate'), fieldName: 'plannedDate', minWidth: 100 },
    { key: 'ownerUpn', name: t('field.requestedBy'), fieldName: 'ownerUpn', minWidth: 150 }
  ];
}

const Changes: React.FC = () => {
  const t = useT();
  const { service, userEmail, changes: state, projects } = useHubData();
  const { projectOptions } = useOperationsLinkOptions();
  const columns = React.useMemo(() => makeColumns(t), [t]);

  const newItem = React.useCallback((): ChangeRequest => ({
    changeId: generateBusinessId('CHG'), title: '', description: '', reason: '', status: ChangeStatus.DRAFT, changeType: ChangeType.NORMAL, risk: RiskScale.MEDIUM,
    plannedDate: '', implementedDate: '', backoutPlan: '', ownerUpn: userEmail, projectId: ''
  }), [userEmail]);

  const csvFromRow = React.useCallback((row: Record<string, string>): ChangeRequest => ({
    changeId: row.ChangeId || generateBusinessId('CHG'), title: row.Title ?? '', description: row.Description ?? '', reason: row.Reason ?? '', status: csvEnum(row.Status, STATUSES, ChangeStatus.DRAFT),
    changeType: csvEnum(row.ChangeType, TYPES, ChangeType.NORMAL), risk: csvEnum(row.Risk, RISKS, RiskScale.MEDIUM), plannedDate: csvDate(row.PlannedDate), implementedDate: csvDate(row.ImplementedDate),
    backoutPlan: row.BackoutPlan ?? '', ownerUpn: row.OwnerUPN || userEmail, projectId: row.ProjectId ?? ''
  }), [userEmail]);

  const checkBeforeSave = (form: ChangeRequest, original: ChangeRequest | undefined): string | undefined => {
    const base = original ? original.status : ChangeStatus.DRAFT;
    return getAllowedChangeStatuses(base).indexOf(form.status) === -1
      ? t('common.invalidTransition', { from: t(`status.${base}`), to: t(`status.${form.status}`) })
      : undefined;
  };

  const renderForm = ({ form, setForm, errors, original, isEdit, service: svc }: IFormContext<ChangeRequest>): React.ReactNode => {
    const base = original ? original.status : ChangeStatus.DRAFT;
    return (
      <>
        <TextField label={t('field.changeId')} value={form.changeId} readOnly={isEdit} onChange={(_, v) => setForm(p => ({ ...p, changeId: v ?? '' }))} />
        <Dropdown label={t('field.status')} selectedKey={form.status} options={toOptions(getAllowedChangeStatuses(base), t)} onChange={(_, o) => setForm(p => ({ ...p, status: (o?.key as ChangeStatus) ?? base }))} />
        <FormRow full><TextField label={t('field.title')} required value={form.title} errorMessage={errors.title && t(errors.title)} onChange={(_, v) => setForm(p => ({ ...p, title: v ?? '' }))} /></FormRow>
        <FormRow full><TextField label={t('field.whatChanges')} multiline rows={3} value={form.description} onChange={(_, v) => setForm(p => ({ ...p, description: v ?? '' }))} /></FormRow>
        <FormRow full><TextField label={t('field.reason')} multiline rows={3} value={form.reason} onChange={(_, v) => setForm(p => ({ ...p, reason: v ?? '' }))} /></FormRow>
        <Dropdown label={t('field.changeType')} selectedKey={form.changeType} options={toOptions(TYPES, t, 'changeType')} onChange={(_, o) => setForm(p => ({ ...p, changeType: (o?.key as ChangeType) ?? ChangeType.NORMAL }))} />
        <Dropdown label={t('field.changeRisk')} selectedKey={form.risk} options={toOptions(RISKS, t, 'impact')} onChange={(_, o) => setForm(p => ({ ...p, risk: (o?.key as RiskScale) ?? RiskScale.MEDIUM }))} />
        <DateField label={t('field.plannedDate')} value={form.plannedDate} errorMessage={errors.plannedDate && t(errors.plannedDate)} onChange={v => setForm(p => ({ ...p, plannedDate: v }))} />
        <DateField label={t('field.implementedDate')} value={form.implementedDate} errorMessage={errors.implementedDate && t(errors.implementedDate)} onChange={v => setForm(p => ({ ...p, implementedDate: v }))} />
        <FormRow full><TextField label={t('field.backoutPlan')} multiline rows={3} value={form.backoutPlan} onChange={(_, v) => setForm(p => ({ ...p, backoutPlan: v ?? '' }))} /></FormRow>
        <UserField label={t('field.requestedBy')} required service={svc} value={form.ownerUpn} errorMessage={errors.ownerUpn && t(errors.ownerUpn)} onChange={e => setForm(p => ({ ...p, ownerUpn: e }))} />
        <LinkField label={t('field.project')} value={form.projectId} options={projectOptions} onChange={id => setForm(p => ({ ...p, projectId: id }))} />
      </>
    );
  };

  const renderDetail = (c: ChangeRequest): React.ReactNode => {
    const project = projects.items.filter(p => p.projectId === c.projectId)[0];
    return (
      <DetailFields rows={[
        { label: t('field.changeId'), value: c.changeId },
        { label: t('field.status'), value: t(`status.${c.status}`) },
        { label: t('field.changeType'), value: t(`changeType.${c.changeType}`) },
        { label: t('field.changeRisk'), value: t(`impact.${c.risk}`) },
        { label: t('field.whatChanges'), value: c.description },
        { label: t('field.reason'), value: c.reason },
        { label: t('field.plannedDate'), value: c.plannedDate },
        { label: t('field.implementedDate'), value: c.implementedDate },
        { label: t('field.backoutPlan'), value: c.backoutPlan },
        { label: t('field.requestedBy'), value: c.ownerUpn },
        { label: t('field.project'), value: project ? `${project.title} (${project.projectId})` : c.projectId },
        { label: t('common.modifiedBy'), value: `${(c.modified ?? '').slice(0, 10)} ${c.editor ?? ''}`.trim() }
      ]} />
    );
  };

  return (
    <EntityScreen<ChangeRequest>
      textKey="changes"
      listName={AppConfig.sharePoint.listNames.changeRequests}
      state={state}
      service={service}
      statuses={STATUSES}
      getStatus={c => c.status}
      getTitle={c => c.title}
      columns={columns}
      sortAccessors={sortAccessors}
      searchFields={searchFields}
      newItem={newItem}
      validate={validateChange}
      buildPayload={buildChangePayload}
      prepareForSave={(form, original) => applyChangeEffects(form, original ? original.status : undefined)}
      checkBeforeSave={checkBeforeSave}
      renderForm={renderForm}
      renderDetail={renderDetail}
      approval={approvalConfig}
      quickStatuses={c => getAllowedChangeStatuses(c.status)}
      quickPayload={(item, status) => {
        const updated = applyChangeEffects({ ...item, status: status as ChangeStatus }, item.status);
        return { Status: status, ImplementedDate: dayKeyToSharePoint(updated.implementedDate) };
      }}
      hideArchive
      archiveStatus={ChangeStatus.REJECTED}
      canArchive={() => false}
      csvFileName="changes.csv"
      csvColumns={csvColumns}
      csvFromRow={csvFromRow}
    />
  );
};

export default Changes;
