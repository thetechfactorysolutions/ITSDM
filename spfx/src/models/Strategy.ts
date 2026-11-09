import { ActionPriority } from './Action';
import { IApprovalState } from './Approval';

export enum ObjectiveStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ACHIEVED = 'ACHIEVED',
  CANCELLED = 'CANCELLED'
}

/** What IT is trying to achieve; business cases and KPIs point to it. */
export interface Objective {
  id?: number;
  objectiveId: string;
  title: string;
  description: string;
  ownerUpn: string;
  sponsorUpn: string;
  startDate?: string;
  targetDate?: string;
  status: ObjectiveStatus;
  priority: ActionPriority;
  /** What reaching it means, e.g. "NPS of 85 or more". */
  goal: string;
  /** The KPI that measures it. */
  kpiId?: string;
  created?: string;
  modified?: string;
  editor?: string;
}

export enum CaseStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ARCHIVED = 'ARCHIVED'
}

/** The reasoning behind an investment: the problem, the options, the recommendation, what it costs and what it brings. */
export interface BusinessCase {
  id?: number;
  caseId: string;
  title: string;
  problem: string;
  /** The options considered. */
  options: string;
  recommendation: string;
  risks: string;
  estimatedCost: number;
  /** What it brings in a year, in money. */
  annualBenefit: number;
  objectiveId?: string;
  initiativeId?: string;
  projectId?: string;
  ownerUpn: string;
  status: CaseStatus;
  decisionDate?: string;
  decisionNotes: string;
  created?: string;
  modified?: string;
  editor?: string;
  approval?: IApprovalState;
}

export enum WeeklyReviewStatus {
  DRAFT = 'DRAFT',
  COMPLETED = 'COMPLETED'
}

/** The weekly management review: what happened, what to decide, what to do next. */
export interface WeeklyReview {
  id?: number;
  reviewId: string;
  title: string;
  /** The Monday of the week reviewed. */
  weekStart?: string;
  status: WeeklyReviewStatus;
  happened: string;
  wentWell: string;
  wentWrong: string;
  attention: string;
  decisions: string;
  risks: string;
  priorities: string;
  stopDoing: string;
  startDoing: string;
  ownerUpn: string;
  created?: string;
  modified?: string;
  editor?: string;
}
