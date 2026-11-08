import * as React from 'react';
import { Dropdown, IColumn, TextField } from '@fluentui/react';
import { AppConfig } from '../../config/AppConfig';
import { csvDate, csvEnum, csvNumber, enumValues } from '../../entities/csvHelpers';
import { buildTrainingPayload } from '../../entities/payloads';
import { TranslateFn, useT } from '../../i18n/I18n';
import { Training, TrainingStatus, TrainingType } from '../../models';
import { dayKeyToSharePoint } from '../../rules/dates';
import { generateBusinessId } from '../../rules/ids';
import { applyTrainingEffects, getAllowedTrainingStatuses, isTrainingOverdue } from '../../rules/people';
import { validateTraining } from '../../rules/validation';
import DateField from '../shared/DateField';
import { DetailFields } from '../shared/DetailSection';
import EntityScreen, { IFormContext } from '../shared/EntityScreen';
import { FormRow } from '../shared/FormGrid';
import { useHubData } from '../shared/HubData';
import LinkField from '../shared/LinkField';
import { usePeopleLinkOptions } from '../shared/linkOptions';
import { toOptions } from '../shared/options';
import UserField from '../shared/UserField';

const STATUSES = enumValues(TrainingStatus);
const TYPES = enumValues(TrainingType);

const searchFields = [(x: Training) => x.title, (x: Training) => x.personUpn, (x: Training) => x.trainingId, (x: Training) => x.provider, (x: Training) => x.notes];
const sortAccessors = {
  trainingId: (x: Training) => x.trainingId, title: (x: Training) => x.title, personUpn: (x: Training) => x.personUpn, type: (x: Training) => TYPES.indexOf(x.type),
  status: (x: Training) => x.status, dueDate: (x: Training) => x.dueDate, cost: (x: Training) => x.cost
};
const csvColumns = [
  { header: 'Title', value: (x: Training) => x.title }, { header: 'TrainingId', value: (x: Training) => x.trainingId }, { header: 'Status', value: (x: Training) => x.status },
  { header: 'TrainingType', value: (x: Training) => x.type }, { header: 'PersonUPN', value: (x: Training) => x.personUpn }, { header: 'Provider', value: (x: Training) => x.provider },
  { header: 'SkillId', value: (x: Training) => x.skillId }, { header: 'VendorId', value: (x: Training) => x.vendorId }, { header: 'StartDate', value: (x: Training) => x.startDate },
  { header: 'DueDate', value: (x: Training) => x.dueDate }, { header: 'CompletedDate', value: (x: Training) => x.completedDate }, { header: 'Cost', value: (x: Training) => x.cost },
  { header: 'Notes', value: (x: Training) => x.notes }
];

function makeColumns(t: TranslateFn): IColumn[] {
  return [
    { key: 'trainingId', name: t('field.trainingId'), fieldName: 'trainingId', minWidth: 120 },
    { key: 'title', name: t('field.title'), fieldName: 'title', minWidth: 200 },
    { key: 'personUpn', name: t('field.person'), fieldName: 'personUpn', minWidth: 150 },
    { key: 'type', name: t('field.trainingType'), minWidth: 100, onRender: (x: Training) => t(`trainingType.${x.type}`) },
    { key: 'status', name: t('field.status'), fieldName: 'status', minWidth: 110 },
    { key: 'dueDate', name: t('field.dueDate'), minWidth: 110, onRender: (x: Training) => `${isTrainingOverdue(x) ? '🔴 ' : ''}${x.dueDate ?? ''}` },
    { key: 'cost', name: t('field.cost'), fieldName: 'cost', minWidth: 70 }
  ];
}

