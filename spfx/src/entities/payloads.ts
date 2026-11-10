import {
  ActionItem, Area, Purchase, PurchaseOrder, PurchaseRoleEntry, Article, BusinessCase, Budget, CatalogEntry, GeniusSession, NpsResponse, Objective, ServiceMonth, StockItem, WeeklyReview, CapexItem, ChangeRequest, Contract, Decision, Entitlement, IApprovalState, Idea, Incident, Initiative, Interaction, Kpi, Lesson, LinkItem, Matter, Meeting, Note, OpexItem, Project, Review, Risk, Skill, Training, Vendor
} from '../models';
import { getApproval } from '../rules/approvals';
import { dayKeyToSharePoint } from '../rules/dates';

/**
 * What is sent to SharePoint when an item is created or updated, shared by the forms, the CSV
 * import and the transcript import so all three write exactly the same shape.
 */

/** The approval columns of an item, as written to SharePoint. */
export const buildApprovalPayload = (approval: IApprovalState): Record<string, unknown> => ({
  ApprovalRule: approval.ruleId,
  ApprovalStatus: approval.status,
  Approver: approval.approver,
  ApprovalRequestedOn: dayKeyToSharePoint(approval.requestedOn),
  ApprovalDecidedOn: dayKeyToSharePoint(approval.decidedOn),
  ApprovalDecidedBy: approval.decidedBy,
  ApprovalComment: approval.comment
});

export const buildIdeaPayload = (idea: Idea): Record<string, unknown> => ({
  Title: idea.title.trim(),
  IdeaId: idea.ideaId,
  Description: idea.description,
  Status: idea.status,
  OwnerUPN: idea.ownerUpn,
  SponsorUPN: idea.sponsorUpn ?? '',
  EstimatedValue: idea.estimatedValue ?? 0,
  TargetDate: dayKeyToSharePoint(idea.targetDate),
  Tags: idea.tags.join(','),
  ConvertedInitiativeId: idea.convertedInitiativeId ?? '',
  ...buildApprovalPayload(getApproval(idea))
});

export const buildInitiativePayload = (initiative: Initiative): Record<string, unknown> => ({
  Title: initiative.title.trim(),
  InitiativeId: initiative.initiativeId,
  Description: initiative.description,
  Status: initiative.status,
  OwnerUPN: initiative.ownerUpn,
  ProgressPct: initiative.progressPct,
  TargetDate: dayKeyToSharePoint(initiative.targetDate),
  SourceIdeaId: initiative.sourceIdeaId ?? '',
  PlannerPlanId: initiative.plannerPlanId ?? '',
  ...buildApprovalPayload(getApproval(initiative))
});

export const buildProjectPayload = (project: Project): Record<string, unknown> => ({
  Title: project.title.trim(),
  ProjectId: project.projectId,
  InitiativeId: project.initiativeId ?? '',
  Description: project.description,
  Status: project.status,
  OwnerUPN: project.ownerUpn,
  StartDate: dayKeyToSharePoint(project.startDate),
  EndDate: dayKeyToSharePoint(project.endDate),
  BudgetAmount: project.budgetAmount,
  ForecastAmount: project.forecastAmount,
  RiskLevel: project.riskLevel,
  PlannerPlanId: project.plannerPlanId ?? '',
  ...buildApprovalPayload(getApproval(project))
});

export const buildActionPayload = (action: ActionItem): Record<string, unknown> => ({
  Title: action.title.trim(),
  ActionId: action.actionId,
  InitiativeId: action.initiativeId ?? '',
  ProjectId: action.projectId ?? '',
  Description: action.description,
  Status: action.status,
  Priority: action.priority,
  OwnerUPN: action.ownerUpn,
  DueDate: dayKeyToSharePoint(action.dueDate),
  CompletedDate: dayKeyToSharePoint(action.completedDate),
  PlannerTaskId: action.plannerTaskId ?? '',
  ...buildApprovalPayload(getApproval(action))
});

export const buildMeetingPayload = (meeting: Meeting): Record<string, unknown> => ({
  Title: meeting.title.trim(),
  MeetingId: meeting.meetingId,
  MeetingDate: dayKeyToSharePoint(meeting.meetingDate),
  Summary: meeting.summary,
  Attendees: meeting.attendees,
  Transcript: meeting.transcript,
  ImportedItems: meeting.importedItems
});

