export enum IncidentStatus {
  NEW = 'NEW',
  IN_PROGRESS = 'IN_PROGRESS',
  ON_HOLD = 'ON_HOLD',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED'
}

export enum IncidentSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum IncidentCategory {
  APPLICATION = 'APPLICATION',
  INFRASTRUCTURE = 'INFRASTRUCTURE',
  NETWORK = 'NETWORK',
  SECURITY = 'SECURITY',
  ACCESS = 'ACCESS',
  OTHER = 'OTHER'
}

export interface Incident {
  id?: number;
  incidentId: string;
  title: string;
  description: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  category: IncidentCategory;
  reportedBy: string;
  assignedTo: string;
  reportedOn?: string;
  resolvedOn?: string;
  resolution: string;
  rootCause: string;
  projectId?: string;
  vendorId?: string;
  created?: string;
  modified?: string;
  editor?: string;
}
