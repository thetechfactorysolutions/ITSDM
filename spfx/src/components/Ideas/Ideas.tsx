import * as React from 'react';
import { useMemo, useState } from 'react';
import {
  CommandBar,
  DefaultButton,
  DetailsList,
  Dialog,
  DialogFooter,
  DialogType,
  Dropdown,
  IColumn,
  IDropdownOption,
  MessageBar,
  MessageBarType,
  Panel,
  PanelType,
  PrimaryButton,
  SelectionMode,
  Stack,
  Text,
  TextField
} from '@fluentui/react';
import { Idea, IdeaStatus, InitiativeStatus } from '../../models';
import { AppConfig } from '../../config/AppConfig';
import { canConvertIdeaToInitiative, getAllowedIdeaStatuses } from '../../rules/businessRules';
import { dayKeyToSharePoint } from '../../rules/dates';
import { generateBusinessId } from '../../rules/ids';
import { hasErrors, validateIdea } from '../../rules/validation';
import DateField from '../shared/DateField';
import { useHubData } from '../shared/HubData';
import UserField from '../shared/UserField';

const statusOptions: IDropdownOption[] = [
  { key: IdeaStatus.NEW, text: IdeaStatus.NEW },
  { key: IdeaStatus.DISCOVERY, text: IdeaStatus.DISCOVERY },
  { key: IdeaStatus.VALIDATED, text: IdeaStatus.VALIDATED },
  { key: IdeaStatus.PLANNED, text: IdeaStatus.PLANNED },
  { key: IdeaStatus.IN_PROGRESS, text: IdeaStatus.IN_PROGRESS },
  { key: IdeaStatus.PILOT, text: IdeaStatus.PILOT },
  { key: IdeaStatus.ROLLOUT, text: IdeaStatus.ROLLOUT },
  { key: IdeaStatus.COMPLETED, text: IdeaStatus.COMPLETED },
  { key: IdeaStatus.REJECTED, text: IdeaStatus.REJECTED },
  { key: IdeaStatus.CANCELLED, text: IdeaStatus.CANCELLED }
];

const buildIdeaPayload = (idea: Idea): Record<string, unknown> => ({
  Title: idea.title.trim(),
  IdeaId: idea.ideaId,
  Description: idea.description,
  Status: idea.status,
  OwnerUPN: idea.ownerUpn,
  SponsorUPN: idea.sponsorUpn,
  EstimatedValue: idea.estimatedValue,
  TargetDate: dayKeyToSharePoint(idea.targetDate),
  Tags: idea.tags.join(','),
  ConvertedInitiativeId: idea.convertedInitiativeId
});

