import * as React from 'react';
import { useMemo, useState } from 'react';
import { CommandBar, DetailsList, Dropdown, IColumn, IDropdownOption, MessageBar, MessageBarType, Panel, PanelType, Pivot, PivotItem, PrimaryButton, SelectionMode, Stack, Text, TextField } from '@fluentui/react';
import { ActionItem, ActionPriority, ActionStatus } from '../../models';
import { isActionDueToday, isActionDueWithinDays, isOverdueAction } from '../../rules/businessRules';
import { dayKeyToSharePoint } from '../../rules/dates';
import { generateBusinessId } from '../../rules/ids';
import { hasErrors, validateAction } from '../../rules/validation';
import DateField from '../shared/DateField';
import { useHubData } from '../shared/HubData';
import UserField from '../shared/UserField';

const statusOptions: IDropdownOption[] = [
  { key: ActionStatus.OPEN, text: ActionStatus.OPEN },
  { key: ActionStatus.IN_PROGRESS, text: ActionStatus.IN_PROGRESS },
  { key: ActionStatus.BLOCKED, text: ActionStatus.BLOCKED },
  { key: ActionStatus.DONE, text: ActionStatus.DONE },
  { key: ActionStatus.CANCELLED, text: ActionStatus.CANCELLED }
];
const priorityOptions: IDropdownOption[] = [
  { key: ActionPriority.LOW, text: ActionPriority.LOW },
  { key: ActionPriority.MEDIUM, text: ActionPriority.MEDIUM },
  { key: ActionPriority.HIGH, text: ActionPriority.HIGH },
  { key: ActionPriority.CRITICAL, text: ActionPriority.CRITICAL }
];

const buildPayload = (action: ActionItem): Record<string, unknown> => ({
  Title: action.title.trim(),
  ActionId: action.actionId,
  InitiativeId: action.initiativeId,
  ProjectId: action.projectId,
  Description: action.description,
  Status: action.status,
  Priority: action.priority,
  OwnerUPN: action.ownerUpn,
  DueDate: dayKeyToSharePoint(action.dueDate),
  CompletedDate: dayKeyToSharePoint(action.completedDate),
  PlannerTaskId: action.plannerTaskId
});

