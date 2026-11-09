import * as React from 'react';
import { Dropdown, IColumn, Link, Stack, TextField } from '@fluentui/react';
import { AppConfig } from '../../config/AppConfig';
import { csvDate, csvEnum, enumValues } from '../../entities/csvHelpers';
import { buildMatterPayload } from '../../entities/payloads';
import { TranslateFn, useT } from '../../i18n/I18n';
import { Matter, MatterPriority, MatterSource, MatterStatus } from '../../models';
import { dayKeyToSharePoint } from '../../rules/dates';
import { generateBusinessId } from '../../rules/ids';
import {
  allowedMatterStatusesFor, applyMatterEffects, getAllowedMatterStatuses, isInbox, isMatterClosed, isMatterOpen, isMatterOverdue, isSafeUrl, matterAgeDays, statusForNewMatter
} from '../../rules/matters';
import { validateMatter } from '../../rules/validation';
import { titleFor, titleMap } from '../../utils/lookup';
import DateField from '../shared/DateField';
import { DetailFields } from '../shared/DetailSection';
import EntityScreen, { IFormContext } from '../shared/EntityScreen';
import { FormRow } from '../shared/FormGrid';
import { useHubData } from '../shared/HubData';
import LinkField from '../shared/LinkField';
import { useMatterLinkOptions } from '../shared/linkOptions';
import { toOptions } from '../shared/options';
import UserField from '../shared/UserField';

/** The inbox, the open matters and the history are three views of the same list. */
export type MatterView = 'inbox' | 'open' | 'history';

const STATUSES_BY_VIEW: Record<MatterView, string[]> = {
  inbox: [],
  open: [MatterStatus.OPEN, MatterStatus.IN_PROGRESS, MatterStatus.WAITING],
  history: [MatterStatus.DONE, MatterStatus.DISCARDED]
};
const ALL_STATUSES = enumValues(MatterStatus);
const PRIORITIES = enumValues(MatterPriority);
const SOURCES = enumValues(MatterSource);

const SCOPE_BY_VIEW: Record<MatterView, (matter: Matter) => boolean> = {
  inbox: isInbox,
  open: isMatterOpen,
  history: isMatterClosed
};

/** Oldest waiting first in the inbox, soonest due first in the open matters, latest closed first in the history. */
const INITIAL_VIEW = {
  inbox: { sortKey: 'age', sortDescending: true },
  open: { sortKey: 'dueDate', sortDescending: false },
  history: { sortKey: 'closedOn', sortDescending: true, showClosed: true }
};

const searchFields = [
  (m: Matter) => m.title, (m: Matter) => m.description, (m: Matter) => m.notes, (m: Matter) => m.sender, (m: Matter) => m.matterId, (m: Matter) => m.ownerUpn
];
const csvColumns = [
  { header: 'Title', value: (m: Matter) => m.title }, { header: 'MatterId', value: (m: Matter) => m.matterId }, { header: 'Description', value: (m: Matter) => m.description },
  { header: 'Notes', value: (m: Matter) => m.notes }, { header: 'Status', value: (m: Matter) => m.status }, { header: 'Priority', value: (m: Matter) => m.priority },
  { header: 'AreaId', value: (m: Matter) => m.areaId }, { header: 'Source', value: (m: Matter) => m.source }, { header: 'SourceRef', value: (m: Matter) => m.sourceRef },
  { header: 'Sender', value: (m: Matter) => m.sender }, { header: 'ReceivedOn', value: (m: Matter) => m.receivedOn }, { header: 'DueDate', value: (m: Matter) => m.dueDate },
  { header: 'ClosedOn', value: (m: Matter) => m.closedOn }, { header: 'OwnerUPN', value: (m: Matter) => m.ownerUpn }, { header: 'ProjectId', value: (m: Matter) => m.projectId },
  { header: 'ContractId', value: (m: Matter) => m.contractId }, { header: 'IncidentId', value: (m: Matter) => m.incidentId }, { header: 'VendorId', value: (m: Matter) => m.vendorId }
];

