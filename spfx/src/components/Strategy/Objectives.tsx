import * as React from 'react';
import { Dropdown, IColumn, Stack, TextField } from '@fluentui/react';
import { AppConfig } from '../../config/AppConfig';
import { csvDate, csvEnum, enumValues } from '../../entities/csvHelpers';
import { buildObjectivePayload } from '../../entities/payloads';
import { TranslateFn, useT } from '../../i18n/I18n';
import { ActionPriority, Objective, ObjectiveStatus } from '../../models';
import { generateBusinessId } from '../../rules/ids';
import { casesOfObjective, caseRoiPct, getAllowedObjectiveStatuses, isObjectiveLate } from '../../rules/strategy';
import { validateObjective } from '../../rules/validation';
import { formatMoney } from '../../utils/format';
import { titleFor, titleMap } from '../../utils/lookup';
import DateField from '../shared/DateField';
import { DetailFields, RelatedList } from '../shared/DetailSection';
import EntityScreen, { IFormContext } from '../shared/EntityScreen';
import { FormRow } from '../shared/FormGrid';
import { useHubData } from '../shared/HubData';
import LinkField from '../shared/LinkField';
import { useStrategyLinkOptions } from '../shared/linkOptions';
import { toOptions } from '../shared/options';
import UserField from '../shared/UserField';

const STATUSES = enumValues(ObjectiveStatus);
const PRIORITIES = enumValues(ActionPriority);

const searchFields = [(o: Objective) => o.title, (o: Objective) => o.description, (o: Objective) => o.goal, (o: Objective) => o.objectiveId, (o: Objective) => o.ownerUpn];
const sortAccessors = {
  title: (o: Objective) => o.title, status: (o: Objective) => o.status, priority: (o: Objective) => PRIORITIES.indexOf(o.priority), targetDate: (o: Objective) => o.targetDate, ownerUpn: (o: Objective) => o.ownerUpn
};
const csvColumns = [
  { header: 'Title', value: (o: Objective) => o.title }, { header: 'ObjectiveId', value: (o: Objective) => o.objectiveId }, { header: 'Description', value: (o: Objective) => o.description },
  { header: 'OwnerUPN', value: (o: Objective) => o.ownerUpn }, { header: 'SponsorUPN', value: (o: Objective) => o.sponsorUpn }, { header: 'StartDate', value: (o: Objective) => o.startDate },
  { header: 'TargetDate', value: (o: Objective) => o.targetDate }, { header: 'Status', value: (o: Objective) => o.status }, { header: 'Priority', value: (o: Objective) => o.priority },
  { header: 'Goal', value: (o: Objective) => o.goal }, { header: 'KpiId', value: (o: Objective) => o.kpiId }
];

const makeColumns = (t: TranslateFn): IColumn[] => [
  { key: 'title', name: t('field.title'), fieldName: 'title', minWidth: 240 },
  { key: 'goal', name: t('field.goal'), fieldName: 'goal', minWidth: 180 },
  { key: 'status', name: t('field.status'), fieldName: 'status', minWidth: 110 },
  { key: 'priority', name: t('field.priority'), minWidth: 80, onRender: (o: Objective) => t(`priority.${o.priority}`) },
  { key: 'ownerUpn', name: t('field.owner'), fieldName: 'ownerUpn', minWidth: 150 },
  { key: 'targetDate', name: t('field.targetDate'), minWidth: 110, onRender: (o: Objective) => `${isObjectiveLate(o) ? '🔴 ' : ''}${o.targetDate ?? ''}` }
];

