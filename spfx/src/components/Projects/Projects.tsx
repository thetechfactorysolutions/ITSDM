import * as React from 'react';
import { Dropdown, IColumn, Stack, TextField } from '@fluentui/react';
import { AppConfig } from '../../config/AppConfig';
import { csvDate, csvEnum, csvNumber, enumValues } from '../../entities/csvHelpers';
import { buildProjectPayload } from '../../entities/payloads';
import { TranslateFn, useT } from '../../i18n/I18n';
import { Project, ProjectRiskLevel, ProjectStatus } from '../../models';
import { isProjectAtRiskByVariance } from '../../rules/businessRules';
import { countsAgainstBudget, opexAnnualAmount } from '../../rules/finance';
import { riskScore } from '../../rules/governance';
import { generateBusinessId } from '../../rules/ids';
import { getAllowedProjectStatuses } from '../../rules/transitions';
import { validateProject } from '../../rules/validation';
import { formatMoney } from '../../utils/format';
import DateField from '../shared/DateField';
import { DetailFields, RelatedList } from '../shared/DetailSection';
import EntityScreen, { IApprovalConfig, IFormContext } from '../shared/EntityScreen';
import { FormRow } from '../shared/FormGrid';
import { useHubData } from '../shared/HubData';
import LinkField from '../shared/LinkField';
import { toOptions } from '../shared/options';
import UserField from '../shared/UserField';

const STATUSES = enumValues(ProjectStatus);

/** Connects this screen to the approval rules in src/rules/approvals.ts. */
const approvalConfig: IApprovalConfig<Project> = {
  entity: 'projects',
  getBusinessId: item => item.projectId,
  proposeStatus: (item, status) => ({ ...item, status: status as ProjectStatus })
};
const RISKS = enumValues(ProjectRiskLevel);

const makeColumns = (t: TranslateFn): IColumn[] => [
  { key: 'projectId', name: t('field.projectId'), fieldName: 'projectId', minWidth: 130 },
  { key: 'title', name: t('field.title'), fieldName: 'title', minWidth: 180 },
  { key: 'status', name: t('field.status'), fieldName: 'status', minWidth: 110 },
  { key: 'budgetAmount', name: t('field.budget'), minWidth: 90, onRender: (p: Project) => p.budgetAmount.toFixed(2) },
  { key: 'forecastAmount', name: t('field.forecast'), minWidth: 90, onRender: (p: Project) => p.forecastAmount.toFixed(2) },
  { key: 'riskLevel', name: t('field.risk'), minWidth: 90, onRender: (p: Project) => t(`risk.${p.riskLevel}`) },
  { key: 'endDate', name: t('field.endDate'), fieldName: 'endDate', minWidth: 100 }
];
const sortAccessors = {
  projectId: (p: Project) => p.projectId,
  title: (p: Project) => p.title,
  status: (p: Project) => p.status,
  budgetAmount: (p: Project) => p.budgetAmount,
  forecastAmount: (p: Project) => p.forecastAmount,
  riskLevel: (p: Project) => RISKS.indexOf(p.riskLevel),
  endDate: (p: Project) => p.endDate
};
const searchFields = [(p: Project) => p.title, (p: Project) => p.description, (p: Project) => p.projectId, (p: Project) => p.ownerUpn];

const csvColumns = [
  { header: 'Title', value: (p: Project) => p.title },
  { header: 'ProjectId', value: (p: Project) => p.projectId },
  { header: 'InitiativeId', value: (p: Project) => p.initiativeId },
  { header: 'Description', value: (p: Project) => p.description },
  { header: 'Status', value: (p: Project) => p.status },
  { header: 'OwnerUPN', value: (p: Project) => p.ownerUpn },
  { header: 'StartDate', value: (p: Project) => p.startDate },
  { header: 'EndDate', value: (p: Project) => p.endDate },
  { header: 'BudgetAmount', value: (p: Project) => p.budgetAmount },
  { header: 'ForecastAmount', value: (p: Project) => p.forecastAmount },
  { header: 'RiskLevel', value: (p: Project) => p.riskLevel }
];

