export enum ReviewType {
  STATUS = 'STATUS',
  RISK = 'RISK',
  FINANCIAL = 'FINANCIAL',
  CLOSURE = 'CLOSURE'
}

export enum ReviewStatus {
  SCHEDULED = 'SCHEDULED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

/** Overall health given by the review. */
export enum ReviewHealth {
  GREEN = 'GREEN',
  AMBER = 'AMBER',
  RED = 'RED'
}

export interface Review {
  id?: number;
  reviewId: string;
  title: string;
  reviewType: ReviewType;
  status: ReviewStatus;
  health: ReviewHealth;
  reviewDate?: string;
  nextReviewDate?: string;
  summary: string;
  nextSteps: string;
  ownerUpn: string;
  projectId?: string;
  initiativeId?: string;
  created?: string;
  modified?: string;
  editor?: string;
}
