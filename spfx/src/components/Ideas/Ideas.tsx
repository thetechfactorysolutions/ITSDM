import * as React from 'react';
import { DefaultButton, Dialog, DialogFooter, DialogType, Dropdown, IColumn, MessageBar, MessageBarType, PrimaryButton, TextField } from '@fluentui/react';
import { AppConfig } from '../../config/AppConfig';
import { csvDate, csvEnum, csvNumber, enumValues } from '../../entities/csvHelpers';
import { buildIdeaPayload } from '../../entities/payloads';
import { TranslateFn, useT } from '../../i18n/I18n';
import { Idea, IdeaStatus, InitiativeStatus } from '../../models';
import { canConvertIdeaToInitiative, getAllowedIdeaStatuses } from '../../rules/businessRules';
import { dayKeyToSharePoint } from '../../rules/dates';
import { generateBusinessId } from '../../rules/ids';
import { validateIdea } from '../../rules/validation';
import DateField from '../shared/DateField';
import { DetailFields } from '../shared/DetailSection';
import EntityScreen, { IFormContext } from '../shared/EntityScreen';
import { FormRow } from '../shared/FormGrid';
import { useHubData } from '../shared/HubData';
import { toOptions } from '../shared/options';
import UserField from '../shared/UserField';

const STATUSES = enumValues(IdeaStatus);

const makeColumns = (t: TranslateFn): IColumn[] => [
  { key: 'ideaId', name: t('field.ideaId'), fieldName: 'ideaId', minWidth: 120 },
  { key: 'title', name: t('field.title'), fieldName: 'title', minWidth: 180 },
  { key: 'status', name: t('field.status'), fieldName: 'status', minWidth: 110 },
  { key: 'ownerUpn', name: t('field.owner'), fieldName: 'ownerUpn', minWidth: 160 },
  { key: 'targetDate', name: t('field.targetDate'), fieldName: 'targetDate', minWidth: 100 }
];
const sortAccessors = {
  ideaId: (i: Idea) => i.ideaId,
  title: (i: Idea) => i.title,
  status: (i: Idea) => i.status,
  ownerUpn: (i: Idea) => i.ownerUpn,
  targetDate: (i: Idea) => i.targetDate
};
const searchFields = [(i: Idea) => i.title, (i: Idea) => i.description, (i: Idea) => i.ideaId, (i: Idea) => i.ownerUpn, (i: Idea) => i.tags.join(' ')];

const csvColumns = [
  { header: 'Title', value: (i: Idea) => i.title },
  { header: 'IdeaId', value: (i: Idea) => i.ideaId },
  { header: 'Description', value: (i: Idea) => i.description },
  { header: 'Status', value: (i: Idea) => i.status },
  { header: 'OwnerUPN', value: (i: Idea) => i.ownerUpn },
  { header: 'SponsorUPN', value: (i: Idea) => i.sponsorUpn },
  { header: 'EstimatedValue', value: (i: Idea) => i.estimatedValue },
  { header: 'TargetDate', value: (i: Idea) => i.targetDate },
  { header: 'Tags', value: (i: Idea) => i.tags.join(';') }
];

