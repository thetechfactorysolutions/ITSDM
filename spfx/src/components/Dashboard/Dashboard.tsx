import * as React from 'react';
import { DetailsList, IColumn, MessageBar, MessageBarType, SelectionMode, Stack, Text } from '@fluentui/react';
import { ActionStatus, IdeaStatus, Initiative, InitiativeStatus, ProjectStatus } from '../../models';
import { isActionDueToday, isActionDueWithinDays, isOverdueAction, isProjectAtRiskByVariance } from '../../rules/businessRules';
import { useHubData } from '../shared/HubData';
import KpiTile from '../shared/KpiTile';

const initiativeColumns: IColumn[] = [
  { key: 'title', name: 'Initiative', fieldName: 'title', minWidth: 180 },
  { key: 'status', name: 'Status', fieldName: 'status', minWidth: 90 },
  { key: 'progressPct', name: 'Progress', minWidth: 90, onRender: (item: Initiative) => `${item.progressPct}%` },
  { key: 'ownerUpn', name: 'Owner', fieldName: 'ownerUpn', minWidth: 180 },
  { key: 'targetDate', name: 'Target date', fieldName: 'targetDate', minWidth: 110 }
];

const Dashboard: React.FC = () => {
  const { userEmail, ideas: ideasState, initiatives: initiativesState, projects: projectsState, actions: actionsState } = useHubData();

  const now = new Date();

  const openActions = actionsState.items.filter(item => item.status !== ActionStatus.DONE && item.status !== ActionStatus.CANCELLED);
  const overdueActions = openActions.filter(item => isOverdueAction(item, now));
  const myActions = openActions.filter(item => item.ownerUpn.toLowerCase() === userEmail.toLowerCase());
  const myOverdue = myActions.filter(item => isOverdueAction(item, now)).length;
  const myToday = myActions.filter(item => isActionDueToday(item, now)).length;
  const myWeek = myActions.filter(item => isActionDueWithinDays(item, 7, now)).length;
  const projectsAtRisk = projectsState.items.filter(item => isProjectAtRiskByVariance(item)).length;
  const activeIdeas = ideasState.items.filter(item => item.status !== IdeaStatus.COMPLETED && item.status !== IdeaStatus.REJECTED && item.status !== IdeaStatus.CANCELLED).length;
  const activeInitiatives = initiativesState.items.filter(item => item.status === InitiativeStatus.ACTIVE || item.status === InitiativeStatus.BLOCKED || item.status === InitiativeStatus.ON_HOLD).length;
  const activeProjects = projectsState.items.filter(item => item.status !== ProjectStatus.COMPLETED && item.status !== ProjectStatus.CANCELLED).length;
  const openInitiatives = initiativesState.items.filter(item => item.status !== InitiativeStatus.COMPLETED && item.status !== InitiativeStatus.CANCELLED);

  const attentionMessages: string[] = [];
  if (overdueActions.length > 0) {
    attentionMessages.push(`${overdueActions.length} overdue action(s)`);
  }
  if (projectsAtRisk > 0) {
    attentionMessages.push(`${projectsAtRisk} project(s) at risk`);
  }

  const hasLoading = ideasState.loading || initiativesState.loading || projectsState.loading || actionsState.loading;
  const errors = [ideasState.error, initiativesState.error, projectsState.error, actionsState.error].filter(Boolean);

  return (
    <Stack tokens={{ childrenGap: 16 }}>
      <Text variant="xLarge" as="h2">Management Dashboard</Text>

      {errors.map((error, index) => (
        <MessageBar key={index} messageBarType={MessageBarType.error}>{error}</MessageBar>
      ))}

      {hasLoading && <MessageBar messageBarType={MessageBarType.info}>Loading dashboard data...</MessageBar>}

      <Stack horizontal wrap tokens={{ childrenGap: 12 }}>
        <KpiTile label="Active Ideas" value={activeIdeas} tone="info" />
        <KpiTile label="Active Initiatives" value={activeInitiatives} tone="info" />
        <KpiTile label="Active Projects" value={activeProjects} tone="info" />
        <KpiTile label="Open Actions" value={openActions.length} tone="good" />
        <KpiTile label="Overdue Actions" value={overdueActions.length} tone={overdueActions.length > 0 ? 'warning' : 'good'} />
        <KpiTile label="Projects At Risk" value={projectsAtRisk} tone={projectsAtRisk > 0 ? 'danger' : 'good'} />
      </Stack>

      <Stack>
        <Text variant="large" as="h3">Attention Required</Text>
        {attentionMessages.length === 0 ? (
          <Text>No items currently require urgent manager attention.</Text>
        ) : (
          attentionMessages.map((message, index) => <Text key={index}>• {message}</Text>)
        )}
      </Stack>

      <Stack>
        <Text variant="large" as="h3">My Actions</Text>
        <Text>Overdue: {myOverdue} | Today: {myToday} | This week: {myWeek}</Text>
      </Stack>

      <Stack>
        <Text variant="large" as="h3">Active Initiatives</Text>
        {openInitiatives.length === 0 && !hasLoading ? (
          <Text>No active initiatives yet. Convert a validated idea or create one in the Initiatives tab.</Text>
        ) : (
          <DetailsList items={openInitiatives} columns={initiativeColumns} selectionMode={SelectionMode.none} />
        )}
      </Stack>
    </Stack>
  );
};

export default Dashboard;
