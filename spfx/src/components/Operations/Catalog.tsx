import * as React from 'react';
import { Dropdown, IColumn, SearchBox, Stack, Text, TextField } from '@fluentui/react';
import { AppConfig } from '../../config/AppConfig';
import { csvEnum, enumValues } from '../../entities/csvHelpers';
import { buildCatalogPayload } from '../../entities/payloads';
import { TranslateFn, useT } from '../../i18n/I18n';
import { CatalogCategory, CatalogEntry, CatalogKind, CatalogStatus } from '../../models';
import { generateBusinessId } from '../../rules/ids';
import { classifyText, suggestedKind } from '../../rules/service';
import { validateCatalog } from '../../rules/validation';
import { titleFor, titleMap } from '../../utils/lookup';
import { DetailFields } from '../shared/DetailSection';
import EntityScreen, { IFormContext } from '../shared/EntityScreen';
import { FormRow } from '../shared/FormGrid';
import { useHubData } from '../shared/HubData';
import LinkField from '../shared/LinkField';
import { toOptions } from '../shared/options';

const STATUSES = enumValues(CatalogStatus);
const CATEGORIES = enumValues(CatalogCategory);
const KINDS = enumValues(CatalogKind);

const searchFields = [(c: CatalogEntry) => c.title, (c: CatalogEntry) => c.keywords, (c: CatalogEntry) => c.guidance, (c: CatalogEntry) => c.catalogId];
const sortAccessors = {
  title: (c: CatalogEntry) => c.title, category: (c: CatalogEntry) => CATEGORIES.indexOf(c.category), kind: (c: CatalogEntry) => KINDS.indexOf(c.kind), status: (c: CatalogEntry) => c.status
};
const csvColumns = [
  { header: 'Title', value: (c: CatalogEntry) => c.title }, { header: 'CatalogId', value: (c: CatalogEntry) => c.catalogId }, { header: 'Category', value: (c: CatalogEntry) => c.category },
  { header: 'Kind', value: (c: CatalogEntry) => c.kind }, { header: 'Keywords', value: (c: CatalogEntry) => c.keywords }, { header: 'Guidance', value: (c: CatalogEntry) => c.guidance },
  { header: 'ArticleId', value: (c: CatalogEntry) => c.articleId }, { header: 'Status', value: (c: CatalogEntry) => c.status }
];

const makeColumns = (t: TranslateFn): IColumn[] => [
  { key: 'title', name: t('field.title'), fieldName: 'title', minWidth: 200 },
  { key: 'category', name: t('field.category'), minWidth: 140, onRender: (c: CatalogEntry) => t(`catalogCategory.${c.category}`) },
  { key: 'kind', name: t('field.kind'), minWidth: 100, onRender: (c: CatalogEntry) => t(`catalogKind.${c.kind}`) },
  { key: 'keywords', name: t('field.keywords'), fieldName: 'keywords', minWidth: 220 },
  { key: 'status', name: t('field.status'), fieldName: 'status', minWidth: 90 }
];

/** Try a sentence the user said and see which entries match, and so how it should be recorded. */
const Tester: React.FC<{ entries: CatalogEntry[] }> = ({ entries }) => {
  const t = useT();
  const [text, setText] = React.useState<string>('');
  const matches = classifyText(text, entries);
  const kind = suggestedKind(matches);
  return (
    <Stack tokens={{ childrenGap: 6 }}>
      <Text variant="mediumPlus" as="h3">{t('catalog.tester')}</Text>
      <SearchBox placeholder={t('catalog.testerHint')} ariaLabel={t('catalog.tester')} value={text} onChange={(_, v) => setText(v ?? '')} onClear={() => setText('')} />
      <div aria-live="polite">
        {text.trim().length > 0 && matches.length === 0 && <Text>{t('catalog.noMatch')}</Text>}
        {kind && <Text block><strong>{t('catalog.suggested', { kind: t(`catalogKind.${kind}`) })}</strong></Text>}
        {matches.slice(0, 5).map(m => (
          <Text key={m.entry.catalogId} block variant="small">
            {m.entry.title} · {t(`catalogCategory.${m.entry.category}`)} · {t(`catalogKind.${m.entry.kind}`)} ({m.matched.join(', ')})
          </Text>
        ))}
      </div>
    </Stack>
  );
};

