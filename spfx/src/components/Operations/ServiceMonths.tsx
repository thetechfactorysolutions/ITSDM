import * as React from 'react';
import { Dropdown, IColumn, MessageBar, Stack, Text, TextField } from '@fluentui/react';
import { AppConfig } from '../../config/AppConfig';
import { csvDate, csvEnum, csvNumber, enumValues } from '../../entities/csvHelpers';
import { buildServiceMonthPayload } from '../../entities/payloads';
import { TranslateFn, useT } from '../../i18n/I18n';
import { Country, ServiceMonth } from '../../models';
import { generateBusinessId } from '../../rules/ids';
import { contactsPer100Users, interactionShare, latestByCountry, slaLevel } from '../../rules/service';
import { validateServiceMonth } from '../../rules/validation';
import DateField from '../shared/DateField';
import { DetailFields } from '../shared/DetailSection';
import EntityScreen, { IFormContext } from '../shared/EntityScreen';
import { FormRow } from '../shared/FormGrid';
import { useHubData } from '../shared/HubData';
import { toOptions } from '../shared/options';

const COUNTRIES = enumValues(Country);

const searchFields = [(m: ServiceMonth) => m.title, (m: ServiceMonth) => m.notes, (m: ServiceMonth) => m.monthId, (m: ServiceMonth) => m.period];
const sortAccessors = {
  title: (m: ServiceMonth) => m.title, period: (m: ServiceMonth) => m.period, country: (m: ServiceMonth) => m.country, incidents: (m: ServiceMonth) => m.incidents,
  interactions: (m: ServiceMonth) => m.interactions, slaPct: (m: ServiceMonth) => m.slaPct, npsScore: (m: ServiceMonth) => m.npsScore
};
const csvColumns = [
  { header: 'Title', value: (m: ServiceMonth) => m.title }, { header: 'MonthId', value: (m: ServiceMonth) => m.monthId }, { header: 'Period', value: (m: ServiceMonth) => m.period },
  { header: 'Country', value: (m: ServiceMonth) => m.country }, { header: 'Incidents', value: (m: ServiceMonth) => m.incidents }, { header: 'Interactions', value: (m: ServiceMonth) => m.interactions },
  { header: 'Requests', value: (m: ServiceMonth) => m.requests }, { header: 'Calls', value: (m: ServiceMonth) => m.calls }, { header: 'Users', value: (m: ServiceMonth) => m.users },
  { header: 'SlaPct', value: (m: ServiceMonth) => m.slaPct }, { header: 'NpsScore', value: (m: ServiceMonth) => m.npsScore }, { header: 'NpsResponses', value: (m: ServiceMonth) => m.npsResponses },
  { header: 'Backlog', value: (m: ServiceMonth) => m.backlog }, { header: 'Notes', value: (m: ServiceMonth) => m.notes }
];

const optionalNumber = (value: string | undefined): number | undefined => (value === undefined || value.trim() === '' ? undefined : csvNumber(value));
const show = (value: number | undefined, suffix: string = ''): string => (value === undefined ? '—' : `${value}${suffix}`);

const makeColumns = (t: TranslateFn): IColumn[] => [
  { key: 'title', name: t('field.title'), fieldName: 'title', minWidth: 160 },
  { key: 'country', name: t('field.country'), minWidth: 80, onRender: (m: ServiceMonth) => t(`country.${m.country}`) },
  { key: 'incidents', name: t('field.incidents'), fieldName: 'incidents', minWidth: 70 },
  { key: 'interactions', name: t('field.interactions'), fieldName: 'interactions', minWidth: 80 },
  { key: 'share', name: t('field.interactionShare'), minWidth: 90, onRender: (m: ServiceMonth) => show(interactionShare(m), ' %') },
  { key: 'per100', name: t('field.contactsPer100'), minWidth: 110, onRender: (m: ServiceMonth) => show(contactsPer100Users(m)) },
  { key: 'slaPct', name: t('field.slaPct'), minWidth: 70, onRender: (m: ServiceMonth) => `${slaLevel(m) === 'LOW' ? '🔴 ' : ''}${show(m.slaPct)}` },
  { key: 'npsScore', name: t('field.npsScore'), minWidth: 60, onRender: (m: ServiceMonth) => show(m.npsScore) }
];

