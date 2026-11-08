import * as React from 'react';
import { Dropdown, IColumn, TextField } from '@fluentui/react';
import { AppConfig } from '../../config/AppConfig';
import { csvDate, csvEnum, enumValues } from '../../entities/csvHelpers';
import { buildDecisionPayload } from '../../entities/payloads';
import { TranslateFn, useT } from '../../i18n/I18n';
import { Decision, DecisionStatus } from '../../models';
import { dayKeyToSharePoint } from '../../rules/dates';
import { applyDecisionEffects, getAllowedDecisionStatuses } from '../../rules/governance';
import { generateBusinessId } from '../../rules/ids';
import { validateDecision } from '../../rules/validation';
import DateField from '../shared/DateField';
import { DetailFields } from '../shared/DetailSection';
import EntityScreen, { IFormContext } from '../shared/EntityScreen';
import { FormRow } from '../shared/FormGrid';
import { useHubData } from '../shared/HubData';
import LinkField from '../shared/LinkField';
import { useLinkOptions } from '../shared/linkOptions';
import { toOptions } from '../shared/options';
import UserField from '../shared/UserField';

const STATUSES = enumValues(DecisionStatus);

const makeColumns = (t: TranslateFn): IColumn[] => [
  { key: 'decisionId', name: t('field.decisionId'), fieldName: 'decisionId', minWidth: 130 },
  { key: 'title', name: t('field.title'), fieldName: 'title', minWidth: 220 },
  { key: 'status', name: t('field.status'), fieldName: 'status', minWidth: 130 },
  { key: 'decidedBy', name: t('field.decidedBy'), fieldName: 'decidedBy', minWidth: 160 },
  { key: 'decisionDate', name: t('field.decisionDate'), fieldName: 'decisionDate', minWidth: 100 }
];
const sortAccessors = {
  decisionId: (d: Decision) => d.decisionId, title: (d: Decision) => d.title, status: (d: Decision) => d.status,
  decidedBy: (d: Decision) => d.decidedBy, decisionDate: (d: Decision) => d.decisionDate
};
const searchFields = [(d: Decision) => d.title, (d: Decision) => d.description, (d: Decision) => d.rationale, (d: Decision) => d.decisionId, (d: Decision) => d.decidedBy];
const csvColumns = [
  { header: 'Title', value: (d: Decision) => d.title }, { header: 'DecisionId', value: (d: Decision) => d.decisionId },
  { header: 'Description', value: (d: Decision) => d.description }, { header: 'Rationale', value: (d: Decision) => d.rationale },
  { header: 'Status', value: (d: Decision) => d.status }, { header: 'DecidedBy', value: (d: Decision) => d.decidedBy },
  { header: 'DecisionDate', value: (d: Decision) => d.decisionDate }, { header: 'ProjectId', value: (d: Decision) => d.projectId },
  { header: 'InitiativeId', value: (d: Decision) => d.initiativeId }
];

