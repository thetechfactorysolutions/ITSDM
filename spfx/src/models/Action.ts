export enum ActionStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  BLOCKED = 'BLOCKED',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED'
}

export enum ActionPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface ActionItem {
  id?: number;
  actionId: string;
  initiativeId?: string;
  projectId?: string;
  title: string;
  description: string;
  status: ActionStatus;
  priority: ActionPriority;
  ownerUpn: string;
  dueDate?: string;
  completedDate?: string;
  plannerTaskId?: string;
  created?: string;
  modified?: string;
  editor?: string;
}
