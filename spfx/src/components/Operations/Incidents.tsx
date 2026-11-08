import * as React from 'react';
import { Dropdown, IColumn, Text, TextField } from '@fluentui/react';
import { AppConfig } from '../../config/AppConfig';
import { csvDate, csvEnum, enumValues } from '../../entities/csvHelpers';
import { buildIncidentPayload } from '../../entities/payloads';
import { TranslateFn, useT } from '../../i18n/I18n';
import { Incident, IncidentCategory, IncidentSeverity, IncidentStatus } from '../../models';
import { dayKeyToSharePoint, toDayKey } from '../../rules/dates';
import { generateBusinessId } from '../../rules/ids';
import {
  applyIncidentEffects, getAllowedIncidentStatuses, incidentDaysOpen, incidentDueDate, isIncidentOverdue, SEVERITY_ORDER
} from '../../rules/operations';
import { validateIncident } from '../../rules/validation';
import DateField from '../shared/DateField';
import { DetailFields } from '../shared/DetailSection';
import EntityScreen, { IFormContext } from '../shared/EntityScreen';
import { FormRow } from '../shared/FormGrid';
import { useHubData } from '../shared/HubData';
import LinkField from '../shared/LinkField';
import { useOperationsLinkOptions } from '../shared/linkOptions';
import { toOptions } from '../shared/options';
import UserField from '../shared/UserField';

const STATUSES = enumValues(IncidentStatus);
const SEVERITIES = enumValues(IncidentSeverity);
const CATEGORIES = enumValues(IncidentCategory);

const searchFields = [(i: Incident) => i.title, (i: Incident) => i.description, (i: Incident) => i.incidentId, (i: Incident) => i.assignedTo, (i: Incident) => i.resolution, (i: Incident) => i.rootCause];
const sortAccessors = {
  incidentId: (i: Incident) => i.incidentId, title: (i: Incident) => i.title, severity: (i: Incident) => SEVERITY_ORDER.indexOf(i.severity), status: (i: Incident) => i.status,
  assignedTo: (i: Incident) => i.assignedTo, reportedOn: (i: Incident) => i.reportedOn, due: (i: Incident) => incidentDueDate(i)
};
const csvColumns = [
  { header: 'Title', value: (i: Incident) => i.title }, { header: 'IncidentId', value: (i: Incident) => i.incidentId }, { header: 'Description', value: (i: Incident) => i.description },
  { header: 'Status', value: (i: Incident) => i.status }, { header: 'Severity', value: (i: Incident) => i.severity }, { header: 'Category', value: (i: Incident) => i.category },
  { header: 'ReportedBy', value: (i: Incident) => i.reportedBy }, { header: 'AssignedTo', value: (i: Incident) => i.assignedTo }, { header: 'ReportedOn', value: (i: Incident) => i.reportedOn },
  { header: 'ResolvedOn', value: (i: Incident) => i.resolvedOn }, { header: 'Resolution', value: (i: Incident) => i.resolution }, { header: 'RootCause', value: (i: Incident) => i.rootCause },
  { header: 'ProjectId', value: (i: Incident) => i.projectId }, { header: 'VendorId', value: (i: Incident) => i.vendorId }
];

function makeColumns(t: TranslateFn): IColumn[] {
  return [
    { key: 'incidentId', name: t('field.incidentId'), fieldName: 'incidentId', minWidth: 120 },
    { key: 'title', name: t('field.title'), fieldName: 'title', minWidth: 200 },
    { key: 'severity', name: t('field.severity'), minWidth: 80, onRender: (i: Incident) => t(`severity.${i.severity}`) },
    { key: 'status', name: t('field.status'), fieldName: 'status', minWidth: 120 },
    { key: 'assignedTo', name: t('field.assignedTo'), fieldName: 'assignedTo', minWidth: 150 },
    { key: 'reportedOn', name: t('field.reportedOn'), fieldName: 'reportedOn', minWidth: 100 },
    { key: 'due', name: t('field.dueBy'), minWidth: 120, onRender: (i: Incident) => `${isIncidentOverdue(i) ? '🔴 ' : ''}${incidentDueDate(i) ?? ''}` }
  ];
}

