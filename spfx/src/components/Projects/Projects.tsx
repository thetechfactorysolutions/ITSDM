import * as React from 'react';
import { useMemo, useState } from 'react';
import { CommandBar, DetailsList, Dropdown, IColumn, IDropdownOption, MessageBar, MessageBarType, Panel, PanelType, PrimaryButton, SelectionMode, Stack, Text, TextField } from '@fluentui/react';
import { Project, ProjectRiskLevel, ProjectStatus } from '../../models';
import { isProjectAtRiskByVariance } from '../../rules/businessRules';
import { dayKeyToSharePoint } from '../../rules/dates';
import { generateBusinessId } from '../../rules/ids';
import { hasErrors, validateProject } from '../../rules/validation';
import DateField from '../shared/DateField';
import { useHubData } from '../shared/HubData';
import UserField from '../shared/UserField';

const statusOptions: IDropdownOption[] = [
  { key: ProjectStatus.PLANNING, text: ProjectStatus.PLANNING },
  { key: ProjectStatus.ACTIVE, text: ProjectStatus.ACTIVE },
  { key: ProjectStatus.AT_RISK, text: ProjectStatus.AT_RISK },
  { key: ProjectStatus.BLOCKED, text: ProjectStatus.BLOCKED },
  { key: ProjectStatus.ON_HOLD, text: ProjectStatus.ON_HOLD },
  { key: ProjectStatus.COMPLETED, text: ProjectStatus.COMPLETED },
  { key: ProjectStatus.CANCELLED, text: ProjectStatus.CANCELLED }
];
const riskOptions: IDropdownOption[] = [
  { key: ProjectRiskLevel.LOW, text: ProjectRiskLevel.LOW },
  { key: ProjectRiskLevel.MEDIUM, text: ProjectRiskLevel.MEDIUM },
  { key: ProjectRiskLevel.HIGH, text: ProjectRiskLevel.HIGH },
  { key: ProjectRiskLevel.CRITICAL, text: ProjectRiskLevel.CRITICAL }
];

const buildPayload = (project: Project): Record<string, unknown> => ({
  Title: project.title.trim(),
  ProjectId: project.projectId,
  InitiativeId: project.initiativeId,
  Description: project.description,
  Status: project.status,
  OwnerUPN: project.ownerUpn,
  StartDate: dayKeyToSharePoint(project.startDate),
  EndDate: dayKeyToSharePoint(project.endDate),
  BudgetAmount: project.budgetAmount,
  ForecastAmount: project.forecastAmount,
  RiskLevel: project.riskLevel,
  PlannerPlanId: project.plannerPlanId
});

