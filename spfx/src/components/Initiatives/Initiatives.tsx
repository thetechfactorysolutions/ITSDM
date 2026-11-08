import * as React from 'react';
import { useMemo, useState } from 'react';
import { CommandBar, DetailsList, Dropdown, IColumn, IDropdownOption, MessageBar, MessageBarType, Panel, PanelType, PrimaryButton, SelectionMode, Stack, Text, TextField } from '@fluentui/react';
import { Initiative, InitiativeStatus } from '../../models';
import { dayKeyToSharePoint } from '../../rules/dates';
import { generateBusinessId } from '../../rules/ids';
import { hasErrors, validateInitiative } from '../../rules/validation';
import DateField from '../shared/DateField';
import { useHubData } from '../shared/HubData';
import UserField from '../shared/UserField';

const statusOptions: IDropdownOption[] = [
  { key: InitiativeStatus.DRAFT, text: InitiativeStatus.DRAFT },
  { key: InitiativeStatus.ACTIVE, text: InitiativeStatus.ACTIVE },
  { key: InitiativeStatus.BLOCKED, text: InitiativeStatus.BLOCKED },
  { key: InitiativeStatus.ON_HOLD, text: InitiativeStatus.ON_HOLD },
  { key: InitiativeStatus.COMPLETED, text: InitiativeStatus.COMPLETED },
  { key: InitiativeStatus.CANCELLED, text: InitiativeStatus.CANCELLED }
];

const buildPayload = (initiative: Initiative): Record<string, unknown> => ({
  Title: initiative.title.trim(),
  InitiativeId: initiative.initiativeId,
  Description: initiative.description,
  Status: initiative.status,
  OwnerUPN: initiative.ownerUpn,
  ProgressPct: initiative.progressPct,
  TargetDate: dayKeyToSharePoint(initiative.targetDate),
  SourceIdeaId: initiative.sourceIdeaId,
  PlannerPlanId: initiative.plannerPlanId
});

const Initiatives: React.FC = () => {
  const { service, userEmail, initiatives: state } = useHubData();

  const newInitiative = (): Initiative => ({
    initiativeId: generateBusinessId('INIT'),
    title: '',
    description: '',
    status: InitiativeStatus.DRAFT,
    ownerUpn: userEmail,
    progressPct: 0,
    targetDate: '',
    sourceIdeaId: '',
    plannerPlanId: ''
  });

  const [selectedId, setSelectedId] = useState<number | undefined>();
  const selected: Initiative | undefined = useMemo(
    () => state.items.filter(item => item.id === selectedId)[0],
    [state.items, selectedId]
  );
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [form, setForm] = useState<Initiative>(newInitiative);

  // Field errors appear after the first save attempt and then update as the user types.
  const errors = submitted ? validateInitiative(form) : {};

  const columns: IColumn[] = useMemo(() => [
    { key: 'initiativeId', name: 'Initiative ID', fieldName: 'initiativeId', minWidth: 110 },
    { key: 'title', name: 'Title', fieldName: 'title', minWidth: 180 },
    { key: 'status', name: 'Status', fieldName: 'status', minWidth: 100 },
    { key: 'progressPct', name: 'Progress', minWidth: 80, onRender: (item: Initiative) => `${item.progressPct}%` },
    { key: 'ownerUpn', name: 'Owner', fieldName: 'ownerUpn', minWidth: 180 }
  ], []);

  const openCreate = (): void => {
    setSelectedId(undefined);
    setSubmitted(false);
    setForm(newInitiative());
    setIsOpen(true);
  };

  const openEdit = (initiative: Initiative): void => {
    setSelectedId(initiative.id);
    setSubmitted(false);
    setForm(initiative);
    setIsOpen(true);
  };

  const save = async (): Promise<void> => {
    setSubmitted(true);
    if (hasErrors(validateInitiative(form))) {
      return;
    }

    // On failure the hook rethrows, so the panel stays open and shows the error.
    if (selected?.id) {
      await state.update(selected.id, buildPayload(form));
    } else {
      await state.create(buildPayload(form));
    }

    setIsOpen(false);
  };

  return (
    <Stack tokens={{ childrenGap: 12 }}>
      <Text variant="xLarge" as="h2">Initiatives</Text>
      <CommandBar items={[{ key: 'new', text: 'New Initiative', onClick: openCreate }, { key: 'refresh', text: 'Refresh', onClick: () => { state.reload().catch(() => undefined); } }]} />
      {state.error && <MessageBar messageBarType={MessageBarType.error}>{state.error}</MessageBar>}
      {state.loading && <MessageBar>Loading initiatives...</MessageBar>}
      <DetailsList items={state.items} columns={columns} selectionMode={SelectionMode.single} onItemInvoked={openEdit} />
      {selected && <Text>Detail: {selected.title} ({selected.status})</Text>}
      <Panel isOpen={isOpen} onDismiss={() => setIsOpen(false)} type={PanelType.medium} headerText={selected ? 'Edit Initiative' : 'Create Initiative'}>
        <Stack tokens={{ childrenGap: 8 }}>
          {state.error && <MessageBar messageBarType={MessageBarType.error}>{state.error}</MessageBar>}
          <TextField label="Initiative ID" value={form.initiativeId} readOnly={!!selected} onChange={(_, value) => setForm(prev => ({ ...prev, initiativeId: value ?? '' }))} />
          <TextField label="Title" value={form.title} required errorMessage={errors.title} onChange={(_, value) => setForm(prev => ({ ...prev, title: value ?? '' }))} />
          <TextField label="Description" multiline value={form.description} onChange={(_, value) => setForm(prev => ({ ...prev, description: value ?? '' }))} />
          <Dropdown label="Status" selectedKey={form.status} options={statusOptions} onChange={(_, option) => setForm(prev => ({ ...prev, status: (option?.key as InitiativeStatus) ?? InitiativeStatus.DRAFT }))} />
          <UserField label="Owner" required service={service} value={form.ownerUpn} errorMessage={errors.ownerUpn} onChange={email => setForm(prev => ({ ...prev, ownerUpn: email }))} />
          <TextField label="Progress %" type="number" min={0} max={100} value={String(form.progressPct)} errorMessage={errors.progressPct} onChange={(_, value) => setForm(prev => ({ ...prev, progressPct: Number(value ?? 0) }))} />
          <DateField label="Target Date" value={form.targetDate} errorMessage={errors.targetDate} onChange={value => setForm(prev => ({ ...prev, targetDate: value }))} />
          <TextField label="Source Idea ID" value={form.sourceIdeaId} onChange={(_, value) => setForm(prev => ({ ...prev, sourceIdeaId: value ?? '' }))} />
          <TextField label="Planner Plan ID" value={form.plannerPlanId} onChange={(_, value) => setForm(prev => ({ ...prev, plannerPlanId: value ?? '' }))} />
          <PrimaryButton text="Save" onClick={() => { save().catch(() => undefined); }} />
        </Stack>
      </Panel>
    </Stack>
  );
};

export default Initiatives;
