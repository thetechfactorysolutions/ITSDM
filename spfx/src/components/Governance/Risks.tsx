import * as React from 'react';
import { Dropdown, IColumn, Text, TextField } from '@fluentui/react';
import { AppConfig } from '../../config/AppConfig';
import { csvDate, csvEnum, enumValues } from '../../entities/csvHelpers';
import { buildRiskPayload } from '../../entities/payloads';
import { TranslateFn, useT } from '../../i18n/I18n';
import { Risk, RiskScale, RiskStatus } from '../../models';
import { getAllowedRiskStatuses, riskLevel, riskScore } from '../../rules/governance';
import { generateBusinessId } from '../../rules/ids';
import { validateRisk } from '../../rules/validation';
import DateField from '../shared/DateField';
import { DetailFields } from '../shared/DetailSection';
import EntityScreen, { IFormContext } from '../shared/EntityScreen';
import { FormRow } from '../shared/FormGrid';
import { useHubData } from '../shared/HubData';
import LinkField from '../shared/LinkField';
import { useLinkOptions } from '../shared/linkOptions';
import { toOptions } from '../shared/options';
import UserField from '../shared/UserField';

const STATUSES = enumValues(RiskStatus);
const SCALE = enumValues(RiskScale);

const scoreOf = (r: Risk): number => riskScore(r.probability, r.impact);

const makeColumns = (t: TranslateFn): IColumn[] => [
  { key: 'riskId', name: t('field.riskId'), fieldName: 'riskId', minWidth: 130 },
  { key: 'title', name: t('field.title'), fieldName: 'title', minWidth: 200 },
  { key: 'status', name: t('field.status'), fieldName: 'status', minWidth: 130 },
  { key: 'score', name: t('field.score'), minWidth: 110, onRender: (r: Risk) => `${scoreOf(r)} · ${t(`risk.${riskLevel(r)}`)}` },
  { key: 'ownerUpn', name: t('field.owner'), fieldName: 'ownerUpn', minWidth: 160 },
  { key: 'dueDate', name: t('field.dueDate'), fieldName: 'dueDate', minWidth: 100 }
];
const sortAccessors = {
  riskId: (r: Risk) => r.riskId, title: (r: Risk) => r.title, status: (r: Risk) => r.status,
  score: (r: Risk) => scoreOf(r), ownerUpn: (r: Risk) => r.ownerUpn, dueDate: (r: Risk) => r.dueDate
};
const searchFields = [(r: Risk) => r.title, (r: Risk) => r.description, (r: Risk) => r.mitigation, (r: Risk) => r.riskId, (r: Risk) => r.ownerUpn];
const csvColumns = [
  { header: 'Title', value: (r: Risk) => r.title }, { header: 'RiskId', value: (r: Risk) => r.riskId },
  { header: 'Description', value: (r: Risk) => r.description }, { header: 'Status', value: (r: Risk) => r.status },
  { header: 'Probability', value: (r: Risk) => r.probability }, { header: 'Impact', value: (r: Risk) => r.impact },
  { header: 'OwnerUPN', value: (r: Risk) => r.ownerUpn }, { header: 'Mitigation', value: (r: Risk) => r.mitigation },
  { header: 'DueDate', value: (r: Risk) => r.dueDate }, { header: 'ProjectId', value: (r: Risk) => r.projectId },
  { header: 'InitiativeId', value: (r: Risk) => r.initiativeId }
];

