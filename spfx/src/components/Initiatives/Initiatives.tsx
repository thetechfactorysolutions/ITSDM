import * as React from 'react';
import { Dropdown, IColumn, Stack, TextField } from '@fluentui/react';
import { AppConfig } from '../../config/AppConfig';
import { csvDate, csvEnum, csvNumber, enumValues } from '../../entities/csvHelpers';
import { buildInitiativePayload } from '../../entities/payloads';
import { TranslateFn, useT } from '../../i18n/I18n';
import { Initiative, InitiativeStatus } from '../../models';
import { generateBusinessId } from '../../rules/ids';
import { getAllowedInitiativeStatuses } from '../../rules/transitions';
import { validateInitiative } from '../../rules/validation';
import DateField from '../shared/DateField';
import { DetailFields, RelatedList } from '../shared/DetailSection';
import EntityScreen, { IFormContext } from '../shared/EntityScreen';
import { FormRow } from '../shared/FormGrid';
import { useHubData } from '../shared/HubData';
import LinkField from '../shared/LinkField';
import { toOptions } from '../shared/options';
import UserField from '../shared/UserField';

const STATUSES = enumValues(InitiativeStatus);

const makeColumns = (t: TranslateFn): IColumn[] => [
  { key: 'initiativeId', name: t('field.initiativeId'), fieldName: 'initiativeId', minWidth: 130 },
  { key: 'title', name: t('field.title'), fieldName: 'title', minWidth: 180 },
  { key: 'status', name: t('field.status'), fieldName: 'status', minWidth: 110 },
  { key: 'progressPct', name: t('field.progress'), minWidth: 80, onRender: (i: Initiative) => `${i.progressPct}%` },
  { key: 'ownerUpn', name: t('field.owner'), fieldName: 'ownerUpn', minWidth: 160 },
  { key: 'targetDate', name: t('field.targetDate'), fieldName: 'targetDate', minWidth: 100 }
];
const sortAccessors = {
  initiativeId: (i: Initiative) => i.initiativeId,
  title: (i: Initiative) => i.title,
  status: (i: Initiative) => i.status,
  progressPct: (i: Initiative) => i.progressPct,
  ownerUpn: (i: Initiative) => i.ownerUpn,
  targetDate: (i: Initiative) => i.targetDate
};
const searchFields = [(i: Initiative) => i.title, (i: Initiative) => i.description, (i: Initiative) => i.initiativeId, (i: Initiative) => i.ownerUpn];

const csvColumns = [
  { header: 'Title', value: (i: Initiative) => i.title },
  { header: 'InitiativeId', value: (i: Initiative) => i.initiativeId },
  { header: 'Description', value: (i: Initiative) => i.description },
  { header: 'Status', value: (i: Initiative) => i.status },
  { header: 'OwnerUPN', value: (i: Initiative) => i.ownerUpn },
  { header: 'ProgressPct', value: (i: Initiative) => i.progressPct },
  { header: 'TargetDate', value: (i: Initiative) => i.targetDate },
  { header: 'SourceIdeaId', value: (i: Initiative) => i.sourceIdeaId }
];

