export enum DecisionStatus {
  PROPOSED = 'PROPOSED',
  DECIDED = 'DECIDED',
  SUPERSEDED = 'SUPERSEDED'
}

export interface Decision {
  id?: number;
  decisionId: string;
  title: string;
  /** The situation that called for a decision. */
  description: string;
  /** Why this option was chosen. */
  rationale: string;
  status: DecisionStatus;
  decidedBy: string;
  decisionDate?: string;
  projectId?: string;
  initiativeId?: string;
  meetingId?: string;
  created?: string;
  modified?: string;
  editor?: string;
}
