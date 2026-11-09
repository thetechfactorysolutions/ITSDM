import * as React from 'react';
import { Dropdown, IColumn, Link, Stack, Text, TextField } from '@fluentui/react';
import { AppConfig } from '../../config/AppConfig';
import { csvDate, csvEnum, csvNumber, enumValues } from '../../entities/csvHelpers';
import { buildGeniusPayload } from '../../entities/payloads';
import { TranslateFn, useT } from '../../i18n/I18n';
import { GeniusSession, GeniusStatus, GeniusType } from '../../models';
import { dayKeyToSharePoint } from '../../rules/dates';
import { applyGeniusEffects, attendanceRate, geniusImpact, getAllowedGeniusStatuses, isSessionLate, topicsWithoutSession } from '../../rules/genius';
import { generateBusinessId } from '../../rules/ids';
import { isSafeUrl } from '../../rules/matters';
import { validateGenius } from '../../rules/validation';
import DateField from '../shared/DateField';
import { DetailFields } from '../shared/DetailSection';
import EntityScreen, { IFormContext } from '../shared/EntityScreen';
import { FormRow } from '../shared/FormGrid';
import { useHubData } from '../shared/HubData';
import LinkField from '../shared/LinkField';
import { toOptions } from '../shared/options';
import UserField from '../shared/UserField';

const STATUSES = enumValues(GeniusStatus);
const TYPES = enumValues(GeniusType);

const searchFields = [(s: GeniusSession) => s.title, (s: GeniusSession) => s.topic, (s: GeniusSession) => s.audience, (s: GeniusSession) => s.motivation, (s: GeniusSession) => s.sessionId];
const sortAccessors = {
  title: (s: GeniusSession) => s.title, type: (s: GeniusSession) => TYPES.indexOf(s.type), topic: (s: GeniusSession) => s.topic, status: (s: GeniusSession) => s.status,
  sessionDate: (s: GeniusSession) => s.sessionDate, attended: (s: GeniusSession) => s.attended, satisfaction: (s: GeniusSession) => s.satisfaction
};
const optionalNumber = (value: string | undefined): number | undefined => (value === undefined || value.trim() === '' ? undefined : csvNumber(value));
const csvColumns = [
  { header: 'Title', value: (s: GeniusSession) => s.title }, { header: 'SessionId', value: (s: GeniusSession) => s.sessionId }, { header: 'SessionType', value: (s: GeniusSession) => s.type },
  { header: 'Topic', value: (s: GeniusSession) => s.topic }, { header: 'Status', value: (s: GeniusSession) => s.status }, { header: 'SessionDate', value: (s: GeniusSession) => s.sessionDate },
  { header: 'Audience', value: (s: GeniusSession) => s.audience }, { header: 'OwnerUPN', value: (s: GeniusSession) => s.ownerUpn }, { header: 'Invited', value: (s: GeniusSession) => s.invited },
  { header: 'Attended', value: (s: GeniusSession) => s.attended }, { header: 'Satisfaction', value: (s: GeniusSession) => s.satisfaction }, { header: 'MaterialUrl', value: (s: GeniusSession) => s.materialUrl },
  { header: 'ArticleId', value: (s: GeniusSession) => s.articleId }, { header: 'CatalogId', value: (s: GeniusSession) => s.catalogId }, { header: 'Motivation', value: (s: GeniusSession) => s.motivation }
];

const makeColumns = (t: TranslateFn): IColumn[] => [
  { key: 'title', name: t('field.title'), fieldName: 'title', minWidth: 220 },
  { key: 'type', name: t('field.geniusType'), minWidth: 110, onRender: (s: GeniusSession) => t(`geniusType.${s.type}`) },
  { key: 'topic', name: t('field.topic'), fieldName: 'topic', minWidth: 140 },
  { key: 'status', name: t('field.status'), fieldName: 'status', minWidth: 110 },
  { key: 'sessionDate', name: t('field.sessionDate'), minWidth: 110, onRender: (s: GeniusSession) => `${isSessionLate(s) ? '🔴 ' : ''}${s.sessionDate ?? ''}` },
  { key: 'attended', name: t('field.attendance'), minWidth: 110, onRender: (s: GeniusSession) => (s.status === GeniusStatus.DELIVERED ? `${s.attended}/${s.invited}${attendanceRate(s) === undefined ? '' : ` (${attendanceRate(s)} %)`}` : '') },
  { key: 'satisfaction', name: t('field.satisfaction'), minWidth: 80, onRender: (s: GeniusSession) => (s.satisfaction === undefined ? '' : `${s.satisfaction}/5`) }
];