const Projects: React.FC = () => {
  const { service, userEmail, projects: state } = useHubData();

  const newProject = (): Project => ({
    projectId: generateBusinessId('PROJ'),
    initiativeId: '',
    title: '',
    description: '',
    status: ProjectStatus.PLANNING,
    ownerUpn: userEmail,
    startDate: '',
    endDate: '',
    budgetAmount: 0,
    forecastAmount: 0,
    riskLevel: ProjectRiskLevel.LOW,
    plannerPlanId: ''
  });

  const [selectedId, setSelectedId] = useState<number | undefined>();
  const selected: Project | undefined = useMemo(
    () => state.items.filter(item => item.id === selectedId)[0],
    [state.items, selectedId]
  );
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [form, setForm] = useState<Project>(newProject);

  // Field errors appear after the first save attempt and then update as the user types.
  const errors = submitted ? validateProject(form) : {};

  const columns: IColumn[] = useMemo(() => [
    { key: 'projectId', name: 'Project ID', fieldName: 'projectId', minWidth: 90 },
    { key: 'title', name: 'Title', fieldName: 'title', minWidth: 160 },
    { key: 'status', name: 'Status', fieldName: 'status', minWidth: 100 },
    { key: 'budgetAmount', name: 'Budget', minWidth: 90, onRender: (item: Project) => item.budgetAmount.toFixed(2) },
    { key: 'forecastAmount', name: 'Forecast', minWidth: 90, onRender: (item: Project) => item.forecastAmount.toFixed(2) },
    { key: 'riskLevel', name: 'Risk', fieldName: 'riskLevel', minWidth: 80 }
  ], []);

  const openCreate = (): void => {
    setSelectedId(undefined);
    setSubmitted(false);
    setForm(newProject());
    setIsOpen(true);
  };

  const openEdit = (item: Project): void => {
    setSelectedId(item.id);
    setSubmitted(false);
    setForm(item);
    setIsOpen(true);
  };

  const save = async (): Promise<void> => {
    setSubmitted(true);
    if (hasErrors(validateProject(form))) {
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
      <Text variant="xLarge" as="h2">Projects</Text>
      <CommandBar items={[{ key: 'new', text: 'New Project', onClick: openCreate }, { key: 'refresh', text: 'Refresh', onClick: () => { state.reload().catch(() => undefined); } }]} />
      {state.error && <MessageBar messageBarType={MessageBarType.error}>{state.error}</MessageBar>}
      {state.loading && <MessageBar>Loading projects...</MessageBar>}
      <DetailsList items={state.items} columns={columns} selectionMode={SelectionMode.single} onItemInvoked={openEdit} />
      {selected && (
        <Text>
          Detail: {selected.title} | Budget {selected.budgetAmount.toFixed(2)} | Forecast {selected.forecastAmount.toFixed(2)} |
          {isProjectAtRiskByVariance(selected) ? ' At Risk' : ' Within Threshold'}
        </Text>
      )}
      <Panel isOpen={isOpen} onDismiss={() => setIsOpen(false)} type={PanelType.medium} headerText={selected ? 'Edit Project' : 'Create Project'}>
        <Stack tokens={{ childrenGap: 8 }}>
          {state.error && <MessageBar messageBarType={MessageBarType.error}>{state.error}</MessageBar>}
          <TextField label="Project ID" value={form.projectId} readOnly={!!selected} onChange={(_, value) => setForm(prev => ({ ...prev, projectId: value ?? '' }))} />
          <TextField label="Title" value={form.title} required errorMessage={errors.title} onChange={(_, value) => setForm(prev => ({ ...prev, title: value ?? '' }))} />
          <TextField label="Description" multiline value={form.description} onChange={(_, value) => setForm(prev => ({ ...prev, description: value ?? '' }))} />
          <TextField label="Initiative ID" value={form.initiativeId} onChange={(_, value) => setForm(prev => ({ ...prev, initiativeId: value ?? '' }))} />
          <Dropdown label="Status" selectedKey={form.status} options={statusOptions} onChange={(_, option) => setForm(prev => ({ ...prev, status: (option?.key as ProjectStatus) ?? ProjectStatus.PLANNING }))} />
          <UserField label="Owner" required service={service} value={form.ownerUpn} errorMessage={errors.ownerUpn} onChange={email => setForm(prev => ({ ...prev, ownerUpn: email }))} />
          <DateField label="Start Date" value={form.startDate} errorMessage={errors.startDate} onChange={value => setForm(prev => ({ ...prev, startDate: value }))} />
          <DateField label="End Date" value={form.endDate} errorMessage={errors.endDate} onChange={value => setForm(prev => ({ ...prev, endDate: value }))} />
          <TextField label="Budget" type="number" min={0} value={String(form.budgetAmount)} errorMessage={errors.budgetAmount} onChange={(_, value) => setForm(prev => ({ ...prev, budgetAmount: Number(value ?? 0) }))} />
          <TextField label="Forecast" type="number" min={0} value={String(form.forecastAmount)} errorMessage={errors.forecastAmount} onChange={(_, value) => setForm(prev => ({ ...prev, forecastAmount: Number(value ?? 0) }))} />
          <Dropdown label="Risk Level" selectedKey={form.riskLevel} options={riskOptions} onChange={(_, option) => setForm(prev => ({ ...prev, riskLevel: (option?.key as ProjectRiskLevel) ?? ProjectRiskLevel.LOW }))} />
          <TextField label="Planner Plan ID" value={form.plannerPlanId} onChange={(_, value) => setForm(prev => ({ ...prev, plannerPlanId: value ?? '' }))} />
          <PrimaryButton text="Save" onClick={() => { save().catch(() => undefined); }} />
        </Stack>
      </Panel>
    </Stack>
  );
};

export default Projects;