const makeColumns = (t: TranslateFn, view: MatterView, areaName: (id: string | undefined) => string): IColumn[] => {
  const columns: IColumn[] = [
    { key: 'title', name: t('field.title'), fieldName: 'title', minWidth: 220 },
    { key: 'area', name: t('field.area'), minWidth: 130, onRender: (m: Matter) => areaName(m.areaId) || t('matters.noArea') },
    { key: 'priority', name: t('field.priority'), minWidth: 80, onRender: (m: Matter) => t(`priority.${m.priority}`) },
    { key: 'status', name: t('field.status'), fieldName: 'status', minWidth: 110 }
  ];
  if (view === 'inbox') {
    columns.push(
      { key: 'source', name: t('field.source'), minWidth: 80, onRender: (m: Matter) => t(`matterSource.${m.source}`) },
      { key: 'sender', name: t('field.sender'), fieldName: 'sender', minWidth: 140 },
      { key: 'age', name: t('field.age'), minWidth: 70, onRender: (m: Matter) => { const days = matterAgeDays(m); return days === undefined ? '' : t('matters.waitingDays', { days }); } }
    );
  } else {
    columns.push({ key: 'dueDate', name: t('field.dueDate'), minWidth: 110, onRender: (m: Matter) => `${isMatterOverdue(m) ? '🔴 ' : ''}${m.dueDate ?? ''}` });
  }
  if (view === 'history') {
    columns.push({ key: 'closedOn', name: t('field.closedOn'), fieldName: 'closedOn', minWidth: 100 });
  }
  return columns;
};

