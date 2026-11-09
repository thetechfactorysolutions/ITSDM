import * as React from 'react';
import { Dropdown, IColumn, Stack, Text, TextField } from '@fluentui/react';
import { AppConfig } from '../../config/AppConfig';
import { csvDate, csvEnum, csvNumber, enumValues } from '../../entities/csvHelpers';
import { buildNpsPayload } from '../../entities/payloads';
import { TranslateFn, useT } from '../../i18n/I18n';
import { Country, NpsChannel, NpsFollowUp, NpsResponse } from '../../models';
import { dayKeyToSharePoint, toDayKey } from '../../rules/dates';
import { generateBusinessId } from '../../rules/ids';
import { applyNpsEffects, getAllowedNpsFollowUps, isCallOverdue, npsBreakdown, npsByMonth, npsCategory, responsesInLastDays } from '../../rules/service';
import { validateNps } from '../../rules/validation';
import DateField from '../shared/DateField';
import { DetailFields } from '../shared/DetailSection';
import EntityScreen, { IFormContext } from '../shared/EntityScreen';
import { FormRow } from '../shared/FormGrid';
import { useHubData } from '../shared/HubData';
import { toOptions } from '../shared/options';
import UserField from '../shared/UserField';

const STATUSES = enumValues(NpsFollowUp);
const CHANNELS = enumValues(NpsChannel);
const COUNTRIES = enumValues(Country);

const searchFields = [(r: NpsResponse) => r.title, (r: NpsResponse) => r.comment, (r: NpsResponse) => r.followUpNotes, (r: NpsResponse) => r.ticketRef, (r: NpsResponse) => r.responseId];
const sortAccessors = {
  title: (r: NpsResponse) => r.title, score: (r: NpsResponse) => r.score, channel: (r: NpsResponse) => CHANNELS.indexOf(r.channel), country: (r: NpsResponse) => r.country,
  respondedOn: (r: NpsResponse) => r.respondedOn, status: (r: NpsResponse) => r.status
};
const csvColumns = [
  { header: 'Title', value: (r: NpsResponse) => r.title }, { header: 'ResponseId', value: (r: NpsResponse) => r.responseId }, { header: 'Score', value: (r: NpsResponse) => r.score },
  { header: 'Comment', value: (r: NpsResponse) => r.comment }, { header: 'RespondedOn', value: (r: NpsResponse) => r.respondedOn }, { header: 'Channel', value: (r: NpsResponse) => r.channel },
  { header: 'Country', value: (r: NpsResponse) => r.country }, { header: 'TicketRef', value: (r: NpsResponse) => r.ticketRef }, { header: 'Status', value: (r: NpsResponse) => r.status },
  { header: 'FollowUpDate', value: (r: NpsResponse) => r.followUpDate }, { header: 'FollowUpNotes', value: (r: NpsResponse) => r.followUpNotes }, { header: 'OwnerUPN', value: (r: NpsResponse) => r.ownerUpn }
];

const makeColumns = (t: TranslateFn): IColumn[] => [
  { key: 'title', name: t('field.title'), fieldName: 'title', minWidth: 220 },
  { key: 'score', name: t('field.score'), minWidth: 120, onRender: (r: NpsResponse) => `${r.score} · ${t(`npsCategory.${npsCategory(r.score)}`)}` },
  { key: 'channel', name: t('field.channel'), minWidth: 90, onRender: (r: NpsResponse) => t(`npsChannel.${r.channel}`) },
  { key: 'country', name: t('field.country'), minWidth: 80, onRender: (r: NpsResponse) => t(`country.${r.country}`) },
  { key: 'respondedOn', name: t('field.respondedOn'), minWidth: 110, onRender: (r: NpsResponse) => `${isCallOverdue(r) ? '🔴 ' : ''}${r.respondedOn ?? ''}` },
  { key: 'status', name: t('field.followUp'), fieldName: 'status', minWidth: 150 }
];

