export enum IdeaStatus {
  NEW = 'NEW',
  DISCOVERY = 'DISCOVERY',
  VALIDATED = 'VALIDATED',
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  PILOT = 'PILOT',
  ROLLOUT = 'ROLLOUT',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

export interface Idea {
  id?: number;
  ideaId: string;
  title: string;
  description: string;
  status: IdeaStatus;
  ownerUpn: string;
  sponsorUpn?: string;
  estimatedValue?: number;
  targetDate?: string;
  tags: string[];
  convertedInitiativeId?: string;
  created?: string;
  modified?: string;
  editor?: string;
}