export const buildNotePayload = (note: Note): Record<string, unknown> => ({
  Title: note.title.trim(),
  NoteId: note.noteId,
  Body: note.body,
  Category: note.category,
  Status: note.status,
  MeetingId: note.meetingId ?? '',
  InitiativeId: note.initiativeId ?? '',
  ProjectId: note.projectId ?? ''
});

export const buildRiskPayload = (risk: Risk): Record<string, unknown> => ({
  Title: risk.title.trim(),
  RiskId: risk.riskId,
  Description: risk.description,
  Status: risk.status,
  Probability: risk.probability,
  Impact: risk.impact,
  OwnerUPN: risk.ownerUpn,
  Mitigation: risk.mitigation,
  DueDate: dayKeyToSharePoint(risk.dueDate),
  ProjectId: risk.projectId ?? '',
  InitiativeId: risk.initiativeId ?? '',
  MeetingId: risk.meetingId ?? ''
});

export const buildDecisionPayload = (decision: Decision): Record<string, unknown> => ({
  Title: decision.title.trim(),
  DecisionId: decision.decisionId,
  Description: decision.description,
  Rationale: decision.rationale,
  Status: decision.status,
  DecidedBy: decision.decidedBy,
  DecisionDate: dayKeyToSharePoint(decision.decisionDate),
  ProjectId: decision.projectId ?? '',
  InitiativeId: decision.initiativeId ?? '',
  MeetingId: decision.meetingId ?? ''
});

export const buildLessonPayload = (lesson: Lesson): Record<string, unknown> => ({
  Title: lesson.title.trim(),
  LessonId: lesson.lessonId,
  Description: lesson.description,
  Recommendation: lesson.recommendation,
  Category: lesson.category,
  Status: lesson.status,
  OwnerUPN: lesson.ownerUpn,
  ProjectId: lesson.projectId ?? '',
  InitiativeId: lesson.initiativeId ?? '',
  MeetingId: lesson.meetingId ?? ''
});

export const buildReviewPayload = (review: Review): Record<string, unknown> => ({
  Title: review.title.trim(),
  ReviewId: review.reviewId,
  ReviewType: review.reviewType,
  Status: review.status,
  Health: review.health,
  ReviewDate: dayKeyToSharePoint(review.reviewDate),
  NextReviewDate: dayKeyToSharePoint(review.nextReviewDate),
  Summary: review.summary,
  NextSteps: review.nextSteps,
  OwnerUPN: review.ownerUpn,
  ProjectId: review.projectId ?? '',
  InitiativeId: review.initiativeId ?? ''
});

export const buildBudgetPayload = (budget: Budget): Record<string, unknown> => ({
  Title: budget.title.trim(),
  BudgetId: budget.budgetId,
  FiscalYear: budget.fiscalYear,
  Description: budget.description,
  Status: budget.status,
  PlannedAmount: budget.plannedAmount,
  OwnerUPN: budget.ownerUpn
});

export const buildCapexPayload = (capex: CapexItem): Record<string, unknown> => ({
  Title: capex.title.trim(),
  CapexId: capex.capexId,
  Description: capex.description,
  Status: capex.status,
  Amount: capex.amount,
  ExpenseDate: dayKeyToSharePoint(capex.expenseDate),
  InvoiceRef: capex.invoiceRef,
  OwnerUPN: capex.ownerUpn,
  BudgetId: capex.budgetId ?? '',
  ProjectId: capex.projectId ?? '',
  VendorId: capex.vendorId ?? '',
  ...buildApprovalPayload(getApproval(capex))
});

export const buildOpexPayload = (opex: OpexItem): Record<string, unknown> => ({
  Title: opex.title.trim(),
  OpexId: opex.opexId,
  Description: opex.description,
  Status: opex.status,
  Amount: opex.amount,
  Frequency: opex.frequency,
  ExpenseDate: dayKeyToSharePoint(opex.expenseDate),
  OwnerUPN: opex.ownerUpn,
  BudgetId: opex.budgetId ?? '',
  ProjectId: opex.projectId ?? '',
  VendorId: opex.vendorId ?? '',
  ContractId: opex.contractId ?? '',
  ...buildApprovalPayload(getApproval(opex))
});

export const buildVendorPayload = (vendor: Vendor): Record<string, unknown> => ({
  Title: vendor.title.trim(),
  VendorId: vendor.vendorId,
  Description: vendor.description,
  Status: vendor.status,
  Category: vendor.category,
  ContactName: vendor.contactName,
  ContactEmail: vendor.contactEmail,
  Website: vendor.website,
  OwnerUPN: vendor.ownerUpn
});