const Ideas: React.FC = () => {
  const t = useT();
  const { service, userEmail, ideas: state, initiatives } = useHubData();
  const columns = React.useMemo(() => makeColumns(t), [t]);
  const [convertId, setConvertId] = React.useState<number | undefined>();
  const [conversionError, setConversionError] = React.useState<string | undefined>();

  const newItem = React.useCallback((): Idea => ({
    ideaId: generateBusinessId('IDEA'), title: '', description: '', status: IdeaStatus.NEW, ownerUpn: userEmail,
    sponsorUpn: '', estimatedValue: 0, targetDate: '', tags: []
  }), [userEmail]);

  const csvFromRow = React.useCallback((row: Record<string, string>): Idea => ({
    ideaId: row.IdeaId || generateBusinessId('IDEA'),
    title: row.Title ?? '',
    description: row.Description ?? '',
    status: csvEnum(row.Status, STATUSES, IdeaStatus.NEW),
    ownerUpn: row.OwnerUPN || userEmail,
    sponsorUpn: row.SponsorUPN ?? '',
    estimatedValue: csvNumber(row.EstimatedValue),
    targetDate: csvDate(row.TargetDate),
    tags: (row.Tags ?? '').split(/[;,]/).map(tag => tag.trim()).filter(Boolean)
  }), [userEmail]);

  const checkBeforeSave = (form: Idea, original: Idea | undefined): string | undefined => {
    const base = original ? original.status : IdeaStatus.NEW;
    return getAllowedIdeaStatuses(base).indexOf(form.status) === -1
      ? t('ideas.invalidTransition', { from: t(`status.${base}`), to: t(`status.${form.status}`) })
      : undefined;
  };

  const renderForm = ({ form, setForm, errors, original, isEdit, service: svc }: IFormContext<Idea>): React.ReactNode => {
    const base = original ? original.status : IdeaStatus.NEW;
    return (
      <>
        <TextField label={t('field.ideaId')} value={form.ideaId} readOnly={isEdit} onChange={(_, v) => setForm(p => ({ ...p, ideaId: v ?? '' }))} />
        <Dropdown label={t('field.status')} selectedKey={form.status} options={toOptions(getAllowedIdeaStatuses(base), t)}
          onChange={(_, o) => setForm(p => ({ ...p, status: (o?.key as IdeaStatus) ?? base }))} />
        <FormRow full><TextField label={t('field.title')} required value={form.title} errorMessage={errors.title && t(errors.title)} onChange={(_, v) => setForm(p => ({ ...p, title: v ?? '' }))} /></FormRow>
        <FormRow full><TextField label={t('field.description')} multiline rows={4} value={form.description} onChange={(_, v) => setForm(p => ({ ...p, description: v ?? '' }))} /></FormRow>
        <UserField label={t('field.owner')} required service={svc} value={form.ownerUpn} errorMessage={errors.ownerUpn && t(errors.ownerUpn)} onChange={e => setForm(p => ({ ...p, ownerUpn: e }))} />
        <UserField label={t('field.sponsor')} service={svc} value={form.sponsorUpn} errorMessage={errors.sponsorUpn && t(errors.sponsorUpn)} onChange={e => setForm(p => ({ ...p, sponsorUpn: e }))} />
        <TextField label={t('field.estimatedValue')} type="number" min={0} value={String(form.estimatedValue ?? 0)} errorMessage={errors.estimatedValue && t(errors.estimatedValue)} onChange={(_, v) => setForm(p => ({ ...p, estimatedValue: Number(v ?? 0) }))} />
        <DateField label={t('field.targetDate')} value={form.targetDate} errorMessage={errors.targetDate && t(errors.targetDate)} onChange={v => setForm(p => ({ ...p, targetDate: v }))} />
        {/* Uncontrolled on purpose: rebuilding the text from the tag list on every keystroke would swallow the comma being typed. */}
        <FormRow full><TextField key={form.ideaId} label={t('field.tags')} defaultValue={form.tags.join(', ')} onChange={(_, v) => setForm(p => ({ ...p, tags: (v ?? '').split(',').map(tag => tag.trim()).filter(Boolean) }))} /></FormRow>
      </>
    );
  };

  const renderDetail = (idea: Idea): React.ReactNode => (
    <DetailFields rows={[
      { label: t('field.ideaId'), value: idea.ideaId },
      { label: t('field.status'), value: t(`status.${idea.status}`) },
      { label: t('field.description'), value: idea.description },
      { label: t('field.owner'), value: idea.ownerUpn },
      { label: t('field.sponsor'), value: idea.sponsorUpn },
      { label: t('field.estimatedValue'), value: idea.estimatedValue },
      { label: t('field.targetDate'), value: idea.targetDate },
      { label: t('field.tags'), value: idea.tags.join(', ') },
      { label: t('field.convertedInitiative'), value: idea.convertedInitiativeId },
      { label: t('common.modifiedBy'), value: `${(idea.modified ?? '').slice(0, 10)} ${idea.editor ?? ''}`.trim() }
    ]} />
  );

  const convertTarget = state.items.filter(item => item.id === convertId)[0];

  const convertToInitiative = async (): Promise<void> => {
    const idea = convertTarget;
    setConvertId(undefined);
    if (!idea || !idea.id || !canConvertIdeaToInitiative(idea.status, true)) {
      return;
    }

    setConversionError(undefined);
    const initiativeId = generateBusinessId('INIT');
    let createdItemId: number | undefined;

    try {
      const created = await service.createItem<{ Id?: number }>(AppConfig.sharePoint.listNames.initiatives, {
        Title: idea.title, InitiativeId: initiativeId, Description: idea.description, Status: InitiativeStatus.DRAFT,
        OwnerUPN: idea.ownerUpn, ProgressPct: 0, TargetDate: dayKeyToSharePoint(idea.targetDate), SourceIdeaId: idea.ideaId
      });
      createdItemId = created.Id;
    } catch (err) {
      setConversionError(err instanceof Error ? err.message : t('common.unknownError'));
      return;
    }

    try {
      await state.update(idea.id, { Status: IdeaStatus.PLANNED, ConvertedInitiativeId: initiativeId });
    } catch (err) {
      const reason = err instanceof Error ? err.message : t('common.unknownError');
      let rolledBack = false;
      if (createdItemId !== undefined) {
        try {
          await service.deleteItem(AppConfig.sharePoint.listNames.initiatives, createdItemId);
          rolledBack = true;
        } catch {
          rolledBack = false;
        }
      }
      setConversionError(rolledBack
        ? t('ideas.convertRolledBack', { reason })
        : t('ideas.convertOrphan', { id: initiativeId, reason }));
    }

    initiatives.reload().catch(() => undefined);
  };

  return (
    <>
    <EntityScreen<Idea>
      textKey="ideas"
      listName={AppConfig.sharePoint.listNames.ideas}
      state={state}
      service={service}
      statuses={STATUSES}
      getStatus={i => i.status}
      getTitle={i => i.title}
      columns={columns}
      sortAccessors={sortAccessors}
      searchFields={searchFields}
      newItem={newItem}
      validate={validateIdea}
      buildPayload={buildIdeaPayload}
      checkBeforeSave={checkBeforeSave}
      renderForm={renderForm}
      renderDetail={renderDetail}
      archiveStatus={IdeaStatus.CANCELLED}
      canArchive={i => getAllowedIdeaStatuses(i.status).indexOf(IdeaStatus.CANCELLED) > -1 && i.status !== IdeaStatus.CANCELLED}
      csvFileName="ideas.csv"
      csvColumns={csvColumns}
      csvFromRow={csvFromRow}
      extraCommands={selected => [{
        key: 'convert', text: t('ideas.convert'), iconProps: { iconName: 'Forward' },
        disabled: !selected || !canConvertIdeaToInitiative(selected.status, true),
        onClick: () => setConvertId(selected ? selected.id : undefined)
      }]}
      extraContent={conversionError ? <MessageBar messageBarType={MessageBarType.error} onDismiss={() => setConversionError(undefined)}>{conversionError}</MessageBar> : undefined}
    />
    <Dialog
      hidden={!convertTarget}
      onDismiss={() => setConvertId(undefined)}
      dialogContentProps={{ type: DialogType.normal, title: t('ideas.convertTitle'), subText: t('ideas.convertMessage', { name: convertTarget ? convertTarget.title : '' }) }}
    >
      <DialogFooter>
        <PrimaryButton text={t('ideas.convertConfirm')} onClick={() => { convertToInitiative().catch(() => undefined); }} />
        <DefaultButton text={t('common.cancel')} onClick={() => setConvertId(undefined)} />
      </DialogFooter>
    </Dialog>
    </>
  );
};

export default Ideas;
