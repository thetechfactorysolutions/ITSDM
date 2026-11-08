export enum InitiativeStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface Initiative {
  id?: number;
  initiativeId: string;
  title: string;
  description: string;
  status: InitiativeStatus;
  ownerUpn: string;
  progressPct: number;
  targetDate?: string;
  sourceIdeaId?: string;
  plannerPlanId?: string;
  created?: string;
  modified?: string;
}