const Incidents: React.FC = () => {
  const t = useT();
  const { service, userEmail, incidents: state, projects, vendors } = useHubData();
  const { projectOptions, vendorOptions } = useOperationsLinkOptions();
  const columns = React.useMemo(() => makeColumns(t), [t]);

  const newItem = React.useCallback((): Incident => ({
    incidentId: generateBusinessId('INC'), title: '', description: '', status: IncidentStatus.NEW, severity: IncidentSeverity.MEDIUM, category: IncidentCategory.APPLICATION,
    reportedBy: userEmail, assignedTo: '', reportedOn: toDayKey(new Date()), resolvedOn: '', resolution: '', rootCause: '', projectId: '', vendorId: ''
  }), [userEmail]);

  const csvFromRow = React.useCallback((row: Record<string, string>): Incident => ({
    incidentId: row.IncidentId || generateBusinessId('INC'), title: row.Title ?? '', description: row.Description ?? '', status: csvEnum(row.Status, STATUSES, IncidentStatus.NEW),
    severity: csvEnum(row.Severity, SEVERITIES, IncidentSeverity.MEDIUM), category: csvEnum(row.Category, CATEGORIES, IncidentCategory.OTHER), reportedBy: row.ReportedBy ?? '',
    assignedTo: row.AssignedTo ?? '', reportedOn: csvDate(row.ReportedOn), resolvedOn: csvDate(row.ResolvedOn), resolution: row.Resolution ?? '', rootCause: row.RootCause ?? '',
    projectId: row.ProjectId ?? '', vendorId: row.VendorId ?? ''
  }), []);

  const checkBeforeSave = (form: Incident, original: Incident | undefined): string | undefined => {
    const base = original ? original.status : IncidentStatus.NEW;
    return getAllowedIncidentStatuses(base).indexOf(form.status) === -1
      ? t('common.invalidTransition', { from: t(`status.${base}`), to: t(`status.${form.status}`) })
      : undefined;
  };

  const renderForm = ({ form, setForm, errors, original, isEdit, service: svc }: IFormContext<Incident>): React.ReactNode => {
    const base = original ? original.status : IncidentStatus.NEW;
    const due = incidentDueDate(form);
    return (
      <>
        <TextField label={t('field.incidentId')} value={form.incidentId} readOnly={isEdit} onChange={(_, v) => setForm(p => ({ ...p, incidentId: v ?? '' }))} />
        <Dropdown label={t('field.status')} selectedKey={form.status} options={toOptions(getAllowedIncidentStatuses(base), t)} onChange={(_, o) => setForm(p => ({ ...p, status: (o?.key as IncidentStatus) ?? base }))} />
        <FormRow full><TextField label={t('field.title')} required value={form.title} errorMessage={errors.title && t(errors.title)} onChange={(_, v) => setForm(p => ({ ...p, title: v ?? '' }))} /></FormRow>
        <FormRow full><TextField label={t('field.description')} multiline rows={3} value={form.description} onChange={(_, v) => setForm(p => ({ ...p, description: v ?? '' }))} /></FormRow>
        <Dropdown label={t('field.severity')} selectedKey={form.severity} options={toOptions(SEVERITIES, t, 'severity')} onChange={(_, o) => setForm(p => ({ ...p, severity: (o?.key as IncidentSeverity) ?? IncidentSeverity.MEDIUM }))} />
        <Dropdown label={t('field.category')} selectedKey={form.category} options={toOptions(CATEGORIES, t, 'incidentCategory')} onChange={(_, o) => setForm(p => ({ ...p, category: (o?.key as IncidentCategory) ?? IncidentCategory.OTHER }))} />
        <UserField label={t('field.reportedBy')} service={svc} value={form.reportedBy} errorMessage={errors.reportedBy && t(errors.reportedBy)} onChange={e => setForm(p => ({ ...p, reportedBy: e }))} />
        <UserField label={t('field.assignedTo')} service={svc} value={form.assignedTo} errorMessage={errors.assignedTo && t(errors.assignedTo)} onChange={e => setForm(p => ({ ...p, assignedTo: e }))} />
        <DateField label={t('field.reportedOn')} value={form.reportedOn} errorMessage={errors.reportedOn && t(errors.reportedOn)} onChange={v => setForm(p => ({ ...p, reportedOn: v }))} />
        <DateField label={t('field.resolvedOn')} value={form.resolvedOn} errorMessage={errors.resolvedOn && t(errors.resolvedOn)} onChange={v => setForm(p => ({ ...p, resolvedOn: v }))} />
        {due && <FormRow full><Text>{t('field.dueBy')}: <strong>{due}</strong> ({t('incident.slaDays', { days: AppConfig.service.slaDays[form.severity] })})</Text></FormRow>}
        <FormRow full><TextField label={t('field.resolution')} multiline rows={3} value={form.resolution} onChange={(_, v) => setForm(p => ({ ...p, resolution: v ?? '' }))} /></FormRow>
        <FormRow full><TextField label={t('field.rootCause')} multiline rows={3} value={form.rootCause} onChange={(_, v) => setForm(p => ({ ...p, rootCause: v ?? '' }))} /></FormRow>
        <LinkField label={t('field.project')} value={form.projectId} options={projectOptions} onChange={id => setForm(p => ({ ...p, projectId: id }))} />
        <LinkField label={t('field.vendor')} value={form.vendorId} options={vendorOptions} onChange={id => setForm(p => ({ ...p, vendorId: id }))} />
      </>
    );
  };

  const renderDetail = (i: Incident): React.ReactNode => {
    const project = projects.items.filter(p => p.projectId === i.projectId)[0];
    const vendor = vendors.items.filter(v => v.vendorId === i.vendorId)[0];
    const days = incidentDaysOpen(i);
    return (
      <DetailFields rows={[
        { label: t('field.incidentId'), value: i.incidentId },
        { label: t('field.status'), value: t(`status.${i.status}`) },
        { label: t('field.severity'), value: t(`severity.${i.severity}`) },
        { label: t('field.category'), value: t(`incidentCategory.${i.category}`) },
        { label: t('field.description'), value: i.description },
        { label: t('field.reportedBy'), value: i.reportedBy },
        { label: t('field.assignedTo'), value: i.assignedTo },
        { label: t('field.reportedOn'), value: i.reportedOn },
        { label: t('field.dueBy'), value: `${isIncidentOverdue(i) ? '🔴 ' : ''}${incidentDueDate(i) ?? ''}` },
        { label: t('field.daysOpen'), value: days === undefined ? '' : String(days) },
        { label: t('field.resolvedOn'), value: i.resolvedOn },
        { label: t('field.resolution'), value: i.resolution },
        { label: t('field.rootCause'), value: i.rootCause },
        { label: t('field.project'), value: project ? `${project.title} (${project.projectId})` : i.projectId },
        { label: t('field.vendor'), value: vendor ? `${vendor.title} (${vendor.vendorId})` : i.vendorId },
        { label: t('common.modifiedBy'), value: `${(i.modified ?? '').slice(0, 10)} ${i.editor ?? ''}`.trim() }
      ]} />
    );
  };

  return (
    <EntityScreen<Incident>
      textKey="incidents"
      listName={AppConfig.sharePoint.listNames.incidents}
      state={state}
      service={service}
      statuses={STATUSES}
      getStatus={i => i.status}
      getTitle={i => i.title}
      columns={columns}
      sortAccessors={sortAccessors}
      searchFields={searchFields}
      newItem={newItem}
      validate={validateIncident}
      buildPayload={buildIncidentPayload}
      prepareForSave={(form, original) => applyIncidentEffects(form, original ? original.status : undefined)}
      checkBeforeSave={checkBeforeSave}
      renderForm={renderForm}
      renderDetail={renderDetail}
      quickStatuses={i => getAllowedIncidentStatuses(i.status)}
      quickPayload={(item, status) => {
        const updated = applyIncidentEffects({ ...item, status: status as IncidentStatus }, item.status);
        return { Status: status, ResolvedOn: dayKeyToSharePoint(updated.resolvedOn) };
      }}
      archiveStatus={IncidentStatus.CLOSED}
      canArchive={i => getAllowedIncidentStatuses(i.status).indexOf(IncidentStatus.CLOSED) > -1 && i.status !== IncidentStatus.CLOSED}
      csvFileName="incidents.csv"
      csvColumns={csvColumns}
      csvFromRow={csvFromRow}
    />
  );
};

export default Incidents;
