import * as React from 'react';
import { Dropdown, IColumn, MessageBar, MessageBarType, Stack, TextField } from '@fluentui/react';
import { AppConfig } from '../../config/AppConfig';
import { csvDate, csvEnum, enumValues } from '../../entities/csvHelpers';
import { buildWeeklyPayload } from '../../entities/payloads';
import { TranslateFn, useT } from '../../i18n/I18n';
import { WeeklyReview, WeeklyReviewStatus } from '../../models';
import { generateBusinessId } from '../../rules/ids';
import { isWeeklyReviewMissing, lastWeekStart, reviewTitleFor, weekStartOf } from '../../rules/strategy';
import { toDayKey } from '../../rules/dates';
import { validateWeekly } from '../../rules/validation';
import DateField from '../shared/DateField';
import { DetailFields } from '../shared/DetailSection';
import EntityScreen, { IFormContext } from '../shared/EntityScreen';
import { FormRow } from '../shared/FormGrid';
import { useHubData } from '../shared/HubData';
import { toOptions } from '../shared/options';
import UserField from '../shared/UserField';

const STATUSES = enumValues(WeeklyReviewStatus);

const searchFields = [
  (r: WeeklyReview) => r.title, (r: WeeklyReview) => r.happened, (r: WeeklyReview) => r.wentWell, (r: WeeklyReview) => r.wentWrong, (r: WeeklyReview) => r.attention,
  (r: WeeklyReview) => r.decisions, (r: WeeklyReview) => r.priorities
];
const sortAccessors = { title: (r: WeeklyReview) => r.title, weekStart: (r: WeeklyReview) => r.weekStart, status: (r: WeeklyReview) => r.status };
const csvColumns = [
  { header: 'Title', value: (r: WeeklyReview) => r.title }, { header: 'ReviewId', value: (r: WeeklyReview) => r.reviewId }, { header: 'WeekStart', value: (r: WeeklyReview) => r.weekStart },
  { header: 'Status', value: (r: WeeklyReview) => r.status }, { header: 'Happened', value: (r: WeeklyReview) => r.happened }, { header: 'WentWell', value: (r: WeeklyReview) => r.wentWell },
  { header: 'WentWrong', value: (r: WeeklyReview) => r.wentWrong }, { header: 'Attention', value: (r: WeeklyReview) => r.attention }, { header: 'Decisions', value: (r: WeeklyReview) => r.decisions },
  { header: 'Risks', value: (r: WeeklyReview) => r.risks }, { header: 'Priorities', value: (r: WeeklyReview) => r.priorities }, { header: 'StopDoing', value: (r: WeeklyReview) => r.stopDoing },
  { header: 'StartDoing', value: (r: WeeklyReview) => r.startDoing }, { header: 'OwnerUPN', value: (r: WeeklyReview) => r.ownerUpn }
];

const makeColumns = (t: TranslateFn): IColumn[] => [
  { key: 'weekStart', name: t('field.weekStart'), fieldName: 'weekStart', minWidth: 110 },
  { key: 'title', name: t('field.title'), fieldName: 'title', minWidth: 200 },
  { key: 'status', name: t('field.status'), fieldName: 'status', minWidth: 110 },
  { key: 'priorities', name: t('field.priorities'), fieldName: 'priorities', minWidth: 260 }
];

const SECTIONS: Array<[keyof WeeklyReview, string]> = [
  ['happened', 'field.happened'], ['wentWell', 'field.wentWell'], ['wentWrong', 'field.wentWrong'], ['attention', 'field.attentionNeeded'], ['decisions', 'field.decisionsNeeded'],
  ['risks', 'field.risksChanged'], ['priorities', 'field.priorities'], ['stopDoing', 'field.stopDoing'], ['startDoing', 'field.startDoing']
];

