export enum RiskStatus {
  OPEN = 'OPEN',
  MITIGATING = 'MITIGATING',
  ACCEPTED = 'ACCEPTED',
  CLOSED = 'CLOSED'
}

/** Used for both the probability and the impact of a risk. */
export enum RiskScale {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export interface Risk {
  id?: number;
  riskId: string;
  title: string;
  description: string;
  status: RiskStatus;
  probability: RiskScale;
  impact: RiskScale;
  ownerUpn: string;
  mitigation: string;
  dueDate?: string;
  projectId?: string;
  initiativeId?: string;
  meetingId?: string;
  created?: string;
  modified?: string;
  editor?: string;
}