export const buildContractPayload = (contract: Contract): Record<string, unknown> => ({
  Title: contract.title.trim(),
  ContractId: contract.contractId,
  Description: contract.description,
  Status: contract.status,
  VendorId: contract.vendorId ?? '',
  StartDate: dayKeyToSharePoint(contract.startDate),
  EndDate: dayKeyToSharePoint(contract.endDate),
  NoticeDays: contract.noticeDays,
  AnnualValue: contract.annualValue,
  AutoRenew: contract.autoRenew,
  OwnerUPN: contract.ownerUpn,
  ProjectId: contract.projectId ?? '',
  ...buildApprovalPayload(getApproval(contract))
});

export const buildIncidentPayload = (incident: Incident): Record<string, unknown> => ({
  Title: incident.title.trim(),
  IncidentId: incident.incidentId,
  Description: incident.description,
  Status: incident.status,
  Severity: incident.severity,
  Category: incident.category,
  ReportedBy: incident.reportedBy,
  AssignedTo: incident.assignedTo,
  ReportedOn: dayKeyToSharePoint(incident.reportedOn),
  ResolvedOn: dayKeyToSharePoint(incident.resolvedOn),
  Resolution: incident.resolution,
  RootCause: incident.rootCause,
  ProjectId: incident.projectId ?? '',
  VendorId: incident.vendorId ?? ''
});

export const buildChangePayload = (change: ChangeRequest): Record<string, unknown> => ({
  Title: change.title.trim(),
  ChangeId: change.changeId,
  Description: change.description,
  Reason: change.reason,
  Status: change.status,
  ChangeType: change.changeType,
  Risk: change.risk,
  PlannedDate: dayKeyToSharePoint(change.plannedDate),
  ImplementedDate: dayKeyToSharePoint(change.implementedDate),
  BackoutPlan: change.backoutPlan,
  OwnerUPN: change.ownerUpn,
  ProjectId: change.projectId ?? '',
  ...buildApprovalPayload(getApproval(change))
});

export const buildInteractionPayload = (interaction: Interaction): Record<string, unknown> => ({
  Title: interaction.title.trim(),
  InteractionId: interaction.interactionId,
  InteractionType: interaction.type,
  Status: interaction.status,
  InteractionDate: dayKeyToSharePoint(interaction.interactionDate),
  ContactName: interaction.contactName,
  ContactEmail: interaction.contactEmail,
  Organization: interaction.organization,
  Summary: interaction.summary,
  NextSteps: interaction.nextSteps,
  FollowUpDate: dayKeyToSharePoint(interaction.followUpDate),
  OwnerUPN: interaction.ownerUpn,
  ProjectId: interaction.projectId ?? '',
  VendorId: interaction.vendorId ?? '',
  MeetingId: interaction.meetingId ?? ''
});

export const buildKpiPayload = (kpi: Kpi): Record<string, unknown> => ({
  Title: kpi.title.trim(),
  KpiId: kpi.kpiId,
  Description: kpi.description,
  Category: kpi.category,
  Status: kpi.status,
  Unit: kpi.unit,
  Direction: kpi.direction,
  Target: kpi.target,
  CurrentValue: kpi.currentValue,
  // null clears the column: a KPI with no previous value must not be read back as zero.
  PreviousValue: kpi.previousValue === undefined ? null : kpi.previousValue,
  MeasuredOn: dayKeyToSharePoint(kpi.measuredOn),
  OwnerUPN: kpi.ownerUpn,
  ProjectId: kpi.projectId ?? ''
});

/** Columns requested from each list. Asking only for what the app uses keeps the responses small. */
export const buildSkillPayload = (skill: Skill): Record<string, unknown> => ({
  Title: skill.title.trim(),
  SkillId: skill.skillId,
  PersonUPN: skill.personUpn,
  Category: skill.category,
  Level: skill.level,
  TargetLevel: skill.targetLevel,
  Status: skill.status,
  LastAssessed: dayKeyToSharePoint(skill.lastAssessed),
  Certification: skill.certification,
  CertificationExpiry: dayKeyToSharePoint(skill.certificationExpiry),
  Notes: skill.notes
});

export const buildTrainingPayload = (training: Training): Record<string, unknown> => ({
  Title: training.title.trim(),
  TrainingId: training.trainingId,
  Status: training.status,
  TrainingType: training.type,
  PersonUPN: training.personUpn,
  Provider: training.provider,
  SkillId: training.skillId ?? '',
  VendorId: training.vendorId ?? '',
  StartDate: dayKeyToSharePoint(training.startDate),
  DueDate: dayKeyToSharePoint(training.dueDate),
  CompletedDate: dayKeyToSharePoint(training.completedDate),
  Cost: training.cost,
  Notes: training.notes
});