const Projects: React.FC = () => {
  const t = useT();
  const { service, userEmail, projects: state, initiatives, actions, notes, risks, decisions, lessons, reviews, capex, opex } = useHubData();
  const columns = React.useMemo(() => makeColumns(t), [t]);

  const initiativeOptions = React.useMemo(() => initiatives.items.map(i => ({ id: i.initiativeId, title: i.title })), [initiatives.items]);

  const newItem = React.useCallback((): Project => ({
    projectId: generateBusinessId('PROJ'), initiativeId: '', title: '', description: '', status: ProjectStatus.PLANNING, ownerUpn: userEmail,
    startDate: '', endDate: '', budgetAmount: 0, forecastAmount: 0, riskLevel: ProjectRiskLevel.LOW, plannerPlanId: ''
  }), [userEmail]);

  const csvFromRow = React.useCallback((row: Record<string, string>): Project => ({
    projectId: row.ProjectId || generateBusinessId('PROJ'),
    initiativeId: row.InitiativeId ?? '',
    title: row.Title ?? '',
    description: row.Description ?? '',
    status: csvEnum(row.Status, STATUSES, ProjectStatus.PLANNING),
    ownerUpn: row.OwnerUPN || userEmail,
    startDate: csvDate(row.StartDate),
    endDate: csvDate(row.EndDate),
    budgetAmount: csvNumber(row.BudgetAmount),
    forecastAmount: csvNumber(row.ForecastAmount),
    riskLevel: csvEnum(row.RiskLevel, RISKS, ProjectRiskLevel.LOW),
    plannerPlanId: ''
  }), [userEmail]);

  const checkBeforeSave = (form: Project, original: Project | undefined): string | undefined => {
    const base = original ? original.status : ProjectStatus.PLANNING;
    return getAllowedProjectStatuses(base).indexOf(form.status) === -1
      ? t('common.invalidTransition', { from: t(`status.${base}`), to: t(`status.${form.status}`) })
      : undefined;
  };

  const renderForm = ({ form, setForm, errors, original, isEdit, service: svc }: IFormContext<Project>): React.ReactNode => {
    const base = original ? original.status : ProjectStatus.PLANNING;
    return (
      <>
        <TextField label={t('field.projectId')} value={form.projectId} readOnly={isEdit} onChange={(_, v) => setForm(p => ({ ...p, projectId: v ?? '' }))} />
        <Dropdown label={t('field.status')} selectedKey={form.status} options={toOptions(getAllowedProjectStatuses(base), t)}
          onChange={(_, o) => setForm(p => ({ ...p, status: (o?.key as ProjectStatus) ?? base }))} />
        <FormRow full><TextField label={t('field.title')} required value={form.title} errorMessage={errors.title && t(errors.title)} onChange={(_, v) => setForm(p => ({ ...p, title: v ?? '' }))} /></FormRow>
        <FormRow full><TextField label={t('field.description')} multiline rows={4} value={form.description} onChange={(_, v) => setForm(p => ({ ...p, description: v ?? '' }))} /></FormRow>
        <LinkField label={t('field.initiative')} value={form.initiativeId} options={initiativeOptions} onChange={id => setForm(p => ({ ...p, initiativeId: id }))} />
        <UserField label={t('field.owner')} required service={svc} value={form.ownerUpn} errorMessage={errors.ownerUpn && t(errors.ownerUpn)} onChange={e => setForm(p => ({ ...p, ownerUpn: e }))} />
        <DateField label={t('field.startDate')} value={form.startDate} errorMessage={errors.startDate && t(errors.startDate)} onChange={v => setForm(p => ({ ...p, startDate: v }))} />
        <DateField label={t('field.endDate')} value={form.endDate} errorMessage={errors.endDate && t(errors.endDate)} onChange={v => setForm(p => ({ ...p, endDate: v }))} />
        <TextField label={t('field.budget')} type="number" min={0} value={String(form.budgetAmount)} errorMessage={errors.budgetAmount && t(errors.budgetAmount)} onChange={(_, v) => setForm(p => ({ ...p, budgetAmount: Number(v ?? 0) }))} />
        <TextField label={t('field.forecast')} type="number" min={0} value={String(form.forecastAmount)} errorMessage={errors.forecastAmount && t(errors.forecastAmount)} onChange={(_, v) => setForm(p => ({ ...p, forecastAmount: Number(v ?? 0) }))} />
        <Dropdown label={t('field.risk')} selectedKey={form.riskLevel} options={toOptions(RISKS, t, 'risk')} onChange={(_, o) => setForm(p => ({ ...p, riskLevel: (o?.key as ProjectRiskLevel) ?? ProjectRiskLevel.LOW }))} />
      </>
    );
  };

  const renderDetail = (project: Project): React.ReactNode => {
    const myActions = actions.items.filter(a => a.projectId === project.projectId);
    const myNotes = notes.items.filter(n => n.projectId === project.projectId);
    const myRisks = risks.items.filter(r => r.projectId === project.projectId);
    const myDecisions = decisions.items.filter(d => d.projectId === project.projectId);
    const myLessons = lessons.items.filter(l => l.projectId === project.projectId);
    const myReviews = reviews.items.filter(r => r.projectId === project.projectId);
    const myCapex = capex.items.filter(c => c.projectId === project.projectId);
    const myOpex = opex.items.filter(o => o.projectId === project.projectId);
    const spend = myCapex.filter(c => countsAgainstBudget(c.status)).reduce((sum, c) => sum + c.amount, 0)
      + myOpex.filter(o => countsAgainstBudget(o.status)).reduce((sum, o) => sum + opexAnnualAmount(o), 0);
    const initiative = initiatives.items.filter(i => i.initiativeId === project.initiativeId)[0];
    const variance = project.budgetAmount > 0 ? Math.round(((project.forecastAmount - project.budgetAmount) / project.budgetAmount) * 100) : 0;

    return (
      <Stack tokens={{ childrenGap: 16 }}>
        <DetailFields rows={[
          { label: t('field.projectId'), value: project.projectId },
          { label: t('field.status'), value: t(`status.${project.status}`) },
          { label: t('field.description'), value: project.description },
          { label: t('field.initiative'), value: initiative ? `${initiative.title} (${initiative.initiativeId})` : project.initiativeId },
          { label: t('field.owner'), value: project.ownerUpn },
          { label: t('field.startDate'), value: project.startDate },
          { label: t('field.endDate'), value: project.endDate },
          { label: t('field.budget'), value: project.budgetAmount.toFixed(2) },
          { label: t('field.forecast'), value: `${project.forecastAmount.toFixed(2)} (${variance > 0 ? '+' : ''}${variance}%)` },
          { label: t('field.risk'), value: t(`risk.${project.riskLevel}`) },
          { label: t('project.spend'), value: formatMoney(spend) },
          { label: t('projects.atRisk'), value: isProjectAtRiskByVariance(project) ? t('common.yes') : t('common.no') },
          { label: t('common.modifiedBy'), value: `${(project.modified ?? '').slice(0, 10)} ${project.editor ?? ''}`.trim() }
        ]} />
        <RelatedList title={t('nav.actions')} items={myActions.map(a => ({ key: a.actionId, title: a.title, meta: t(`status.${a.status}`) }))} />
        <RelatedList title={t('nav.notes')} items={myNotes.map(n => ({ key: n.noteId, title: n.title, meta: t(`category.${n.category}`) }))} />
        <RelatedList title={t('nav.risks')} items={myRisks.map(r => ({ key: r.riskId, title: r.title, meta: `${t(`status.${r.status}`)} · ${riskScore(r.probability, r.impact)}` }))} />
        <RelatedList title={t('nav.decisions')} items={myDecisions.map(d => ({ key: d.decisionId, title: d.title, meta: t(`status.${d.status}`) }))} />
        <RelatedList title={t('nav.lessons')} items={myLessons.map(l => ({ key: l.lessonId, title: l.title, meta: t(`lessonCategory.${l.category}`) }))} />
        <RelatedList title={t('nav.reviews')} items={myReviews.map(r => ({ key: r.reviewId, title: r.title, meta: t(`status.${r.status}`) }))} />
        <RelatedList title={t('nav.capex')} items={myCapex.map(c => ({ key: c.capexId, title: c.title, meta: `${formatMoney(c.amount)} · ${t(`status.${c.status}`)}` }))} />
        <RelatedList title={t('nav.opex')} items={myOpex.map(o => ({ key: o.opexId, title: o.title, meta: `${formatMoney(opexAnnualAmount(o))} / ${t('budget.perYear')} · ${t(`status.${o.status}`)}` }))} />
      </Stack>
    );
  };

  return (
    <EntityScreen<Project>
      textKey="projects"
      listName={AppConfig.sharePoint.listNames.projects}
      state={state}
      service={service}
      statuses={STATUSES}
      getStatus={p => p.status}
      getTitle={p => p.title}
      columns={columns}
      sortAccessors={sortAccessors}
      searchFields={searchFields}
      newItem={newItem}
      validate={validateProject}
      buildPayload={buildProjectPayload}
      checkBeforeSave={checkBeforeSave}
      renderForm={renderForm}
      approval={approvalConfig}
      renderDetail={renderDetail}
      quickStatuses={p => getAllowedProjectStatuses(p.status)}
      archiveStatus={ProjectStatus.CANCELLED}
      canArchive={p => getAllowedProjectStatuses(p.status).indexOf(ProjectStatus.CANCELLED) > -1 && p.status !== ProjectStatus.CANCELLED}
      csvFileName="projects.csv"
      csvColumns={csvColumns}
      csvFromRow={csvFromRow}
    />
  );
};

export default Projects;