const numberField = (
  t: TranslateFn, label: string, value: number | undefined, error: string | undefined, onChange: (next: number | undefined) => void, optional: boolean = false
): React.ReactNode => (
  <TextField label={label} type="number" value={value === undefined ? '' : String(value)} errorMessage={error && t(error)}
    onChange={(_, v) => onChange(v === undefined || v === '' ? (optional ? undefined : 0) : Number(v))} />
);

/** The monthly figures of the service by country, with a comparison that does not hide how each country records its contacts. */
const ServiceMonths: React.FC = () => {
  const t = useT();
  const { service, serviceMonths: state } = useHubData();
  const columns = React.useMemo(() => makeColumns(t), [t]);
  const latest = latestByCountry(state.items);

  const newItem = React.useCallback((): ServiceMonth => ({
    monthId: generateBusinessId('MON'), title: '', period: '', country: Country.ES, incidents: 0, interactions: 0, requests: 0, calls: 0, users: 0, slaPct: undefined, npsScore: undefined,
    npsResponses: 0, backlog: 0, notes: ''
  }), []);

  const csvFromRow = React.useCallback((row: Record<string, string>): ServiceMonth => ({
    monthId: row.MonthId || generateBusinessId('MON'), title: row.Title ?? '', period: csvDate(row.Period), country: csvEnum(row.Country, COUNTRIES, Country.ES),
    incidents: csvNumber(row.Incidents), interactions: csvNumber(row.Interactions), requests: csvNumber(row.Requests), calls: csvNumber(row.Calls), users: csvNumber(row.Users),
    slaPct: optionalNumber(row.SlaPct), npsScore: optionalNumber(row.NpsScore), npsResponses: csvNumber(row.NpsResponses), backlog: csvNumber(row.Backlog), notes: row.Notes ?? ''
  }), []);

  const renderForm = ({ form, setForm, errors, isEdit }: IFormContext<ServiceMonth>): React.ReactNode => (
    <>
      <TextField label={t('field.monthId')} value={form.monthId} readOnly={isEdit} onChange={(_, v) => setForm(p => ({ ...p, monthId: v ?? '' }))} />
      <Dropdown label={t('field.country')} selectedKey={form.country} options={toOptions(COUNTRIES, t, 'country')} onChange={(_, o) => setForm(p => ({ ...p, country: (o?.key as Country) ?? Country.ES }))} />
      <FormRow full><TextField label={t('field.title')} required value={form.title} errorMessage={errors.title && t(errors.title)} onChange={(_, v) => setForm(p => ({ ...p, title: v ?? '' }))} /></FormRow>
      <DateField label={t('field.period')} value={form.period} errorMessage={errors.period && t(errors.period)} onChange={v => setForm(p => ({ ...p, period: v }))} />
      {numberField(t, t('field.users'), form.users, errors.users, v => setForm(p => ({ ...p, users: v ?? 0 })))}
      {numberField(t, t('field.incidents'), form.incidents, errors.incidents, v => setForm(p => ({ ...p, incidents: v ?? 0 })))}
      {numberField(t, t('field.interactions'), form.interactions, errors.interactions, v => setForm(p => ({ ...p, interactions: v ?? 0 })))}
      {numberField(t, t('field.requests'), form.requests, errors.requests, v => setForm(p => ({ ...p, requests: v ?? 0 })))}
      {numberField(t, t('field.calls'), form.calls, errors.calls, v => setForm(p => ({ ...p, calls: v ?? 0 })))}
      {numberField(t, t('field.backlog'), form.backlog, errors.backlog, v => setForm(p => ({ ...p, backlog: v ?? 0 })))}
      {numberField(t, t('field.slaPct'), form.slaPct, errors.slaPct, v => setForm(p => ({ ...p, slaPct: v })), true)}
      {numberField(t, t('field.npsScore'), form.npsScore, errors.npsScore, v => setForm(p => ({ ...p, npsScore: v })), true)}
      {numberField(t, t('field.npsResponses'), form.npsResponses, errors.npsResponses, v => setForm(p => ({ ...p, npsResponses: v ?? 0 })))}
      <FormRow full><TextField label={t('field.notes')} multiline rows={3} value={form.notes} onChange={(_, v) => setForm(p => ({ ...p, notes: v ?? '' }))} /></FormRow>
    </>
  );

  const renderDetail = (m: ServiceMonth): React.ReactNode => (
    <DetailFields rows={[
      { label: t('field.monthId'), value: m.monthId },
      { label: t('field.country'), value: t(`country.${m.country}`) },
      { label: t('field.period'), value: m.period },
      { label: t('field.users'), value: m.users },
      { label: t('field.incidents'), value: m.incidents },
      { label: t('field.interactions'), value: m.interactions },
      { label: t('field.interactionShare'), value: show(interactionShare(m), ' %') },
      { label: t('field.contactsPer100'), value: show(contactsPer100Users(m)) },
      { label: t('field.requests'), value: m.requests },
      { label: t('field.calls'), value: m.calls },
      { label: t('field.backlog'), value: m.backlog },
      { label: t('field.slaPct'), value: show(m.slaPct) },
      { label: t('field.npsScore'), value: show(m.npsScore) },
      { label: t('field.npsResponses'), value: m.npsResponses },
      { label: t('field.notes'), value: m.notes },
      { label: t('common.modifiedBy'), value: `${(m.modified ?? '').slice(0, 10)} ${m.editor ?? ''}`.trim() }
    ]} />
  );

  const rows = COUNTRIES.map(c => latest[c]).filter((m): m is ServiceMonth => !!m);

  return (
    <EntityScreen<ServiceMonth>
      textKey="serviceMonths"
      listName={AppConfig.sharePoint.listNames.serviceMonths}
      state={state}
      service={service}
      statuses={[]}
      getStatus={() => ''}
      getTitle={m => m.title}
      columns={columns}
      sortAccessors={sortAccessors}
      searchFields={searchFields}
      newItem={newItem}
      validate={validateServiceMonth}
      buildPayload={buildServiceMonthPayload}
      renderForm={renderForm}
      renderDetail={renderDetail}
      hideArchive
      archiveStatus=""
      canArchive={() => false}
      hideAttachments
      initialView={{ sortKey: 'period', sortDescending: true }}
      extraContent={rows.length > 0 ? (
        <Stack tokens={{ childrenGap: 6 }}>
          <Text variant="large" as="h3">{t('serviceMonths.compare')}</Text>
          <MessageBar>{t('serviceMonths.note')}</MessageBar>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', minWidth: 520 }}>
              <thead>
                <tr>
                  {['field.country', 'field.period', 'field.incidents', 'field.interactions', 'field.interactionShare', 'field.contactsPer100', 'field.slaPct', 'field.npsScore'].map(key => (
                    <th key={key} scope="col" style={{ textAlign: 'left', padding: '2px 12px 2px 0' }}>{t(key)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(m => (
                  <tr key={m.country}>
                    <td style={{ padding: '2px 12px 2px 0' }}>{t(`country.${m.country}`)}</td>
                    <td style={{ padding: '2px 12px 2px 0' }}>{(m.period ?? '').slice(0, 7)}</td>
                    <td style={{ padding: '2px 12px 2px 0' }}>{m.incidents}</td>
                    <td style={{ padding: '2px 12px 2px 0' }}>{m.interactions}</td>
                    <td style={{ padding: '2px 12px 2px 0' }}>{show(interactionShare(m), ' %')}</td>
                    <td style={{ padding: '2px 12px 2px 0' }}>{show(contactsPer100Users(m))}</td>
                    <td style={{ padding: '2px 12px 2px 0' }}>{`${slaLevel(m) === 'LOW' ? '🔴 ' : ''}${show(m.slaPct)}`}</td>
                    <td style={{ padding: '2px 12px 2px 0' }}>{show(m.npsScore)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Stack>
      ) : undefined}
      csvFileName="service-months.csv"
      csvColumns={csvColumns}
      csvFromRow={csvFromRow}
    />
  );
};

export default ServiceMonths;
