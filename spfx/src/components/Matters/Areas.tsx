import * as React from 'react';
import { Dropdown, IColumn, TextField } from '@fluentui/react';
import { AppConfig } from '../../config/AppConfig';
import { csvEnum, csvNumber, enumValues } from '../../entities/csvHelpers';
import { buildAreaPayload } from '../../entities/payloads';
import { TranslateFn, useT } from '../../i18n/I18n';
import { Area, AreaStatus } from '../../models';
import { generateBusinessId } from '../../rules/ids';
import { validateArea } from '../../rules/validation';
import { DetailFields } from '../shared/DetailSection';
import EntityScreen, { IFormContext } from '../shared/EntityScreen';
import { FormRow } from '../shared/FormGrid';
import { useHubData } from '../shared/HubData';
import { toOptions } from '../shared/options';

const STATUSES = enumValues(AreaStatus);

const searchFields = [(a: Area) => a.title, (a: Area) => a.description, (a: Area) => a.areaId];
const sortAccessors = { title: (a: Area) => a.title, status: (a: Area) => a.status, sortOrder: (a: Area) => a.sortOrder };
const csvColumns = [
  { header: 'Title', value: (a: Area) => a.title }, { header: 'AreaId', value: (a: Area) => a.areaId }, { header: 'Description', value: (a: Area) => a.description },
  { header: 'Status', value: (a: Area) => a.status }, { header: 'SortOrder', value: (a: Area) => a.sortOrder }
];

const makeColumns = (t: TranslateFn): IColumn[] => [
  { key: 'title', name: t('field.title'), fieldName: 'title', minWidth: 180 },
  { key: 'description', name: t('field.description'), fieldName: 'description', minWidth: 240 },
  { key: 'status', name: t('field.status'), fieldName: 'status', minWidth: 100 },
  { key: 'sortOrder', name: t('field.sortOrder'), fieldName: 'sortOrder', minWidth: 60 }
];

/** The topics matters are grouped by. Editable, so a new area needs no change to the app. */
const Areas: React.FC = () => {
  const t = useT();
  const { service, areas: state, matters } = useHubData();
  const columns = React.useMemo(() => makeColumns(t), [t]);

  const newItem = React.useCallback((): Area => ({
    areaId: generateBusinessId('AREA'), title: '', description: '', status: AreaStatus.ACTIVE,
    // After the last one, in steps of ten so one can be slipped in between.
    sortOrder: state.items.reduce((highest, a) => Math.max(highest, a.sortOrder), 0) + 10
  }), [state.items]);

  const csvFromRow = React.useCallback((row: Record<string, string>): Area => ({
    areaId: row.AreaId || generateBusinessId('AREA'), title: row.Title ?? '', description: row.Description ?? '',
    status: csvEnum(row.Status, STATUSES, AreaStatus.ACTIVE), sortOrder: csvNumber(row.SortOrder)
  }), []);

  const renderForm = ({ form, setForm, errors, isEdit }: IFormContext<Area>): React.ReactNode => (
    <>
      <TextField label={t('field.areaId')} value={form.areaId} readOnly={isEdit} onChange={(_, v) => setForm(p => ({ ...p, areaId: v ?? '' }))} />
      <Dropdown label={t('field.status')} selectedKey={form.status} options={toOptions(STATUSES, t)} onChange={(_, o) => setForm(p => ({ ...p, status: (o?.key as AreaStatus) ?? AreaStatus.ACTIVE }))} />
      <FormRow full><TextField label={t('field.title')} required value={form.title} errorMessage={errors.title && t(errors.title)} onChange={(_, v) => setForm(p => ({ ...p, title: v ?? '' }))} /></FormRow>
      <FormRow full><TextField label={t('field.description')} multiline rows={2} value={form.description} onChange={(_, v) => setForm(p => ({ ...p, description: v ?? '' }))} /></FormRow>
      <TextField label={t('field.sortOrder')} type="number" value={String(form.sortOrder)} errorMessage={errors.sortOrder && t(errors.sortOrder)}
        onChange={(_, v) => setForm(p => ({ ...p, sortOrder: v === undefined || v === '' ? 0 : Number(v) }))} />
    </>
  );

  const renderDetail = (a: Area): React.ReactNode => (
    <DetailFields rows={[
      { label: t('field.areaId'), value: a.areaId },
      { label: t('field.status'), value: t(`status.${a.status}`) },
      { label: t('field.description'), value: a.description },
      { label: t('field.sortOrder'), value: a.sortOrder },
      { label: t('nav.matters'), value: matters.items.filter(m => m.areaId === a.areaId).length },
      { label: t('common.modifiedBy'), value: `${(a.modified ?? '').slice(0, 10)} ${a.editor ?? ''}`.trim() }
    ]} />
  );

  return (
    <EntityScreen<Area>
      textKey="areas"
      listName={AppConfig.sharePoint.listNames.areas}
      state={state}
      service={service}
      statuses={STATUSES}
      getStatus={a => a.status}
      getTitle={a => a.title}
      columns={columns}
      sortAccessors={sortAccessors}
      searchFields={searchFields}
      newItem={newItem}
      validate={validateArea}
      buildPayload={buildAreaPayload}
      renderForm={renderForm}
      renderDetail={renderDetail}
      quickStatuses={() => STATUSES}
      archiveStatus={AreaStatus.ARCHIVED}
      canArchive={a => a.status === AreaStatus.ACTIVE}
      hideAttachments
      initialView={{ sortKey: 'sortOrder', sortDescending: false }}
      csvFileName="areas.csv"
      csvColumns={csvColumns}
      csvFromRow={csvFromRow}
    />
  );
};

export default Areas;