/** Survey answers and the call-back that follows each detractor. The default view is the list of calls still to make. */
const Nps: React.FC = () => {
  const t = useT();
  const { service, userEmail, nps: state } = useHubData();
  const columns = React.useMemo(() => makeColumns(t), [t]);

  const recent = npsBreakdown(responsesInLastDays(state.items, 90));
  const overall = npsBreakdown(state.items);
  const months = npsByMonth(state.items).slice(-6).reverse();

  const newItem = React.useCallback((): NpsResponse => ({
    responseId: generateBusinessId('NPS'), title: '', score: 10, comment: '', respondedOn: toDayKey(new Date()), channel: NpsChannel.KIOSK, country: Country.ES, ticketRef: '',
    status: NpsFollowUp.NOT_REQUIRED, followUpDate: '', followUpNotes: '', ownerUpn: userEmail
  }), [userEmail]);

  const csvFromRow = React.useCallback((row: Record<string, string>): NpsResponse => ({
    responseId: row.ResponseId || generateBusinessId('NPS'), title: row.Title ?? '', score: csvNumber(row.Score), comment: row.Comment ?? '', respondedOn: csvDate(row.RespondedOn),
    channel: csvEnum(row.Channel, CHANNELS, NpsChannel.OTHER), country: csvEnum(row.Country, COUNTRIES, Country.ES), ticketRef: row.TicketRef ?? '',
    status: csvEnum(row.Status, STATUSES, NpsFollowUp.NOT_REQUIRED), followUpDate: csvDate(row.FollowUpDate), followUpNotes: row.FollowUpNotes ?? '', ownerUpn: row.OwnerUPN || userEmail
  }), [userEmail]);

  const renderForm = ({ form, setForm, errors, original, isEdit, service: svc }: IFormContext<NpsResponse>): React.ReactNode => {
    const base = original ? original.status : form.status;
    return (
      <>
        <TextField label={t('field.responseId')} value={form.responseId} readOnly={isEdit} onChange={(_, v) => setForm(p => ({ ...p, responseId: v ?? '' }))} />
        <Dropdown label={t('field.followUp')} selectedKey={form.status} options={toOptions(getAllowedNpsFollowUps(base), t)} onChange={(_, o) => setForm(p => ({ ...p, status: (o?.key as NpsFollowUp) ?? base }))} />
        <FormRow full><TextField label={t('field.title')} required value={form.title} errorMessage={errors.title && t(errors.title)} onChange={(_, v) => setForm(p => ({ ...p, title: v ?? '' }))} /></FormRow>
        <TextField label={t('field.score')} type="number" min={0} max={10} value={String(form.score)} errorMessage={errors.score && t(errors.score)} onChange={(_, v) => setForm(p => ({ ...p, score: v === undefined || v === '' ? 0 : Number(v) }))} />
        <DateField label={t('field.respondedOn')} value={form.respondedOn} errorMessage={errors.respondedOn && t(errors.respondedOn)} onChange={v => setForm(p => ({ ...p, respondedOn: v }))} />
        <Dropdown label={t('field.channel')} selectedKey={form.channel} options={toOptions(CHANNELS, t, 'npsChannel')} onChange={(_, o) => setForm(p => ({ ...p, channel: (o?.key as NpsChannel) ?? NpsChannel.OTHER }))} />
        <Dropdown label={t('field.country')} selectedKey={form.country} options={toOptions(COUNTRIES, t, 'country')} onChange={(_, o) => setForm(p => ({ ...p, country: (o?.key as Country) ?? Country.ES }))} />
        <TextField label={t('field.ticketRef')} value={form.ticketRef} onChange={(_, v) => setForm(p => ({ ...p, ticketRef: v ?? '' }))} />
        <UserField label={t('field.caller')} service={svc} value={form.ownerUpn} errorMessage={errors.ownerUpn && t(errors.ownerUpn)} onChange={e => setForm(p => ({ ...p, ownerUpn: e }))} />
        <FormRow full><TextField label={t('field.comment')} multiline rows={3} value={form.comment} onChange={(_, v) => setForm(p => ({ ...p, comment: v ?? '' }))} /></FormRow>
        <DateField label={t('field.followUpDate')} value={form.followUpDate} errorMessage={errors.followUpDate && t(errors.followUpDate)} onChange={v => setForm(p => ({ ...p, followUpDate: v }))} />
        <FormRow full><TextField label={t('field.followUpNotes')} multiline rows={3} value={form.followUpNotes} onChange={(_, v) => setForm(p => ({ ...p, followUpNotes: v ?? '' }))} /></FormRow>
      </>
    );
  };

  const renderDetail = (r: NpsResponse): React.ReactNode => (
    <DetailFields rows={[
      { label: t('field.responseId'), value: r.responseId },
      { label: t('field.score'), value: `${r.score} · ${t(`npsCategory.${npsCategory(r.score)}`)}` },
      { label: t('field.followUp'), value: t(`status.${r.status}`) },
      { label: t('field.respondedOn'), value: `${isCallOverdue(r) ? '🔴 ' : ''}${r.respondedOn ?? ''}`.trim() },
      { label: t('field.channel'), value: t(`npsChannel.${r.channel}`) },
      { label: t('field.country'), value: t(`country.${r.country}`) },
      { label: t('field.ticketRef'), value: r.ticketRef },
      { label: t('field.comment'), value: r.comment },
      { label: t('field.caller'), value: r.ownerUpn },
      { label: t('field.followUpDate'), value: r.followUpDate },
      { label: t('field.followUpNotes'), value: r.followUpNotes },
      { label: t('common.modifiedBy'), value: `${(r.modified ?? '').slice(0, 10)} ${r.editor ?? ''}`.trim() }
    ]} />
  );

  const summary = (label: string, b: ReturnType<typeof npsBreakdown>): string =>
    b.score === undefined ? `${label}: ${t('nps.noResponses')}` : t('nps.summary', { label, score: b.score, promoters: b.promoters, passives: b.passives, detractors: b.detractors, total: b.total });

  return (
    <EntityScreen<NpsResponse>
      textKey="nps"
      listName={AppConfig.sharePoint.listNames.nps}
      state={state}
      service={service}
      statuses={STATUSES}
      getStatus={r => r.status}
      getTitle={r => r.title}
      columns={columns}
      sortAccessors={sortAccessors}
      searchFields={searchFields}
      newItem={newItem}
      validate={validateNps}
      buildPayload={buildNpsPayload}
      prepareForSave={form => applyNpsEffects(form)}
      renderForm={renderForm}
      renderDetail={renderDetail}
      quickStatuses={r => getAllowedNpsFollowUps(r.status)}
      quickPayload={(item, status) => {
        const updated = applyNpsEffects({ ...item, status: status as NpsFollowUp });
        return { Status: status, FollowUpDate: dayKeyToSharePoint(updated.followUpDate) };
      }}
      hideArchive
      archiveStatus={NpsFollowUp.CLOSED}
      canArchive={() => false}
      hideAttachments
      initialView={{ sortKey: 'respondedOn', sortDescending: false }}
      extraContent={state.items.length > 0 ? (
        <Stack tokens={{ childrenGap: 2 }} aria-live="polite">
          <Text>{summary(t('nps.last90'), recent)}</Text>
          <Text>{summary(t('nps.overall'), overall)}</Text>
          {months.map(m => <Text key={m.month} variant="small">{m.month}: {m.breakdown.score === undefined ? '' : `NPS ${m.breakdown.score}`} ({m.breakdown.total})</Text>)}
        </Stack>
      ) : undefined}
      csvFileName="nps.csv"
      csvColumns={csvColumns}
      csvFromRow={csvFromRow}
    />
  );
};

export default Nps;