/** What kinds of contact the service gets and how each is recorded, the same for every team. */
const Catalog: React.FC = () => {
  const t = useT();
  const { service, catalog: state, articles } = useHubData();
  const columns = React.useMemo(() => makeColumns(t), [t]);
  const articleOptions = React.useMemo(() => articles.items.map(a => ({ id: a.articleId, title: a.title })), [articles.items]);
  const articleTitles = React.useMemo(() => titleMap(articles.items, a => a.articleId), [articles.items]);

  const newItem = React.useCallback((): CatalogEntry => ({
    catalogId: generateBusinessId('CAT'), title: '', category: CatalogCategory.OTHER, kind: CatalogKind.INTERACTION, keywords: '', guidance: '', articleId: '', status: CatalogStatus.ACTIVE
  }), []);

  const csvFromRow = React.useCallback((row: Record<string, string>): CatalogEntry => ({
    catalogId: row.CatalogId || generateBusinessId('CAT'), title: row.Title ?? '', category: csvEnum(row.Category, CATEGORIES, CatalogCategory.OTHER), kind: csvEnum(row.Kind, KINDS, CatalogKind.INTERACTION),
    keywords: row.Keywords ?? '', guidance: row.Guidance ?? '', articleId: row.ArticleId ?? '', status: csvEnum(row.Status, STATUSES, CatalogStatus.ACTIVE)
  }), []);

  const renderForm = ({ form, setForm, errors, isEdit }: IFormContext<CatalogEntry>): React.ReactNode => (
    <>
      <TextField label={t('field.catalogId')} value={form.catalogId} readOnly={isEdit} onChange={(_, v) => setForm(p => ({ ...p, catalogId: v ?? '' }))} />
      <Dropdown label={t('field.status')} selectedKey={form.status} options={toOptions(STATUSES, t)} onChange={(_, o) => setForm(p => ({ ...p, status: (o?.key as CatalogStatus) ?? CatalogStatus.ACTIVE }))} />
      <FormRow full><TextField label={t('field.title')} required value={form.title} errorMessage={errors.title && t(errors.title)} onChange={(_, v) => setForm(p => ({ ...p, title: v ?? '' }))} /></FormRow>
      <Dropdown label={t('field.category')} selectedKey={form.category} options={toOptions(CATEGORIES, t, 'catalogCategory')} onChange={(_, o) => setForm(p => ({ ...p, category: (o?.key as CatalogCategory) ?? CatalogCategory.OTHER }))} />
      <Dropdown label={t('field.kind')} selectedKey={form.kind} options={toOptions(KINDS, t, 'catalogKind')} onChange={(_, o) => setForm(p => ({ ...p, kind: (o?.key as CatalogKind) ?? CatalogKind.INTERACTION }))} />
      <FormRow full><TextField label={t('field.keywords')} description={t('catalog.keywordsHint')} value={form.keywords} onChange={(_, v) => setForm(p => ({ ...p, keywords: v ?? '' }))} /></FormRow>
      <FormRow full><TextField label={t('field.guidance')} multiline rows={4} value={form.guidance} onChange={(_, v) => setForm(p => ({ ...p, guidance: v ?? '' }))} /></FormRow>
      <LinkField label={t('field.article')} value={form.articleId} options={articleOptions} onChange={id => setForm(p => ({ ...p, articleId: id }))} />
    </>
  );

  const renderDetail = (c: CatalogEntry): React.ReactNode => (
    <DetailFields rows={[
      { label: t('field.catalogId'), value: c.catalogId },
      { label: t('field.status'), value: t(`status.${c.status}`) },
      { label: t('field.category'), value: t(`catalogCategory.${c.category}`) },
      { label: t('field.kind'), value: t(`catalogKind.${c.kind}`) },
      { label: t('field.keywords'), value: c.keywords },
      { label: t('field.guidance'), value: c.guidance },
      { label: t('field.article'), value: c.articleId ? `${titleFor(articleTitles, c.articleId)} (${c.articleId})` : '' },
      { label: t('common.modifiedBy'), value: `${(c.modified ?? '').slice(0, 10)} ${c.editor ?? ''}`.trim() }
    ]} />
  );

  return (
    <EntityScreen<CatalogEntry>
      textKey="catalog"
      listName={AppConfig.sharePoint.listNames.catalog}
      state={state}
      service={service}
      statuses={STATUSES}
      getStatus={c => c.status}
      getTitle={c => c.title}
      columns={columns}
      sortAccessors={sortAccessors}
      searchFields={searchFields}
      newItem={newItem}
      validate={validateCatalog}
      buildPayload={buildCatalogPayload}
      renderForm={renderForm}
      renderDetail={renderDetail}
      quickStatuses={() => STATUSES}
      archiveStatus={CatalogStatus.ARCHIVED}
      canArchive={c => c.status === CatalogStatus.ACTIVE}
      hideAttachments
      extraContent={<Tester entries={state.items} />}
      csvFileName="catalog.csv"
      csvColumns={csvColumns}
      csvFromRow={csvFromRow}
    />
  );
};

export default Catalog;
