import * as React from 'react';
import { ComboBox, Dropdown, IColumn, Stack, TextField, Toggle } from '@fluentui/react';
import { AppConfig } from '../../config/AppConfig';
import { csvEnum, enumValues } from '../../entities/csvHelpers';
import { buildLinkPayload } from '../../entities/payloads';
import { TranslateFn, useT } from '../../i18n/I18n';
import { LinkItem, LinkStatus } from '../../models';
import { generateBusinessId } from '../../rules/ids';
import { linkCategories } from '../../rules/matters';
import { validateLink } from '../../rules/validation';
import { titleFor, titleMap } from '../../utils/lookup';
import { DetailFields } from '../shared/DetailSection';
import EntityScreen, { IFormContext } from '../shared/EntityScreen';
import { FormRow } from '../shared/FormGrid';
import { useHubData } from '../shared/HubData';
import LinkField from '../shared/LinkField';
import { toOptions } from '../shared/options';
import QuickLinks, { SafeLink } from './QuickLinks';

const STATUSES = enumValues(LinkStatus);

const searchFields = [(l: LinkItem) => l.title, (l: LinkItem) => l.url, (l: LinkItem) => l.category, (l: LinkItem) => l.description];
const sortAccessors = { title: (l: LinkItem) => l.title, category: (l: LinkItem) => l.category, status: (l: LinkItem) => l.status, pinned: (l: LinkItem) => (l.pinned ? 0 : 1) };
const csvColumns = [
  { header: 'Title', value: (l: LinkItem) => l.title }, { header: 'LinkId', value: (l: LinkItem) => l.linkId }, { header: 'Url', value: (l: LinkItem) => l.url },
  { header: 'Category', value: (l: LinkItem) => l.category }, { header: 'Description', value: (l: LinkItem) => l.description }, { header: 'Pinned', value: (l: LinkItem) => (l.pinned ? 'YES' : 'NO') },
  { header: 'Status', value: (l: LinkItem) => l.status }, { header: 'VendorId', value: (l: LinkItem) => l.vendorId }
];

const makeColumns = (t: TranslateFn): IColumn[] => [
  { key: 'title', name: t('field.title'), minWidth: 180, onRender: (l: LinkItem) => <SafeLink link={l} /> },
  { key: 'category', name: t('field.category'), fieldName: 'category', minWidth: 120 },
  { key: 'url', name: t('field.url'), fieldName: 'url', minWidth: 240 },
  { key: 'pinned', name: t('field.pinned'), minWidth: 80, onRender: (l: LinkItem) => (l.pinned ? '★' : '') },
  { key: 'status', name: t('field.status'), fieldName: 'status', minWidth: 90 }
];

/** The pages used often, with one-click access and a pinned selection for the dashboard. */
const Links: React.FC = () => {
  const t = useT();
  const { service, links: state, vendors } = useHubData();
  const columns = React.useMemo(() => makeColumns(t), [t]);
  const categories = React.useMemo(() => linkCategories(state.items), [state.items]);
  const vendorOptions = React.useMemo(() => vendors.items.map(v => ({ id: v.vendorId, title: v.title })), [vendors.items]);
  const vendorTitles = React.useMemo(() => titleMap(vendors.items, v => v.vendorId), [vendors.items]);

  const newItem = React.useCallback((): LinkItem => ({ linkId: generateBusinessId('LNK'), title: '', url: 'https://', category: '', description: '', pinned: false, status: LinkStatus.ACTIVE, vendorId: '' }), []);

  const csvFromRow = React.useCallback((row: Record<string, string>): LinkItem => ({
    linkId: row.LinkId || generateBusinessId('LNK'), title: row.Title ?? '', url: row.Url ?? '', category: row.Category ?? '', description: row.Description ?? '',
    pinned: (row.Pinned ?? '').toUpperCase() === 'YES', status: csvEnum(row.Status, STATUSES, LinkStatus.ACTIVE), vendorId: row.VendorId ?? ''
  }), []);

  const renderForm = ({ form, setForm, errors, isEdit }: IFormContext<LinkItem>): React.ReactNode => (
    <>
      <TextField label={t('field.linkId')} value={form.linkId} readOnly={isEdit} onChange={(_, v) => setForm(p => ({ ...p, linkId: v ?? '' }))} />
      <Dropdown label={t('field.status')} selectedKey={form.status} options={toOptions(STATUSES, t)} onChange={(_, o) => setForm(p => ({ ...p, status: (o?.key as LinkStatus) ?? LinkStatus.ACTIVE }))} />
      <FormRow full><TextField label={t('field.title')} required value={form.title} errorMessage={errors.title && t(errors.title)} onChange={(_, v) => setForm(p => ({ ...p, title: v ?? '' }))} /></FormRow>
      <FormRow full><TextField label={t('field.url')} required value={form.url} errorMessage={errors.url && t(errors.url)} onChange={(_, v) => setForm(p => ({ ...p, url: v ?? '' }))} /></FormRow>
      <ComboBox
        label={t('field.category')}
        allowFreeform
        autoComplete="on"
        text={form.category}
        options={categories.map(c => ({ key: c, text: c }))}
        onChange={(_, option, __, value) => setForm(p => ({ ...p, category: option ? String(option.key) : (value ?? '') }))}
      />
      <LinkField label={t('field.vendor')} value={form.vendorId} options={vendorOptions} onChange={id => setForm(p => ({ ...p, vendorId: id }))} />
      <FormRow full><TextField label={t('field.description')} multiline rows={2} value={form.description} onChange={(_, v) => setForm(p => ({ ...p, description: v ?? '' }))} /></FormRow>
      <Toggle label={t('field.pinned')} checked={form.pinned} onChange={(_, checked) => setForm(p => ({ ...p, pinned: !!checked }))} />
    </>
  );

  const renderDetail = (l: LinkItem): React.ReactNode => (
    <DetailFields rows={[
      { label: t('field.linkId'), value: l.linkId },
      { label: t('field.status'), value: t(`status.${l.status}`) },
      { label: t('field.url'), value: l.url },
      { label: t('field.category'), value: l.category },
      { label: t('field.description'), value: l.description },
      { label: t('field.pinned'), value: l.pinned ? t('common.yes') : t('common.no') },
      { label: t('field.vendor'), value: l.vendorId ? titleFor(vendorTitles, l.vendorId) : '' },
      { label: t('common.modifiedBy'), value: `${(l.modified ?? '').slice(0, 10)} ${l.editor ?? ''}`.trim() }
    ]} />
  );

  return (
    <EntityScreen<LinkItem>
      textKey="links"
      listName={AppConfig.sharePoint.listNames.links}
      state={state}
      service={service}
      statuses={STATUSES}
      getStatus={l => l.status}
      getTitle={l => l.title}
      columns={columns}
      sortAccessors={sortAccessors}
      searchFields={searchFields}
      newItem={newItem}
      validate={validateLink}
      buildPayload={buildLinkPayload}
      renderForm={renderForm}
      renderDetail={renderDetail}
      quickStatuses={() => STATUSES}
      archiveStatus={LinkStatus.ARCHIVED}
      canArchive={l => l.status === LinkStatus.ACTIVE}
      hideAttachments
      initialView={{ sortKey: 'category', sortDescending: false }}
      extraContent={state.items.length > 0 ? (
        <Stack tokens={{ childrenGap: 4 }}>
          <QuickLinks links={state.items} grouped />
        </Stack>
      ) : undefined}
      csvFileName="links.csv"
      csvColumns={csvColumns}
      csvFromRow={csvFromRow}
    />
  );
};

export default Links;
