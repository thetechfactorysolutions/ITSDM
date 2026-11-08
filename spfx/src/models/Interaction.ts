export enum InteractionType {
  MEETING = 'MEETING',
  CALL = 'CALL',
  EMAIL = 'EMAIL',
  WORKSHOP = 'WORKSHOP',
  OTHER = 'OTHER'
}

export enum InteractionStatus {
  LOGGED = 'LOGGED',
  FOLLOW_UP = 'FOLLOW_UP',
  DONE = 'DONE'
}

/** A contact with a stakeholder, with the follow-up it left behind. */
export interface Interaction {
  id?: number;
  interactionId: string;
  title: string;
  type: InteractionType;
  status: InteractionStatus;
  interactionDate?: string;
  contactName: string;
  contactEmail: string;
  organization: string;
  summary: string;
  nextSteps: string;
  followUpDate?: string;
  /** Who held the interaction on our side. */
  ownerUpn: string;
  projectId?: string;
  vendorId?: string;
  meetingId?: string;
  created?: string;
  modified?: string;
  editor?: string;
}