/** The weekly management review: what happened, what needs a decision, what comes next. */
const WeeklyReviews: React.FC = () => {
  const t = useT();
  const { service, userEmail, weeklyReviews: state } = useHubData();
  const columns = React.useMemo(() => makeColumns(t), [t]);
  const missing = isWeeklyReviewMissing(state.items);

  const newItem = React.useCallback((): WeeklyReview => {
    const week = weekStartOf(toDayKey(new Date()));
    return {
      reviewId: generateBusinessId('WEEK'), title: reviewTitleFor(week), weekStart: week, status: WeeklyReviewStatus.DRAFT, happened: '', wentWell: '', wentWrong: '', attention: '', decisions: '',
      risks: '', priorities: '', stopDoing: '', startDoing: '', ownerUpn: userEmail
    };
  }, [userEmail]);

  const csvFromRow = React.useCallback((row: Record<string, string>): WeeklyReview => ({
    reviewId: row.ReviewId || generateBusinessId('WEEK'), title: row.Title ?? '', weekStart: csvDate(row.WeekStart), status: csvEnum(row.Status, STATUSES, WeeklyReviewStatus.DRAFT),
    happened: row.Happened ?? '', wentWell: row.WentWell ?? '', wentWrong: row.WentWrong ?? '', attention: row.Attention ?? '', decisions: row.Decisions ?? '', risks: row.Risks ?? '',
    priorities: row.Priorities ?? '', stopDoing: row.StopDoing ?? '', startDoing: row.StartDoing ?? '', ownerUpn: row.OwnerUPN || userEmail
  }), [userEmail]);

  const renderForm = ({ form, setForm, errors, isEdit, service: svc }: IFormContext<WeeklyReview>): React.ReactNode => (
    <>
      <TextField label={t('field.reviewId')} value={form.reviewId} readOnly={isEdit} onChange={(_, v) => setForm(p => ({ ...p, reviewId: v ?? '' }))} />
      <Dropdown label={t('field.status')} selectedKey={form.status} options={toOptions(STATUSES, t)} onChange={(_, o) => setForm(p => ({ ...p, status: (o?.key as WeeklyReviewStatus) ?? WeeklyReviewStatus.DRAFT }))} />
      <FormRow full><TextField label={t('field.title')} required value={form.title} errorMessage={errors.title && t(errors.title)} onChange={(_, v) => setForm(p => ({ ...p, title: v ?? '' }))} /></FormRow>
      <DateField label={t('field.weekStart')} value={form.weekStart} errorMessage={errors.weekStart && t(errors.weekStart)} onChange={v => setForm(p => ({ ...p, weekStart: v }))} />
      <UserField label={t('field.owner')} service={svc} value={form.ownerUpn} errorMessage={errors.ownerUpn && t(errors.ownerUpn)} onChange={e => setForm(p => ({ ...p, ownerUpn: e }))} />
      {SECTIONS.map(([key, label]) => (
        <FormRow key={key} full>
          <TextField label={t(label)} multiline rows={2} value={String(form[key] ?? '')} onChange={(_, v) => setForm(p => ({ ...p, [key]: v ?? '' }))} />
        </FormRow>
      ))}
    </>
  );

  const renderDetail = (r: WeeklyReview): React.ReactNode => (
    <DetailFields rows={[
      { label: t('field.reviewId'), value: r.reviewId },
      { label: t('field.status'), value: t(`status.${r.status}`) },
      { label: t('field.weekStart'), value: r.weekStart },
      ...SECTIONS.map(([key, label]) => ({ label: t(label), value: String(r[key] ?? '') })),
      { label: t('field.owner'), value: r.ownerUpn },
      { label: t('common.modifiedBy'), value: `${(r.modified ?? '').slice(0, 10)} ${r.editor ?? ''}`.trim() }
    ]} />
  );

  return (
    <EntityScreen<WeeklyReview>
      textKey="weekly"
      listName={AppConfig.sharePoint.listNames.weeklyReviews}
      state={state}
      service={service}
      statuses={STATUSES}
      getStatus={r => r.status}
      getTitle={r => r.title}
      columns={columns}
      sortAccessors={sortAccessors}
      searchFields={searchFields}
      newItem={newItem}
      validate={validateWeekly}
      buildPayload={buildWeeklyPayload}
      renderForm={renderForm}
      renderDetail={renderDetail}
      quickStatuses={() => STATUSES}
      hideArchive
      archiveStatus={WeeklyReviewStatus.COMPLETED}
      canArchive={() => false}
      hideAttachments
      initialView={{ sortKey: 'weekStart', sortDescending: true, showClosed: true }}
      extraContent={missing ? (
        <Stack><MessageBar messageBarType={MessageBarType.warning}>{t('weekly.missing', { week: lastWeekStart() })}</MessageBar></Stack>
      ) : undefined}
      csvFileName="weekly-reviews.csv"
      csvColumns={csvColumns}
      csvFromRow={csvFromRow}
    />
  );
};

export default WeeklyReviews;
