import * as React from 'react';
import { Dropdown, IColumn, TextField } from '@fluentui/react';
import { AppConfig } from '../../config/AppConfig';
import { csvDate, csvEnum, enumValues } from '../../entities/csvHelpers';
import { buildInteractionPayload } from '../../entities/payloads';
import { TranslateFn, useT } from '../../i18n/I18n';
import { Interaction, InteractionStatus, InteractionType } from '../../models';
import { toDayKey } from '../../rules/dates';
import { generateBusinessId } from '../../rules/ids';
import { getAllowedInteractionStatuses, isFollowUpOverdue } from '../../rules/operations';
import { validateInteraction } from '../../rules/validation';
import DateField from '../shared/DateField';
import { DetailFields } from '../shared/DetailSection';
import EntityScreen, { IFormContext } from '../shared/EntityScreen';
import { FormRow } from '../shared/FormGrid';
import { useHubData } from '../shared/HubData';
import LinkField from '../shared/LinkField';
import { useOperationsLinkOptions } from '../shared/linkOptions';
import { toOptions } from '../shared/options';
import UserField from '../shared/UserField';

const STATUSES = enumValues(InteractionStatus);
const TYPES = enumValues(InteractionType);

const searchFields = [(i: Interaction) => i.title, (i: Interaction) => i.summary, (i: Interaction) => i.nextSteps, (i: Interaction) => i.contactName, (i: Interaction) => i.organization, (i: Interaction) => i.interactionId];
const sortAccessors = {
  interactionId: (i: Interaction) => i.interactionId, title: (i: Interaction) => i.title, type: (i: Interaction) => TYPES.indexOf(i.type), status: (i: Interaction) => i.status,
  contact: (i: Interaction) => i.contactName, interactionDate: (i: Interaction) => i.interactionDate, followUpDate: (i: Interaction) => i.followUpDate
};
const csvColumns = [
  { header: 'Title', value: (i: Interaction) => i.title }, { header: 'InteractionId', value: (i: Interaction) => i.interactionId }, { header: 'InteractionType', value: (i: Interaction) => i.type },
  { header: 'Status', value: (i: Interaction) => i.status }, { header: 'InteractionDate', value: (i: Interaction) => i.interactionDate }, { header: 'ContactName', value: (i: Interaction) => i.contactName },
  { header: 'ContactEmail', value: (i: Interaction) => i.contactEmail }, { header: 'Organization', value: (i: Interaction) => i.organization }, { header: 'Summary', value: (i: Interaction) => i.summary },
  { header: 'NextSteps', value: (i: Interaction) => i.nextSteps }, { header: 'FollowUpDate', value: (i: Interaction) => i.followUpDate }, { header: 'OwnerUPN', value: (i: Interaction) => i.ownerUpn },
  { header: 'ProjectId', value: (i: Interaction) => i.projectId }, { header: 'VendorId', value: (i: Interaction) => i.vendorId }
];

function makeColumns(t: TranslateFn): IColumn[] {
  return [
    { key: 'interactionId', name: t('field.interactionId'), fieldName: 'interactionId', minWidth: 120 },
    { key: 'title', name: t('field.subject'), fieldName: 'title', minWidth: 200 },
    { key: 'type', name: t('field.interactionType'), minWidth: 90, onRender: (i: Interaction) => t(`interactionType.${i.type}`) },
    { key: 'status', name: t('field.status'), fieldName: 'status', minWidth: 140 },
    { key: 'contact', name: t('field.contactName'), minWidth: 160, onRender: (i: Interaction) => [i.contactName, i.organization].filter(Boolean).join(' · ') },
    { key: 'interactionDate', name: t('field.interactionDate'), fieldName: 'interactionDate', minWidth: 100 },
    { key: 'followUpDate', name: t('field.followUpDate'), minWidth: 120, onRender: (i: Interaction) => `${isFollowUpOverdue(i) ? '🔴 ' : ''}${i.followUpDate ?? ''}` }
  ];
}

