import * as React from 'react';
import { Dropdown, IColumn, Pivot, PivotItem, Stack, TextField } from '@fluentui/react';
import { AppConfig } from '../../config/AppConfig';
import { csvEnum, enumValues } from '../../entities/csvHelpers';
import { buildMeetingPayload, buildNotePayload } from '../../entities/payloads';
import { TranslateFn, useT } from '../../i18n/I18n';
import { Meeting, Note, NoteCategory, NoteStatus } from '../../models';
import { csvDate } from '../../entities/csvHelpers';
import { generateBusinessId } from '../../rules/ids';
import { validateMeeting, validateNote } from '../../rules/validation';
import DateField from '../shared/DateField';
import { DetailFields, RelatedList } from '../shared/DetailSection';
import EntityScreen, { IFormContext } from '../shared/EntityScreen';
import { FormRow } from '../shared/FormGrid';
import { useHubData } from '../shared/HubData';
import LinkField from '../shared/LinkField';
import { toOptions } from '../shared/options';

const NOTE_STATUSES = enumValues(NoteStatus);
const CATEGORIES = enumValues(NoteCategory);

// ---------------------------------------------------------------- notes
const makeNoteColumns = (t: TranslateFn): IColumn[] => [
  { key: 'noteId', name: t('field.noteId'), fieldName: 'noteId', minWidth: 130 },
  { key: 'title', name: t('field.title'), fieldName: 'title', minWidth: 200 },
  { key: 'category', name: t('field.category'), minWidth: 100, onRender: (n: Note) => t(`category.${n.category}`) },
  { key: 'status', name: t('field.status'), fieldName: 'status', minWidth: 100 },
  { key: 'projectId', name: t('field.project'), fieldName: 'projectId', minWidth: 140 },
  { key: 'meetingId', name: t('field.meeting'), fieldName: 'meetingId', minWidth: 140 }
];
const noteSort = {
  noteId: (n: Note) => n.noteId, title: (n: Note) => n.title, category: (n: Note) => n.category,
  status: (n: Note) => n.status, projectId: (n: Note) => n.projectId, meetingId: (n: Note) => n.meetingId
};
const noteSearch = [(n: Note) => n.title, (n: Note) => n.body, (n: Note) => n.noteId, (n: Note) => n.category, (n: Note) => n.meetingId, (n: Note) => n.projectId];
const noteCsv = [
  { header: 'Title', value: (n: Note) => n.title },
  { header: 'NoteId', value: (n: Note) => n.noteId },
  { header: 'Body', value: (n: Note) => n.body },
  { header: 'Category', value: (n: Note) => n.category },
  { header: 'Status', value: (n: Note) => n.status },
  { header: 'MeetingId', value: (n: Note) => n.meetingId },
  { header: 'InitiativeId', value: (n: Note) => n.initiativeId },
  { header: 'ProjectId', value: (n: Note) => n.projectId }
];