export const buildArticlePayload = (article: Article): Record<string, unknown> => ({
  Title: article.title.trim(),
  ArticleId: article.articleId,
  Summary: article.summary,
  Body: article.body,
  Category: article.category,
  Status: article.status,
  OwnerUPN: article.ownerUpn,
  Tags: article.tags,
  PublishedOn: dayKeyToSharePoint(article.publishedOn),
  ReviewDate: dayKeyToSharePoint(article.reviewDate),
  ProjectId: article.projectId ?? '',
  VendorId: article.vendorId ?? '',
  IncidentId: article.incidentId ?? '',
  ...buildApprovalPayload(getApproval(article))
});

export const buildMatterPayload = (matter: Matter): Record<string, unknown> => ({
  Title: matter.title.trim(),
  MatterId: matter.matterId,
  Description: matter.description,
  Notes: matter.notes,
  Status: matter.status,
  Priority: matter.priority,
  AreaId: matter.areaId ?? '',
  Source: matter.source,
  SourceRef: matter.sourceRef,
  Sender: matter.sender,
  ReceivedOn: dayKeyToSharePoint(matter.receivedOn),
  DueDate: dayKeyToSharePoint(matter.dueDate),
  ClosedOn: dayKeyToSharePoint(matter.closedOn),
  OwnerUPN: matter.ownerUpn,
  ProjectId: matter.projectId ?? '',
  ContractId: matter.contractId ?? '',
  IncidentId: matter.incidentId ?? '',
  VendorId: matter.vendorId ?? ''
});

export const buildAreaPayload = (area: Area): Record<string, unknown> => ({
  Title: area.title.trim(),
  AreaId: area.areaId,
  Description: area.description,
  Status: area.status,
  SortOrder: area.sortOrder
});

export const buildLinkPayload = (link: LinkItem): Record<string, unknown> => ({
  Title: link.title.trim(),
  LinkId: link.linkId,
  Url: link.url.trim(),
  Category: link.category.trim(),
  Description: link.description,
  Pinned: link.pinned ? 'YES' : 'NO',
  Status: link.status,
  VendorId: link.vendorId ?? ''
});

export const buildEntitlementPayload = (entitlement: Entitlement): Record<string, unknown> => ({
  Title: entitlement.title.trim(),
  EntitlementId: entitlement.entitlementId,
  EntitlementType: entitlement.type,
  Status: entitlement.status,
  Product: entitlement.product,
  Reference: entitlement.reference,
  Quantity: entitlement.quantity,
  StartDate: dayKeyToSharePoint(entitlement.startDate),
  EndDate: dayKeyToSharePoint(entitlement.endDate),
  NoticeDays: entitlement.noticeDays,
  AnnualCost: entitlement.annualCost,
  VendorId: entitlement.vendorId ?? '',
  ContractId: entitlement.contractId ?? '',
  OwnerUPN: entitlement.ownerUpn,
  Notes: entitlement.notes
});

export const buildNpsPayload = (response: NpsResponse): Record<string, unknown> => ({
  Title: response.title.trim(),
  ResponseId: response.responseId,
  Score: response.score,
  Comment: response.comment,
  RespondedOn: dayKeyToSharePoint(response.respondedOn),
  Channel: response.channel,
  Country: response.country,
  TicketRef: response.ticketRef,
  Status: response.status,
  FollowUpDate: dayKeyToSharePoint(response.followUpDate),
  FollowUpNotes: response.followUpNotes,
  OwnerUPN: response.ownerUpn
});

export const buildServiceMonthPayload = (month: ServiceMonth): Record<string, unknown> => ({
  Title: month.title.trim(),
  MonthId: month.monthId,
  Period: dayKeyToSharePoint(month.period),
  Country: month.country,
  Incidents: month.incidents,
  Interactions: month.interactions,
  Requests: month.requests,
  Calls: month.calls,
  Users: month.users,
  // null clears the column: a month with no SLA reported must not be read back as zero.
  SlaPct: month.slaPct === undefined ? null : month.slaPct,
  NpsScore: month.npsScore === undefined ? null : month.npsScore,
  NpsResponses: month.npsResponses,
  Backlog: month.backlog,
  Notes: month.notes
});