const Actions: React.FC = () => {
  const { service, userEmail, actions: state } = useHubData();

  const newAction = (): ActionItem => ({
    actionId: generateBusinessId('ACT'),
    initiativeId: '',
    projectId: '',
    title: '',
    description: '',
    status: ActionStatus.OPEN,
    priority: ActionPriority.MEDIUM,
    ownerUpn: userEmail,
    dueDate: '',
    completedDate: '',
    plannerTaskId: ''
  });

  const [selectedId, setSelectedId] = useState<number | undefined>();
  const selected: ActionItem | undefined = useMemo(
    () => state.items.filter(item => item.id === selectedId)[0],
    [state.items, selectedId]
  );
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [form, setForm] = useState<ActionItem>(newAction);

  // Field errors appear after the first save attempt and then update as the user types.
  const errors = submitted ? validateAction(form) : {};

  const columns: IColumn[] = useMemo(() => [
    { key: 'actionId', name: 'Action ID', fieldName: 'actionId', minWidth: 90 },
    { key: 'title', name: 'Title', fieldName: 'title', minWidth: 160 },
    { key: 'status', name: 'Status', fieldName: 'status', minWidth: 100 },
    { key: 'priority', name: 'Priority', fieldName: 'priority', minWidth: 100 },
    { key: 'ownerUpn', name: 'Owner', fieldName: 'ownerUpn', minWidth: 180 },
    { key: 'dueDate', name: 'Due', fieldName: 'dueDate', minWidth: 100 }
  ], []);

  const now = new Date();
  const overdue = state.items.filter(item => isOverdueAction(item, now));
  const today = state.items.filter(item => isActionDueToday(item, now));
  const thisWeek = state.items.filter(item => isActionDueWithinDays(item, 7, now));

  const openCreate = (): void => {
    setSelectedId(undefined);
    setSubmitted(false);
    setForm(newAction());
    setIsOpen(true);
  };

  const openEdit = (item: ActionItem): void => {
    setSelectedId(item.id);
    setSubmitted(false);
    setForm(item);
    setIsOpen(true);
  };

  const save = async (): Promise<void> => {
    setSubmitted(true);
    if (hasErrors(validateAction(form))) {
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
      <Text variant="xLarge" as="h2">Actions</Text>
      <CommandBar items={[{ key: 'new', text: 'New Action', onClick: openCreate }, { key: 'refresh', text: 'Refresh', onClick: () => { state.reload().catch(() => undefined); } }]} />
      {state.error && <MessageBar messageBarType={MessageBarType.error}>{state.error}</MessageBar>}
      {state.loading && <MessageBar>Loading actions...</MessageBar>}
      <Pivot>
        <PivotItem headerText={`Overdue (${overdue.length})`}>
          <DetailsList items={overdue} columns={columns} selectionMode={SelectionMode.single} onItemInvoked={openEdit} />
        </PivotItem>
        <PivotItem headerText={`Today (${today.length})`}>
          <DetailsList items={today} columns={columns} selectionMode={SelectionMode.single} onItemInvoked={openEdit} />
        </PivotItem>
        <PivotItem headerText={`This week (${thisWeek.length})`}>
          <DetailsList items={thisWeek} columns={columns} selectionMode={SelectionMode.single} onItemInvoked={openEdit} />
        </PivotItem>
        <PivotItem headerText={`All (${state.items.length})`}>
          <DetailsList items={state.items} columns={columns} selectionMode={SelectionMode.single} onItemInvoked={openEdit} />
        </PivotItem>
      </Pivot>
      {selected && <Text>Detail: {selected.title} ({selected.status})</Text>}
      <Panel isOpen={isOpen} onDismiss={() => setIsOpen(false)} type={PanelType.medium} headerText={selected ? 'Edit Action' : 'Create Action'}>
        <Stack tokens={{ childrenGap: 8 }}>
          {state.error && <MessageBar messageBarType={MessageBarType.error}>{state.error}</MessageBar>}
          <TextField label="Action ID" value={form.actionId} readOnly={!!selected} onChange={(_, value) => setForm(prev => ({ ...prev, actionId: value ?? '' }))} />
          <TextField label="Title" value={form.title} required errorMessage={errors.title} onChange={(_, value) => setForm(prev => ({ ...prev, title: value ?? '' }))} />
          <TextField label="Description" multiline value={form.description} onChange={(_, value) => setForm(prev => ({ ...prev, description: value ?? '' }))} />
          <TextField label="Initiative ID" value={form.initiativeId} onChange={(_, value) => setForm(prev => ({ ...prev, initiativeId: value ?? '' }))} />
          <TextField label="Project ID" value={form.projectId} onChange={(_, value) => setForm(prev => ({ ...prev, projectId: value ?? '' }))} />
          <Dropdown label="Status" selectedKey={form.status} options={statusOptions} onChange={(_, option) => setForm(prev => ({ ...prev, status: (option?.key as ActionStatus) ?? ActionStatus.OPEN }))} />
          <Dropdown label="Priority" selectedKey={form.priority} options={priorityOptions} onChange={(_, option) => setForm(prev => ({ ...prev, priority: (option?.key as ActionPriority) ?? ActionPriority.MEDIUM }))} />
          <UserField label="Owner" required service={service} value={form.ownerUpn} errorMessage={errors.ownerUpn} onChange={email => setForm(prev => ({ ...prev, ownerUpn: email }))} />
          <DateField label="Due Date" value={form.dueDate} errorMessage={errors.dueDate} onChange={value => setForm(prev => ({ ...prev, dueDate: value }))} />
          <DateField label="Completed Date" value={form.completedDate} errorMessage={errors.completedDate} onChange={value => setForm(prev => ({ ...prev, completedDate: value }))} />
          <TextField label="Planner Task ID" value={form.plannerTaskId} onChange={(_, value) => setForm(prev => ({ ...prev, plannerTaskId: value ?? '' }))} />
          <PrimaryButton text="Save" onClick={() => { save().catch(() => undefined); }} />
        </Stack>
      </Panel>
    </Stack>
  );
};

export default Actions;