const NotesList: React.FC = () => {
  const t = useT();
  const { service, notes: state, meetings, initiatives, projects } = useHubData();
  const columns = React.useMemo(() => makeNoteColumns(t), [t]);
  const meetingOptions = React.useMemo(() => meetings.items.map(m => ({ id: m.meetingId, title: m.title })), [meetings.items]);
  const initiativeOptions = React.useMemo(() => initiatives.items.map(i => ({ id: i.initiativeId, title: i.title })), [initiatives.items]);
  const projectOptions = React.useMemo(() => projects.items.map(p => ({ id: p.projectId, title: p.title })), [projects.items]);

  const newItem = React.useCallback((): Note => ({
    noteId: generateBusinessId('NOTE'), title: '', body: '', category: NoteCategory.INFO, status: NoteStatus.ACTIVE,
    meetingId: '', initiativeId: '', projectId: ''
  }), []);

  const csvFromRow = React.useCallback((row: Record<string, string>): Note => ({
    noteId: row.NoteId || generateBusinessId('NOTE'),
    title: row.Title ?? '',
    body: row.Body ?? '',
    category: csvEnum(row.Category, CATEGORIES, NoteCategory.INFO),
    status: csvEnum(row.Status, NOTE_STATUSES, NoteStatus.ACTIVE),
    meetingId: row.MeetingId ?? '',
    initiativeId: row.InitiativeId ?? '',
    projectId: row.ProjectId ?? ''
  }), []);

  const renderForm = ({ form, setForm, errors, isEdit }: IFormContext<Note>): React.ReactNode => (
    <>
      <TextField label={t('field.noteId')} value={form.noteId} readOnly={isEdit} onChange={(_, v) => setForm(p => ({ ...p, noteId: v ?? '' }))} />
      <Dropdown label={t('field.category')} selectedKey={form.category} options={toOptions(CATEGORIES, t, 'category')} onChange={(_, o) => setForm(p => ({ ...p, category: (o?.key as NoteCategory) ?? NoteCategory.INFO }))} />
      <FormRow full><TextField label={t('field.title')} required value={form.title} errorMessage={errors.title && t(errors.title)} onChange={(_, v) => setForm(p => ({ ...p, title: v ?? '' }))} /></FormRow>
      <FormRow full><TextField label={t('field.body')} multiline rows={6} value={form.body} onChange={(_, v) => setForm(p => ({ ...p, body: v ?? '' }))} /></FormRow>
      <LinkField label={t('field.meeting')} value={form.meetingId} options={meetingOptions} onChange={id => setForm(p => ({ ...p, meetingId: id }))} />
      <LinkField label={t('field.initiative')} value={form.initiativeId} options={initiativeOptions} onChange={id => setForm(p => ({ ...p, initiativeId: id }))} />
      <LinkField label={t('field.project')} value={form.projectId} options={projectOptions} onChange={id => setForm(p => ({ ...p, projectId: id }))} />
      <Dropdown label={t('field.status')} selectedKey={form.status} options={toOptions(NOTE_STATUSES, t)} onChange={(_, o) => setForm(p => ({ ...p, status: (o?.key as NoteStatus) ?? NoteStatus.ACTIVE }))} />
    </>
  );

  const renderDetail = (note: Note): React.ReactNode => {
    const meeting = meetings.items.filter(m => m.meetingId === note.meetingId)[0];
    const project = projects.items.filter(p => p.projectId === note.projectId)[0];
    const initiative = initiatives.items.filter(i => i.initiativeId === note.initiativeId)[0];
    return (
      <DetailFields rows={[
        { label: t('field.noteId'), value: note.noteId },
        { label: t('field.category'), value: t(`category.${note.category}`) },
        { label: t('field.status'), value: t(`status.${note.status}`) },
        { label: t('field.body'), value: note.body },
        { label: t('field.meeting'), value: meeting ? `${meeting.title} (${meeting.meetingId})` : note.meetingId },
        { label: t('field.initiative'), value: initiative ? `${initiative.title} (${initiative.initiativeId})` : note.initiativeId },
        { label: t('field.project'), value: project ? `${project.title} (${project.projectId})` : note.projectId },
        { label: t('common.modifiedBy'), value: `${(note.modified ?? '').slice(0, 10)} ${note.editor ?? ''}`.trim() }
      ]} />
    );
  };

  return (
    <EntityScreen<Note>
      textKey="notes"
      listName={AppConfig.sharePoint.listNames.notes}
      state={state}
      service={service}
      statuses={NOTE_STATUSES}
      getStatus={n => n.status}
      getTitle={n => n.title}
      columns={columns}
      sortAccessors={noteSort}
      searchFields={noteSearch}
      newItem={newItem}
      validate={validateNote}
      buildPayload={buildNotePayload}
      renderForm={renderForm}
      renderDetail={renderDetail}
      quickStatuses={n => NOTE_STATUSES}
      archiveStatus={NoteStatus.ARCHIVED}
      canArchive={n => n.status !== NoteStatus.ARCHIVED}
      csvFileName="notes.csv"
      csvColumns={noteCsv}
      csvFromRow={csvFromRow}
    />
  );
};

// ---------------------------------------------------------------- meetings
const makeMeetingColumns = (t: TranslateFn): IColumn[] => [
  { key: 'meetingId', name: t('field.meetingId'), fieldName: 'meetingId', minWidth: 140 },
  { key: 'title', name: t('field.title'), fieldName: 'title', minWidth: 220 },
  { key: 'meetingDate', name: t('field.meetingDate'), fieldName: 'meetingDate', minWidth: 100 }
];
const meetingSort = { meetingId: (m: Meeting) => m.meetingId, title: (m: Meeting) => m.title, meetingDate: (m: Meeting) => m.meetingDate };
const meetingSearch = [(m: Meeting) => m.title, (m: Meeting) => m.summary, (m: Meeting) => m.meetingId, (m: Meeting) => m.attendees];
const meetingCsv = [
  { header: 'Title', value: (m: Meeting) => m.title },
  { header: 'MeetingId', value: (m: Meeting) => m.meetingId },
  { header: 'MeetingDate', value: (m: Meeting) => m.meetingDate },
  { header: 'Summary', value: (m: Meeting) => m.summary },
  { header: 'Attendees', value: (m: Meeting) => m.attendees }
];

