import * as React from 'react';
import { Dropdown, IColumn, TextField } from '@fluentui/react';
import { AppConfig } from '../../config/AppConfig';
import { csvDate, csvEnum, enumValues } from '../../entities/csvHelpers';
import { buildReviewPayload } from '../../entities/payloads';
import { TranslateFn, useT } from '../../i18n/I18n';
import { Review, ReviewHealth, ReviewStatus, ReviewType } from '../../models';
import { getAllowedReviewStatuses } from '../../rules/governance';
import { generateBusinessId } from '../../rules/ids';
import { validateReview } from '../../rules/validation';
import DateField from '../shared/DateField';
import { DetailFields } from '../shared/DetailSection';
import EntityScreen, { IFormContext } from '../shared/EntityScreen';
import { FormRow } from '../shared/FormGrid';
import { useHubData } from '../shared/HubData';
import LinkField from '../shared/LinkField';
import { useLinkOptions } from '../shared/linkOptions';
import { toOptions } from '../shared/options';
import UserField from '../shared/UserField';

const STATUSES = enumValues(ReviewStatus);
const TYPES = enumValues(ReviewType);
const HEALTHS = enumValues(ReviewHealth);

const HEALTH_MARK: Record<ReviewHealth, string> = { [ReviewHealth.GREEN]: '🟢', [ReviewHealth.AMBER]: '🟠', [ReviewHealth.RED]: '🔴' };

const makeColumns = (t: TranslateFn): IColumn[] => [
  { key: 'reviewId', name: t('field.reviewId'), fieldName: 'reviewId', minWidth: 130 },
  { key: 'title', name: t('field.title'), fieldName: 'title', minWidth: 200 },
  { key: 'reviewType', name: t('field.reviewType'), minWidth: 100, onRender: (r: Review) => t(`reviewType.${r.reviewType}`) },
  { key: 'status', name: t('field.status'), fieldName: 'status', minWidth: 120 },
  { key: 'health', name: t('field.health'), minWidth: 100, onRender: (r: Review) => `${HEALTH_MARK[r.health]} ${t(`health.${r.health}`)}` },
  { key: 'reviewDate', name: t('field.reviewDate'), fieldName: 'reviewDate', minWidth: 100 },
  { key: 'ownerUpn', name: t('field.owner'), fieldName: 'ownerUpn', minWidth: 160 }
];
const sortAccessors = {
  reviewId: (r: Review) => r.reviewId, title: (r: Review) => r.title, reviewType: (r: Review) => r.reviewType, status: (r: Review) => r.status,
  health: (r: Review) => HEALTHS.indexOf(r.health), reviewDate: (r: Review) => r.reviewDate, ownerUpn: (r: Review) => r.ownerUpn
};
const searchFields = [(r: Review) => r.title, (r: Review) => r.summary, (r: Review) => r.nextSteps, (r: Review) => r.reviewId, (r: Review) => r.ownerUpn];
const csvColumns = [
  { header: 'Title', value: (r: Review) => r.title }, { header: 'ReviewId', value: (r: Review) => r.reviewId },
  { header: 'ReviewType', value: (r: Review) => r.reviewType }, { header: 'Status', value: (r: Review) => r.status },
  { header: 'Health', value: (r: Review) => r.health }, { header: 'ReviewDate', value: (r: Review) => r.reviewDate },
  { header: 'NextReviewDate', value: (r: Review) => r.nextReviewDate }, { header: 'Summary', value: (r: Review) => r.summary },
  { header: 'NextSteps', value: (r: Review) => r.nextSteps }, { header: 'OwnerUPN', value: (r: Review) => r.ownerUpn },
  { header: 'ProjectId', value: (r: Review) => r.projectId }, { header: 'InitiativeId', value: (r: Review) => r.initiativeId }
];

