import * as React from 'react';
import { Dropdown, IColumn, TextField } from '@fluentui/react';
import { AppConfig } from '../../config/AppConfig';
import { csvDate, csvEnum, enumValues } from '../../entities/csvHelpers';
import { buildArticlePayload } from '../../entities/payloads';
import { TranslateFn, useT } from '../../i18n/I18n';
import { Article, ArticleCategory, ArticleStatus } from '../../models';
import { dayKeyToSharePoint } from '../../rules/dates';
import { generateBusinessId } from '../../rules/ids';
import { applyArticleEffects, getAllowedArticleStatuses, isReviewDue } from '../../rules/people';
import { validateArticle } from '../../rules/validation';
import DateField from '../shared/DateField';
import { DetailFields } from '../shared/DetailSection';
import EntityScreen, { IApprovalConfig, IFormContext } from '../shared/EntityScreen';
import { FormRow } from '../shared/FormGrid';
import { useHubData } from '../shared/HubData';
import LinkField from '../shared/LinkField';
import { usePeopleLinkOptions } from '../shared/linkOptions';
import { toOptions } from '../shared/options';
import UserField from '../shared/UserField';

const STATUSES = enumValues(ArticleStatus);
const CATEGORIES = enumValues(ArticleCategory);

/** Connects this screen to the approval rules in src/rules/approvals.ts. */
const approvalConfig: IApprovalConfig<Article> = {
  entity: 'articles',
  getBusinessId: item => item.articleId,
  proposeStatus: (item, status) => ({ ...item, status: status as ArticleStatus })
};

const searchFields = [(a: Article) => a.title, (a: Article) => a.summary, (a: Article) => a.body, (a: Article) => a.tags, (a: Article) => a.articleId, (a: Article) => a.ownerUpn];
const sortAccessors = {
  articleId: (a: Article) => a.articleId, title: (a: Article) => a.title, category: (a: Article) => CATEGORIES.indexOf(a.category), status: (a: Article) => a.status,
  ownerUpn: (a: Article) => a.ownerUpn, reviewDate: (a: Article) => a.reviewDate
};
const csvColumns = [
  { header: 'Title', value: (a: Article) => a.title }, { header: 'ArticleId', value: (a: Article) => a.articleId }, { header: 'Summary', value: (a: Article) => a.summary },
  { header: 'Body', value: (a: Article) => a.body }, { header: 'Category', value: (a: Article) => a.category }, { header: 'Status', value: (a: Article) => a.status },
  { header: 'OwnerUPN', value: (a: Article) => a.ownerUpn }, { header: 'Tags', value: (a: Article) => a.tags }, { header: 'PublishedOn', value: (a: Article) => a.publishedOn },
  { header: 'ReviewDate', value: (a: Article) => a.reviewDate }, { header: 'ProjectId', value: (a: Article) => a.projectId }, { header: 'VendorId', value: (a: Article) => a.vendorId },
  { header: 'IncidentId', value: (a: Article) => a.incidentId }
];

function makeColumns(t: TranslateFn): IColumn[] {
  return [
    { key: 'articleId', name: t('field.articleId'), fieldName: 'articleId', minWidth: 120 },
    { key: 'title', name: t('field.title'), fieldName: 'title', minWidth: 220 },
    { key: 'category', name: t('field.category'), minWidth: 100, onRender: (a: Article) => t(`articleCategory.${a.category}`) },
    { key: 'status', name: t('field.status'), fieldName: 'status', minWidth: 110 },
    { key: 'ownerUpn', name: t('field.owner'), fieldName: 'ownerUpn', minWidth: 150 },
    { key: 'reviewDate', name: t('field.reviewDate'), minWidth: 110, onRender: (a: Article) => `${isReviewDue(a) ? '🟠 ' : ''}${a.reviewDate ?? ''}` }
  ];
}

