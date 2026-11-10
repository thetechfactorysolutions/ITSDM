import * as React from 'react';
import { DefaultButton, DetailsList, IColumn, IconButton, MessageBar, MessageBarType, SelectionMode, Stack, Text, getTheme } from '@fluentui/react';
import { useLanguage, useT } from '../../i18n/I18n';
import { buildApprovalPayload } from '../../entities/payloads';
import { ActionItem, ActionStatus, ApprovalStatus, GeniusStatus, IApprovalState, IdeaStatus, Initiative, InitiativeStatus, ProjectStatus } from '../../models';
import { budgetFigures, contractAlert, isLiveBudget, needsContractAttention } from '../../rules/finance';
import { entitlementAlert, isInbox, isInboxStale, isMatterOpen, isMatterOverdue, needsEntitlementAttention } from '../../rules/matters';
import { AppConfig } from '../../config/AppConfig';
import { isSessionLate } from '../../rules/genius';
import { isCaseToDecide, isObjectiveLate, isWeeklyReviewMissing, lastWeekStart } from '../../rules/strategy';
import { isOrderLate, stockLevel } from '../../rules/stock';
import { isCallOverdue, isCallPending, latestByCountry, npsBreakdown, responsesInLastDays, slaLevel } from '../../rules/service';
import { isHighActiveRisk } from '../../rules/governance';
import { certificationAlert, hasSkillGap, isReviewDue, isTrainingOverdue, needsCertificationAttention } from '../../rules/people';
import { isActiveKpi, isFollowUpOverdue, isIncidentOpen, isIncidentOverdue, kpiHealth } from '../../rules/operations';
import { ApprovalEntity, decideApproval, findRule, getApproval, isPending } from '../../rules/approvals';
import { isActionDueToday, isActionDueWithinDays, isOverdueAction, isProjectAtRiskByVariance } from '../../rules/businessRules';
import { dayKeyToSharePoint, toDayKey } from '../../rules/dates';
import ApprovalDecisionDialog from '../shared/ApprovalDecisionDialog';
import BarChart from '../shared/Charts';
import { useHubData } from '../shared/HubData';
import { AttentionRow, Card, Hero, Section, StatCard, Tone } from '../shared/ui';
import QuickLinks from '../Links/QuickLinks';
import { usePurchaseRole } from '../Purchases/usePurchaseRole';
import { awaitingDelivery, isApprover as isPurchaseApprover, posToWatch, requestsToApprove, visiblePurchases } from '../../rules/purchases';
import { PurchaseRoleType } from '../../models';

interface IAttention {
  tone: Tone;
  tab: string;
  text: string;
}

