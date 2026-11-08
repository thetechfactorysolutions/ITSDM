import * as React from 'react';
import { Dropdown, IColumn, Pivot, PivotItem, TextField } from '@fluentui/react';
import { AppConfig } from '../../config/AppConfig';
import { csvDate, csvEnum, enumValues } from '../../entities/csvHelpers';
import { buildActionPayload } from '../../entities/payloads';
import { TranslateFn, useT } from '../../i18n/I18n';
import { ActionItem, ActionPriority, ActionStatus } from '../../models';
import { isActionDueToday, isActionDueWithinDays, isOverdueAction } from '../../rules/businessRules';
import { dayKeyToSharePoint } from '../../rules/dates';
import { generateBusinessId } from '../../rules/ids';
import { applyActionStatusEffects, getAllowedActionStatuses } from '../../rules/transitions';
import { validateAction } from '../../rules/validation';
import DateField from '../shared/DateField';
import EntityScreen, { IFormContext } from '../shared/EntityScreen';
import { FormRow } from '../shared/FormGrid';
import { useHubData } from '../shared/HubData';
import LinkField from '../shared/LinkField';
import { toOptions } from '../shared/options';
import UserField from '../shared/UserField';

const STATUSES = enumValues(ActionStatus);
const PRIORITIES = enumValues(ActionPriority);

const makeColumns = (t: TranslateFn): IColumn[] => [
  { key: 'actionId', name: t('field.actionId'), fieldName: 'actionId', minWidth: 130 },
  { key: 'title', name: t('field.title'), fieldName: 'title', minWidth: 180 },
  { key: 'status', name: t('field.status'), fieldName: 'status', minWidth: 110 },
  { key: 'priority', name: t('field.priority'), minWidth: 90, onRender: (a: ActionItem) => t(`priority.${a.priority}`) },
  { key: 'ownerUpn', name: t('field.owner'), fieldName: 'ownerUpn', minWidth: 160 },
  { key: 'dueDate', name: t('field.dueDate'), fieldName: 'dueDate', minWidth: 100 }
];
const sortAccessors = {
  actionId: (a: ActionItem) => a.actionId,
  title: (a: ActionItem) => a.title,
  status: (a: ActionItem) => a.status,
  priority: (a: ActionItem) => PRIORITIES.indexOf(a.priority),
  ownerUpn: (a: ActionItem) => a.ownerUpn,
  dueDate: (a: ActionItem) => a.dueDate
};
const searchFields = [(a: ActionItem) => a.title, (a: ActionItem) => a.description, (a: ActionItem) => a.actionId, (a: ActionItem) => a.ownerUpn];

const csvColumns = [
  { header: 'Title', value: (a: ActionItem) => a.title },
  { header: 'ActionId', value: (a: ActionItem) => a.actionId },
  { header: 'InitiativeId', value: (a: ActionItem) => a.initiativeId },
  { header: 'ProjectId', value: (a: ActionItem) => a.projectId },
  { header: 'Description', value: (a: ActionItem) => a.description },
  { header: 'Status', value: (a: ActionItem) => a.status },
  { header: 'Priority', value: (a: ActionItem) => a.priority },
  { header: 'OwnerUPN', value: (a: ActionItem) => a.ownerUpn },
  { header: 'DueDate', value: (a: ActionItem) => a.dueDate },
  { header: 'CompletedDate', value: (a: ActionItem) => a.completedDate }
];

type DueFilter = 'all' | 'overdue' | 'today' | 'week';