const Knowledge: React.FC = () => {
  const t = useT();
  const { service, userEmail, articles: state, projects, vendors, incidents } = useHubData();
  const { projectOptions, vendorOptions, incidentOptions } = usePeopleLinkOptions();
  const columns = React.useMemo(() => makeColumns(t), [t]);

  const newItem = React.useCallback((): Article => ({
    articleId: generateBusinessId('KB'), title: '', summary: '', body: '', category: ArticleCategory.HOW_TO, status: ArticleStatus.DRAFT, ownerUpn: userEmail, tags: '',
    publishedOn: '', reviewDate: '', projectId: '', vendorId: '', incidentId: ''
  }), [userEmail]);

  const csvFromRow = React.useCallback((row: Record<string, string>): Article => ({
    articleId: row.ArticleId || generateBusinessId('KB'), title: row.Title ?? '', summary: row.Summary ?? '', body: row.Body ?? '', category: csvEnum(row.Category, CATEGORIES, ArticleCategory.REFERENCE),
    status: csvEnum(row.Status, STATUSES, ArticleStatus.DRAFT), ownerUpn: row.OwnerUPN || userEmail, tags: row.Tags ?? '', publishedOn: csvDate(row.PublishedOn), reviewDate: csvDate(row.ReviewDate),
    projectId: row.ProjectId ?? '', vendorId: row.VendorId ?? '', incidentId: row.IncidentId ?? ''
  }), [userEmail]);

  const checkBeforeSave = (form: Article, original: Article | undefined): string | undefined => {
    const base = original ? original.status : ArticleStatus.DRAFT;
    return getAllowedArticleStatuses(base).indexOf(form.status) === -1
      ? t('common.invalidTransition', { from: t(`status.${base}`), to: t(`status.${form.status}`) })
      : undefined;
  };

  const renderForm = ({ form, setForm, errors, original, isEdit, service: svc }: IFormContext<Article>): React.ReactNode => {
    const base = original ? original.status : ArticleStatus.DRAFT;
    return (
      <>
        <TextField label={t('field.articleId')} value={form.articleId} readOnly={isEdit} onChange={(_, v) => setForm(p => ({ ...p, articleId: v ?? '' }))} />
        <Dropdown label={t('field.status')} selectedKey={form.status} options={toOptions(getAllowedArticleStatuses(base), t)} onChange={(_, o) => setForm(p => ({ ...p, status: (o?.key as ArticleStatus) ?? base }))} />
        <FormRow full><TextField label={t('field.title')} required value={form.title} errorMessage={errors.title && t(errors.title)} onChange={(_, v) => setForm(p => ({ ...p, title: v ?? '' }))} /></FormRow>
        <FormRow full><TextField label={t('field.summary')} multiline rows={2} value={form.summary} onChange={(_, v) => setForm(p => ({ ...p, summary: v ?? '' }))} /></FormRow>
        <FormRow full><TextField label={t('field.body')} multiline rows={8} value={form.body} onChange={(_, v) => setForm(p => ({ ...p, body: v ?? '' }))} /></FormRow>
        <Dropdown label={t('field.category')} selectedKey={form.category} options={toOptions(CATEGORIES, t, 'articleCategory')} onChange={(_, o) => setForm(p => ({ ...p, category: (o?.key as ArticleCategory) ?? ArticleCategory.REFERENCE }))} />
        <UserField label={t('field.owner')} required service={svc} value={form.ownerUpn} errorMessage={errors.ownerUpn && t(errors.ownerUpn)} onChange={e => setForm(p => ({ ...p, ownerUpn: e }))} />
        <TextField label={t('field.tags')} value={form.tags} onChange={(_, v) => setForm(p => ({ ...p, tags: v ?? '' }))} />
        <DateField label={t('field.publishedOn')} value={form.publishedOn} errorMessage={errors.publishedOn && t(errors.publishedOn)} onChange={v => setForm(p => ({ ...p, publishedOn: v }))} />
        <DateField label={t('field.reviewDate')} value={form.reviewDate} errorMessage={errors.reviewDate && t(errors.reviewDate)} onChange={v => setForm(p => ({ ...p, reviewDate: v }))} />
        <LinkField label={t('field.project')} value={form.projectId} options={projectOptions} onChange={id => setForm(p => ({ ...p, projectId: id }))} />
        <LinkField label={t('field.vendor')} value={form.vendorId} options={vendorOptions} onChange={id => setForm(p => ({ ...p, vendorId: id }))} />
        <LinkField label={t('field.incident')} value={form.incidentId} options={incidentOptions} onChange={id => setForm(p => ({ ...p, incidentId: id }))} />
      </>
    );
  };

  const renderDetail = (a: Article): React.ReactNode => {
    const project = projects.items.filter(p => p.projectId === a.projectId)[0];
    const vendor = vendors.items.filter(v => v.vendorId === a.vendorId)[0];
    const incident = incidents.items.filter(i => i.incidentId === a.incidentId)[0];
    return (
      <DetailFields rows={[
        { label: t('field.articleId'), value: a.articleId },
        { label: t('field.status'), value: t(`status.${a.status}`) },
        { label: t('field.category'), value: t(`articleCategory.${a.category}`) },
        { label: t('field.summary'), value: a.summary },
        { label: t('field.body'), value: a.body },
        { label: t('field.owner'), value: a.ownerUpn },
        { label: t('field.tags'), value: a.tags },
        { label: t('field.publishedOn'), value: a.publishedOn },
        { label: t('field.reviewDate'), value: `${isReviewDue(a) ? '🟠 ' : ''}${a.reviewDate ?? ''}` },
        { label: t('field.project'), value: project ? `${project.title} (${project.projectId})` : a.projectId },
        { label: t('field.vendor'), value: vendor ? `${vendor.title} (${vendor.vendorId})` : a.vendorId },
        { label: t('field.incident'), value: incident ? `${incident.title} (${incident.incidentId})` : a.incidentId },
        { label: t('common.modifiedBy'), value: `${(a.modified ?? '').slice(0, 10)} ${a.editor ?? ''}`.trim() }
      ]} />
    );
  };

  return (
    <EntityScreen<Article>
      textKey="articles"
      listName={AppConfig.sharePoint.listNames.knowledgeBase}
      state={state}
      service={service}
      statuses={STATUSES}
      getStatus={a => a.status}
      getTitle={a => a.title}
      columns={columns}
      sortAccessors={sortAccessors}
      searchFields={searchFields}
      newItem={newItem}
      validate={validateArticle}
      buildPayload={buildArticlePayload}
      prepareForSave={(form, original) => applyArticleEffects(form, original ? original.status : undefined)}
      checkBeforeSave={checkBeforeSave}
      renderForm={renderForm}
      renderDetail={renderDetail}
      approval={approvalConfig}
      quickStatuses={a => getAllowedArticleStatuses(a.status)}
      quickPayload={(item, status) => {
        const updated = applyArticleEffects({ ...item, status: status as ArticleStatus }, item.status);
        return { Status: status, PublishedOn: dayKeyToSharePoint(updated.publishedOn), ReviewDate: dayKeyToSharePoint(updated.reviewDate) };
      }}
      archiveStatus={ArticleStatus.ARCHIVED}
      canArchive={a => getAllowedArticleStatuses(a.status).indexOf(ArticleStatus.ARCHIVED) > -1 && a.status !== ArticleStatus.ARCHIVED}
      csvFileName="articles.csv"
      csvColumns={csvColumns}
      csvFromRow={csvFromRow}
    />
  );
};

export default Knowledge;