export const buildCatalogPayload = (entry: CatalogEntry): Record<string, unknown> => ({
  Title: entry.title.trim(),
  CatalogId: entry.catalogId,
  Category: entry.category,
  Kind: entry.kind,
  Keywords: entry.keywords,
  Guidance: entry.guidance,
  ArticleId: entry.articleId ?? '',
  Status: entry.status
});

export const buildStockPayload = (item: StockItem): Record<string, unknown> => ({
  Title: item.title.trim(),
  StockId: item.stockId,
  Category: item.category,
  Country: item.country,
  OnHand: item.onHand,
  MinLevel: item.minLevel,
  InUse: item.inUse,
  OnOrder: item.onOrder,
  ExpectedOn: dayKeyToSharePoint(item.expectedOn),
  UnitCost: item.unitCost,
  Ownership: item.ownership,
  VendorId: item.vendorId ?? '',
  Status: item.status,
  Notes: item.notes
});

export const buildGeniusPayload = (session: GeniusSession): Record<string, unknown> => ({
  Title: session.title.trim(),
  SessionId: session.sessionId,
  SessionType: session.type,
  Topic: session.topic,
  Status: session.status,
  SessionDate: dayKeyToSharePoint(session.sessionDate),
  Audience: session.audience,
  OwnerUPN: session.ownerUpn,
  Invited: session.invited,
  Attended: session.attended,
  // null clears the column: a session nobody rated must not be read back as a zero rating.
  Satisfaction: session.satisfaction === undefined ? null : session.satisfaction,
  MaterialUrl: session.materialUrl.trim(),
  ArticleId: session.articleId ?? '',
  CatalogId: session.catalogId ?? '',
  Motivation: session.motivation
});

export const buildObjectivePayload = (objective: Objective): Record<string, unknown> => ({
  Title: objective.title.trim(),
  ObjectiveId: objective.objectiveId,
  Description: objective.description,
  OwnerUPN: objective.ownerUpn,
  SponsorUPN: objective.sponsorUpn,
  StartDate: dayKeyToSharePoint(objective.startDate),
  TargetDate: dayKeyToSharePoint(objective.targetDate),
  Status: objective.status,
  Priority: objective.priority,
  Goal: objective.goal,
  KpiId: objective.kpiId ?? ''
});

export const buildCasePayload = (businessCase: BusinessCase): Record<string, unknown> => ({
  Title: businessCase.title.trim(),
  CaseId: businessCase.caseId,
  Problem: businessCase.problem,
  Options: businessCase.options,
  Recommendation: businessCase.recommendation,
  Risks: businessCase.risks,
  EstimatedCost: businessCase.estimatedCost,
  AnnualBenefit: businessCase.annualBenefit,
  ObjectiveId: businessCase.objectiveId ?? '',
  InitiativeId: businessCase.initiativeId ?? '',
  ProjectId: businessCase.projectId ?? '',
  OwnerUPN: businessCase.ownerUpn,
  Status: businessCase.status,
  DecisionDate: dayKeyToSharePoint(businessCase.decisionDate),
  DecisionNotes: businessCase.decisionNotes,
  ...buildApprovalPayload(getApproval(businessCase))
});

export const buildWeeklyPayload = (review: WeeklyReview): Record<string, unknown> => ({
  Title: review.title.trim(),
  ReviewId: review.reviewId,
  WeekStart: dayKeyToSharePoint(review.weekStart),
  Status: review.status,
  Happened: review.happened,
  WentWell: review.wentWell,
  WentWrong: review.wentWrong,
  Attention: review.attention,
  Decisions: review.decisions,
  Risks: review.risks,
  Priorities: review.priorities,
  StopDoing: review.stopDoing,
  StartDoing: review.startDoing,
  OwnerUPN: review.ownerUpn
});

