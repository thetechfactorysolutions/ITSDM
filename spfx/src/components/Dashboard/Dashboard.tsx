import * as React from 'react';
import { DefaultButton, DetailsList, IColumn, IconButton, MessageBar, MessageBarType, SelectionMode, Stack, Text, getTheme } from '@fluentui/react';
import { useT } from '../../i18n/I18n';
import { buildApprovalPayload } from '../../entities/payloads';
import { ActionItem, ActionStatus, ApprovalStatus, IApprovalState, IdeaStatus, Initiative, InitiativeStatus, ProjectStatus } from '../../models';
import { budgetFigures, contractAlert, isLiveBudget, needsContractAttention } from '../../rules/finance';
import { isHighActiveRisk } from '../../rules/governance';
import { isActiveKpi, isFollowUpOverdue, isIncidentOpen, isIncidentOverdue, kpiHealth } from '../../rules/operations';
import { ApprovalEntity, decideApproval, findRule, getApproval, isPending } from '../../rules/approvals';
import { isActionDueToday, isActionDueWithinDays, isOverdueAction, isProjectAtRiskByVariance } from '../../rules/businessRules';
import { dayKeyToSharePoint, toDayKey } from '../../rules/dates';
import ApprovalDecisionDialog from '../shared/ApprovalDecisionDialog';
import BarChart from '../shared/Charts';
import { useHubData } from '../shared/HubData';
import KpiTile from '../shared/KpiTile';

interface IPendingApproval {
  key: string;
  entity: ApprovalEntity;
  id: number | undefined;
  title: string;
  approval: IApprovalState;
  update: (id: number, payload: Record<string, unknown>) => Promise<void>;
}