const Risks: React.FC = () => {
  const t = useT();
  const { service, userEmail, risks: state, projects, initiatives, meetings } = useHubData();
  const { initiativeOptions, projectOptions, meetingOptions } = useLinkOptions();
  const columns = React.useMemo(() => makeColumns(t), [t]);

  const newItem = React.useCallback((): Risk => ({
    riskId: generateBusinessId('RISK'), title: '', description: '', status: RiskStatus.OPEN, probability: RiskScale.MEDIUM, impact: RiskScale.MEDIUM,
    ownerUpn: userEmail, mitigation: '', dueDate: '', projectId: '', initiativeId: '', meetingId: ''
  }), [userEmail]);

  const csvFromRow = React.useCallback((row: Record<string, string>): Risk => ({
    riskId: row.RiskId || generateBusinessId('RISK'), title: row.Title ?? '', description: row.Description ?? '',
    status: csvEnum(row.Status, STATUSES, RiskStatus.OPEN), probability: csvEnum(row.Probability, SCALE, RiskScale.MEDIUM), impact: csvEnum(row.Impact, SCALE, RiskScale.MEDIUM),
    ownerUpn: row.OwnerUPN || userEmail, mitigation: row.Mitigation ?? '', dueDate: csvDate(row.DueDate),
    projectId: row.ProjectId ?? '', initiativeId: row.InitiativeId ?? '', meetingId: ''
  }), [userEmail]);

  const checkBeforeSave = (form: Risk, original: Risk | undefined): string | undefined => {
    const base = original ? original.status : RiskStatus.OPEN;
    return getAllowedRiskStatuses(base).indexOf(form.status) === -1
      ? t('common.invalidTransition', { from: t(`status.${base}`), to: t(`status.${form.status}`) })
      : undefined;
  };

  const renderForm = ({ form, setForm, errors, original, isEdit, service: svc }: IFormContext<Risk>): React.ReactNode => {
    const base = original ? original.status : RiskStatus.OPEN;
    return (
      <>
        <TextField label={t('field.riskId')} value={form.riskId} readOnly={isEdit} onChange={(_, v) => setForm(p => ({ ...p, riskId: v ?? '' }))} />
        <Dropdown label={t('field.status')} selectedKey={form.status} options={toOptions(getAllowedRiskStatuses(base), t)} onChange={(_, o) => setForm(p => ({ ...p, status: (o?.key as RiskStatus) ?? base }))} />
        <FormRow full><TextField label={t('field.title')} required value={form.title} errorMessage={errors.title && t(errors.title)} onChange={(_, v) => setForm(p => ({ ...p, title: v ?? '' }))} /></FormRow>
        <FormRow full><TextField label={t('field.description')} multiline rows={3} value={form.description} onChange={(_, v) => setForm(p => ({ ...p, description: v ?? '' }))} /></FormRow>
        <Dropdown label={t('field.probability')} selectedKey={form.probability} options={toOptions(SCALE, t, 'probability')} onChange={(_, o) => setForm(p => ({ ...p, probability: (o?.key as RiskScale) ?? RiskScale.MEDIUM }))} />
        <Dropdown label={t('field.impact')} selectedKey={form.impact} options={toOptions(SCALE, t, 'impact')} onChange={(_, o) => setForm(p => ({ ...p, impact: (o?.key as RiskScale) ?? RiskScale.MEDIUM }))} />
        <FormRow full><Text>{t('field.score')}: <strong>{scoreOf(form)} · {t(`risk.${riskLevel(form)}`)}</strong></Text></FormRow>
        <UserField label={t('field.owner')} required service={svc} value={form.ownerUpn} errorMessage={errors.ownerUpn && t(errors.ownerUpn)} onChange={e => setForm(p => ({ ...p, ownerUpn: e }))} />
        <DateField label={t('field.mitigationDue')} value={form.dueDate} errorMessage={errors.dueDate && t(errors.dueDate)} onChange={v => setForm(p => ({ ...p, dueDate: v }))} />
        <FormRow full><TextField label={t('field.mitigation')} multiline rows={3} value={form.mitigation} onChange={(_, v) => setForm(p => ({ ...p, mitigation: v ?? '' }))} /></FormRow>
        <LinkField label={t('field.project')} value={form.projectId} options={projectOptions} onChange={id => setForm(p => ({ ...p, projectId: id }))} />
        <LinkField label={t('field.initiative')} value={form.initiativeId} options={initiativeOptions} onChange={id => setForm(p => ({ ...p, initiativeId: id }))} />
        <LinkField label={t('field.meeting')} value={form.meetingId} options={meetingOptions} onChange={id => setForm(p => ({ ...p, meetingId: id }))} />
      </>
    );
  };

  const renderDetail = (risk: Risk): React.ReactNode => {
    const project = projects.items.filter(p => p.projectId === risk.projectId)[0];
    const initiative = initiatives.items.filter(i => i.initiativeId === risk.initiativeId)[0];
    const meeting = meetings.items.filter(m => m.meetingId === risk.meetingId)[0];
    return (
      <DetailFields rows={[
        { label: t('field.riskId'), value: risk.riskId },
        { label: t('field.status'), value: t(`status.${risk.status}`) },
        { label: t('field.score'), value: `${scoreOf(risk)} · ${t(`risk.${riskLevel(risk)}`)}` },
        { label: t('field.probability'), value: t(`probability.${risk.probability}`) },
        { label: t('field.impact'), value: t(`impact.${risk.impact}`) },
        { label: t('field.description'), value: risk.description },
        { label: t('field.mitigation'), value: risk.mitigation },
        { label: t('field.owner'), value: risk.ownerUpn },
        { label: t('field.mitigationDue'), value: risk.dueDate },
        { label: t('field.project'), value: project ? `${project.title} (${project.projectId})` : risk.projectId },
        { label: t('field.initiative'), value: initiative ? `${initiative.title} (${initiative.initiativeId})` : risk.initiativeId },
        { label: t('field.meeting'), value: meeting ? `${meeting.title} (${meeting.meetingId})` : risk.meetingId },
        { label: t('common.modifiedBy'), value: `${(risk.modified ?? '').slice(0, 10)} ${risk.editor ?? ''}`.trim() }
      ]} />
    );
  };

  return (
    <EntityScreen<Risk>
      textKey="risks"
      listName={AppConfig.sharePoint.listNames.risks}
      state={state}
      service={service}
      statuses={STATUSES}
      getStatus={r => r.status}
      getTitle={r => r.title}
      columns={columns}
      sortAccessors={sortAccessors}
      searchFields={searchFields}
      newItem={newItem}
      validate={validateRisk}
      buildPayload={buildRiskPayload}
      checkBeforeSave={checkBeforeSave}
      renderForm={renderForm}
      renderDetail={renderDetail}
      quickStatuses={r => getAllowedRiskStatuses(r.status)}
      archiveStatus={RiskStatus.CLOSED}
      canArchive={r => r.status !== RiskStatus.CLOSED}
      csvFileName="risks.csv"
      csvColumns={csvColumns}
      csvFromRow={csvFromRow}
    />
  );
};

export default Risks;