const MatterScreen: React.FC<{ view: MatterView }> = ({ view }) => {
  const t = useT();
  const { service, userEmail, matters: state, areas, projects, contracts, incidents, vendors } = useHubData();
  const { areaOptions, projectOptions, contractOptions, incidentOptions, vendorOptions } = useMatterLinkOptions();

  const areaTitles = React.useMemo(() => titleMap(areas.items, a => a.areaId), [areas.items]);
  const columns = React.useMemo(() => makeColumns(t, view, id => titleFor(areaTitles, id)), [t, view, areaTitles]);
  const sortAccessors = React.useMemo(() => ({
    title: (m: Matter) => m.title, area: (m: Matter) => titleFor(areaTitles, m.areaId), priority: (m: Matter) => PRIORITIES.indexOf(m.priority), status: (m: Matter) => m.status,
    dueDate: (m: Matter) => m.dueDate, source: (m: Matter) => m.source, sender: (m: Matter) => m.sender, age: (m: Matter) => matterAgeDays(m), closedOn: (m: Matter) => m.closedOn
  }), [areaTitles]);

  const startStatus = view === 'inbox' ? MatterStatus.INBOX : MatterStatus.OPEN;
  const newItem = React.useCallback((): Matter => ({
    matterId: generateBusinessId('ASU'), title: '', description: '', notes: '', status: startStatus, priority: MatterPriority.MEDIUM, areaId: '', source: MatterSource.MANUAL, sourceRef: '',
    sender: '', receivedOn: '', dueDate: '', closedOn: '', ownerUpn: userEmail, projectId: '', contractId: '', incidentId: '', vendorId: ''
  }), [userEmail, startStatus]);

  const csvFromRow = React.useCallback((row: Record<string, string>): Matter => ({
    matterId: row.MatterId || generateBusinessId('ASU'), title: row.Title ?? '', description: row.Description ?? '', notes: row.Notes ?? '',
    status: csvEnum(row.Status, ALL_STATUSES, statusForNewMatter(row.AreaId)), priority: csvEnum(row.Priority, PRIORITIES, MatterPriority.MEDIUM), areaId: row.AreaId ?? '',
    source: csvEnum(row.Source, SOURCES, MatterSource.MANUAL), sourceRef: row.SourceRef ?? '', sender: row.Sender ?? '', receivedOn: csvDate(row.ReceivedOn), dueDate: csvDate(row.DueDate),
    closedOn: csvDate(row.ClosedOn), ownerUpn: row.OwnerUPN || userEmail, projectId: row.ProjectId ?? '', contractId: row.ContractId ?? '', incidentId: row.IncidentId ?? '', vendorId: row.VendorId ?? ''
  }), [userEmail]);

  const checkBeforeSave = (form: Matter, original: Matter | undefined): string | undefined => {
    const base = original ? original.status : startStatus;
    return getAllowedMatterStatuses(base).indexOf(form.status) === -1
      ? t('common.invalidTransition', { from: t(`status.${base}`), to: t(`status.${form.status}`) })
      : undefined;
  };

  const renderForm = ({ form, setForm, errors, original, isEdit, service: svc }: IFormContext<Matter>): React.ReactNode => {
    const base = original ? original.status : startStatus;
    return (
      <>
        {view === 'inbox' && <FormRow full><span>{t('inbox.hint')}</span></FormRow>}
        <TextField label={t('field.matterId')} value={form.matterId} readOnly={isEdit} onChange={(_, v) => setForm(p => ({ ...p, matterId: v ?? '' }))} />
        <Dropdown label={t('field.status')} selectedKey={form.status} options={toOptions(getAllowedMatterStatuses(base), t)}
          onChange={(_, o) => setForm(p => ({ ...p, status: (o?.key as MatterStatus) ?? base }))} />
        <FormRow full><TextField label={t('field.title')} required value={form.title} errorMessage={errors.title && t(errors.title)} onChange={(_, v) => setForm(p => ({ ...p, title: v ?? '' }))} /></FormRow>
        <FormRow full><TextField label={t('field.description')} multiline rows={3} value={form.description} onChange={(_, v) => setForm(p => ({ ...p, description: v ?? '' }))} /></FormRow>
        <div>
          <LinkField label={t('field.area')} value={form.areaId} options={areaOptions}
            onChange={id => setForm(p => ({ ...p, areaId: id, status: p.status === MatterStatus.INBOX && id ? MatterStatus.OPEN : p.status }))} />
          {errors.areaId && <span role="alert" style={{ color: '#a4262c', fontSize: 12 }}>{t(errors.areaId)}</span>}
        </div>
        <Dropdown label={t('field.priority')} selectedKey={form.priority} options={toOptions(PRIORITIES, t, 'priority')} onChange={(_, o) => setForm(p => ({ ...p, priority: (o?.key as MatterPriority) ?? MatterPriority.MEDIUM }))} />
        <DateField label={t('field.dueDate')} value={form.dueDate} errorMessage={errors.dueDate && t(errors.dueDate)} onChange={v => setForm(p => ({ ...p, dueDate: v }))} />
        <UserField label={t('field.owner')} required service={svc} value={form.ownerUpn} errorMessage={errors.ownerUpn && t(errors.ownerUpn)} onChange={e => setForm(p => ({ ...p, ownerUpn: e }))} />
        <Dropdown label={t('field.source')} selectedKey={form.source} options={toOptions(SOURCES, t, 'matterSource')} onChange={(_, o) => setForm(p => ({ ...p, source: (o?.key as MatterSource) ?? MatterSource.MANUAL }))} />
        <TextField label={t('field.sender')} value={form.sender} onChange={(_, v) => setForm(p => ({ ...p, sender: v ?? '' }))} />
        <DateField label={t('field.receivedOn')} value={form.receivedOn} errorMessage={errors.receivedOn && t(errors.receivedOn)} onChange={v => setForm(p => ({ ...p, receivedOn: v }))} />
        <FormRow full><TextField label={t('field.sourceRef')} value={form.sourceRef} onChange={(_, v) => setForm(p => ({ ...p, sourceRef: v ?? '' }))} /></FormRow>
        <FormRow full><TextField label={t('field.notes')} multiline rows={4} value={form.notes} onChange={(_, v) => setForm(p => ({ ...p, notes: v ?? '' }))} /></FormRow>
        <LinkField label={t('field.project')} value={form.projectId} options={projectOptions} onChange={id => setForm(p => ({ ...p, projectId: id }))} />
        <LinkField label={t('field.contract')} value={form.contractId} options={contractOptions} onChange={id => setForm(p => ({ ...p, contractId: id }))} />
        <LinkField label={t('field.incident')} value={form.incidentId} options={incidentOptions} onChange={id => setForm(p => ({ ...p, incidentId: id }))} />
        <LinkField label={t('field.vendor')} value={form.vendorId} options={vendorOptions} onChange={id => setForm(p => ({ ...p, vendorId: id }))} />
        {isEdit && form.closedOn && <DateField label={t('field.closedOn')} value={form.closedOn} errorMessage={errors.closedOn && t(errors.closedOn)} onChange={v => setForm(p => ({ ...p, closedOn: v }))} />}
      </>
    );
  };

  const renderDetail = (m: Matter): React.ReactNode => {
    const project = projects.items.filter(p => p.projectId === m.projectId)[0];
    const contract = contracts.items.filter(c => c.contractId === m.contractId)[0];
    const incident = incidents.items.filter(i => i.incidentId === m.incidentId)[0];
    const vendor = vendors.items.filter(v => v.vendorId === m.vendorId)[0];
    return (
      <Stack tokens={{ childrenGap: 16 }}>
        <DetailFields rows={[
          { label: t('field.matterId'), value: m.matterId },
          { label: t('field.status'), value: t(`status.${m.status}`) },
          { label: t('field.area'), value: titleFor(areaTitles, m.areaId) },
          { label: t('field.priority'), value: t(`priority.${m.priority}`) },
          { label: t('field.description'), value: m.description },
          { label: t('field.notes'), value: m.notes },
          { label: t('field.source'), value: t(`matterSource.${m.source}`) },
          { label: t('field.sender'), value: m.sender },
          { label: t('field.receivedOn'), value: m.receivedOn },
          { label: t('field.dueDate'), value: `${isMatterOverdue(m) ? '🔴 ' : ''}${m.dueDate ?? ''}`.trim() },
          { label: t('field.closedOn'), value: m.closedOn },
          { label: t('field.owner'), value: m.ownerUpn },
          { label: t('field.project'), value: project ? `${project.title} (${project.projectId})` : m.projectId },
          { label: t('field.contract'), value: contract ? `${contract.title} (${contract.contractId})` : m.contractId },
          { label: t('field.incident'), value: incident ? `${incident.title} (${incident.incidentId})` : m.incidentId },
          { label: t('field.vendor'), value: vendor ? `${vendor.title} (${vendor.vendorId})` : m.vendorId },
          { label: t('common.modifiedBy'), value: `${(m.modified ?? '').slice(0, 10)} ${m.editor ?? ''}`.trim() }
        ]} />
        {m.sourceRef && isSafeUrl(m.sourceRef) && <Link href={m.sourceRef.trim()} target="_blank" rel="noopener noreferrer">{t('matters.openOriginal')}</Link>}
      </Stack>
    );
  };

  return (
    <EntityScreen<Matter>
      textKey={view === 'inbox' ? 'inbox' : view === 'open' ? 'matters' : 'history'}
      listName={AppConfig.sharePoint.listNames.matters}
      state={state}
      service={service}
      statuses={STATUSES_BY_VIEW[view]}
      getStatus={m => m.status}
      getTitle={m => m.title}
      columns={columns}
      sortAccessors={sortAccessors}
      searchFields={searchFields}
      newItem={newItem}
      validate={validateMatter}
      buildPayload={buildMatterPayload}
      prepareForSave={(form, original) => applyMatterEffects(form, original ? original.status : undefined)}
      checkBeforeSave={checkBeforeSave}
      renderForm={renderForm}
      renderDetail={renderDetail}
      quickStatuses={allowedMatterStatusesFor}
      quickPayload={(item, status) => {
        const updated = applyMatterEffects({ ...item, status: status as MatterStatus }, item.status);
        return { Status: status, ClosedOn: dayKeyToSharePoint(updated.closedOn) };
      }}
      hideArchive
      archiveStatus={MatterStatus.DISCARDED}
      canArchive={() => false}
      scope={SCOPE_BY_VIEW[view]}
      initialView={INITIAL_VIEW[view]}
      hideNew={view === 'history'}
      hideClosedToggle
      csvFileName="matters.csv"
      csvColumns={csvColumns}
      csvFromRow={csvFromRow}
    />
  );
};

export default MatterScreen;