const Interactions: React.FC = () => {
  const t = useT();
  const { service, userEmail, interactions: state, projects, vendors, meetings } = useHubData();
  const { projectOptions, vendorOptions, meetingOptions } = useOperationsLinkOptions();
  const columns = React.useMemo(() => makeColumns(t), [t]);

  const newItem = React.useCallback((): Interaction => ({
    interactionId: generateBusinessId('INT'), title: '', type: InteractionType.MEETING, status: InteractionStatus.LOGGED, interactionDate: toDayKey(new Date()), contactName: '',
    contactEmail: '', organization: '', summary: '', nextSteps: '', followUpDate: '', ownerUpn: userEmail, projectId: '', vendorId: '', meetingId: ''
  }), [userEmail]);

  const csvFromRow = React.useCallback((row: Record<string, string>): Interaction => ({
    interactionId: row.InteractionId || generateBusinessId('INT'), title: row.Title ?? '', type: csvEnum(row.InteractionType, TYPES, InteractionType.OTHER), status: csvEnum(row.Status, STATUSES, InteractionStatus.LOGGED),
    interactionDate: csvDate(row.InteractionDate), contactName: row.ContactName ?? '', contactEmail: row.ContactEmail ?? '', organization: row.Organization ?? '', summary: row.Summary ?? '',
    nextSteps: row.NextSteps ?? '', followUpDate: csvDate(row.FollowUpDate), ownerUpn: row.OwnerUPN || userEmail, projectId: row.ProjectId ?? '', vendorId: row.VendorId ?? '', meetingId: ''
  }), [userEmail]);

  const checkBeforeSave = (form: Interaction, original: Interaction | undefined): string | undefined => {
    const base = original ? original.status : InteractionStatus.LOGGED;
    return getAllowedInteractionStatuses(base).indexOf(form.status) === -1
      ? t('common.invalidTransition', { from: t(`status.${base}`), to: t(`status.${form.status}`) })
      : undefined;
  };

  const renderForm = ({ form, setForm, errors, original, isEdit, service: svc }: IFormContext<Interaction>): React.ReactNode => {
    const base = original ? original.status : InteractionStatus.LOGGED;
    return (
      <>
        <TextField label={t('field.interactionId')} value={form.interactionId} readOnly={isEdit} onChange={(_, v) => setForm(p => ({ ...p, interactionId: v ?? '' }))} />
        <Dropdown label={t('field.status')} selectedKey={form.status} options={toOptions(getAllowedInteractionStatuses(base), t)} onChange={(_, o) => setForm(p => ({ ...p, status: (o?.key as InteractionStatus) ?? base }))} />
        <FormRow full><TextField label={t('field.subject')} required value={form.title} errorMessage={errors.title && t(errors.title)} onChange={(_, v) => setForm(p => ({ ...p, title: v ?? '' }))} /></FormRow>
        <Dropdown label={t('field.interactionType')} selectedKey={form.type} options={toOptions(TYPES, t, 'interactionType')} onChange={(_, o) => setForm(p => ({ ...p, type: (o?.key as InteractionType) ?? InteractionType.OTHER }))} />
        <DateField label={t('field.interactionDate')} value={form.interactionDate} errorMessage={errors.interactionDate && t(errors.interactionDate)} onChange={v => setForm(p => ({ ...p, interactionDate: v }))} />
        <TextField label={t('field.contactName')} value={form.contactName} onChange={(_, v) => setForm(p => ({ ...p, contactName: v ?? '' }))} />
        <TextField label={t('field.contactEmail')} value={form.contactEmail} errorMessage={errors.contactEmail && t(errors.contactEmail)} onChange={(_, v) => setForm(p => ({ ...p, contactEmail: v ?? '' }))} />
        <TextField label={t('field.organization')} value={form.organization} onChange={(_, v) => setForm(p => ({ ...p, organization: v ?? '' }))} />
        <UserField label={t('field.heldBy')} service={svc} value={form.ownerUpn} errorMessage={errors.ownerUpn && t(errors.ownerUpn)} onChange={e => setForm(p => ({ ...p, ownerUpn: e }))} />
        <FormRow full><TextField label={t('field.summary')} multiline rows={4} value={form.summary} onChange={(_, v) => setForm(p => ({ ...p, summary: v ?? '' }))} /></FormRow>
        <FormRow full><TextField label={t('field.nextSteps')} multiline rows={3} value={form.nextSteps} onChange={(_, v) => setForm(p => ({ ...p, nextSteps: v ?? '' }))} /></FormRow>
        <DateField label={t('field.followUpDate')} value={form.followUpDate} errorMessage={errors.followUpDate && t(errors.followUpDate)} onChange={v => setForm(p => ({ ...p, followUpDate: v }))} />
        <LinkField label={t('field.project')} value={form.projectId} options={projectOptions} onChange={id => setForm(p => ({ ...p, projectId: id }))} />
        <LinkField label={t('field.vendor')} value={form.vendorId} options={vendorOptions} onChange={id => setForm(p => ({ ...p, vendorId: id }))} />
        <LinkField label={t('field.meeting')} value={form.meetingId} options={meetingOptions} onChange={id => setForm(p => ({ ...p, meetingId: id }))} />
      </>
    );
  };

  const renderDetail = (i: Interaction): React.ReactNode => {
    const project = projects.items.filter(p => p.projectId === i.projectId)[0];
    const vendor = vendors.items.filter(v => v.vendorId === i.vendorId)[0];
    const meeting = meetings.items.filter(m => m.meetingId === i.meetingId)[0];
    return (
      <DetailFields rows={[
        { label: t('field.interactionId'), value: i.interactionId },
        { label: t('field.status'), value: t(`status.${i.status}`) },
        { label: t('field.interactionType'), value: t(`interactionType.${i.type}`) },
        { label: t('field.interactionDate'), value: i.interactionDate },
        { label: t('field.contactName'), value: i.contactName },
        { label: t('field.contactEmail'), value: i.contactEmail },
        { label: t('field.organization'), value: i.organization },
        { label: t('field.heldBy'), value: i.ownerUpn },
        { label: t('field.summary'), value: i.summary },
        { label: t('field.nextSteps'), value: i.nextSteps },
        { label: t('field.followUpDate'), value: `${isFollowUpOverdue(i) ? '🔴 ' : ''}${i.followUpDate ?? ''}` },
        { label: t('field.project'), value: project ? `${project.title} (${project.projectId})` : i.projectId },
        { label: t('field.vendor'), value: vendor ? `${vendor.title} (${vendor.vendorId})` : i.vendorId },
        { label: t('field.meeting'), value: meeting ? `${meeting.title} (${meeting.meetingId})` : i.meetingId },
        { label: t('common.modifiedBy'), value: `${(i.modified ?? '').slice(0, 10)} ${i.editor ?? ''}`.trim() }
      ]} />
    );
  };

  return (
    <EntityScreen<Interaction>
      textKey="interactions"
      listName={AppConfig.sharePoint.listNames.interactions}
      state={state}
      service={service}
      statuses={STATUSES}
      getStatus={i => i.status}
      getTitle={i => i.title}
      columns={columns}
      sortAccessors={sortAccessors}
      searchFields={searchFields}
      newItem={newItem}
      validate={validateInteraction}
      buildPayload={buildInteractionPayload}
      checkBeforeSave={checkBeforeSave}
      renderForm={renderForm}
      renderDetail={renderDetail}
      quickStatuses={i => getAllowedInteractionStatuses(i.status)}
      archiveStatus={InteractionStatus.DONE}
      canArchive={i => i.status !== InteractionStatus.DONE}
      csvFileName="interactions.csv"
      csvColumns={csvColumns}
      csvFromRow={csvFromRow}
    />
  );
};

export default Interactions;