const Actions: React.FC = () => {
  const t = useT();
  const { service, userEmail, actions: state, initiatives, projects } = useHubData();
  const columns = React.useMemo(() => makeColumns(t), [t]);
  const [dueFilter, setDueFilter] = React.useState<DueFilter>('all');

  const initiativeOptions = React.useMemo(() => initiatives.items.map(i => ({ id: i.initiativeId, title: i.title })), [initiatives.items]);
  const projectOptions = React.useMemo(() => projects.items.map(p => ({ id: p.projectId, title: p.title })), [projects.items]);

  const now = new Date();
  const counts = {
    overdue: state.items.filter(a => isOverdueAction(a, now)).length,
    today: state.items.filter(a => isActionDueToday(a, now)).length,
    week: state.items.filter(a => isActionDueWithinDays(a, 7, now)).length
  };

  // The due-date tabs narrow the list before the common search and filters are applied.
  const dueItems = React.useMemo(() => {
    const at = new Date();
    switch (dueFilter) {
      case 'overdue': return state.items.filter(a => isOverdueAction(a, at));
      case 'today': return state.items.filter(a => isActionDueToday(a, at));
      case 'week': return state.items.filter(a => isActionDueWithinDays(a, 7, at));
      default: return state.items;
    }
  }, [state.items, dueFilter]);
  const dueState = { ...state, items: dueItems };

  const newItem = React.useCallback((): ActionItem => ({
    actionId: generateBusinessId('ACT'), initiativeId: '', projectId: '', title: '', description: '', status: ActionStatus.OPEN,
    priority: ActionPriority.MEDIUM, ownerUpn: userEmail, dueDate: '', completedDate: '', plannerTaskId: ''
  }), [userEmail]);

  const csvFromRow = React.useCallback((row: Record<string, string>): ActionItem => ({
    actionId: row.ActionId || generateBusinessId('ACT'),
    initiativeId: row.InitiativeId ?? '',
    projectId: row.ProjectId ?? '',
    title: row.Title ?? '',
    description: row.Description ?? '',
    status: csvEnum(row.Status, STATUSES, ActionStatus.OPEN),
    priority: csvEnum(row.Priority, PRIORITIES, ActionPriority.MEDIUM),
    ownerUpn: row.OwnerUPN || userEmail,
    dueDate: csvDate(row.DueDate),
    completedDate: csvDate(row.CompletedDate),
    plannerTaskId: ''
  }), [userEmail]);

  const checkBeforeSave = (form: ActionItem, original: ActionItem | undefined): string | undefined => {
    const base = original ? original.status : ActionStatus.OPEN;
    return getAllowedActionStatuses(base).indexOf(form.status) === -1
      ? t('common.invalidTransition', { from: t(`status.${base}`), to: t(`status.${form.status}`) })
      : undefined;
  };

  const renderForm = ({ form, setForm, errors, original, isEdit, service: svc }: IFormContext<ActionItem>): React.ReactNode => {
    const base = original ? original.status : ActionStatus.OPEN;
    return (
      <>
        <TextField label={t('field.actionId')} value={form.actionId} readOnly={isEdit} onChange={(_, v) => setForm(p => ({ ...p, actionId: v ?? '' }))} />
        <Dropdown label={t('field.status')} selectedKey={form.status} options={toOptions(getAllowedActionStatuses(base), t)}
          onChange={(_, o) => setForm(p => ({ ...p, status: (o?.key as ActionStatus) ?? base }))} />
        <FormRow full><TextField label={t('field.title')} required value={form.title} errorMessage={errors.title && t(errors.title)} onChange={(_, v) => setForm(p => ({ ...p, title: v ?? '' }))} /></FormRow>
        <FormRow full><TextField label={t('field.description')} multiline rows={3} value={form.description} onChange={(_, v) => setForm(p => ({ ...p, description: v ?? '' }))} /></FormRow>
        <LinkField label={t('field.initiative')} value={form.initiativeId} options={initiativeOptions} onChange={id => setForm(p => ({ ...p, initiativeId: id }))} />
        <LinkField label={t('field.project')} value={form.projectId} options={projectOptions} onChange={id => setForm(p => ({ ...p, projectId: id }))} />
        <Dropdown label={t('field.priority')} selectedKey={form.priority} options={toOptions(PRIORITIES, t, 'priority')} onChange={(_, o) => setForm(p => ({ ...p, priority: (o?.key as ActionPriority) ?? ActionPriority.MEDIUM }))} />
        <UserField label={t('field.owner')} required service={svc} value={form.ownerUpn} errorMessage={errors.ownerUpn && t(errors.ownerUpn)} onChange={e => setForm(p => ({ ...p, ownerUpn: e }))} />
        <DateField label={t('field.dueDate')} value={form.dueDate} errorMessage={errors.dueDate && t(errors.dueDate)} onChange={v => setForm(p => ({ ...p, dueDate: v }))} />
        <DateField label={t('field.completedDate')} value={form.completedDate} errorMessage={errors.completedDate && t(errors.completedDate)} onChange={v => setForm(p => ({ ...p, completedDate: v }))} />
      </>
    );
  };

  const pivot = (
    <Pivot
      headersOnly
      selectedKey={dueFilter}
      onLinkClick={item => setDueFilter((item?.props.itemKey as DueFilter) ?? 'all')}
      aria-label={t('actions.dueFilter')}
    >
      <PivotItem itemKey="all" headerText={`${t('actions.all')} (${state.items.length})`} />
      <PivotItem itemKey="overdue" headerText={`${t('actions.overdue')} (${counts.overdue})`} />
      <PivotItem itemKey="today" headerText={`${t('actions.today')} (${counts.today})`} />
      <PivotItem itemKey="week" headerText={`${t('actions.week')} (${counts.week})`} />
    </Pivot>
  );

  return (
    <EntityScreen<ActionItem>
      textKey="actions"
      listName={AppConfig.sharePoint.listNames.actions}
      state={dueState}
      service={service}
      statuses={STATUSES}
      getStatus={a => a.status}
      getTitle={a => a.title}
      columns={columns}
      sortAccessors={sortAccessors}
      searchFields={searchFields}
      newItem={newItem}
      validate={validateAction}
      buildPayload={buildActionPayload}
      prepareForSave={(form, original) => applyActionStatusEffects(form, original ? original.status : undefined)}
      checkBeforeSave={checkBeforeSave}
      renderForm={renderForm}
      quickStatuses={a => getAllowedActionStatuses(a.status)}
      quickPayload={(item, status) => {
        const updated = applyActionStatusEffects({ ...item, status: status as ActionStatus }, item.status);
        return { Status: status, CompletedDate: dayKeyToSharePoint(updated.completedDate) };
      }}
      archiveStatus={ActionStatus.CANCELLED}
      canArchive={a => getAllowedActionStatuses(a.status).indexOf(ActionStatus.CANCELLED) > -1 && a.status !== ActionStatus.CANCELLED}
      csvFileName="actions.csv"
      csvColumns={csvColumns}
      csvFromRow={csvFromRow}
      extraContent={pivot}
    />
  );
};

export default Actions;