const Trainings: React.FC = () => {
  const t = useT();
  const { service, userEmail, trainings: state, skills, vendors } = useHubData();
  const { skillOptions, vendorOptions } = usePeopleLinkOptions();
  const columns = React.useMemo(() => makeColumns(t), [t]);

  const newItem = React.useCallback((): Training => ({
    trainingId: generateBusinessId('TRN'), title: '', status: TrainingStatus.PLANNED, type: TrainingType.COURSE, personUpn: userEmail, provider: '', skillId: '', vendorId: '',
    startDate: '', dueDate: '', completedDate: '', cost: 0, notes: ''
  }), [userEmail]);

  const csvFromRow = React.useCallback((row: Record<string, string>): Training => ({
    trainingId: row.TrainingId || generateBusinessId('TRN'), title: row.Title ?? '', status: csvEnum(row.Status, STATUSES, TrainingStatus.PLANNED),
    type: csvEnum(row.TrainingType, TYPES, TrainingType.COURSE), personUpn: row.PersonUPN || userEmail, provider: row.Provider ?? '', skillId: row.SkillId ?? '', vendorId: row.VendorId ?? '',
    startDate: csvDate(row.StartDate), dueDate: csvDate(row.DueDate), completedDate: csvDate(row.CompletedDate), cost: csvNumber(row.Cost), notes: row.Notes ?? ''
  }), [userEmail]);

  const checkBeforeSave = (form: Training, original: Training | undefined): string | undefined => {
    const base = original ? original.status : TrainingStatus.PLANNED;
    return getAllowedTrainingStatuses(base).indexOf(form.status) === -1
      ? t('common.invalidTransition', { from: t(`status.${base}`), to: t(`status.${form.status}`) })
      : undefined;
  };

  const renderForm = ({ form, setForm, errors, original, isEdit, service: svc }: IFormContext<Training>): React.ReactNode => {
    const base = original ? original.status : TrainingStatus.PLANNED;
    return (
      <>
        <TextField label={t('field.trainingId')} value={form.trainingId} readOnly={isEdit} onChange={(_, v) => setForm(p => ({ ...p, trainingId: v ?? '' }))} />
        <Dropdown label={t('field.status')} selectedKey={form.status} options={toOptions(getAllowedTrainingStatuses(base), t)} onChange={(_, o) => setForm(p => ({ ...p, status: (o?.key as TrainingStatus) ?? base }))} />
        <FormRow full><TextField label={t('field.title')} required value={form.title} errorMessage={errors.title && t(errors.title)} onChange={(_, v) => setForm(p => ({ ...p, title: v ?? '' }))} /></FormRow>
        <UserField label={t('field.person')} required service={svc} value={form.personUpn} errorMessage={errors.personUpn && t(errors.personUpn)} onChange={e => setForm(p => ({ ...p, personUpn: e }))} />
        <Dropdown label={t('field.trainingType')} selectedKey={form.type} options={toOptions(TYPES, t, 'trainingType')} onChange={(_, o) => setForm(p => ({ ...p, type: (o?.key as TrainingType) ?? TrainingType.COURSE }))} />
        <TextField label={t('field.provider')} value={form.provider} onChange={(_, v) => setForm(p => ({ ...p, provider: v ?? '' }))} />
        <TextField label={t('field.cost')} type="number" min={0} value={String(form.cost)} errorMessage={errors.cost && t(errors.cost)} onChange={(_, v) => setForm(p => ({ ...p, cost: v === undefined || v === '' ? 0 : Number(v) }))} />
        <DateField label={t('field.startDate')} value={form.startDate} errorMessage={errors.startDate && t(errors.startDate)} onChange={v => setForm(p => ({ ...p, startDate: v }))} />
        <DateField label={t('field.dueDate')} value={form.dueDate} errorMessage={errors.dueDate && t(errors.dueDate)} onChange={v => setForm(p => ({ ...p, dueDate: v }))} />
        <DateField label={t('field.completedDate')} value={form.completedDate} errorMessage={errors.completedDate && t(errors.completedDate)} onChange={v => setForm(p => ({ ...p, completedDate: v }))} />
        <LinkField label={t('field.skill')} value={form.skillId} options={skillOptions} onChange={id => setForm(p => ({ ...p, skillId: id }))} />
        <LinkField label={t('field.vendor')} value={form.vendorId} options={vendorOptions} onChange={id => setForm(p => ({ ...p, vendorId: id }))} />
        <FormRow full><TextField label={t('field.notes')} multiline rows={3} value={form.notes} onChange={(_, v) => setForm(p => ({ ...p, notes: v ?? '' }))} /></FormRow>
      </>
    );
  };

  const renderDetail = (x: Training): React.ReactNode => {
    const skill = skills.items.filter(s => s.skillId === x.skillId)[0];
    const vendor = vendors.items.filter(v => v.vendorId === x.vendorId)[0];
    return (
      <DetailFields rows={[
        { label: t('field.trainingId'), value: x.trainingId },
        { label: t('field.status'), value: t(`status.${x.status}`) },
        { label: t('field.trainingType'), value: t(`trainingType.${x.type}`) },
        { label: t('field.person'), value: x.personUpn },
        { label: t('field.provider'), value: x.provider },
        { label: t('field.startDate'), value: x.startDate },
        { label: t('field.dueDate'), value: `${isTrainingOverdue(x) ? '🔴 ' : ''}${x.dueDate ?? ''}` },
        { label: t('field.completedDate'), value: x.completedDate },
        { label: t('field.cost'), value: String(x.cost) },
        { label: t('field.skill'), value: skill ? `${skill.title} (${skill.skillId})` : x.skillId },
        { label: t('field.vendor'), value: vendor ? `${vendor.title} (${vendor.vendorId})` : x.vendorId },
        { label: t('field.notes'), value: x.notes },
        { label: t('common.modifiedBy'), value: `${(x.modified ?? '').slice(0, 10)} ${x.editor ?? ''}`.trim() }
      ]} />
    );
  };

  return (
    <EntityScreen<Training>
      textKey="trainings"
      listName={AppConfig.sharePoint.listNames.trainingPlans}
      state={state}
      service={service}
      statuses={STATUSES}
      getStatus={x => x.status}
      getTitle={x => x.title}
      columns={columns}
      sortAccessors={sortAccessors}
      searchFields={searchFields}
      newItem={newItem}
      validate={validateTraining}
      buildPayload={buildTrainingPayload}
      prepareForSave={(form, original) => applyTrainingEffects(form, original ? original.status : undefined)}
      checkBeforeSave={checkBeforeSave}
      renderForm={renderForm}
      renderDetail={renderDetail}
      quickStatuses={x => getAllowedTrainingStatuses(x.status)}
      quickPayload={(item, status) => {
        const updated = applyTrainingEffects({ ...item, status: status as TrainingStatus }, item.status);
        return { Status: status, CompletedDate: dayKeyToSharePoint(updated.completedDate) };
      }}
      archiveStatus={TrainingStatus.CANCELLED}
      canArchive={x => getAllowedTrainingStatuses(x.status).indexOf(TrainingStatus.CANCELLED) > -1 && x.status !== TrainingStatus.CANCELLED}
      csvFileName="trainings.csv"
      csvColumns={csvColumns}
      csvFromRow={csvFromRow}
    />
  );
};

export default Trainings;