const Ideas: React.FC = () => {
  const { service, userEmail, ideas: ideasState, initiatives: initiativesState } = useHubData();

  const newIdea = (): Idea => ({
    ideaId: generateBusinessId('IDEA'),
    title: '',
    description: '',
    status: IdeaStatus.NEW,
    ownerUpn: userEmail,
    sponsorUpn: '',
    estimatedValue: 0,
    targetDate: '',
    tags: []
  });

  // Keep only the id and derive the idea from the loaded list, so the detail view and the
  // transition rules always see the saved status instead of a stale copy.
  const [selectedId, setSelectedId] = useState<number | undefined>();
  const selected: Idea | undefined = useMemo(
    () => ideasState.items.filter(item => item.id === selectedId)[0],
    [ideasState.items, selectedId]
  );
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(false);
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | undefined>();
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [form, setForm] = useState<Idea>(newIdea);

  // Field errors appear after the first save attempt and then update as the user types.
  const errors = submitted ? validateIdea(form) : {};

  // Status changes are validated against the saved status, not the in-progress form value,
  // so several invalid steps cannot be chained inside one edit session.
  const baseStatus = selected ? selected.status : IdeaStatus.NEW;
  const allowedStatusOptions: IDropdownOption[] = useMemo(() => {
    const allowed = getAllowedIdeaStatuses(baseStatus);
    return statusOptions.filter(option => allowed.indexOf(option.key as IdeaStatus) > -1);
  }, [baseStatus]);

  const columns: IColumn[] = useMemo(() => [
    { key: 'ideaId', name: 'Idea ID', fieldName: 'ideaId', minWidth: 100 },
    { key: 'title', name: 'Title', fieldName: 'title', minWidth: 160 },
    { key: 'status', name: 'Status', fieldName: 'status', minWidth: 120 },
    { key: 'ownerUpn', name: 'Owner', fieldName: 'ownerUpn', minWidth: 180 },
    { key: 'targetDate', name: 'Target', fieldName: 'targetDate', minWidth: 100 }
  ], []);

  const openCreate = (): void => {
    setSelectedId(undefined);
    setActionError(undefined);
    setSubmitted(false);
    setForm(newIdea());
    setIsPanelOpen(true);
  };

  const openEdit = (idea: Idea): void => {
    setSelectedId(idea.id);
    setActionError(undefined);
    setSubmitted(false);
    setForm(idea);
    setIsPanelOpen(true);
  };

  const save = async (): Promise<void> => {
    setActionError(undefined);
    setSubmitted(true);

    if (hasErrors(validateIdea(form))) {
      return;
    }

    if (getAllowedIdeaStatuses(baseStatus).indexOf(form.status) === -1) {
      setActionError(`An idea in status ${baseStatus} cannot move to ${form.status}.`);
      return;
    }

    // On failure the hook rethrows, so the panel stays open and shows the error.
    if (selected?.id) {
      await ideasState.update(selected.id, buildIdeaPayload(form));
    } else {
      await ideasState.create(buildIdeaPayload(form));
    }
    setIsPanelOpen(false);
  };

  const convertToInitiative = async (): Promise<void> => {
    if (!selected || !selected.id || !canConvertIdeaToInitiative(selected.status, true)) {
      return;
    }

    setActionError(undefined);
    const initiativeId = generateBusinessId('INIT');

    let createdItemId: number | undefined;
    try {
      const created = await service.createItem<{ Id?: number }>(AppConfig.sharePoint.listNames.initiatives, {
        Title: selected.title,
        InitiativeId: initiativeId,
        Description: selected.description,
        Status: InitiativeStatus.DRAFT,
        OwnerUPN: selected.ownerUpn,
        ProgressPct: 0,
        TargetDate: dayKeyToSharePoint(selected.targetDate),
        SourceIdeaId: selected.ideaId
      });
      createdItemId = created.Id;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'The initiative could not be created.');
      setIsConvertDialogOpen(false);
      return;
    }

    try {
      await ideasState.update(selected.id, {
        Status: IdeaStatus.PLANNED,
        ConvertedInitiativeId: initiativeId
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Unknown error';
      // Undo the first step so the idea and the initiative list stay consistent.
      let rolledBack = false;
      if (createdItemId !== undefined) {
        try {
          await service.deleteItem(AppConfig.sharePoint.listNames.initiatives, createdItemId);
          rolledBack = true;
        } catch {
          rolledBack = false;
        }
      }

      setActionError(rolledBack
        ? `The idea could not be updated, so the conversion was cancelled and nothing was created. You can try again. ${reason}`
        : `Initiative ${initiativeId} was created, but the idea could not be updated and the initiative could not be removed. Delete that initiative manually before converting again. ${reason}`);
    }

    // The Initiatives tab shares this data, so refresh it to match what is really stored.
    initiativesState.reload().catch(() => undefined);
    setIsConvertDialogOpen(false);
  };

  const commandBarItems = [
    { key: 'new', text: 'New Idea', onClick: openCreate },
    { key: 'refresh', text: 'Refresh', onClick: () => { ideasState.reload().catch(() => undefined); } }
  ];

  const shownError = actionError || ideasState.error;

  return (
    <Stack tokens={{ childrenGap: 12 }}>
      <Text variant="xLarge" as="h2">Ideas</Text>
      <CommandBar items={commandBarItems} />
      {shownError && <MessageBar messageBarType={MessageBarType.error}>{shownError}</MessageBar>}
      {ideasState.loading && <MessageBar>Loading ideas...</MessageBar>}
      <DetailsList
        items={ideasState.items}
        columns={columns}
        selectionMode={SelectionMode.single}
        onItemInvoked={openEdit}
      />

      {selected && (
        <Stack>
          <Text variant="large" as="h3">Detail</Text>
          <Text>{selected.title} ({selected.status})</Text>
          <Text>{selected.description || 'No description'}</Text>
          <Stack horizontal tokens={{ childrenGap: 8 }}>
            <DefaultButton text="Edit" onClick={() => openEdit(selected)} />
            <PrimaryButton
              text="Convert to Initiative"
              disabled={!canConvertIdeaToInitiative(selected.status, true)}
              onClick={() => setIsConvertDialogOpen(true)}
            />
          </Stack>
        </Stack>
      )}

      <Panel
        isOpen={isPanelOpen}
        onDismiss={() => setIsPanelOpen(false)}
        type={PanelType.medium}
        headerText={selected ? 'Edit Idea' : 'Create Idea'}
      >
        <Stack tokens={{ childrenGap: 8 }}>
          {shownError && <MessageBar messageBarType={MessageBarType.error}>{shownError}</MessageBar>}
          <TextField label="Idea ID" value={form.ideaId} readOnly={!!selected} onChange={(_, value) => setForm(prev => ({ ...prev, ideaId: value ?? '' }))} />
          <TextField label="Title" value={form.title} required errorMessage={errors.title} onChange={(_, value) => setForm(prev => ({ ...prev, title: value ?? '' }))} />
          <TextField label="Description" multiline value={form.description} onChange={(_, value) => setForm(prev => ({ ...prev, description: value ?? '' }))} />
          <Dropdown
            label="Status"
            selectedKey={form.status}
            options={allowedStatusOptions}
            onChange={(_, option) => setForm(prev => ({ ...prev, status: (option?.key as IdeaStatus) ?? baseStatus }))}
          />
          <UserField label="Owner" required service={service} value={form.ownerUpn} errorMessage={errors.ownerUpn} onChange={email => setForm(prev => ({ ...prev, ownerUpn: email }))} />
          <UserField label="Sponsor" service={service} value={form.sponsorUpn} errorMessage={errors.sponsorUpn} onChange={email => setForm(prev => ({ ...prev, sponsorUpn: email }))} />
          <TextField label="Estimated Value" type="number" min={0} value={String(form.estimatedValue ?? 0)} errorMessage={errors.estimatedValue} onChange={(_, value) => setForm(prev => ({ ...prev, estimatedValue: Number(value ?? 0) }))} />
          <DateField label="Target Date" value={form.targetDate} errorMessage={errors.targetDate} onChange={value => setForm(prev => ({ ...prev, targetDate: value }))} />
          <TextField label="Tags (comma-separated)" value={form.tags.join(',')} onChange={(_, value) => setForm(prev => ({ ...prev, tags: (value ?? '').split(',').map(tag => tag.trim()).filter(Boolean) }))} />
          <PrimaryButton text="Save" onClick={() => { save().catch(() => undefined); }} />
        </Stack>
      </Panel>

      <Dialog hidden={!isConvertDialogOpen} onDismiss={() => setIsConvertDialogOpen(false)} dialogContentProps={{ type: DialogType.normal, title: 'Convert to Initiative', subText: 'Do you want to convert this validated idea into an initiative?' }}>
        <DialogFooter>
          <PrimaryButton text="Confirm conversion" onClick={() => { convertToInitiative().catch(() => undefined); }} />
          <DefaultButton text="Cancel" onClick={() => setIsConvertDialogOpen(false)} />
        </DialogFooter>
      </Dialog>
    </Stack>
  );
};

export default Ideas;