const Reviews: React.FC = () => {
  const t = useT();
  const { service, userEmail, reviews: state, projects, initiatives } = useHubData();
  const { initiativeOptions, projectOptions } = useLinkOptions();
  const columns = React.useMemo(() => makeColumns(t), [t]);

  const newItem = React.useCallback((): Review => ({
    reviewId: generateBusinessId('REV'), title: '', reviewType: ReviewType.STATUS, status: ReviewStatus.SCHEDULED, health: ReviewHealth.GREEN,
    reviewDate: '', nextReviewDate: '', summary: '', nextSteps: '', ownerUpn: userEmail, projectId: '', initiativeId: ''
  }), [userEmail]);

  const csvFromRow = React.useCallback((row: Record<string, string>): Review => ({
    reviewId: row.ReviewId || generateBusinessId('REV'), title: row.Title ?? '', reviewType: csvEnum(row.ReviewType, TYPES, ReviewType.STATUS),
    status: csvEnum(row.Status, STATUSES, ReviewStatus.SCHEDULED), health: csvEnum(row.Health, HEALTHS, ReviewHealth.GREEN),
    reviewDate: csvDate(row.ReviewDate), nextReviewDate: csvDate(row.NextReviewDate), summary: row.Summary ?? '', nextSteps: row.NextSteps ?? '',
    ownerUpn: row.OwnerUPN || userEmail, projectId: row.ProjectId ?? '', initiativeId: row.InitiativeId ?? ''
  }), [userEmail]);

  const checkBeforeSave = (form: Review, original: Review | undefined): string | undefined => {
    const base = original ? original.status : ReviewStatus.SCHEDULED;
    return getAllowedReviewStatuses(base).indexOf(form.status) === -1
      ? t('common.invalidTransition', { from: t(`status.${base}`), to: t(`status.${form.status}`) })
      : undefined;
  };

  const renderForm = ({ form, setForm, errors, original, isEdit, service: svc }: IFormContext<Review>): React.ReactNode => {
    const base = original ? original.status : ReviewStatus.SCHEDULED;
    return (
      <>
        <TextField label={t('field.reviewId')} value={form.reviewId} readOnly={isEdit} onChange={(_, v) => setForm(p => ({ ...p, reviewId: v ?? '' }))} />
        <Dropdown label={t('field.status')} selectedKey={form.status} options={toOptions(getAllowedReviewStatuses(base), t)} onChange={(_, o) => setForm(p => ({ ...p, status: (o?.key as ReviewStatus) ?? base }))} />
        <FormRow full><TextField label={t('field.title')} required value={form.title} errorMessage={errors.title && t(errors.title)} onChange={(_, v) => setForm(p => ({ ...p, title: v ?? '' }))} /></FormRow>
        <Dropdown label={t('field.reviewType')} selectedKey={form.reviewType} options={toOptions(TYPES, t, 'reviewType')} onChange={(_, o) => setForm(p => ({ ...p, reviewType: (o?.key as ReviewType) ?? ReviewType.STATUS }))} />
        <Dropdown label={t('field.health')} selectedKey={form.health} options={HEALTHS.map(h => ({ key: h, text: `${HEALTH_MARK[h]} ${t(`health.${h}`)}` }))} onChange={(_, o) => setForm(p => ({ ...p, health: (o?.key as ReviewHealth) ?? ReviewHealth.GREEN }))} />
        <DateField label={t('field.reviewDate')} value={form.reviewDate} errorMessage={errors.reviewDate && t(errors.reviewDate)} onChange={v => setForm(p => ({ ...p, reviewDate: v }))} />
        <DateField label={t('field.nextReviewDate')} value={form.nextReviewDate} errorMessage={errors.nextReviewDate && t(errors.nextReviewDate)} onChange={v => setForm(p => ({ ...p, nextReviewDate: v }))} />
        <UserField label={t('field.owner')} required service={svc} value={form.ownerUpn} errorMessage={errors.ownerUpn && t(errors.ownerUpn)} onChange={e => setForm(p => ({ ...p, ownerUpn: e }))} />
        <FormRow full><TextField label={t('field.summary')} multiline rows={4} value={form.summary} onChange={(_, v) => setForm(p => ({ ...p, summary: v ?? '' }))} /></FormRow>
        <FormRow full><TextField label={t('field.nextSteps')} multiline rows={3} value={form.nextSteps} onChange={(_, v) => setForm(p => ({ ...p, nextSteps: v ?? '' }))} /></FormRow>
        <LinkField label={t('field.project')} value={form.projectId} options={projectOptions} onChange={id => setForm(p => ({ ...p, projectId: id }))} />
        <LinkField label={t('field.initiative')} value={form.initiativeId} options={initiativeOptions} onChange={id => setForm(p => ({ ...p, initiativeId: id }))} />
      </>
    );
  };

  const renderDetail = (review: Review): React.ReactNode => {
    const project = projects.items.filter(p => p.projectId === review.projectId)[0];
    const initiative = initiatives.items.filter(i => i.initiativeId === review.initiativeId)[0];
    return (
      <DetailFields rows={[
        { label: t('field.reviewId'), value: review.reviewId },
        { label: t('field.status'), value: t(`status.${review.status}`) },
        { label: t('field.reviewType'), value: t(`reviewType.${review.reviewType}`) },
        { label: t('field.health'), value: `${HEALTH_MARK[review.health]} ${t(`health.${review.health}`)}` },
        { label: t('field.reviewDate'), value: review.reviewDate },
        { label: t('field.nextReviewDate'), value: review.nextReviewDate },
        { label: t('field.summary'), value: review.summary },
        { label: t('field.nextSteps'), value: review.nextSteps },
        { label: t('field.owner'), value: review.ownerUpn },
        { label: t('field.project'), value: project ? `${project.title} (${project.projectId})` : review.projectId },
        { label: t('field.initiative'), value: initiative ? `${initiative.title} (${initiative.initiativeId})` : review.initiativeId },
        { label: t('common.modifiedBy'), value: `${(review.modified ?? '').slice(0, 10)} ${review.editor ?? ''}`.trim() }
      ]} />
    );
  };

  return (
    <EntityScreen<Review>
      textKey="reviews"
      listName={AppConfig.sharePoint.listNames.reviews}
      state={state}
      service={service}
      statuses={STATUSES}
      getStatus={r => r.status}
      getTitle={r => r.title}
      columns={columns}
      sortAccessors={sortAccessors}
      searchFields={searchFields}
      newItem={newItem}
      validate={validateReview}
      buildPayload={buildReviewPayload}
      checkBeforeSave={checkBeforeSave}
      renderForm={renderForm}
      renderDetail={renderDetail}
      quickStatuses={r => getAllowedReviewStatuses(r.status)}
      archiveStatus={ReviewStatus.CANCELLED}
      canArchive={r => getAllowedReviewStatuses(r.status).indexOf(ReviewStatus.CANCELLED) > -1 && r.status !== ReviewStatus.CANCELLED}
      csvFileName="reviews.csv"
      csvColumns={csvColumns}
      csvFromRow={csvFromRow}
    />
  );
};

export default Reviews;