const Dashboard: React.FC = () => {
  const t = useT();
  const theme = getTheme();
  const { userEmail, ideas: ideasState, initiatives: initiativesState, projects: projectsState, actions: actionsState, risks: risksState,
    budgets: budgetsState, capex: capexState, opex: opexState, contracts: contractsState,
    incidents: incidentsState, changes: changesState, interactions: interactionsState, kpis: kpisState } = useHubData();
  const [actionError, setActionError] = React.useState<string | undefined>();
  const [deciding, setDeciding] = React.useState<{ row: IPendingApproval; decision: ApprovalStatus.APPROVED | ApprovalStatus.REJECTED } | undefined>();

  const now = new Date();

  const openActions = actionsState.items.filter(item => item.status !== ActionStatus.DONE && item.status !== ActionStatus.CANCELLED);
  const overdueActions = openActions.filter(item => isOverdueAction(item, now));
  const myActions = openActions.filter(item => item.ownerUpn.toLowerCase() === userEmail.toLowerCase());
  const myOverdue = myActions.filter(item => isOverdueAction(item, now));
  const myToday = myActions.filter(item => isActionDueToday(item, now));
  const myWeek = myActions.filter(item => isActionDueWithinDays(item, 7, now) && !isActionDueToday(item, now));
  const myWork = myOverdue.concat(myToday, myWeek);
  const projectsAtRisk = projectsState.items.filter(item => isProjectAtRiskByVariance(item));
  const activeIdeas = ideasState.items.filter(item => item.status !== IdeaStatus.COMPLETED && item.status !== IdeaStatus.REJECTED && item.status !== IdeaStatus.CANCELLED).length;
  const activeInitiatives = initiativesState.items.filter(item => item.status === InitiativeStatus.ACTIVE || item.status === InitiativeStatus.BLOCKED || item.status === InitiativeStatus.ON_HOLD).length;
  const activeProjectsList = projectsState.items.filter(item => item.status !== ProjectStatus.COMPLETED && item.status !== ProjectStatus.CANCELLED);
  const pendingApprovals: IPendingApproval[] = ([] as IPendingApproval[]).concat(
    ideasState.items.filter(isPending).map(i => ({ key: `ideas-${i.id}`, entity: 'ideas' as ApprovalEntity, id: i.id, title: i.title, approval: getApproval(i), update: ideasState.update })),
    initiativesState.items.filter(isPending).map(i => ({ key: `initiatives-${i.id}`, entity: 'initiatives' as ApprovalEntity, id: i.id, title: i.title, approval: getApproval(i), update: initiativesState.update })),
    projectsState.items.filter(isPending).map(p => ({ key: `projects-${p.id}`, entity: 'projects' as ApprovalEntity, id: p.id, title: p.title, approval: getApproval(p), update: projectsState.update })),
    actionsState.items.filter(isPending).map(a => ({ key: `actions-${a.id}`, entity: 'actions' as ApprovalEntity, id: a.id, title: a.title, approval: getApproval(a), update: actionsState.update })),
    capexState.items.filter(isPending).map(c => ({ key: `capex-${c.id}`, entity: 'capex' as ApprovalEntity, id: c.id, title: c.title, approval: getApproval(c), update: capexState.update })),
    opexState.items.filter(isPending).map(o => ({ key: `opex-${o.id}`, entity: 'opex' as ApprovalEntity, id: o.id, title: o.title, approval: getApproval(o), update: opexState.update })),
    contractsState.items.filter(isPending).map(c => ({ key: `contracts-${c.id}`, entity: 'contracts' as ApprovalEntity, id: c.id, title: c.title, approval: getApproval(c), update: contractsState.update })),
    changesState.items.filter(isPending).map(c => ({ key: `changes-${c.id}`, entity: 'changes' as ApprovalEntity, id: c.id, title: c.title, approval: getApproval(c), update: changesState.update }))
  );
  const highRisks = risksState.items.filter(isHighActiveRisk);
  const openIncidents = incidentsState.items.filter(i => isIncidentOpen(i.status));
  const overdueIncidents = openIncidents.filter(i => isIncidentOverdue(i, now));
  const offTargetKpis = kpisState.items.filter(k => isActiveKpi(k) && kpiHealth(k) === 'OFF_TARGET');
  const followUpsDue = interactionsState.items.filter(i => isFollowUpOverdue(i, now));
  const contractsToAttend = contractsState.items.filter(c => needsContractAttention(c, now));
  const lapsedContracts = contractsToAttend.filter(c => contractAlert(c, now).alert === 'LAPSED');
  const liveBudgets = budgetsState.items.filter(isLiveBudget).map(b => ({ budget: b, figures: budgetFigures(b, capexState.items, opexState.items) }));
  const overBudgets = liveBudgets.filter(x => x.figures.level === 'OVER');
  const nearBudgets = liveBudgets.filter(x => x.figures.level === 'NEAR');
  const openInitiatives = initiativesState.items.filter(item => item.status !== InitiativeStatus.COMPLETED && item.status !== InitiativeStatus.CANCELLED);

  const initiativeColumns: IColumn[] = [
    { key: 'title', name: t('field.initiative'), fieldName: 'title', minWidth: 180, isResizable: true },
    { key: 'status', name: t('field.status'), minWidth: 100, onRender: (i: Initiative) => t(`status.${i.status}`) },
    { key: 'progressPct', name: t('field.progress'), minWidth: 80, onRender: (i: Initiative) => `${i.progressPct}%` },
    { key: 'ownerUpn', name: t('field.owner'), fieldName: 'ownerUpn', minWidth: 160, isResizable: true },
    { key: 'targetDate', name: t('field.targetDate'), fieldName: 'targetDate', minWidth: 100 }
  ];

  const markDone = (action: ActionItem): void => {
    if (!action.id) {
      return;
    }
    setActionError(undefined);
    actionsState
      .update(action.id, { Status: ActionStatus.DONE, CompletedDate: dayKeyToSharePoint(toDayKey(new Date())) })
      .catch(err => setActionError(err instanceof Error ? err.message : t('common.unknownError')));
  };

  const decide = (comment: string): void => {
    const current = deciding;
    setDeciding(undefined);
    if (!current || current.row.id === undefined) {
      return;
    }
    setActionError(undefined);
    const next = decideApproval(current.row.approval, current.decision, userEmail, comment);
    current.row.update(current.row.id, buildApprovalPayload(next))
      .catch(err => setActionError(err instanceof Error ? err.message : t('common.unknownError')));
  };

  const myWorkColumns: IColumn[] = [
    { key: 'title', name: t('field.title'), fieldName: 'title', minWidth: 180, isResizable: true },
    {
      key: 'due', name: t('field.dueDate'), minWidth: 130,
      onRender: (a: ActionItem) => {
        const label = isOverdueAction(a, now) ? t('actions.overdue') : isActionDueToday(a, now) ? t('actions.today') : t('actions.week');
        return <span>{a.dueDate} · <strong>{label}</strong></span>;
      }
    },
    { key: 'priority', name: t('field.priority'), minWidth: 80, onRender: (a: ActionItem) => t(`priority.${a.priority}`) },
    {
      key: 'done', name: '', minWidth: 40, maxWidth: 40,
      onRender: (a: ActionItem) => <IconButton iconProps={{ iconName: 'CheckMark' }} title={t('dashboard.markDone')} ariaLabel={`${t('dashboard.markDone')}: ${a.title}`} onClick={() => markDone(a)} />
    }
  ];

  // ----- charts -----
  const statusColors: Record<string, string> = {
    OPEN: theme.palette.themePrimary, IN_PROGRESS: theme.palette.themeSecondary, BLOCKED: theme.palette.redDark, DONE: theme.palette.green, CANCELLED: theme.palette.neutralTertiary
  };
  const actionStatusRows = [ActionStatus.OPEN, ActionStatus.IN_PROGRESS, ActionStatus.BLOCKED, ActionStatus.DONE, ActionStatus.CANCELLED].map(status => ({
    label: t(`status.${status}`),
    bars: [{ name: t('nav.actions'), value: actionsState.items.filter(a => a.status === status).length, color: statusColors[status] }]
  }));
  const budgetRows = activeProjectsList.slice(0, 8).map(project => ({
    label: project.title,
    bars: [
      { name: t('field.budget'), value: project.budgetAmount, color: theme.palette.neutralTertiary },
      { name: t('field.forecast'), value: project.forecastAmount, color: isProjectAtRiskByVariance(project) ? theme.palette.redDark : theme.palette.themePrimary }
    ]
  }));

  const spendRows = liveBudgets.slice(0, 8).map(x => ({
    label: x.budget.title,
    bars: [
      { name: t('field.plannedAmount'), value: x.budget.plannedAmount, color: theme.palette.neutralTertiary },
      { name: t('budget.committed'), value: x.figures.committed, color: x.figures.level === 'OVER' ? theme.palette.redDark : x.figures.level === 'NEAR' ? theme.palette.orange : theme.palette.themePrimary }
    ]
  }));

  const attention: string[] = [];
  if (overdueActions.length > 0) {
    attention.push(t('dashboard.attentionOverdue', { count: overdueActions.length }));
  }
  if (projectsAtRisk.length > 0) {
    attention.push(t('dashboard.attentionRisk', { count: projectsAtRisk.length }));
  }
  if (highRisks.length > 0) {
    attention.push(t('dashboard.attentionHighRisks', { count: highRisks.length }));
  }
  if (overdueIncidents.length > 0) {
    attention.push(t('dashboard.attentionIncidents', { count: overdueIncidents.length }));
  }
  if (offTargetKpis.length > 0) {
    attention.push(t('dashboard.attentionKpis', { count: offTargetKpis.length }));
  }
  if (followUpsDue.length > 0) {
    attention.push(t('dashboard.attentionFollowUps', { count: followUpsDue.length }));
  }
  if (contractsToAttend.length > 0) {
    attention.push(t('dashboard.attentionContracts', { count: contractsToAttend.length }));
  }
  if (overBudgets.length > 0) {
    attention.push(t('dashboard.attentionBudgetsOver', { count: overBudgets.length }));
  }
  if (nearBudgets.length > 0) {
    attention.push(t('dashboard.attentionBudgetsNear', { count: nearBudgets.length }));
  }

  const hasLoading = ideasState.loading || initiativesState.loading || projectsState.loading || actionsState.loading || risksState.loading || budgetsState.loading || contractsState.loading || incidentsState.loading || kpisState.loading;
  const errors = [ideasState.error, initiativesState.error, projectsState.error, actionsState.error, risksState.error, budgetsState.error, contractsState.error, incidentsState.error, kpisState.error, actionError].filter(Boolean);

  return (
    <Stack tokens={{ childrenGap: 20 }}>
      <Text variant="xLarge" as="h2">{t('dashboard.title')}</Text>

      <div aria-live="polite">
        {errors.map((error, index) => <MessageBar key={index} messageBarType={MessageBarType.error}>{error}</MessageBar>)}
        {hasLoading && <MessageBar messageBarType={MessageBarType.info}>{t('common.loading')}</MessageBar>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        <KpiTile label={t('dashboard.activeIdeas')} value={activeIdeas} tone="info" />
        <KpiTile label={t('dashboard.activeInitiatives')} value={activeInitiatives} tone="info" />
        <KpiTile label={t('dashboard.activeProjects')} value={activeProjectsList.length} tone="info" />
        <KpiTile label={t('dashboard.openActions')} value={openActions.length} tone="good" />
        <KpiTile label={t('dashboard.overdueActions')} value={overdueActions.length} tone={overdueActions.length > 0 ? 'warning' : 'good'} />
        <KpiTile label={t('dashboard.pendingApprovals')} value={pendingApprovals.length} tone={pendingApprovals.length > 0 ? 'warning' : 'good'} />
        <KpiTile label={t('dashboard.openIncidents')} value={openIncidents.length} tone={openIncidents.length > 0 ? 'warning' : 'good'} />
        <KpiTile label={t('dashboard.incidentsOverdue')} value={overdueIncidents.length} tone={overdueIncidents.length > 0 ? 'danger' : 'good'} />
        <KpiTile label={t('dashboard.kpisOff')} value={offTargetKpis.length} tone={offTargetKpis.length > 0 ? 'danger' : 'good'} />
        <KpiTile label={t('dashboard.followUpsDue')} value={followUpsDue.length} tone={followUpsDue.length > 0 ? 'warning' : 'good'} />
        <KpiTile label={t('dashboard.contractsToRenew')} value={contractsToAttend.length} tone={lapsedContracts.length > 0 ? 'danger' : contractsToAttend.length > 0 ? 'warning' : 'good'} />
        <KpiTile label={t('dashboard.budgetsOver')} value={overBudgets.length} tone={overBudgets.length > 0 ? 'danger' : nearBudgets.length > 0 ? 'warning' : 'good'} />
        <KpiTile label={t('dashboard.highRisks')} value={highRisks.length} tone={highRisks.length > 0 ? 'danger' : 'good'} />
        <KpiTile label={t('dashboard.projectsAtRisk')} value={projectsAtRisk.length} tone={projectsAtRisk.length > 0 ? 'danger' : 'good'} />
      </div>

      <Stack>
        <Text variant="large" as="h3">{t('dashboard.attention')}</Text>
        {attention.length === 0 ? <Text>{t('dashboard.attentionNone')}</Text> : attention.map((m, i) => <Text key={i}>• {m}</Text>)}
      </Stack>

      <Stack tokens={{ childrenGap: 6 }}>
        <Text variant="large" as="h3">{t('dashboard.approvalsTitle')}</Text>
        {pendingApprovals.length === 0 && !hasLoading && <Text>{t('dashboard.approvalsNone')}</Text>}
        {pendingApprovals.map(row => {
          const rule = findRule(row.approval.ruleId);
          return (
            <Stack key={row.key} horizontal wrap verticalAlign="center" tokens={{ childrenGap: 12 }} styles={{ root: { borderLeft: `4px solid ${theme.palette.orange}`, paddingLeft: 10 } }}>
              <Stack.Item grow styles={{ root: { minWidth: 220 } }}>
                <Text block><strong>{t(`approval.entity.${row.entity}`)}</strong>: {row.title}</Text>
                <Text block variant="small">{rule ? t(rule.titleKey) : row.approval.ruleId} · {t('dashboard.approvalsWaiting', { date: row.approval.requestedOn, approver: row.approval.approver })}</Text>
              </Stack.Item>
              <Stack horizontal tokens={{ childrenGap: 8 }}>
                <DefaultButton text={t('approval.approve')} iconProps={{ iconName: 'CheckMark' }} ariaLabel={`${t('approval.approve')}: ${row.title}`} onClick={() => setDeciding({ row, decision: ApprovalStatus.APPROVED })} />
                <DefaultButton text={t('approval.reject')} iconProps={{ iconName: 'Cancel' }} ariaLabel={`${t('approval.reject')}: ${row.title}`} onClick={() => setDeciding({ row, decision: ApprovalStatus.REJECTED })} />
              </Stack>
            </Stack>
          );
        })}
      </Stack>

      <Stack tokens={{ childrenGap: 4 }}>
        <Text variant="large" as="h3">{t('dashboard.myWork')}</Text>
        <Text>{t('dashboard.myWorkSummary', { overdue: myOverdue.length, today: myToday.length, week: myWeek.length })}</Text>
        {myWork.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <DetailsList items={myWork} columns={myWorkColumns} selectionMode={SelectionMode.none} getKey={a => String((a as ActionItem).id)} ariaLabelForGrid={t('dashboard.myWork')} />
          </div>
        )}
        {myWork.length === 0 && !hasLoading && <Text>{t('dashboard.myWorkNone')}</Text>}
      </Stack>

      <Stack horizontal wrap tokens={{ childrenGap: 24 }}>
        <BarChart title={t('dashboard.chartActions')} rows={actionStatusRows} />
        <BarChart title={t('dashboard.chartBudget')} rows={budgetRows} formatValue={v => v.toLocaleString()} />
        <BarChart title={t('dashboard.chartSpend')} rows={spendRows} formatValue={v => v.toLocaleString()} />
      </Stack>

      <Stack>
        <Text variant="large" as="h3">{t('dashboard.activeInitiativesList')}</Text>
        {openInitiatives.length === 0 && !hasLoading ? (
          <Text>{t('dashboard.noInitiatives')}</Text>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <DetailsList items={openInitiatives} columns={initiativeColumns} selectionMode={SelectionMode.none} ariaLabelForGrid={t('dashboard.activeInitiativesList')} />
          </div>
        )}
      </Stack>

      <ApprovalDecisionDialog decision={deciding ? deciding.decision : undefined} title={deciding ? deciding.row.title : ''} onConfirm={decide} onCancel={() => setDeciding(undefined)} />
    </Stack>
  );
};

export default Dashboard;