const Decisions: React.FC = () => {
  const t = useT();
  const { service, userEmail, decisions: state, projects, initiatives, meetings } = useHubData();
  const { initiativeOptions, projectOptions, meetingOptions } = useLinkOptions();
  const columns = React.useMemo(() => makeColumns(t), [t]);

  const newItem = React.useCallback((): Decision => ({
    decisionId: generateBusinessId('DEC'), title: '', description: '', rationale: '', status: DecisionStatus.PROPOSED, decidedBy: '',
    decisionDate: '', projectId: '', initiativeId: '', meetingId: ''
  }), []);

  const csvFromRow = React.useCallback((row: Record<string, string>): Decision => ({
    decisionId: row.DecisionId || generateBusinessId('DEC'), title: row.Title ?? '', description: row.Description ?? '', rationale: row.Rationale ?? '',
    status: csvEnum(row.Status, STATUSES, DecisionStatus.PROPOSED), decidedBy: row.DecidedBy ?? '', decisionDate: csvDate(row.DecisionDate),
    projectId: row.ProjectId ?? '', initiativeId: row.InitiativeId ?? '', meetingId: ''
  }), []);

  const checkBeforeSave = (form: Decision, original: Decision | undefined): string | undefined => {
    const base = original ? original.status : DecisionStatus.PROPOSED;
    return getAllowedDecisionStatuses(base).indexOf(form.status) === -1
      ? t('common.invalidTransition', { from: t(`status.${base}`), to: t(`status.${form.status}`) })
      : undefined;
  };

  const renderForm = ({ form, setForm, errors, original, isEdit, service: svc }: IFormContext<Decision>): React.ReactNode => {
    const base = original ? original.status : DecisionStatus.PROPOSED;
    return (
      <>
        <TextField label={t('field.decisionId')} value={form.decisionId} readOnly={isEdit} onChange={(_, v) => setForm(p => ({ ...p, decisionId: v ?? '' }))} />
        <Dropdown label={t('field.status')} selectedKey={form.status} options={toOptions(getAllowedDecisionStatuses(base), t)} onChange={(_, o) => setForm(p => ({ ...p, status: (o?.key as DecisionStatus) ?? base }))} />
        <FormRow full><TextField label={t('field.title')} required value={form.title} errorMessage={errors.title && t(errors.title)} onChange={(_, v) => setForm(p => ({ ...p, title: v ?? '' }))} /></FormRow>
        <FormRow full><TextField label={t('field.context')} multiline rows={3} value={form.description} onChange={(_, v) => setForm(p => ({ ...p, description: v ?? '' }))} /></FormRow>
        <FormRow full><TextField label={t('field.rationale')} multiline rows={3} value={form.rationale} onChange={(_, v) => setForm(p => ({ ...p, rationale: v ?? '' }))} /></FormRow>
        <UserField label={t('field.decidedBy')} service={svc} value={form.decidedBy} errorMessage={errors.decidedBy && t(errors.decidedBy)} onChange={e => setForm(p => ({ ...p, decidedBy: e }))} />
        <DateField label={t('field.decisionDate')} value={form.decisionDate} errorMessage={errors.decisionDate && t(errors.decisionDate)} onChange={v => setForm(p => ({ ...p, decisionDate: v }))} />
        <LinkField label={t('field.project')} value={form.projectId} options={projectOptions} onChange={id => setForm(p => ({ ...p, projectId: id }))} />
        <LinkField label={t('field.initiative')} value={form.initiativeId} options={initiativeOptions} onChange={id => setForm(p => ({ ...p, initiativeId: id }))} />
        <LinkField label={t('field.meeting')} value={form.meetingId} options={meetingOptions} onChange={id => setForm(p => ({ ...p, meetingId: id }))} />
      </>
    );
  };

  const renderDetail = (decision: Decision): React.ReactNode => {
    const project = projects.items.filter(p => p.projectId === decision.projectId)[0];
    const initiative = initiatives.items.filter(i => i.initiativeId === decision.initiativeId)[0];
    const meeting = meetings.items.filter(m => m.meetingId === decision.meetingId)[0];
    return (
      <DetailFields rows={[
        { label: t('field.decisionId'), value: decision.decisionId },
        { label: t('field.status'), value: t(`status.${decision.status}`) },
        { label: t('field.context'), value: decision.description },
        { label: t('field.rationale'), value: decision.rationale },
        { label: t('field.decidedBy'), value: decision.decidedBy },
        { label: t('field.decisionDate'), value: decision.decisionDate },
        { label: t('field.project'), value: project ? `${project.title} (${project.projectId})` : decision.projectId },
        { label: t('field.initiative'), value: initiative ? `${initiative.title} (${initiative.initiativeId})` : decision.initiativeId },
        { label: t('field.meeting'), value: meeting ? `${meeting.title} (${meeting.meetingId})` : decision.meetingId },
        { label: t('common.modifiedBy'), value: `${(decision.modified ?? '').slice(0, 10)} ${decision.editor ?? ''}`.trim() }
      ]} />
    );
  };

  return (
    <EntityScreen<Decision>
      textKey="decisions"
      listName={AppConfig.sharePoint.listNames.decisions}
      state={state}
      service={service}
      statuses={STATUSES}
      getStatus={d => d.status}
      getTitle={d => d.title}
      columns={columns}
      sortAccessors={sortAccessors}
      searchFields={searchFields}
      newItem={newItem}
      validate={validateDecision}
      buildPayload={buildDecisionPayload}
      prepareForSave={(form, original) => applyDecisionEffects(form, original ? original.status : undefined, userEmail)}
      checkBeforeSave={checkBeforeSave}
      renderForm={renderForm}
      renderDetail={renderDetail}
      quickStatuses={d => getAllowedDecisionStatuses(d.status)}
      quickPayload={(item, status) => {
        const updated = applyDecisionEffects({ ...item, status: status as DecisionStatus }, item.status, userEmail);
        return { Status: status, DecidedBy: updated.decidedBy, DecisionDate: dayKeyToSharePoint(updated.decisionDate) };
      }}
      hideArchive
      archiveStatus={DecisionStatus.SUPERSEDED}
      canArchive={() => false}
      csvFileName="decisions.csv"
      csvColumns={csvColumns}
      csvFromRow={csvFromRow}
    />
  );
};

export default Decisions;
