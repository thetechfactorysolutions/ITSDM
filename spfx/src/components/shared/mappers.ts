import { ActionItem, ActionPriority, ActionStatus, Idea, IdeaStatus, Initiative, InitiativeStatus, Project, ProjectRiskLevel, ProjectStatus } from '../../models';
import { dayKeyFromValue } from '../../rules/dates';

const readString = (item: Record<string, unknown>, key: string): string => {
  const value = item[key];
  return typeof value === 'string' ? value : '';
};

/** Date columns are exposed to the app as YYYY-MM-DD day keys (or empty). */
const readDate = (item: Record<string, unknown>, key: string): string => {
  return dayKeyFromValue(readString(item, key)) ?? '';
};

const readNumber = (item: Record<string, unknown>, key: string): number => {
  const value = item[key];
  return typeof value === 'number' ? value : Number(value ?? 0);
};

const readId = (item: Record<string, unknown>): number | undefined => {
  const value = item.Id;
  return typeof value === 'number' ? value : undefined;
};

export const mapIdea = (item: Record<string, unknown>): Idea => ({
  id: readId(item),
  ideaId: readString(item, 'IdeaId'),
  title: readString(item, 'Title'),
  description: readString(item, 'Description'),
  status: (readString(item, 'Status') as IdeaStatus) || IdeaStatus.NEW,
  ownerUpn: readString(item, 'OwnerUPN'),
  sponsorUpn: readString(item, 'SponsorUPN'),
  estimatedValue: readNumber(item, 'EstimatedValue'),
  targetDate: readDate(item, 'TargetDate'),
  tags: readString(item, 'Tags').split(',').map(tag => tag.trim()).filter(Boolean),
  convertedInitiativeId: readString(item, 'ConvertedInitiativeId'),
  created: readString(item, 'Created'),
  modified: readString(item, 'Modified')
});

export const mapInitiative = (item: Record<string, unknown>): Initiative => ({
  id: readId(item),
  initiativeId: readString(item, 'InitiativeId'),
  title: readString(item, 'Title'),
  description: readString(item, 'Description'),
  status: (readString(item, 'Status') as InitiativeStatus) || InitiativeStatus.DRAFT,
  ownerUpn: readString(item, 'OwnerUPN'),
  progressPct: readNumber(item, 'ProgressPct'),
  targetDate: readDate(item, 'TargetDate'),
  sourceIdeaId: readString(item, 'SourceIdeaId'),
  plannerPlanId: readString(item, 'PlannerPlanId'),
  created: readString(item, 'Created'),
  modified: readString(item, 'Modified')
});

export const mapProject = (item: Record<string, unknown>): Project => ({
  id: readId(item),
  projectId: readString(item, 'ProjectId'),
  initiativeId: readString(item, 'InitiativeId'),
  title: readString(item, 'Title'),
  description: readString(item, 'Description'),
  status: (readString(item, 'Status') as ProjectStatus) || ProjectStatus.PLANNING,
  ownerUpn: readString(item, 'OwnerUPN'),
  startDate: readDate(item, 'StartDate'),
  endDate: readDate(item, 'EndDate'),
  budgetAmount: readNumber(item, 'BudgetAmount'),
  forecastAmount: readNumber(item, 'ForecastAmount'),
  riskLevel: (readString(item, 'RiskLevel') as ProjectRiskLevel) || ProjectRiskLevel.LOW,
  plannerPlanId: readString(item, 'PlannerPlanId'),
  created: readString(item, 'Created'),
  modified: readString(item, 'Modified')
});

export const mapAction = (item: Record<string, unknown>): ActionItem => ({
  id: readId(item),
  actionId: readString(item, 'ActionId'),
  initiativeId: readString(item, 'InitiativeId'),
  projectId: readString(item, 'ProjectId'),
  title: readString(item, 'Title'),
  description: readString(item, 'Description'),
  status: (readString(item, 'Status') as ActionStatus) || ActionStatus.OPEN,
  priority: (readString(item, 'Priority') as ActionPriority) || ActionPriority.MEDIUM,
  ownerUpn: readString(item, 'OwnerUPN'),
  dueDate: readDate(item, 'DueDate'),
  completedDate: readDate(item, 'CompletedDate'),
  plannerTaskId: readString(item, 'PlannerTaskId'),
  created: readString(item, 'Created'),
  modified: readString(item, 'Modified')
});