/** "ana.lopez@x.com" -> "Ana". Empty when there is no usable name. */
const displayName = (email: string): string => {
  const first = (email.split('@')[0] || '').split(/[._-]/)[0] || '';
  return first ? first.charAt(0).toUpperCase() + first.slice(1).toLowerCase() : '';
};

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
  const language = useLanguage();
  const theme = getTheme();
  const { userEmail, ideas: ideasState, initiatives: initiativesState, projects: projectsState, actions: actionsState, risks: risksState,
    budgets: budgetsState, capex: capexState, opex: opexState, contracts: contractsState,
    incidents: incidentsState, changes: changesState, interactions: interactionsState, kpis: kpisState, skills: skillsState, trainings: trainingsState, articles: articlesState,
    matters: mattersState, entitlements: entitlementsState, links: linksState, nps: npsState, serviceMonths: monthsState, stock: stockState, genius: geniusState, businessCases: casesState, objectives: objectivesState, weeklyReviews: weeklyState, purchases: purchasesState, purchaseOrders: posState } = useHubData();
  const purchaseRole = usePurchaseRole();
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
    changesState.items.filter(isPending).map(c => ({ key: `changes-${c.id}`, entity: 'changes' as ApprovalEntity, id: c.id, title: c.title, approval: getApproval(c), update: changesState.update })),
    articlesState.items.filter(isPending).map(a => ({ key: `articles-${a.id}`, entity: 'articles' as ApprovalEntity, id: a.id, title: a.title, approval: getApproval(a), update: articlesState.update })),
    casesState.items.filter(isPending).map(c => ({ key: `cases-${c.id}`, entity: 'cases' as ApprovalEntity, id: c.id, title: c.title, approval: getApproval(c), update: casesState.update }))
  );
  const highRisks = risksState.items.filter(isHighActiveRisk);
  const openIncidents = incidentsState.items.filter(i => isIncidentOpen(i.status));
  const overdueIncidents = openIncidents.filter(i => isIncidentOverdue(i, now));
  const offTargetKpis = kpisState.items.filter(k => isActiveKpi(k) && kpiHealth(k) === 'OFF_TARGET');
  const followUpsDue = interactionsState.items.filter(i => isFollowUpOverdue(i, now));
  const skillGaps = skillsState.items.filter(hasSkillGap);
  const certsToAttend = skillsState.items.filter(sk => needsCertificationAttention(sk, now));
  const certsExpired = certsToAttend.filter(sk => certificationAlert(sk, now).alert === 'EXPIRED');
  const trainingsOverdue = trainingsState.items.filter(x => isTrainingOverdue(x, now));
  const articlesToReview = articlesState.items.filter(a => isReviewDue(a, now));
  const contractsToAttend = contractsState.items.filter(c => needsContractAttention(c, now));
  const lapsedContracts = contractsToAttend.filter(c => contractAlert(c, now).alert === 'LAPSED');
  const liveBudgets = budgetsState.items.filter(isLiveBudget).map(b => ({ budget: b, figures: budgetFigures(b, capexState.items, opexState.items) }));
  const overBudgets = liveBudgets.filter(x => x.figures.level === 'OVER');
  const nearBudgets = liveBudgets.filter(x => x.figures.level === 'NEAR');
  const openInitiatives = initiativesState.items.filter(item => item.status !== InitiativeStatus.COMPLETED && item.status !== InitiativeStatus.CANCELLED);
  const inboxItems = mattersState.items.filter(isInbox);
  const staleInbox = inboxItems.filter(m => isInboxStale(m, now));
  const openMatters = mattersState.items.filter(isMatterOpen);
  const overdueMatters = mattersState.items.filter(m => isMatterOverdue(m, now));
  const entitlementsToAttend = entitlementsState.items.filter(e => needsEntitlementAttention(e, now));
  const lapsedEntitlements = entitlementsToAttend.filter(e => entitlementAlert(e, now).alert === 'LAPSED');
  const pinnedLinks = linksState.items.filter(l => l.pinned);
  const casesToDecide = casesState.items.filter(isCaseToDecide);
  const lateObjectives = objectivesState.items.filter(o => isObjectiveLate(o, now));
  const weeklyMissing = isWeeklyReviewMissing(weeklyState.items, now);
  const lowStock = stockState.items.filter(i => stockLevel(i) === 'LOW');
  const lateOrders = stockState.items.filter(i => isOrderLate(i, now));
  const lateSessions = geniusState.items.filter(g => isSessionLate(g, now));
  const plannedSessions = geniusState.items.filter(g => g.status === GeniusStatus.PLANNED && !isSessionLate(g, now));
  const recentNps = npsBreakdown(responsesInLastDays(npsState.items, 90, now));
  const callsPending = npsState.items.filter(isCallPending);
  const callsOverdue = npsState.items.filter(r => isCallOverdue(r, now));
  const latestMonths = latestByCountry(monthsState.items);
  const lowSlaCountries = Object.keys(latestMonths).filter(key => { const m = latestMonths[key as keyof typeof latestMonths]; return !!m && slaLevel(m) === 'LOW'; });

  const myPurchases = visiblePurchases(purchasesState.items, userEmail, purchaseRole);
  const purchasesToApprove = isPurchaseApprover(purchaseRole) ? requestsToApprove(purchasesState.items) : [];
  const purchasesToReceive = awaitingDelivery(myPurchases);
  const posNearLimit = purchaseRole === PurchaseRoleType.REQUESTER ? [] : posToWatch(posState.items, purchasesState.items);

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

  const attention: IAttention[] = [];
  const flag = (when: boolean, tone: Tone, tab: string, text: string): void => {
    if (when) {
      attention.push({ tone, tab, text });
    }
  };
  flag(lateObjectives.length > 0, 'warning', 'strategy', t('dashboard.attentionObjectives', { count: lateObjectives.length }));
  flag(weeklyMissing, 'info', 'weekly', t('dashboard.attentionWeekly', { week: lastWeekStart(now) }));
  flag(lowStock.length > 0, 'danger', 'devices', t('dashboard.attentionStock', { count: lowStock.length }));
  flag(lateOrders.length > 0, 'warning', 'devices', t('dashboard.attentionOrders', { count: lateOrders.length }));
  flag(lateSessions.length > 0, 'warning', 'genius', t('dashboard.attentionGenius', { count: lateSessions.length }));
  flag(callsOverdue.length > 0, 'danger', 'operations', t('dashboard.attentionCalls', { count: callsOverdue.length, days: AppConfig.service.npsFollowUpDays }));
  flag(lowSlaCountries.length > 0, 'danger', 'operations', t('dashboard.attentionSla', { count: lowSlaCountries.length, target: AppConfig.service.slaTarget }));
  flag(inboxItems.length > 0, 'warning', 'matters', t('dashboard.attentionInbox', { count: inboxItems.length }));
  flag(staleInbox.length > 0, 'danger', 'matters', t('dashboard.attentionInboxStale', { count: staleInbox.length, days: AppConfig.matters.inboxStaleDays }));
  flag(overdueMatters.length > 0, 'danger', 'matters', t('dashboard.attentionMatters', { count: overdueMatters.length }));
  flag(entitlementsToAttend.length > 0, 'warning', 'vendors', t('dashboard.attentionEntitlements', { count: entitlementsToAttend.length }));
  flag(overdueActions.length > 0, 'danger', 'actions', t('dashboard.attentionOverdue', { count: overdueActions.length }));
  flag(projectsAtRisk.length > 0, 'danger', 'projects', t('dashboard.attentionRisk', { count: projectsAtRisk.length }));
  flag(highRisks.length > 0, 'danger', 'governance', t('dashboard.attentionHighRisks', { count: highRisks.length }));
  flag(overdueIncidents.length > 0, 'danger', 'operations', t('dashboard.attentionIncidents', { count: overdueIncidents.length }));
  flag(offTargetKpis.length > 0, 'warning', 'operations', t('dashboard.attentionKpis', { count: offTargetKpis.length }));
  flag(followUpsDue.length > 0, 'warning', 'vendors', t('dashboard.attentionFollowUps', { count: followUpsDue.length }));
  flag(certsExpired.length > 0, 'danger', 'people', t('dashboard.attentionCertsExpired', { count: certsExpired.length }));
  flag(certsToAttend.length > certsExpired.length, 'warning', 'people', t('dashboard.attentionCertsExpiring', { count: certsToAttend.length - certsExpired.length }));
  flag(trainingsOverdue.length > 0, 'warning', 'people', t('dashboard.attentionTrainings', { count: trainingsOverdue.length }));
  flag(articlesToReview.length > 0, 'info', 'people', t('dashboard.attentionArticles', { count: articlesToReview.length }));
  flag(contractsToAttend.length > 0, 'warning', 'vendors', t('dashboard.attentionContracts', { count: contractsToAttend.length }));
  flag(purchasesToApprove.length > 0, 'warning', 'purchases', t('dashboard.attentionPurchases', { count: purchasesToApprove.length }));
  flag(posNearLimit.length > 0, 'warning', 'purchases', t('dashboard.attentionPos', { count: posNearLimit.length }));
  flag(overBudgets.length > 0, 'danger', 'finance', t('dashboard.attentionBudgetsOver', { count: overBudgets.length }));
  flag(nearBudgets.length > 0, 'warning', 'finance', t('dashboard.attentionBudgetsNear', { count: nearBudgets.length }));
  // the most serious first; the order inside each group stays as above
  const toneOrder: Record<Tone, number> = { danger: 0, warning: 1, info: 2, good: 3 };
  const sortedAttention = attention.map((a, i) => ({ a, i })).sort((x, y) => toneOrder[x.a.tone] - toneOrder[y.a.tone] || x.i - y.i).map(x => x.a);

  const hasLoading = ideasState.loading || initiativesState.loading || projectsState.loading || actionsState.loading || risksState.loading || budgetsState.loading || contractsState.loading || incidentsState.loading || kpisState.loading;
  const errors = [ideasState.error, initiativesState.error, projectsState.error, actionsState.error, risksState.error, budgetsState.error, contractsState.error, incidentsState.error, kpisState.error, mattersState.error, entitlementsState.error, linksState.error, npsState.error, monthsState.error, stockState.error, geniusState.error, casesState.error, objectivesState.error, weeklyState.error, purchasesState.error, actionError].filter(Boolean);

  const hour = now.getHours();
  const greetingKey = hour < 12 ? 'dashboard.goodMorning' : hour < 20 ? 'dashboard.goodAfternoon' : 'dashboard.goodEvening';
  const firstName = displayName(userEmail);
  const greeting = firstName ? t(greetingKey, { name: firstName }) : t(`${greetingKey}Plain`);
  const dateLabel = now.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const summary = hasLoading && attention.length === 0 ? t('common.loading') : attention.length === 0 ? t('dashboard.heroClear') : t('dashboard.heroCount', { count: attention.length });

  const level = (danger: boolean, warning: boolean): Tone => danger ? 'danger' : warning ? 'warning' : 'good';

  return (
    <Stack tokens={{ childrenGap: 20 }}>
      <Hero title={t('dashboard.title')} greeting={greeting} date={dateLabel} summary={summary} alertCount={attention.length} />

      <div aria-live="polite">
        {errors.map((error, index) => <MessageBar key={index} messageBarType={MessageBarType.error}>{error}</MessageBar>)}
        {hasLoading && <MessageBar messageBarType={MessageBarType.info}>{t('common.loading')}</MessageBar>}
      </div>

      <Card title={t('dashboard.attention')}>
        {sortedAttention.length === 0 ? (
          <Text>{t('dashboard.attentionNone')}</Text>
        ) : (
          <Stack tokens={{ childrenGap: 8 }}>
            {sortedAttention.map((a, i) => <AttentionRow key={i} tone={a.tone} tab={a.tab} text={a.text} />)}
          </Stack>
        )}
      </Card>

      <Section title={t('dashboard.sectionToday')}>
        <StatCard icon="inbox" tab="matters" label={t('dashboard.inbox')} value={inboxItems.length} tone={level(staleInbox.length > 0, inboxItems.length > 0)} />
        <StatCard icon="clipboard" tab="matters" label={t('dashboard.openMatters')} value={openMatters.length} tone="info" />
        <StatCard icon="alert" tab="matters" label={t('dashboard.mattersOverdue')} value={overdueMatters.length} tone={level(overdueMatters.length > 0, false)} />
        <StatCard icon="shield" label={t('dashboard.pendingApprovals')} value={pendingApprovals.length} tone={level(false, pendingApprovals.length > 0)} />
        <StatCard icon="check" tab="actions" label={t('dashboard.openActions')} value={openActions.length} tone="good" />
        <StatCard icon="clock" tab="actions" label={t('dashboard.overdueActions')} value={overdueActions.length} tone={level(false, overdueActions.length > 0)} />
      </Section>

      <Section title={t('dashboard.sectionService')}>
        {recentNps.score !== undefined && <StatCard icon="heart" tab="operations" label={t('dashboard.nps')} value={recentNps.score} tone="info" />}
        <StatCard icon="phone" tab="operations" label={t('dashboard.detractorsToCall')} value={callsPending.length} tone={level(callsOverdue.length > 0, callsPending.length > 0)} />
        <StatCard icon="alert" tab="operations" label={t('dashboard.openIncidents')} value={openIncidents.length} tone={level(false, openIncidents.length > 0)} />
        <StatCard icon="clock" tab="operations" label={t('dashboard.incidentsOverdue')} value={overdueIncidents.length} tone={level(overdueIncidents.length > 0, false)} />
        <StatCard icon="chart" tab="operations" label={t('dashboard.kpisOff')} value={offTargetKpis.length} tone={level(offTargetKpis.length > 0, false)} />
        <StatCard icon="phone" tab="vendors" label={t('dashboard.followUpsDue')} value={followUpsDue.length} tone={level(false, followUpsDue.length > 0)} />
      </Section>

      <Section title={t('dashboard.sectionMoney')}>
        <StatCard icon="refresh" tab="vendors" label={t('dashboard.contractsToRenew')} value={contractsToAttend.length} tone={level(lapsedContracts.length > 0, contractsToAttend.length > 0)} />
        <StatCard icon="refresh" tab="vendors" label={t('dashboard.entitlementsToRenew')} value={entitlementsToAttend.length} tone={level(lapsedEntitlements.length > 0, entitlementsToAttend.length > 0)} />
        <StatCard icon="wallet" tab="finance" label={t('dashboard.budgetsOver')} value={overBudgets.length} tone={level(overBudgets.length > 0, nearBudgets.length > 0)} />
        <StatCard icon="shield" tab="purchases" label={t('dashboard.purchasesToApprove')} value={purchasesToApprove.length} tone={level(false, purchasesToApprove.length > 0)} />
        <StatCard icon="box" tab="purchases" label={t('dashboard.purchasesToReceive')} value={purchasesToReceive.length} tone="info" />
        <StatCard icon="wallet" tab="purchases" label={t('dashboard.posNearLimit')} value={posNearLimit.length} tone={level(false, posNearLimit.length > 0)} />
        <StatCard icon="box" tab="devices" label={t('dashboard.lowStock')} value={lowStock.length} tone={level(lowStock.length > 0, lateOrders.length > 0)} />
      </Section>

      <Section title={t('dashboard.sectionProjects')}>
        <StatCard icon="bulb" tab="ideas" label={t('dashboard.activeIdeas')} value={activeIdeas} tone="info" />
        <StatCard icon="flag" tab="initiatives" label={t('dashboard.activeInitiatives')} value={activeInitiatives} tone="info" />
        <StatCard icon="rocket" tab="projects" label={t('dashboard.activeProjects')} value={activeProjectsList.length} tone="info" />
        <StatCard icon="alert" tab="projects" label={t('dashboard.projectsAtRisk')} value={projectsAtRisk.length} tone={level(projectsAtRisk.length > 0, false)} />
        <StatCard icon="shield" tab="governance" label={t('dashboard.highRisks')} value={highRisks.length} tone={level(highRisks.length > 0, false)} />
        <StatCard icon="scale" tab="strategy" label={t('dashboard.casesToDecide')} value={casesToDecide.length} tone={level(false, casesToDecide.length > 0)} />
        <StatCard icon="spark" tab="genius" label={t('dashboard.geniusPlanned')} value={plannedSessions.length} tone="info" />
      </Section>

      <Section title={t('dashboard.sectionTeam')}>
        <StatCard icon="users" tab="people" label={t('dashboard.skillGaps')} value={skillGaps.length} tone={level(false, skillGaps.length > 0)} />
        <StatCard icon="award" tab="people" label={t('dashboard.certsToAttend')} value={certsToAttend.length} tone={level(certsExpired.length > 0, certsToAttend.length > 0)} />
        <StatCard icon="book" tab="people" label={t('dashboard.trainingsOverdue')} value={trainingsOverdue.length} tone={level(false, trainingsOverdue.length > 0)} />
        <StatCard icon="book" tab="people" label={t('dashboard.articlesToReview')} value={articlesToReview.length} tone={level(false, articlesToReview.length > 0)} />
      </Section>

      <Card title={t('dashboard.quickLinks')}>
        {pinnedLinks.length === 0 ? <Text>{t('dashboard.quickLinksNone')}</Text> : <QuickLinks links={pinnedLinks} />}
      </Card>

      <Card title={t('dashboard.approvalsTitle')}>
        <Stack tokens={{ childrenGap: 8 }}>
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
      </Card>

      <Card title={t('dashboard.myWork')}>
        <Stack tokens={{ childrenGap: 6 }}>
          <Text>{t('dashboard.myWorkSummary', { overdue: myOverdue.length, today: myToday.length, week: myWeek.length })}</Text>
          {myWork.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <DetailsList items={myWork} columns={myWorkColumns} selectionMode={SelectionMode.none} getKey={a => String((a as ActionItem).id)} ariaLabelForGrid={t('dashboard.myWork')} />
            </div>
          )}
          {myWork.length === 0 && !hasLoading && <Text>{t('dashboard.myWorkNone')}</Text>}
        </Stack>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        <Card><BarChart title={t('dashboard.chartActions')} rows={actionStatusRows} /></Card>
        <Card><BarChart title={t('dashboard.chartBudget')} rows={budgetRows} formatValue={v => v.toLocaleString()} /></Card>
        <Card><BarChart title={t('dashboard.chartSpend')} rows={spendRows} formatValue={v => v.toLocaleString()} /></Card>
      </div>

      <Card title={t('dashboard.activeInitiativesList')}>
        {openInitiatives.length === 0 && !hasLoading ? (
          <Text>{t('dashboard.noInitiatives')}</Text>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <DetailsList items={openInitiatives} columns={initiativeColumns} selectionMode={SelectionMode.none} ariaLabelForGrid={t('dashboard.activeInitiativesList')} />
          </div>
        )}
      </Card>

      <ApprovalDecisionDialog decision={deciding ? deciding.decision : undefined} title={deciding ? deciding.row.title : ''} onConfirm={decide} onCancel={() => setDeciding(undefined)} />
    </Stack>
  );
};

export default Dashboard;
