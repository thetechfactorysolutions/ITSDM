import { IApprovalState } from './Approval';
import { RiskScale } from './Risk';

export enum ChangeStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  IMPLEMENTED = 'IMPLEMENTED'
}

export enum ChangeType {
  STANDARD = 'STANDARD',
  NORMAL = 'NORMAL',
  EMERGENCY = 'EMERGENCY'
}

export interface ChangeRequest {
  id?: number;
  changeId: string;
  title: string;
  /** What is going to change. */
  description: string;
  /** Why it is needed. */
  reason: string;
  status: ChangeStatus;
  changeType: ChangeType;
  /** Risk of making the change, on the same Low / Medium / High scale as risks. */
  risk: RiskScale;
  plannedDate?: string;
  implementedDate?: string;
  backoutPlan: string;
  /** Who asks for the change. */
  ownerUpn: string;
  projectId?: string;
  created?: string;
  modified?: string;
  editor?: string;
  approval?: IApprovalState;
}