/** What IT is trying to achieve, with the business cases and the KPI that go with it. */
const Objectives: React.FC = () => {
  const t = useT();
  const { service, userEmail, objectives: state, businessCases, kpis } = useHubData();
  const { kpiOptions } = useStrategyLinkOptions();
  const columns = React.useMemo(() => makeColumns(t), [t]);
  const kpiTitles = React.useMemo(() => titleMap(kpis.items, k => k.kpiId), [kpis.items]);

  const newItem = React.useCallback((): Objective => ({
    objectiveId: generateBusinessId('OBJ'), title: '', description: '', ownerUpn: userEmail, sponsorUpn: '', startDate: '', targetDate: '', status: ObjectiveStatus.DRAFT, priority: ActionPriority.MEDIUM, goal: '', kpiId: ''
  }), [userEmail]);

  const csvFromRow = React.useCallback((row: Record<string, string>): Objective => ({
    objectiveId: row.ObjectiveId || generateBusinessId('OBJ'), title: row.Title ?? '', description: row.Description ?? '', ownerUpn: row.OwnerUPN || userEmail, sponsorUpn: row.SponsorUPN ?? '',
    startDate: csvDate(row.StartDate), targetDate: csvDate(row.TargetDate), status: csvEnum(row.Status, STATUSES, ObjectiveStatus.DRAFT), priority: csvEnum(row.Priority, PRIORITIES, ActionPriority.MEDIUM),
    goal: row.Goal ?? '', kpiId: row.KpiId ?? ''
  }), [userEmail]);

  const checkBeforeSave = (form: Objective, original: Objective | undefined): string | undefined => {
    const base = original ? original.status : ObjectiveStatus.DRAFT;
    return getAllowedObjectiveStatuses(base).indexOf(form.status) === -1
      ? t('common.invalidTransition', { from: t(`status.${base}`), to: t(`status.${form.status}`) })
      : undefined;
  };

  const renderForm = ({ form, setForm, errors, original, isEdit, service: svc }: IFormContext<Objective>): React.ReactNode => {
    const base = original ? original.status : ObjectiveStatus.DRAFT;
    return (
      <>
        <TextField label={t('field.objectiveId')} value={form.objectiveId} readOnly={isEdit} onChange={(_, v) => setForm(p => ({ ...p, objectiveId: v ?? '' }))} />
        <Dropdown label={t('field.status')} selectedKey={form.status} options={toOptions(getAllowedObjectiveStatuses(base), t)} onChange={(_, o) => setForm(p => ({ ...p, status: (o?.key as ObjectiveStatus) ?? base }))} />
        <FormRow full><TextField label={t('field.title')} required value={form.title} errorMessage={errors.title && t(errors.title)} onChange={(_, v) => setForm(p => ({ ...p, title: v ?? '' }))} /></FormRow>
        <FormRow full><TextField label={t('field.goal')} value={form.goal} onChange={(_, v) => setForm(p => ({ ...p, goal: v ?? '' }))} /></FormRow>
        <FormRow full><TextField label={t('field.description')} multiline rows={3} value={form.description} onChange={(_, v) => setForm(p => ({ ...p, description: v ?? '' }))} /></FormRow>
        <UserField label={t('field.owner')} required service={svc} value={form.ownerUpn} errorMessage={errors.ownerUpn && t(errors.ownerUpn)} onChange={e => setForm(p => ({ ...p, ownerUpn: e }))} />
        <UserField label={t('field.sponsor')} service={svc} value={form.sponsorUpn} errorMessage={errors.sponsorUpn && t(errors.sponsorUpn)} onChange={e => setForm(p => ({ ...p, sponsorUpn: e }))} />
        <DateField label={t('field.startDate')} value={form.startDate} errorMessage={errors.startDate && t(errors.startDate)} onChange={v => setForm(p => ({ ...p, startDate: v }))} />
        <DateField label={t('field.targetDate')} value={form.targetDate} errorMessage={errors.targetDate && t(errors.targetDate)} onChange={v => setForm(p => ({ ...p, targetDate: v }))} />
        <Dropdown label={t('field.priority')} selectedKey={form.priority} options={toOptions(PRIORITIES, t, 'priority')} onChange={(_, o) => setForm(p => ({ ...p, priority: (o?.key as ActionPriority) ?? ActionPriority.MEDIUM }))} />
        <LinkField label={t('field.kpi')} value={form.kpiId} options={kpiOptions} onChange={id => setForm(p => ({ ...p, kpiId: id }))} />
      </>
    );
  };

  const renderDetail = (o: Objective): React.ReactNode => {
    const cases = casesOfObjective(o, businessCases.items);
    return (
      <Stack tokens={{ childrenGap: 16 }}>
        <DetailFields rows={[
          { label: t('field.objectiveId'), value: o.objectiveId },
          { label: t('field.status'), value: t(`status.${o.status}`) },
          { label: t('field.goal'), value: o.goal },
          { label: t('field.description'), value: o.description },
          { label: t('field.owner'), value: o.ownerUpn },
          { label: t('field.sponsor'), value: o.sponsorUpn },
          { label: t('field.priority'), value: t(`priority.${o.priority}`) },
          { label: t('field.startDate'), value: o.startDate },
          { label: t('field.targetDate'), value: `${isObjectiveLate(o) ? '🔴 ' : ''}${o.targetDate ?? ''}`.trim() },
          { label: t('field.kpi'), value: o.kpiId ? `${titleFor(kpiTitles, o.kpiId)} (${o.kpiId})` : '' },
          { label: t('common.modifiedBy'), value: `${(o.modified ?? '').slice(0, 10)} ${o.editor ?? ''}`.trim() }
        ]} />
        <RelatedList title={t('nav.businessCases')} items={cases.map(c => ({
          key: c.caseId, title: c.title, meta: `${t(`status.${c.status}`)} · ${formatMoney(c.estimatedCost)}${caseRoiPct(c) === undefined ? '' : ` · ROI ${caseRoiPct(c)} %`}`
        }))} />
      </Stack>
    );
  };

  return (
    <EntityScreen<Objective>
      textKey="objectives"
      listName={AppConfig.sharePoint.listNames.objectives}
      state={state}
      service={service}
      statuses={STATUSES}
      getStatus={o => o.status}
      getTitle={o => o.title}
      columns={columns}
      sortAccessors={sortAccessors}
      searchFields={searchFields}
      newItem={newItem}
      validate={validateObjective}
      buildPayload={buildObjectivePayload}
      checkBeforeSave={checkBeforeSave}
      renderForm={renderForm}
      renderDetail={renderDetail}
      quickStatuses={o => getAllowedObjectiveStatuses(o.status)}
      archiveStatus={ObjectiveStatus.CANCELLED}
      canArchive={o => getAllowedObjectiveStatuses(o.status).indexOf(ObjectiveStatus.CANCELLED) > -1 && o.status !== ObjectiveStatus.CANCELLED}
      hideAttachments
      csvFileName="objectives.csv"
      csvColumns={csvColumns}
      csvFromRow={csvFromRow}
    />
  );
};

export default Objectives;
