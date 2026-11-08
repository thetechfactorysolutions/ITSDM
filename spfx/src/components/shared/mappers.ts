import {
  ActionItem, ActionPriority, ActionStatus, ApprovalStatus, AutoRenew, ChangeRequest, ChangeStatus, ChangeType, Incident, IncidentCategory, IncidentSeverity, IncidentStatus,
  Interaction, InteractionStatus, InteractionType, Kpi, KpiCategory, KpiDirection, KpiStatus, Budget, BudgetStatus, CapexItem, Contract, ContractStatus, ExpenseStatus, OpexFrequency, OpexItem, Vendor, VendorCategory, VendorStatus, Decision, DecisionStatus, IApprovalState, Idea, Lesson, LessonCategory, LessonStatus, IdeaStatus, Initiative, InitiativeStatus, Meeting, Note, NoteCategory, NoteStatus,
  Project, ProjectRiskLevel, ProjectStatus, Review, ReviewHealth, ReviewStatus, ReviewType, Risk, RiskScale, RiskStatus
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

export const mapRisk = (item: Record<string, unknown>): Risk => ({
  id: readId(item),
  riskId: readString(item, 'RiskId'),
  title: readString(item, 'Title'),
  description: readString(item, 'Description'),
  status: readEnum(item, 'Status', enumValues(RiskStatus), RiskStatus.OPEN),
  probability: readEnum(item, 'Probability', enumValues(RiskScale), RiskScale.MEDIUM),
  impact: readEnum(item, 'Impact', enumValues(RiskScale), RiskScale.MEDIUM),
  ownerUpn: readString(item, 'OwnerUPN'),
  mitigation: readString(item, 'Mitigation'),
  dueDate: readDate(item, 'DueDate'),
  projectId: readString(item, 'ProjectId'),
  initiativeId: readString(item, 'InitiativeId'),
  meetingId: readString(item, 'MeetingId'),
  created: readString(item, 'Created'),
  modified: readString(item, 'Modified'),
  editor: readExpandedTitle(item, 'Editor')
});

export const mapDecision = (item: Record<string, unknown>): Decision => ({
  id: readId(item),
  decisionId: readString(item, 'DecisionId'),
  title: readString(item, 'Title'),
  description: readString(item, 'Description'),
  rationale: readString(item, 'Rationale'),
  status: readEnum(item, 'Status', enumValues(DecisionStatus), DecisionStatus.PROPOSED),
  decidedBy: readString(item, 'DecidedBy'),
  decisionDate: readDate(item, 'DecisionDate'),
  projectId: readString(item, 'ProjectId'),
  initiativeId: readString(item, 'InitiativeId'),
  meetingId: readString(item, 'MeetingId'),
  created: readString(item, 'Created'),
  modified: readString(item, 'Modified'),
  editor: readExpandedTitle(item, 'Editor')
});

export const mapLesson = (item: Record<string, unknown>): Lesson => ({
  id: readId(item),
  lessonId: readString(item, 'LessonId'),
  title: readString(item, 'Title'),
  description: readString(item, 'Description'),
  recommendation: readString(item, 'Recommendation'),
  category: readEnum(item, 'Category', enumValues(LessonCategory), LessonCategory.OTHER),
  status: readEnum(item, 'Status', enumValues(LessonStatus), LessonStatus.NEW),
  ownerUpn: readString(item, 'OwnerUPN'),
  projectId: readString(item, 'ProjectId'),
  initiativeId: readString(item, 'InitiativeId'),
  meetingId: readString(item, 'MeetingId'),
  created: readString(item, 'Created'),
  modified: readString(item, 'Modified'),
  editor: readExpandedTitle(item, 'Editor')
});

export const mapReview = (item: Record<string, unknown>): Review => ({
  id: readId(item),
  reviewId: readString(item, 'ReviewId'),
  title: readString(item, 'Title'),
  reviewType: readEnum(item, 'ReviewType', enumValues(ReviewType), ReviewType.STATUS),
  status: readEnum(item, 'Status', enumValues(ReviewStatus), ReviewStatus.SCHEDULED),
  health: readEnum(item, 'Health', enumValues(ReviewHealth), ReviewHealth.GREEN),
  reviewDate: readDate(item, 'ReviewDate'),
  nextReviewDate: readDate(item, 'NextReviewDate'),
  summary: readString(item, 'Summary'),
  nextSteps: readString(item, 'NextSteps'),
  ownerUpn: readString(item, 'OwnerUPN'),
  projectId: readString(item, 'ProjectId'),
  initiativeId: readString(item, 'InitiativeId'),
  created: readString(item, 'Created'),
  modified: readString(item, 'Modified'),
  editor: readExpandedTitle(item, 'Editor')
});

export const mapBudget = (item: Record<string, unknown>): Budget => ({
  id: readId(item),
  budgetId: readString(item, 'BudgetId'),
  title: readString(item, 'Title'),
  fiscalYear: readNumber(item, 'FiscalYear'),
  description: readString(item, 'Description'),
  status: readEnum(item, 'Status', enumValues(BudgetStatus), BudgetStatus.DRAFT),
  plannedAmount: readNumber(item, 'PlannedAmount'),
  ownerUpn: readString(item, 'OwnerUPN'),
  created: readString(item, 'Created'),
  modified: readString(item, 'Modified'),
  editor: readExpandedTitle(item, 'Editor')
});

export const mapCapex = (item: Record<string, unknown>): CapexItem => ({
  id: readId(item),
  capexId: readString(item, 'CapexId'),
  title: readString(item, 'Title'),
  description: readString(item, 'Description'),
  status: readEnum(item, 'Status', enumValues(ExpenseStatus), ExpenseStatus.PLANNED),
  amount: readNumber(item, 'Amount'),
  expenseDate: readDate(item, 'ExpenseDate'),
  invoiceRef: readString(item, 'InvoiceRef'),
  ownerUpn: readString(item, 'OwnerUPN'),
  budgetId: readString(item, 'BudgetId'),
  projectId: readString(item, 'ProjectId'),
  vendorId: readString(item, 'VendorId'),
  created: readString(item, 'Created'),
  modified: readString(item, 'Modified'),
  editor: readExpandedTitle(item, 'Editor'),
  approval: readApproval(item)
});

export const mapOpex = (item: Record<string, unknown>): OpexItem => ({
  id: readId(item),
  opexId: readString(item, 'OpexId'),
  title: readString(item, 'Title'),
  description: readString(item, 'Description'),
  status: readEnum(item, 'Status', enumValues(ExpenseStatus), ExpenseStatus.PLANNED),
  amount: readNumber(item, 'Amount'),
  frequency: readEnum(item, 'Frequency', enumValues(OpexFrequency), OpexFrequency.ONE_OFF),
  expenseDate: readDate(item, 'ExpenseDate'),
  ownerUpn: readString(item, 'OwnerUPN'),
  budgetId: readString(item, 'BudgetId'),
  projectId: readString(item, 'ProjectId'),
  vendorId: readString(item, 'VendorId'),
  contractId: readString(item, 'ContractId'),
  created: readString(item, 'Created'),
  modified: readString(item, 'Modified'),
  editor: readExpandedTitle(item, 'Editor'),
  approval: readApproval(item)
});

export const mapVendor = (item: Record<string, unknown>): Vendor => ({
  id: readId(item),
  vendorId: readString(item, 'VendorId'),
  title: readString(item, 'Title'),
  description: readString(item, 'Description'),
  status: readEnum(item, 'Status', enumValues(VendorStatus), VendorStatus.ACTIVE),
  category: readEnum(item, 'Category', enumValues(VendorCategory), VendorCategory.OTHER),
  contactName: readString(item, 'ContactName'),
  contactEmail: readString(item, 'ContactEmail'),
  website: readString(item, 'Website'),
  ownerUpn: readString(item, 'OwnerUPN'),
  created: readString(item, 'Created'),
  modified: readString(item, 'Modified'),
  editor: readExpandedTitle(item, 'Editor')
});

export const mapContract = (item: Record<string, unknown>): Contract => ({
  id: readId(item),
  contractId: readString(item, 'ContractId'),
  title: readString(item, 'Title'),
  description: readString(item, 'Description'),
  status: readEnum(item, 'Status', enumValues(ContractStatus), ContractStatus.DRAFT),
  vendorId: readString(item, 'VendorId'),
  startDate: readDate(item, 'StartDate'),
  endDate: readDate(item, 'EndDate'),
  noticeDays: item.NoticeDays === undefined || item.NoticeDays === null ? 90 : readNumber(item, 'NoticeDays'),
  annualValue: readNumber(item, 'AnnualValue'),
  autoRenew: readEnum(item, 'AutoRenew', enumValues(AutoRenew), AutoRenew.NO),
  ownerUpn: readString(item, 'OwnerUPN'),
  projectId: readString(item, 'ProjectId'),
  created: readString(item, 'Created'),
  modified: readString(item, 'Modified'),
  editor: readExpandedTitle(item, 'Editor'),
  approval: readApproval(item)
});

export const mapIncident = (item: Record<string, unknown>): Incident => ({
  id: readId(item),
  incidentId: readString(item, 'IncidentId'),
  title: readString(item, 'Title'),
  description: readString(item, 'Description'),
  status: readEnum(item, 'Status', enumValues(IncidentStatus), IncidentStatus.NEW),
  severity: readEnum(item, 'Severity', enumValues(IncidentSeverity), IncidentSeverity.MEDIUM),
  category: readEnum(item, 'Category', enumValues(IncidentCategory), IncidentCategory.OTHER),
  reportedBy: readString(item, 'ReportedBy'),
  assignedTo: readString(item, 'AssignedTo'),
  reportedOn: readDate(item, 'ReportedOn'),
  resolvedOn: readDate(item, 'ResolvedOn'),
  resolution: readString(item, 'Resolution'),
  rootCause: readString(item, 'RootCause'),
  projectId: readString(item, 'ProjectId'),
  vendorId: readString(item, 'VendorId'),
  created: readString(item, 'Created'),
  modified: readString(item, 'Modified'),
  editor: readExpandedTitle(item, 'Editor')
});

export const mapChange = (item: Record<string, unknown>): ChangeRequest => ({
  id: readId(item),
  changeId: readString(item, 'ChangeId'),
  title: readString(item, 'Title'),
  description: readString(item, 'Description'),
  reason: readString(item, 'Reason'),
  status: readEnum(item, 'Status', enumValues(ChangeStatus), ChangeStatus.DRAFT),
  changeType: readEnum(item, 'ChangeType', enumValues(ChangeType), ChangeType.NORMAL),
  risk: readEnum(item, 'Risk', enumValues(RiskScale), RiskScale.MEDIUM),
  plannedDate: readDate(item, 'PlannedDate'),
  implementedDate: readDate(item, 'ImplementedDate'),
  backoutPlan: readString(item, 'BackoutPlan'),
  ownerUpn: readString(item, 'OwnerUPN'),
  projectId: readString(item, 'ProjectId'),
  created: readString(item, 'Created'),
  modified: readString(item, 'Modified'),
  editor: readExpandedTitle(item, 'Editor'),
  approval: readApproval(item)
});

export const mapInteraction = (item: Record<string, unknown>): Interaction => ({
  id: readId(item),
  interactionId: readString(item, 'InteractionId'),
  title: readString(item, 'Title'),
  type: readEnum(item, 'InteractionType', enumValues(InteractionType), InteractionType.MEETING),
  status: readEnum(item, 'Status', enumValues(InteractionStatus), InteractionStatus.LOGGED),
  interactionDate: readDate(item, 'InteractionDate'),
  contactName: readString(item, 'ContactName'),
  contactEmail: readString(item, 'ContactEmail'),
  organization: readString(item, 'Organization'),
  summary: readString(item, 'Summary'),
  nextSteps: readString(item, 'NextSteps'),
  followUpDate: readDate(item, 'FollowUpDate'),
  ownerUpn: readString(item, 'OwnerUPN'),
  projectId: readString(item, 'ProjectId'),
  vendorId: readString(item, 'VendorId'),
  meetingId: readString(item, 'MeetingId'),
  created: readString(item, 'Created'),
  modified: readString(item, 'Modified'),
  editor: readExpandedTitle(item, 'Editor')
});

export const mapKpi = (item: Record<string, unknown>): Kpi => ({
  id: readId(item),
  kpiId: readString(item, 'KpiId'),
  title: readString(item, 'Title'),
  description: readString(item, 'Description'),
  category: readEnum(item, 'Category', enumValues(KpiCategory), KpiCategory.OTHER),
  status: readEnum(item, 'Status', enumValues(KpiStatus), KpiStatus.ACTIVE),
  unit: readString(item, 'Unit'),
  direction: readEnum(item, 'Direction', enumValues(KpiDirection), KpiDirection.HIGHER),
  target: readNumber(item, 'Target'),
  currentValue: readNumber(item, 'CurrentValue'),
  // An empty column means "no previous value yet", which is not the same as zero.
  previousValue: item.PreviousValue === undefined || item.PreviousValue === null || item.PreviousValue === '' ? undefined : readNumber(item, 'PreviousValue'),
  measuredOn: readDate(item, 'MeasuredOn'),
  ownerUpn: readString(item, 'OwnerUPN'),
  projectId: readString(item, 'ProjectId'),
  created: readString(item, 'Created'),
  modified: readString(item, 'Modified'),
  editor: readExpandedTitle(item, 'Editor')
});
