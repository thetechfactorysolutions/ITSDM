import {
  CatalogCategory, CatalogEntry, CatalogKind, CatalogStatus, Country, NpsChannel, NpsFollowUp, NpsResponse, ServiceMonth,
  Area, AreaStatus, Entitlement, EntitlementStatus, EntitlementType, LinkItem, LinkStatus, Matter, MatterPriority, MatterSource, MatterStatus,
  ActionItem, ActionPriority, ActionStatus, Article, ArticleCategory, ArticleStatus, Skill, SkillCategory, SkillLevel, SkillStatus, Training, TrainingStatus, TrainingType, ApprovalStatus, AutoRenew, ChangeRequest, ChangeStatus, ChangeType, Incident, IncidentCategory, IncidentSeverity, IncidentStatus,
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

/** A number, or undefined when the column is empty (an empty column is not the same as zero). */
const readOptionalNumber = (item: Record<string, unknown>, key: string): number | undefined =>
  item[key] === undefined || item[key] === null || item[key] === '' ? undefined : readNumber(item, key);

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

export const mapSkill = (item: Record<string, unknown>): Skill => ({
  id: readId(item),
  skillId: readString(item, 'SkillId'),
  title: readString(item, 'Title'),
  personUpn: readString(item, 'PersonUPN'),
  category: readEnum(item, 'Category', enumValues(SkillCategory), SkillCategory.OTHER),
  level: readEnum(item, 'Level', enumValues(SkillLevel), SkillLevel.BASIC),
  targetLevel: readEnum(item, 'TargetLevel', enumValues(SkillLevel), SkillLevel.INTERMEDIATE),
  status: readEnum(item, 'Status', enumValues(SkillStatus), SkillStatus.ACTIVE),
  lastAssessed: readDate(item, 'LastAssessed'),
  certification: readString(item, 'Certification'),
  certificationExpiry: readDate(item, 'CertificationExpiry'),
  notes: readString(item, 'Notes'),
  created: readString(item, 'Created'),
  modified: readString(item, 'Modified'),
  editor: readExpandedTitle(item, 'Editor')
});

export const mapTraining = (item: Record<string, unknown>): Training => ({
  id: readId(item),
  trainingId: readString(item, 'TrainingId'),
  title: readString(item, 'Title'),
  status: readEnum(item, 'Status', enumValues(TrainingStatus), TrainingStatus.PLANNED),
  type: readEnum(item, 'TrainingType', enumValues(TrainingType), TrainingType.COURSE),
  personUpn: readString(item, 'PersonUPN'),
  provider: readString(item, 'Provider'),
  skillId: readString(item, 'SkillId'),
  vendorId: readString(item, 'VendorId'),
  startDate: readDate(item, 'StartDate'),
  dueDate: readDate(item, 'DueDate'),
  completedDate: readDate(item, 'CompletedDate'),
  cost: readNumber(item, 'Cost'),
  notes: readString(item, 'Notes'),
  created: readString(item, 'Created'),
  modified: readString(item, 'Modified'),
  editor: readExpandedTitle(item, 'Editor')
});

export const mapArticle = (item: Record<string, unknown>): Article => ({
  id: readId(item),
  articleId: readString(item, 'ArticleId'),
  title: readString(item, 'Title'),
  summary: readString(item, 'Summary'),
  body: readString(item, 'Body'),
  category: readEnum(item, 'Category', enumValues(ArticleCategory), ArticleCategory.HOW_TO),
  status: readEnum(item, 'Status', enumValues(ArticleStatus), ArticleStatus.DRAFT),
  ownerUpn: readString(item, 'OwnerUPN'),
  tags: readString(item, 'Tags'),
  publishedOn: readDate(item, 'PublishedOn'),
  reviewDate: readDate(item, 'ReviewDate'),
  projectId: readString(item, 'ProjectId'),
  vendorId: readString(item, 'VendorId'),
  incidentId: readString(item, 'IncidentId'),
  created: readString(item, 'Created'),
  modified: readString(item, 'Modified'),
  editor: readExpandedTitle(item, 'Editor'),
  approval: readApproval(item)
});

export const mapMatter = (item: Record<string, unknown>): Matter => ({
  id: readId(item),
  matterId: readString(item, 'MatterId'),
  title: readString(item, 'Title'),
  description: readString(item, 'Description'),
  notes: readString(item, 'Notes'),
  status: readEnum(item, 'Status', enumValues(MatterStatus), MatterStatus.INBOX),
  priority: readEnum(item, 'Priority', enumValues(MatterPriority), MatterPriority.MEDIUM),
  areaId: readString(item, 'AreaId'),
  source: readEnum(item, 'Source', enumValues(MatterSource), MatterSource.MANUAL),
  sourceRef: readString(item, 'SourceRef'),
  sender: readString(item, 'Sender'),
  receivedOn: readDate(item, 'ReceivedOn'),
  dueDate: readDate(item, 'DueDate'),
  closedOn: readDate(item, 'ClosedOn'),
  ownerUpn: readString(item, 'OwnerUPN'),
  projectId: readString(item, 'ProjectId'),
  contractId: readString(item, 'ContractId'),
  incidentId: readString(item, 'IncidentId'),
  vendorId: readString(item, 'VendorId'),
  created: readString(item, 'Created'),
  modified: readString(item, 'Modified'),
  editor: readExpandedTitle(item, 'Editor')
});

export const mapArea = (item: Record<string, unknown>): Area => ({
  id: readId(item),
  areaId: readString(item, 'AreaId'),
  title: readString(item, 'Title'),
  description: readString(item, 'Description'),
  status: readEnum(item, 'Status', enumValues(AreaStatus), AreaStatus.ACTIVE),
  sortOrder: readNumber(item, 'SortOrder'),
  created: readString(item, 'Created'),
  modified: readString(item, 'Modified'),
  editor: readExpandedTitle(item, 'Editor')
});

export const mapLink = (item: Record<string, unknown>): LinkItem => ({
  id: readId(item),
  linkId: readString(item, 'LinkId'),
  title: readString(item, 'Title'),
  url: readString(item, 'Url'),
  category: readString(item, 'Category'),
  description: readString(item, 'Description'),
  pinned: readString(item, 'Pinned') === 'YES',
  status: readEnum(item, 'Status', enumValues(LinkStatus), LinkStatus.ACTIVE),
  vendorId: readString(item, 'VendorId'),
  created: readString(item, 'Created'),
  modified: readString(item, 'Modified'),
  editor: readExpandedTitle(item, 'Editor')
});

export const mapEntitlement = (item: Record<string, unknown>): Entitlement => ({
  id: readId(item),
  entitlementId: readString(item, 'EntitlementId'),
  title: readString(item, 'Title'),
  type: readEnum(item, 'EntitlementType', enumValues(EntitlementType), EntitlementType.WARRANTY),
  status: readEnum(item, 'Status', enumValues(EntitlementStatus), EntitlementStatus.ACTIVE),
  product: readString(item, 'Product'),
  reference: readString(item, 'Reference'),
  quantity: readNumber(item, 'Quantity'),
  startDate: readDate(item, 'StartDate'),
  endDate: readDate(item, 'EndDate'),
  noticeDays: item.NoticeDays === undefined || item.NoticeDays === null ? 60 : readNumber(item, 'NoticeDays'),
  annualCost: readNumber(item, 'AnnualCost'),
  vendorId: readString(item, 'VendorId'),
  contractId: readString(item, 'ContractId'),
  ownerUpn: readString(item, 'OwnerUPN'),
  notes: readString(item, 'Notes'),
  created: readString(item, 'Created'),
  modified: readString(item, 'Modified'),
  editor: readExpandedTitle(item, 'Editor')
});

export const mapNps = (item: Record<string, unknown>): NpsResponse => ({
  id: readId(item),
  responseId: readString(item, 'ResponseId'),
  title: readString(item, 'Title'),
  score: readNumber(item, 'Score'),
  comment: readString(item, 'Comment'),
  respondedOn: readDate(item, 'RespondedOn'),
  channel: readEnum(item, 'Channel', enumValues(NpsChannel), NpsChannel.OTHER),
  country: readEnum(item, 'Country', enumValues(Country), Country.ES),
  ticketRef: readString(item, 'TicketRef'),
  status: readEnum(item, 'Status', enumValues(NpsFollowUp), NpsFollowUp.NOT_REQUIRED),
  followUpDate: readDate(item, 'FollowUpDate'),
  followUpNotes: readString(item, 'FollowUpNotes'),
  ownerUpn: readString(item, 'OwnerUPN'),
  created: readString(item, 'Created'),
  modified: readString(item, 'Modified'),
  editor: readExpandedTitle(item, 'Editor')
});

export const mapServiceMonth = (item: Record<string, unknown>): ServiceMonth => ({
  id: readId(item),
  monthId: readString(item, 'MonthId'),
  title: readString(item, 'Title'),
  period: readDate(item, 'Period'),
  country: readEnum(item, 'Country', enumValues(Country), Country.ES),
  incidents: readNumber(item, 'Incidents'),
  interactions: readNumber(item, 'Interactions'),
  requests: readNumber(item, 'Requests'),
  calls: readNumber(item, 'Calls'),
  users: readNumber(item, 'Users'),
  slaPct: readOptionalNumber(item, 'SlaPct'),
  npsScore: readOptionalNumber(item, 'NpsScore'),
  npsResponses: readNumber(item, 'NpsResponses'),
  backlog: readNumber(item, 'Backlog'),
  notes: readString(item, 'Notes'),
  created: readString(item, 'Created'),
  modified: readString(item, 'Modified'),
  editor: readExpandedTitle(item, 'Editor')
});

export const mapCatalog = (item: Record<string, unknown>): CatalogEntry => ({
  id: readId(item),
  catalogId: readString(item, 'CatalogId'),
  title: readString(item, 'Title'),
  category: readEnum(item, 'Category', enumValues(CatalogCategory), CatalogCategory.OTHER),
  kind: readEnum(item, 'Kind', enumValues(CatalogKind), CatalogKind.INTERACTION),
  keywords: readString(item, 'Keywords'),
  guidance: readString(item, 'Guidance'),
  articleId: readString(item, 'ArticleId'),
  status: readEnum(item, 'Status', enumValues(CatalogStatus), CatalogStatus.ACTIVE),
  created: readString(item, 'Created'),
  modified: readString(item, 'Modified'),
  editor: readExpandedTitle(item, 'Editor')
});
