import { IApprovalState } from './Approval';

export enum ArticleStatus {
  DRAFT = 'DRAFT',
  IN_REVIEW = 'IN_REVIEW',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED'
}

export enum ArticleCategory {
  HOW_TO = 'HOW_TO',
  RUNBOOK = 'RUNBOOK',
  FAQ = 'FAQ',
  POLICY = 'POLICY',
  REFERENCE = 'REFERENCE'
}

/** A knowledge base article. */
export interface Article {
  id?: number;
  articleId: string;
  title: string;
  summary: string;
  body: string;
  category: ArticleCategory;
  status: ArticleStatus;
  ownerUpn: string;
  /** Free words that help to find it, separated by commas. */
  tags: string;
  publishedOn?: string;
  /** When it should be read again to check it is still right. */
  reviewDate?: string;
  projectId?: string;
  vendorId?: string;
  /** The incident that led to writing it, if any. */
  incidentId?: string;
  created?: string;
  modified?: string;
  editor?: string;
  approval?: IApprovalState;
}