/** Corners, tips, academy, challenges and open sessions: planned, delivered and measured. */
const Genius: React.FC = () => {
  const t = useT();
  const { service, userEmail, genius: state, catalog, articles } = useHubData();
  const columns = React.useMemo(() => makeColumns(t), [t]);
  const articleOptions = React.useMemo(() => articles.items.map(a => ({ id: a.articleId, title: a.title })), [articles.items]);
  const catalogOptions = React.useMemo(() => catalog.items.map(c => ({ id: c.catalogId, title: c.title })), [catalog.items]);
  const impact = geniusImpact(state.items);
  const opportunities = topicsWithoutSession(catalog.items, state.items).slice(0, 5);

  const newItem = React.useCallback((): GeniusSession => ({
    sessionId: generateBusinessId('GEN'), title: '', type: GeniusType.CORNER, topic: '', status: GeniusStatus.IDEA, sessionDate: '', audience: '', ownerUpn: userEmail, invited: 0, attended: 0,
    satisfaction: undefined, materialUrl: '', articleId: '', catalogId: '', motivation: ''
  }), [userEmail]);

  const csvFromRow = React.useCallback((row: Record<string, string>): GeniusSession => ({
    sessionId: row.SessionId || generateBusinessId('GEN'), title: row.Title ?? '', type: csvEnum(row.SessionType, TYPES, GeniusType.CORNER), topic: row.Topic ?? '',
    status: csvEnum(row.Status, STATUSES, GeniusStatus.IDEA), sessionDate: csvDate(row.SessionDate), audience: row.Audience ?? '', ownerUpn: row.OwnerUPN || userEmail,
    invited: csvNumber(row.Invited), attended: csvNumber(row.Attended), satisfaction: optionalNumber(row.Satisfaction), materialUrl: row.MaterialUrl ?? '', articleId: row.ArticleId ?? '',
    catalogId: row.CatalogId ?? '', motivation: row.Motivation ?? ''
  }), [userEmail]);

  const checkBeforeSave = (form: GeniusSession, original: GeniusSession | undefined): string | undefined => {
    const base = original ? original.status : GeniusStatus.IDEA;
    return getAllowedGeniusStatuses(base).indexOf(form.status) === -1
      ? t('common.invalidTransition', { from: t(`status.${base}`), to: t(`status.${form.status}`) })
      : undefined;
  };

  const renderForm = ({ form, setForm, errors, original, isEdit, service: svc }: IFormContext<GeniusSession>): React.ReactNode => {
    const base = original ? original.status : GeniusStatus.IDEA;
    return (
      <>
        <TextField label={t('field.sessionId')} value={form.sessionId} readOnly={isEdit} onChange={(_, v) => setForm(p => ({ ...p, sessionId: v ?? '' }))} />
        <Dropdown label={t('field.status')} selectedKey={form.status} options={toOptions(getAllowedGeniusStatuses(base), t)} onChange={(_, o) => setForm(p => ({ ...p, status: (o?.key as GeniusStatus) ?? base }))} />
        <FormRow full><TextField label={t('field.title')} required value={form.title} errorMessage={errors.title && t(errors.title)} onChange={(_, v) => setForm(p => ({ ...p, title: v ?? '' }))} /></FormRow>
        <Dropdown label={t('field.geniusType')} selectedKey={form.type} options={toOptions(TYPES, t, 'geniusType')} onChange={(_, o) => setForm(p => ({ ...p, type: (o?.key as GeniusType) ?? GeniusType.CORNER }))} />
        <TextField label={t('field.topic')} value={form.topic} onChange={(_, v) => setForm(p => ({ ...p, topic: v ?? '' }))} />
        <DateField label={t('field.sessionDate')} value={form.sessionDate} errorMessage={errors.sessionDate && t(errors.sessionDate)} onChange={v => setForm(p => ({ ...p, sessionDate: v }))} />
        <UserField label={t('field.presenter')} service={svc} value={form.ownerUpn} errorMessage={errors.ownerUpn && t(errors.ownerUpn)} onChange={e => setForm(p => ({ ...p, ownerUpn: e }))} />
        <TextField label={t('field.audience')} value={form.audience} onChange={(_, v) => setForm(p => ({ ...p, audience: v ?? '' }))} />
        <TextField label={t('field.invited')} type="number" min={0} value={String(form.invited)} errorMessage={errors.invited && t(errors.invited)} onChange={(_, v) => setForm(p => ({ ...p, invited: v === undefined || v === '' ? 0 : Number(v) }))} />
        <TextField label={t('field.attended')} type="number" min={0} value={String(form.attended)} errorMessage={errors.attended && t(errors.attended)} onChange={(_, v) => setForm(p => ({ ...p, attended: v === undefined || v === '' ? 0 : Number(v) }))} />
        <TextField label={t('field.satisfaction')} type="number" min={0} max={5} step={0.1} value={form.satisfaction === undefined ? '' : String(form.satisfaction)} errorMessage={errors.satisfaction && t(errors.satisfaction)}
          onChange={(_, v) => setForm(p => ({ ...p, satisfaction: v === undefined || v === '' ? undefined : Number(v) }))} />
        <FormRow full><TextField label={t('field.materialUrl')} value={form.materialUrl} errorMessage={errors.materialUrl && t(errors.materialUrl)} onChange={(_, v) => setForm(p => ({ ...p, materialUrl: v ?? '' }))} /></FormRow>
        <LinkField label={t('field.catalogEntry')} value={form.catalogId} options={catalogOptions} onChange={id => setForm(p => ({ ...p, catalogId: id }))} />
        <LinkField label={t('field.article')} value={form.articleId} options={articleOptions} onChange={id => setForm(p => ({ ...p, articleId: id }))} />
        <FormRow full><TextField label={t('field.motivation')} multiline rows={3} value={form.motivation} onChange={(_, v) => setForm(p => ({ ...p, motivation: v ?? '' }))} /></FormRow>
      </>
    );
  };

  const renderDetail = (s: GeniusSession): React.ReactNode => (
    <Stack tokens={{ childrenGap: 12 }}>
      <DetailFields rows={[
        { label: t('field.sessionId'), value: s.sessionId },
        { label: t('field.status'), value: t(`status.${s.status}`) },
        { label: t('field.geniusType'), value: t(`geniusType.${s.type}`) },
        { label: t('field.topic'), value: s.topic },
        { label: t('field.sessionDate'), value: `${isSessionLate(s) ? '🔴 ' : ''}${s.sessionDate ?? ''}`.trim() },
        { label: t('field.presenter'), value: s.ownerUpn },
        { label: t('field.audience'), value: s.audience },
        { label: t('field.invited'), value: s.invited },
        { label: t('field.attended'), value: s.attended },
        { label: t('field.attendance'), value: attendanceRate(s) === undefined ? '—' : `${attendanceRate(s)} %` },
        { label: t('field.satisfaction'), value: s.satisfaction === undefined ? '—' : `${s.satisfaction}/5` },
        { label: t('field.catalogEntry'), value: s.catalogId },
        { label: t('field.article'), value: s.articleId },
        { label: t('field.motivation'), value: s.motivation },
        { label: t('common.modifiedBy'), value: `${(s.modified ?? '').slice(0, 10)} ${s.editor ?? ''}`.trim() }
      ]} />
      {s.materialUrl && isSafeUrl(s.materialUrl) && <Link href={s.materialUrl.trim()} target="_blank" rel="noopener noreferrer">{t('genius.openMaterial')}</Link>}
    </Stack>
  );

  return (
    <EntityScreen<GeniusSession>
      textKey="genius"
      listName={AppConfig.sharePoint.listNames.genius}
      state={state}
      service={service}
      statuses={STATUSES}
      getStatus={s => s.status}
      getTitle={s => s.title}
      columns={columns}
      sortAccessors={sortAccessors}
      searchFields={searchFields}
      newItem={newItem}
      validate={validateGenius}
      buildPayload={buildGeniusPayload}
      prepareForSave={form => applyGeniusEffects(form)}
      checkBeforeSave={checkBeforeSave}
      renderForm={renderForm}
      renderDetail={renderDetail}
      quickStatuses={s => getAllowedGeniusStatuses(s.status)}
      quickPayload={(item, status) => {
        const updated = applyGeniusEffects({ ...item, status: status as GeniusStatus });
        return { Status: status, SessionDate: dayKeyToSharePoint(updated.sessionDate) };
      }}
      archiveStatus={GeniusStatus.CANCELLED}
      canArchive={s => getAllowedGeniusStatuses(s.status).indexOf(GeniusStatus.CANCELLED) > -1 && s.status !== GeniusStatus.CANCELLED}
      hideAttachments
      initialView={{ sortKey: 'sessionDate', sortDescending: false }}
      extraContent={(
        <Stack tokens={{ childrenGap: 6 }}>
          <Text variant="large" as="h3">{t('genius.impact')}</Text>
          <Text>
            {impact.delivered === 0
              ? t('genius.noImpact')
              : t('genius.impactSummary', {
                delivered: impact.delivered, attendees: impact.attendees,
                attendance: impact.averageAttendance === undefined ? '—' : `${impact.averageAttendance} %`,
                satisfaction: impact.averageSatisfaction === undefined ? '—' : `${impact.averageSatisfaction}/5`, rated: impact.rated
              })}
          </Text>
          <Text variant="small">{t('genius.impactNote')}</Text>
          {opportunities.length > 0 && (
            <Stack tokens={{ childrenGap: 2 }}>
              <Text variant="mediumPlus" as="h3">{t('genius.opportunities')}</Text>
              {opportunities.map(entry => <Text key={entry.catalogId} variant="small">• {entry.title}</Text>)}
            </Stack>
          )}
        </Stack>
      )}
      csvFileName="genius.csv"
      csvColumns={csvColumns}
      csvFromRow={csvFromRow}
    />
  );
};

export default Genius;