export const SELECT = {
  ideas: ['Id', 'Title', 'IdeaId', 'Description', 'Status', 'OwnerUPN', 'SponsorUPN', 'EstimatedValue', 'TargetDate', 'Tags', 'ConvertedInitiativeId', 'ApprovalRule', 'ApprovalStatus', 'Approver', 'ApprovalRequestedOn', 'ApprovalDecidedOn', 'ApprovalDecidedBy', 'ApprovalComment', 'Created', 'Modified', 'Editor/Title'],
  initiatives: ['Id', 'Title', 'InitiativeId', 'Description', 'Status', 'OwnerUPN', 'ProgressPct', 'TargetDate', 'SourceIdeaId', 'PlannerPlanId', 'ApprovalRule', 'ApprovalStatus', 'Approver', 'ApprovalRequestedOn', 'ApprovalDecidedOn', 'ApprovalDecidedBy', 'ApprovalComment', 'Created', 'Modified', 'Editor/Title'],
  projects: ['Id', 'Title', 'ProjectId', 'InitiativeId', 'Description', 'Status', 'OwnerUPN', 'StartDate', 'EndDate', 'BudgetAmount', 'ForecastAmount', 'RiskLevel', 'PlannerPlanId', 'ApprovalRule', 'ApprovalStatus', 'Approver', 'ApprovalRequestedOn', 'ApprovalDecidedOn', 'ApprovalDecidedBy', 'ApprovalComment', 'Created', 'Modified', 'Editor/Title'],
  actions: ['Id', 'Title', 'ActionId', 'InitiativeId', 'ProjectId', 'Description', 'Status', 'Priority', 'OwnerUPN', 'DueDate', 'CompletedDate', 'PlannerTaskId', 'ApprovalRule', 'ApprovalStatus', 'Approver', 'ApprovalRequestedOn', 'ApprovalDecidedOn', 'ApprovalDecidedBy', 'ApprovalComment', 'Created', 'Modified', 'Editor/Title'],
  meetings: ['Id', 'Title', 'MeetingId', 'MeetingDate', 'Summary', 'Attendees', 'Transcript', 'ImportedItems', 'Created', 'Modified', 'Editor/Title'],
  risks: ['Id', 'Title', 'RiskId', 'Description', 'Status', 'Probability', 'Impact', 'OwnerUPN', 'Mitigation', 'DueDate', 'ProjectId', 'InitiativeId', 'MeetingId', 'Created', 'Modified', 'Editor/Title'],
  decisions: ['Id', 'Title', 'DecisionId', 'Description', 'Rationale', 'Status', 'DecidedBy', 'DecisionDate', 'ProjectId', 'InitiativeId', 'MeetingId', 'Created', 'Modified', 'Editor/Title'],
  lessons: ['Id', 'Title', 'LessonId', 'Description', 'Recommendation', 'Category', 'Status', 'OwnerUPN', 'ProjectId', 'InitiativeId', 'MeetingId', 'Created', 'Modified', 'Editor/Title'],
  reviews: ['Id', 'Title', 'ReviewId', 'ReviewType', 'Status', 'Health', 'ReviewDate', 'NextReviewDate', 'Summary', 'NextSteps', 'OwnerUPN', 'ProjectId', 'InitiativeId', 'Created', 'Modified', 'Editor/Title'],
  budgets: ['Id', 'Title', 'BudgetId', 'FiscalYear', 'Description', 'Status', 'PlannedAmount', 'OwnerUPN', 'Created', 'Modified', 'Editor/Title'],
  capex: ['Id', 'Title', 'CapexId', 'Description', 'Status', 'Amount', 'ExpenseDate', 'InvoiceRef', 'OwnerUPN', 'BudgetId', 'ProjectId', 'VendorId', 'ApprovalRule', 'ApprovalStatus', 'Approver', 'ApprovalRequestedOn', 'ApprovalDecidedOn', 'ApprovalDecidedBy', 'ApprovalComment', 'Created', 'Modified', 'Editor/Title'],
  opex: ['Id', 'Title', 'OpexId', 'Description', 'Status', 'Amount', 'Frequency', 'ExpenseDate', 'OwnerUPN', 'BudgetId', 'ProjectId', 'VendorId', 'ContractId', 'ApprovalRule', 'ApprovalStatus', 'Approver', 'ApprovalRequestedOn', 'ApprovalDecidedOn', 'ApprovalDecidedBy', 'ApprovalComment', 'Created', 'Modified', 'Editor/Title'],
  vendors: ['Id', 'Title', 'VendorId', 'Description', 'Status', 'Category', 'ContactName', 'ContactEmail', 'Website', 'OwnerUPN', 'Created', 'Modified', 'Editor/Title'],
  contracts: ['Id', 'Title', 'ContractId', 'Description', 'Status', 'VendorId', 'StartDate', 'EndDate', 'NoticeDays', 'AnnualValue', 'AutoRenew', 'OwnerUPN', 'ProjectId', 'ApprovalRule', 'ApprovalStatus', 'Approver', 'ApprovalRequestedOn', 'ApprovalDecidedOn', 'ApprovalDecidedBy', 'ApprovalComment', 'Created', 'Modified', 'Editor/Title'],
  incidents: ['Id', 'Title', 'IncidentId', 'Description', 'Status', 'Severity', 'Category', 'ReportedBy', 'AssignedTo', 'ReportedOn', 'ResolvedOn', 'Resolution', 'RootCause', 'ProjectId', 'VendorId', 'Created', 'Modified', 'Editor/Title'],
  changes: ['Id', 'Title', 'ChangeId', 'Description', 'Reason', 'Status', 'ChangeType', 'Risk', 'PlannedDate', 'ImplementedDate', 'BackoutPlan', 'OwnerUPN', 'ProjectId', 'ApprovalRule', 'ApprovalStatus', 'Approver', 'ApprovalRequestedOn', 'ApprovalDecidedOn', 'ApprovalDecidedBy', 'ApprovalComment', 'Created', 'Modified', 'Editor/Title'],
  interactions: ['Id', 'Title', 'InteractionId', 'InteractionType', 'Status', 'InteractionDate', 'ContactName', 'ContactEmail', 'Organization', 'Summary', 'NextSteps', 'FollowUpDate', 'OwnerUPN', 'ProjectId', 'VendorId', 'MeetingId', 'Created', 'Modified', 'Editor/Title'],
  kpis: ['Id', 'Title', 'KpiId', 'Description', 'Category', 'Status', 'Unit', 'Direction', 'Target', 'CurrentValue', 'PreviousValue', 'MeasuredOn', 'OwnerUPN', 'ProjectId', 'Created', 'Modified', 'Editor/Title'],
  skills: ['Id', 'Title', 'SkillId', 'PersonUPN', 'Category', 'Level', 'TargetLevel', 'Status', 'LastAssessed', 'Certification', 'CertificationExpiry', 'Notes', 'Created', 'Modified', 'Editor/Title'],
  trainings: ['Id', 'Title', 'TrainingId', 'Status', 'TrainingType', 'PersonUPN', 'Provider', 'SkillId', 'VendorId', 'StartDate', 'DueDate', 'CompletedDate', 'Cost', 'Notes', 'Created', 'Modified', 'Editor/Title'],
  articles: ['Id', 'Title', 'ArticleId', 'Summary', 'Body', 'Category', 'Status', 'OwnerUPN', 'Tags', 'PublishedOn', 'ReviewDate', 'ProjectId', 'VendorId', 'IncidentId', 'ApprovalRule', 'ApprovalStatus', 'Approver', 'ApprovalRequestedOn', 'ApprovalDecidedOn', 'ApprovalDecidedBy', 'ApprovalComment', 'Created', 'Modified', 'Editor/Title'],
  notes: ['Id', 'Title', 'NoteId', 'Body', 'Category', 'Status', 'MeetingId', 'InitiativeId', 'ProjectId', 'Created', 'Modified', 'Editor/Title'],
  matters: ['Id', 'Title', 'MatterId', 'Description', 'Notes', 'Status', 'Priority', 'AreaId', 'Source', 'SourceRef', 'Sender', 'ReceivedOn', 'DueDate', 'ClosedOn', 'OwnerUPN', 'ProjectId', 'ContractId', 'IncidentId', 'VendorId', 'Created', 'Modified', 'Editor/Title'],
  areas: ['Id', 'Title', 'AreaId', 'Description', 'Status', 'SortOrder', 'Created', 'Modified', 'Editor/Title'],
  links: ['Id', 'Title', 'LinkId', 'Url', 'Category', 'Description', 'Pinned', 'Status', 'VendorId', 'Created', 'Modified', 'Editor/Title'],
  entitlements: ['Id', 'Title', 'EntitlementId', 'EntitlementType', 'Status', 'Product', 'Reference', 'Quantity', 'StartDate', 'EndDate', 'NoticeDays', 'AnnualCost', 'VendorId', 'ContractId', 'OwnerUPN', 'Notes', 'Created', 'Modified', 'Editor/Title'],
  nps: ['Id', 'Title', 'ResponseId', 'Score', 'Comment', 'RespondedOn', 'Channel', 'Country', 'TicketRef', 'Status', 'FollowUpDate', 'FollowUpNotes', 'OwnerUPN', 'Created', 'Modified', 'Editor/Title'],
  serviceMonths: ['Id', 'Title', 'MonthId', 'Period', 'Country', 'Incidents', 'Interactions', 'Requests', 'Calls', 'Users', 'SlaPct', 'NpsScore', 'NpsResponses', 'Backlog', 'Notes', 'Created', 'Modified', 'Editor/Title'],
  catalog: ['Id', 'Title', 'CatalogId', 'Category', 'Kind', 'Keywords', 'Guidance', 'ArticleId', 'Status', 'Created', 'Modified', 'Editor/Title'],
  stock: ['Id', 'Title', 'StockId', 'Category', 'Country', 'OnHand', 'MinLevel', 'InUse', 'OnOrder', 'ExpectedOn', 'UnitCost', 'Ownership', 'VendorId', 'Status', 'Notes', 'Created', 'Modified', 'Editor/Title'],
  genius: ['Id', 'Title', 'SessionId', 'SessionType', 'Topic', 'Status', 'SessionDate', 'Audience', 'OwnerUPN', 'Invited', 'Attended', 'Satisfaction', 'MaterialUrl', 'ArticleId', 'CatalogId', 'Motivation', 'Created', 'Modified', 'Editor/Title'],
  objectives: ['Id', 'Title', 'ObjectiveId', 'Description', 'OwnerUPN', 'SponsorUPN', 'StartDate', 'TargetDate', 'Status', 'Priority', 'Goal', 'KpiId', 'Created', 'Modified', 'Editor/Title'],
  businessCases: ['Id', 'Title', 'CaseId', 'Problem', 'Options', 'Recommendation', 'Risks', 'EstimatedCost', 'AnnualBenefit', 'ObjectiveId', 'InitiativeId', 'ProjectId', 'OwnerUPN', 'Status', 'DecisionDate', 'DecisionNotes', 'ApprovalRule', 'ApprovalStatus', 'Approver', 'ApprovalRequestedOn', 'ApprovalDecidedOn', 'ApprovalDecidedBy', 'ApprovalComment', 'Created', 'Modified', 'Editor/Title'],
  purchaseOrders: ['Id', 'Title', 'PoId', 'VendorId', 'Amount', 'Status', 'Notes', 'Created', 'Modified', 'Editor/Title'],
  purchases: ['Id', 'Title', 'PurchaseId', 'Quantity', 'UnitPrice', 'Amount', 'Category', 'VendorId', 'PoNumber', 'Status', 'RequestedBy', 'RequestedOn', 'OrderedOn', 'ReceivedOn', 'DecisionBy', 'DecisionDate', 'DecisionNotes', 'Reason', 'Notes', 'Created', 'Modified', 'Editor/Title'],
  purchaseRoles: ['Id', 'Title', 'UserUPN', 'Role', 'Notes', 'Created', 'Modified', 'Editor/Title'],
  weeklyReviews: ['Id', 'Title', 'ReviewId', 'WeekStart', 'Status', 'Happened', 'WentWell', 'WentWrong', 'Attention', 'Decisions', 'Risks', 'Priorities', 'StopDoing', 'StartDoing', 'OwnerUPN', 'Created', 'Modified', 'Editor/Title']
};

