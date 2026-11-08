import { ActionItem, IApprovalState, Idea, Initiative, Meeting, Note, Project } from '../models';
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

/** Columns requested from each list. Asking only for what the app uses keeps the responses small. */
export const SELECT = {
  ideas: ['Id', 'Title', 'IdeaId', 'Description', 'Status', 'OwnerUPN', 'SponsorUPN', 'EstimatedValue', 'TargetDate', 'Tags', 'ConvertedInitiativeId', 'ApprovalRule', 'ApprovalStatus', 'Approver', 'ApprovalRequestedOn', 'ApprovalDecidedOn', 'ApprovalDecidedBy', 'ApprovalComment', 'Created', 'Modified', 'Editor/Title'],
  initiatives: ['Id', 'Title', 'InitiativeId', 'Description', 'Status', 'OwnerUPN', 'ProgressPct', 'TargetDate', 'SourceIdeaId', 'PlannerPlanId', 'ApprovalRule', 'ApprovalStatus', 'Approver', 'ApprovalRequestedOn', 'ApprovalDecidedOn', 'ApprovalDecidedBy', 'ApprovalComment', 'Created', 'Modified', 'Editor/Title'],
  projects: ['Id', 'Title', 'ProjectId', 'InitiativeId', 'Description', 'Status', 'OwnerUPN', 'StartDate', 'EndDate', 'BudgetAmount', 'ForecastAmount', 'RiskLevel', 'PlannerPlanId', 'ApprovalRule', 'ApprovalStatus', 'Approver', 'ApprovalRequestedOn', 'ApprovalDecidedOn', 'ApprovalDecidedBy', 'ApprovalComment', 'Created', 'Modified', 'Editor/Title'],
  actions: ['Id', 'Title', 'ActionId', 'InitiativeId', 'ProjectId', 'Description', 'Status', 'Priority', 'OwnerUPN', 'DueDate', 'CompletedDate', 'PlannerTaskId', 'ApprovalRule', 'ApprovalStatus', 'Approver', 'ApprovalRequestedOn', 'ApprovalDecidedOn', 'ApprovalDecidedBy', 'ApprovalComment', 'Created', 'Modified', 'Editor/Title'],
  meetings: ['Id', 'Title', 'MeetingId', 'MeetingDate', 'Summary', 'Attendees', 'Transcript', 'ImportedItems', 'Created', 'Modified', 'Editor/Title'],
  notes: ['Id', 'Title', 'NoteId', 'Body', 'Category', 'Status', 'MeetingId', 'InitiativeId', 'ProjectId', 'Created', 'Modified', 'Editor/Title']
};

export const EXPAND_EDITOR = ['Editor'];
