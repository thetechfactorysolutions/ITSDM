export enum ProjectStatus {
  PLANNING = 'PLANNING',
  ACTIVE = 'ACTIVE',
  AT_RISK = 'AT_RISK',
  BLOCKED = 'BLOCKED',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum ProjectRiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface Project {
  id?: number;
  projectId: string;
  initiativeId?: string;
  title: string;
  description: string;
  status: ProjectStatus;
  ownerUpn: string;
  startDate?: string;
  endDate?: string;
  budgetAmount: number;
  forecastAmount: number;
  riskLevel: ProjectRiskLevel;
  plannerPlanId?: string;
  created?: string;
  modified?: string;
  editor?: string;
}