export const EXPAND_EDITOR = ['Editor'];

export const buildPurchasePayload = (purchase: Purchase): Record<string, unknown> => ({
  Title: purchase.title.trim(),
  PurchaseId: purchase.purchaseId,
  Quantity: purchase.quantity,
  UnitPrice: purchase.unitPrice,
  Amount: purchase.amount,
  Category: purchase.category.trim(),
  VendorId: purchase.vendorId ?? '',
  PoNumber: purchase.poNumber.trim(),
  Status: purchase.status,
  RequestedBy: purchase.requestedBy,
  RequestedOn: dayKeyToSharePoint(purchase.requestedOn),
  OrderedOn: dayKeyToSharePoint(purchase.orderedOn),
  ReceivedOn: dayKeyToSharePoint(purchase.receivedOn),
  DecisionBy: purchase.decisionBy,
  DecisionDate: dayKeyToSharePoint(purchase.decisionDate),
  DecisionNotes: purchase.decisionNotes,
  Reason: purchase.reason,
  Notes: purchase.notes
});

export const buildPurchaseOrderPayload = (po: PurchaseOrder): Record<string, unknown> => ({
  Title: po.title.trim(),
  PoId: po.poId,
  VendorId: po.vendorId ?? '',
  Amount: po.amount,
  Status: po.status,
  Notes: po.notes
});

export const buildPurchaseRolePayload = (entry: PurchaseRoleEntry): Record<string, unknown> => ({
  Title: entry.title.trim(),
  UserUPN: entry.userUpn.trim(),
  Role: entry.role,
  Notes: entry.notes
});
