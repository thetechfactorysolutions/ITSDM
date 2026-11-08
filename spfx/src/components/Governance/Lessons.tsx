import * as React from 'react';
import { Dropdown, IColumn, TextField } from '@fluentui/react';
import { AppConfig } from '../../config/AppConfig';
import { csvEnum, enumValues } from '../../entities/csvHelpers';
import { buildLessonPayload } from '../../entities/payloads';
import { TranslateFn, useT } from '../../i18n/I18n';
import { Lesson, LessonCategory, LessonStatus } from '../../models';
import { getAllowedLessonStatuses } from '../../rules/governance';
import { generateBusinessId } from '../../rules/ids';
import { validateLesson } from '../../rules/validation';
import { DetailFields } from '../shared/DetailSection';
import EntityScreen, { IFormContext } from '../shared/EntityScreen';
import { FormRow } from '../shared/FormGrid';
import { useHubData } from '../shared/HubData';
import LinkField from '../shared/LinkField';
import { useLinkOptions } from '../shared/linkOptions';
import { toOptions } from '../shared/options';
import UserField from '../shared/UserField';

const STATUSES = enumValues(LessonStatus);
const CATEGORIES = enumValues(LessonCategory);

const makeColumns = (t: TranslateFn): IColumn[] => [
  { key: 'lessonId', name: t('field.lessonId'), fieldName: 'lessonId', minWidth: 130 },
  { key: 'title', name: t('field.title'), fieldName: 'title', minWidth: 220 },
  { key: 'category', name: t('field.category'), minWidth: 110, onRender: (l: Lesson) => t(`lessonCategory.${l.category}`) },
  { key: 'status', name: t('field.status'), fieldName: 'status', minWidth: 120 },
  { key: 'ownerUpn', name: t('field.owner'), fieldName: 'ownerUpn', minWidth: 160 }
];
const sortAccessors = {
  lessonId: (l: Lesson) => l.lessonId, title: (l: Lesson) => l.title, category: (l: Lesson) => l.category,
  status: (l: Lesson) => l.status, ownerUpn: (l: Lesson) => l.ownerUpn
};
const searchFields = [(l: Lesson) => l.title, (l: Lesson) => l.description, (l: Lesson) => l.recommendation, (l: Lesson) => l.lessonId, (l: Lesson) => l.ownerUpn];
const csvColumns = [
  { header: 'Title', value: (l: Lesson) => l.title }, { header: 'LessonId', value: (l: Lesson) => l.lessonId },
  { header: 'Description', value: (l: Lesson) => l.description }, { header: 'Recommendation', value: (l: Lesson) => l.recommendation },
  { header: 'Category', value: (l: Lesson) => l.category }, { header: 'Status', value: (l: Lesson) => l.status },
  { header: 'OwnerUPN', value: (l: Lesson) => l.ownerUpn }, { header: 'ProjectId', value: (l: Lesson) => l.projectId },
  { header: 'InitiativeId', value: (l: Lesson) => l.initiativeId }
];