const Initiatives: React.FC = () => {
  const t = useT();
  const { service, userEmail, initiatives: state, ideas, projects, actions, notes } = useHubData();
  const columns = React.useMemo(() => makeColumns(t), [t]);

  const ideaOptions = React.useMemo(() => ideas.items.map(i => ({ id: i.ideaId, title: i.title })), [ideas.items]);

  const newItem = React.useCallback((): Initiative => ({
    initiativeId: generateBusinessId('INIT'), title: '', description: '', status: InitiativeStatus.DRAFT, ownerUpn: userEmail,
    progressPct: 0, targetDate: '', sourceIdeaId: '', plannerPlanId: ''
  }), [userEmail]);

  const csvFromRow = React.useCallback((row: Record<string, string>): Initiative => ({
    initiativeId: row.InitiativeId || generateBusinessId('INIT'),
    title: row.Title ?? '',
    description: row.Description ?? '',
    status: csvEnum(row.Status, STATUSES, InitiativeStatus.DRAFT),
    ownerUpn: row.OwnerUPN || userEmail,
    progressPct: csvNumber(row.ProgressPct),
    targetDate: csvDate(row.TargetDate),
    sourceIdeaId: row.SourceIdeaId ?? '',
    plannerPlanId: ''
  }), [userEmail]);

  const checkBeforeSave = (form: Initiative, original: Initiative | undefined): string | undefined => {
    const base = original ? original.status : InitiativeStatus.DRAFT;
    return getAllowedInitiativeStatuses(base).indexOf(form.status) === -1
      ? t('common.invalidTransition', { from: t(`status.${base}`), to: t(`status.${form.status}`) })
      : undefined;
  };

  const renderForm = ({ form, setForm, errors, original, isEdit, service: svc }: IFormContext<Initiative>): React.ReactNode => {
    const base = original ? original.status : InitiativeStatus.DRAFT;
    return (
      <>
        <TextField label={t('field.initiativeId')} value={form.initiativeId} readOnly={isEdit} onChange={(_, v) => setForm(p => ({ ...p, initiativeId: v ?? '' }))} />
        <Dropdown label={t('field.status')} selectedKey={form.status} options={toOptions(getAllowedInitiativeStatuses(base), t)}
          onChange={(_, o) => setForm(p => ({ ...p, status: (o?.key as InitiativeStatus) ?? base }))} />
        <FormRow full><TextField label={t('field.title')} required value={form.title} errorMessage={errors.title && t(errors.title)} onChange={(_, v) => setForm(p => ({ ...p, title: v ?? '' }))} /></FormRow>
        <FormRow full><TextField label={t('field.description')} multiline rows={4} value={form.description} onChange={(_, v) => setForm(p => ({ ...p, description: v ?? '' }))} /></FormRow>
        <UserField label={t('field.owner')} required service={svc} value={form.ownerUpn} errorMessage={errors.ownerUpn && t(errors.ownerUpn)} onChange={e => setForm(p => ({ ...p, ownerUpn: e }))} />
        <TextField label={t('field.progress')} type="number" min={0} max={100} value={String(form.progressPct)} errorMessage={errors.progressPct && t(errors.progressPct)} onChange={(_, v) => setForm(p => ({ ...p, progressPct: Number(v ?? 0) }))} />
        <DateField label={t('field.targetDate')} value={form.targetDate} errorMessage={errors.targetDate && t(errors.targetDate)} onChange={v => setForm(p => ({ ...p, targetDate: v }))} />
        <LinkField label={t('field.sourceIdea')} value={form.sourceIdeaId} options={ideaOptions} onChange={id => setForm(p => ({ ...p, sourceIdeaId: id }))} />
      </>
    );
  };

  const renderDetail = (initiative: Initiative): React.ReactNode => {
    const myProjects = projects.items.filter(p => p.initiativeId === initiative.initiativeId);
    const myActions = actions.items.filter(a => a.initiativeId === initiative.initiativeId);
    const myNotes = notes.items.filter(n => n.initiativeId === initiative.initiativeId);
    const sourceIdea = ideas.items.filter(i => i.ideaId === initiative.sourceIdeaId)[0];

    return (
      <Stack tokens={{ childrenGap: 16 }}>
        <DetailFields rows={[
          { label: t('field.initiativeId'), value: initiative.initiativeId },
          { label: t('field.status'), value: t(`status.${initiative.status}`) },
          { label: t('field.description'), value: initiative.description },
          { label: t('field.owner'), value: initiative.ownerUpn },
          { label: t('field.progress'), value: `${initiative.progressPct}%` },
          { label: t('field.targetDate'), value: initiative.targetDate },
          { label: t('field.sourceIdea'), value: sourceIdea ? `${sourceIdea.title} (${sourceIdea.ideaId})` : initiative.sourceIdeaId },
          { label: t('common.modifiedBy'), value: `${(initiative.modified ?? '').slice(0, 10)} ${initiative.editor ?? ''}`.trim() }
        ]} />
        <RelatedList title={t('nav.projects')} items={myProjects.map(p => ({ key: p.projectId, title: p.title, meta: t(`status.${p.status}`) }))} />
        <RelatedList title={t('nav.actions')} items={myActions.map(a => ({ key: a.actionId, title: a.title, meta: t(`status.${a.status}`) }))} />
        <RelatedList title={t('nav.notes')} items={myNotes.map(n => ({ key: n.noteId, title: n.title, meta: t(`category.${n.category}`) }))} />
      </Stack>
    );
  };

  return (
    <EntityScreen<Initiative>
      textKey="initiatives"
      listName={AppConfig.sharePoint.listNames.initiatives}
      state={state}
      service={service}
      statuses={STATUSES}
      getStatus={i => i.status}
      getTitle={i => i.title}
      columns={columns}
      sortAccessors={sortAccessors}
      searchFields={searchFields}
      newItem={newItem}
      validate={validateInitiative}
      buildPayload={buildInitiativePayload}
      checkBeforeSave={checkBeforeSave}
      renderForm={renderForm}
      renderDetail={renderDetail}
      quickStatuses={i => getAllowedInitiativeStatuses(i.status)}
      archiveStatus={InitiativeStatus.CANCELLED}
      canArchive={i => getAllowedInitiativeStatuses(i.status).indexOf(InitiativeStatus.CANCELLED) > -1 && i.status !== InitiativeStatus.CANCELLED}
      csvFileName="initiatives.csv"
      csvColumns={csvColumns}
      csvFromRow={csvFromRow}
    />
  );
};

export default Initiatives;
