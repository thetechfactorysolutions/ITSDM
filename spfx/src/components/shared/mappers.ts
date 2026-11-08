import {
  ActionItem, ActionPriority, ActionStatus, ApprovalStatus, IApprovalState, Idea, IdeaStatus, Initiative, InitiativeStatus, Meeting, Note, NoteCategory, NoteStatus,
  Project, ProjectRiskLevel, ProjectStatus
} from '../../models';
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

/** Title of an expanded lookup such as Editor/Title (SharePoint returns { Title: '…' }). */
const readExpandedTitle = (item: Record<string, unknown>, key: string): string => {
  const value = item[key];
  if (value && typeof value === 'object') {
    const title = (value as Record<string, unknown>).Title;
    return typeof title === 'string' ? title : '';
  }
  return '';
};

/** Value from a list of allowed values, or the fallback when the stored text is not one of them. */
const readEnum = <T extends string>(item: Record<string, unknown>, key: string, allowed: T[], fallback: T): T => {
  const value = readString(item, key) as T;
  return allowed.indexOf(value) > -1 ? value : fallback;
};

const enumValues = <T extends string>(e: Record<string, T>): T[] => Object.keys(e).map(k => e[k]);

const readApproval = (item: Record<string, unknown>): IApprovalState => ({
  ruleId: readString(item, 'ApprovalRule'),
  status: readEnum(item, 'ApprovalStatus', enumValues(ApprovalStatus), ApprovalStatus.NONE),
  approver: readString(item, 'Approver'),
  requestedOn: readDate(item, 'ApprovalRequestedOn'),
  decidedOn: readDate(item, 'ApprovalDecidedOn'),
  decidedBy: readString(item, 'ApprovalDecidedBy'),
  comment: readString(item, 'ApprovalComment')
});

export const mapIdea = (item: Record<string, unknown>): Idea => ({
  id: readId(item),
  ideaId: readString(item, 'IdeaId'),
  title: readString(item, 'Title'),
  description: readString(item, 'Description'),
  status: readEnum(item, 'Status', enumValues(IdeaStatus), IdeaStatus.NEW),
  ownerUpn: readString(item, 'OwnerUPN'),
  sponsorUpn: readString(item, 'SponsorUPN'),
  estimatedValue: readNumber(item, 'EstimatedValue'),
  targetDate: readDate(item, 'TargetDate'),
  tags: readString(item, 'Tags').split(',').map(tag => tag.trim()).filter(Boolean),
  convertedInitiativeId: readString(item, 'ConvertedInitiativeId'),
  created: readString(item, 'Created'),
  modified: readString(item, 'Modified'),
  editor: readExpandedTitle(item, 'Editor'),
  approval: readApproval(item)
});

export const mapInitiative = (item: Record<string, unknown>): Initiative => ({
  id: readId(item),
  initiativeId: readString(item, 'InitiativeId'),
  title: readString(item, 'Title'),
  description: readString(item, 'Description'),
  status: readEnum(item, 'Status', enumValues(InitiativeStatus), InitiativeStatus.DRAFT),
  ownerUpn: readString(item, 'OwnerUPN'),
  progressPct: readNumber(item, 'ProgressPct'),
  targetDate: readDate(item, 'TargetDate'),
  sourceIdeaId: readString(item, 'SourceIdeaId'),
  plannerPlanId: readString(item, 'PlannerPlanId'),
  created: readString(item, 'Created'),
  modified: readString(item, 'Modified'),
  editor: readExpandedTitle(item, 'Editor'),
  approval: readApproval(item)
});

export const mapProject = (item: Record<string, unknown>): Project => ({
  id: readId(item),
  projectId: readString(item, 'ProjectId'),
  initiativeId: readString(item, 'InitiativeId'),
  title: readString(item, 'Title'),
  description: readString(item, 'Description'),
  status: readEnum(item, 'Status', enumValues(ProjectStatus), ProjectStatus.PLANNING),
  ownerUpn: readString(item, 'OwnerUPN'),
  startDate: readDate(item, 'StartDate'),
  endDate: readDate(item, 'EndDate'),
  budgetAmount: readNumber(item, 'BudgetAmount'),
  forecastAmount: readNumber(item, 'ForecastAmount'),
  riskLevel: readEnum(item, 'RiskLevel', enumValues(ProjectRiskLevel), ProjectRiskLevel.LOW),
  plannerPlanId: readString(item, 'PlannerPlanId'),
  created: readString(item, 'Created'),
  modified: readString(item, 'Modified'),
  editor: readExpandedTitle(item, 'Editor'),
  approval: readApproval(item)
});

export const mapAction = (item: Record<string, unknown>): ActionItem => ({
  id: readId(item),
  actionId: readString(item, 'ActionId'),
  initiativeId: readString(item, 'InitiativeId'),
  projectId: readString(item, 'ProjectId'),
  title: readString(item, 'Title'),
  description: readString(item, 'Description'),
  status: readEnum(item, 'Status', enumValues(ActionStatus), ActionStatus.OPEN),
  priority: readEnum(item, 'Priority', enumValues(ActionPriority), ActionPriority.MEDIUM),
  ownerUpn: readString(item, 'OwnerUPN'),
  dueDate: readDate(item, 'DueDate'),
  completedDate: readDate(item, 'CompletedDate'),
  plannerTaskId: readString(item, 'PlannerTaskId'),
  created: readString(item, 'Created'),
  modified: readString(item, 'Modified'),
  editor: readExpandedTitle(item, 'Editor'),
  approval: readApproval(item)
});

export const mapMeeting = (item: Record<string, unknown>): Meeting => ({
  id: readId(item),
  meetingId: readString(item, 'MeetingId'),
  title: readString(item, 'Title'),
  meetingDate: readDate(item, 'MeetingDate'),
  summary: readString(item, 'Summary'),
  attendees: readString(item, 'Attendees'),
  transcript: readString(item, 'Transcript'),
  importedItems: readString(item, 'ImportedItems'),
  created: readString(item, 'Created'),
  modified: readString(item, 'Modified'),
  editor: readExpandedTitle(item, 'Editor')
});

export const mapNote = (item: Record<string, unknown>): Note => ({
  id: readId(item),
  noteId: readString(item, 'NoteId'),
  title: readString(item, 'Title'),
  body: readString(item, 'Body'),
  category: readEnum(item, 'Category', enumValues(NoteCategory), NoteCategory.INFO),
  status: readEnum(item, 'Status', enumValues(NoteStatus), NoteStatus.ACTIVE),
  meetingId: readString(item, 'MeetingId'),
  initiativeId: readString(item, 'InitiativeId'),
  projectId: readString(item, 'ProjectId'),
  created: readString(item, 'Created'),
  modified: readString(item, 'Modified'),
  editor: readExpandedTitle(item, 'Editor')
});