const Lessons: React.FC = () => {
  const t = useT();
  const { service, userEmail, lessons: state, projects, initiatives, meetings } = useHubData();
  const { initiativeOptions, projectOptions, meetingOptions } = useLinkOptions();
  const columns = React.useMemo(() => makeColumns(t), [t]);

  const newItem = React.useCallback((): Lesson => ({
    lessonId: generateBusinessId('LESS'), title: '', description: '', recommendation: '', category: LessonCategory.PROCESS, status: LessonStatus.NEW,
    ownerUpn: userEmail, projectId: '', initiativeId: '', meetingId: ''
  }), [userEmail]);

  const csvFromRow = React.useCallback((row: Record<string, string>): Lesson => ({
    lessonId: row.LessonId || generateBusinessId('LESS'), title: row.Title ?? '', description: row.Description ?? '', recommendation: row.Recommendation ?? '',
    category: csvEnum(row.Category, CATEGORIES, LessonCategory.OTHER), status: csvEnum(row.Status, STATUSES, LessonStatus.NEW),
    ownerUpn: row.OwnerUPN ?? '', projectId: row.ProjectId ?? '', initiativeId: row.InitiativeId ?? '', meetingId: ''
  }), []);

  const checkBeforeSave = (form: Lesson, original: Lesson | undefined): string | undefined => {
    const base = original ? original.status : LessonStatus.NEW;
    return getAllowedLessonStatuses(base).indexOf(form.status) === -1
      ? t('common.invalidTransition', { from: t(`status.${base}`), to: t(`status.${form.status}`) })
      : undefined;
  };

  const renderForm = ({ form, setForm, errors, original, isEdit, service: svc }: IFormContext<Lesson>): React.ReactNode => {
    const base = original ? original.status : LessonStatus.NEW;
    return (
      <>
        <TextField label={t('field.lessonId')} value={form.lessonId} readOnly={isEdit} onChange={(_, v) => setForm(p => ({ ...p, lessonId: v ?? '' }))} />
        <Dropdown label={t('field.status')} selectedKey={form.status} options={toOptions(getAllowedLessonStatuses(base), t)} onChange={(_, o) => setForm(p => ({ ...p, status: (o?.key as LessonStatus) ?? base }))} />
        <FormRow full><TextField label={t('field.title')} required value={form.title} errorMessage={errors.title && t(errors.title)} onChange={(_, v) => setForm(p => ({ ...p, title: v ?? '' }))} /></FormRow>
        <FormRow full><TextField label={t('field.whatHappened')} multiline rows={3} value={form.description} onChange={(_, v) => setForm(p => ({ ...p, description: v ?? '' }))} /></FormRow>
        <FormRow full><TextField label={t('field.recommendation')} multiline rows={3} value={form.recommendation} onChange={(_, v) => setForm(p => ({ ...p, recommendation: v ?? '' }))} /></FormRow>
        <Dropdown label={t('field.category')} selectedKey={form.category} options={toOptions(CATEGORIES, t, 'lessonCategory')} onChange={(_, o) => setForm(p => ({ ...p, category: (o?.key as LessonCategory) ?? LessonCategory.OTHER }))} />
        <UserField label={t('field.owner')} service={svc} value={form.ownerUpn} errorMessage={errors.ownerUpn && t(errors.ownerUpn)} onChange={e => setForm(p => ({ ...p, ownerUpn: e }))} />
        <LinkField label={t('field.project')} value={form.projectId} options={projectOptions} onChange={id => setForm(p => ({ ...p, projectId: id }))} />
        <LinkField label={t('field.initiative')} value={form.initiativeId} options={initiativeOptions} onChange={id => setForm(p => ({ ...p, initiativeId: id }))} />
        <LinkField label={t('field.meeting')} value={form.meetingId} options={meetingOptions} onChange={id => setForm(p => ({ ...p, meetingId: id }))} />
      </>
    );
  };

  const renderDetail = (lesson: Lesson): React.ReactNode => {
    const project = projects.items.filter(p => p.projectId === lesson.projectId)[0];
    const initiative = initiatives.items.filter(i => i.initiativeId === lesson.initiativeId)[0];
    const meeting = meetings.items.filter(m => m.meetingId === lesson.meetingId)[0];
    return (
      <DetailFields rows={[
        { label: t('field.lessonId'), value: lesson.lessonId },
        { label: t('field.status'), value: t(`status.${lesson.status}`) },
        { label: t('field.category'), value: t(`lessonCategory.${lesson.category}`) },
        { label: t('field.whatHappened'), value: lesson.description },
        { label: t('field.recommendation'), value: lesson.recommendation },
        { label: t('field.owner'), value: lesson.ownerUpn },
        { label: t('field.project'), value: project ? `${project.title} (${project.projectId})` : lesson.projectId },
        { label: t('field.initiative'), value: initiative ? `${initiative.title} (${initiative.initiativeId})` : lesson.initiativeId },
        { label: t('field.meeting'), value: meeting ? `${meeting.title} (${meeting.meetingId})` : lesson.meetingId },
        { label: t('common.modifiedBy'), value: `${(lesson.modified ?? '').slice(0, 10)} ${lesson.editor ?? ''}`.trim() }
      ]} />
    );
  };

  return (
    <EntityScreen<Lesson>
      textKey="lessons"
      listName={AppConfig.sharePoint.listNames.lessonsLearned}
      state={state}
      service={service}
      statuses={STATUSES}
      getStatus={l => l.status}
      getTitle={l => l.title}
      columns={columns}
      sortAccessors={sortAccessors}
      searchFields={searchFields}
      newItem={newItem}
      validate={validateLesson}
      buildPayload={buildLessonPayload}
      checkBeforeSave={checkBeforeSave}
      renderForm={renderForm}
      renderDetail={renderDetail}
      quickStatuses={l => getAllowedLessonStatuses(l.status)}
      hideArchive
      archiveStatus={LessonStatus.APPLIED}
      canArchive={() => false}
      csvFileName="lessons.csv"
      csvColumns={csvColumns}
      csvFromRow={csvFromRow}
    />
  );
};

export default Lessons;