const MeetingsList: React.FC = () => {
  const t = useT();
  const { service, meetings: state, notes } = useHubData();
  const columns = React.useMemo(() => makeMeetingColumns(t), [t]);

  const newItem = React.useCallback((): Meeting => ({
    meetingId: generateBusinessId('MEET'), title: '', meetingDate: '', summary: '', attendees: '', transcript: '', importedItems: ''
  }), []);

  const csvFromRow = React.useCallback((row: Record<string, string>): Meeting => ({
    meetingId: row.MeetingId || generateBusinessId('MEET'),
    title: row.Title ?? '',
    meetingDate: csvDate(row.MeetingDate),
    summary: row.Summary ?? '',
    attendees: row.Attendees ?? '',
    transcript: '',
    importedItems: ''
  }), []);

  const renderForm = ({ form, setForm, errors, isEdit }: IFormContext<Meeting>): React.ReactNode => (
    <>
      <TextField label={t('field.meetingId')} value={form.meetingId} readOnly={isEdit} onChange={(_, v) => setForm(p => ({ ...p, meetingId: v ?? '' }))} />
      <DateField label={t('field.meetingDate')} value={form.meetingDate} errorMessage={errors.meetingDate && t(errors.meetingDate)} onChange={v => setForm(p => ({ ...p, meetingDate: v }))} />
      <FormRow full><TextField label={t('field.title')} required value={form.title} errorMessage={errors.title && t(errors.title)} onChange={(_, v) => setForm(p => ({ ...p, title: v ?? '' }))} /></FormRow>
      <FormRow full><TextField label={t('field.attendees')} value={form.attendees} onChange={(_, v) => setForm(p => ({ ...p, attendees: v ?? '' }))} /></FormRow>
      <FormRow full><TextField label={t('field.summary')} multiline rows={4} value={form.summary} onChange={(_, v) => setForm(p => ({ ...p, summary: v ?? '' }))} /></FormRow>
      <FormRow full><TextField label={t('field.transcript')} multiline rows={8} value={form.transcript} onChange={(_, v) => setForm(p => ({ ...p, transcript: v ?? '' }))} /></FormRow>
    </>
  );

  const renderDetail = (meeting: Meeting): React.ReactNode => (
    <Stack tokens={{ childrenGap: 16 }}>
      <DetailFields rows={[
        { label: t('field.meetingId'), value: meeting.meetingId },
        { label: t('field.meetingDate'), value: meeting.meetingDate },
        { label: t('field.attendees'), value: meeting.attendees },
        { label: t('field.summary'), value: meeting.summary },
        { label: t('field.importedItems'), value: meeting.importedItems },
        { label: t('common.modifiedBy'), value: `${(meeting.modified ?? '').slice(0, 10)} ${meeting.editor ?? ''}`.trim() }
      ]} />
      <RelatedList title={t('nav.notes')} items={notes.items.filter(n => n.meetingId === meeting.meetingId).map(n => ({ key: n.noteId, title: n.title, meta: t(`category.${n.category}`) }))} />
      <DetailFields rows={[{ label: t('field.transcript'), value: meeting.transcript }]} />
    </Stack>
  );

  return (
    <EntityScreen<Meeting>
      textKey="meetings"
      listName={AppConfig.sharePoint.listNames.meetings}
      state={state}
      service={service}
      statuses={[]}
      getStatus={() => ''}
      getTitle={m => m.title}
      columns={columns}
      sortAccessors={meetingSort}
      searchFields={meetingSearch}
      newItem={newItem}
      validate={validateMeeting}
      buildPayload={buildMeetingPayload}
      renderForm={renderForm}
      renderDetail={renderDetail}
      archiveStatus=""
      canArchive={() => false}
      csvFileName="meetings.csv"
      csvColumns={meetingCsv}
      csvFromRow={csvFromRow}
    />
  );
};

// ---------------------------------------------------------------- tab
const Notes: React.FC = () => {
  const t = useT();
  return (
    <Pivot aria-label={t('nav.notes')}>
      <PivotItem headerText={t('nav.notes')}><NotesList /></PivotItem>
      <PivotItem headerText={t('nav.meetings')}><MeetingsList /></PivotItem>
    </Pivot>
  );
};

export default Notes;
