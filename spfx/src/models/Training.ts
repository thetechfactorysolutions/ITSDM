export enum TrainingStatus {
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum TrainingType {
  COURSE = 'COURSE',
  CERTIFICATION = 'CERTIFICATION',
  WORKSHOP = 'WORKSHOP',
  SELF_STUDY = 'SELF_STUDY',
  MENTORING = 'MENTORING'
}

export interface Training {
  id?: number;
  trainingId: string;
  title: string;
  status: TrainingStatus;
  type: TrainingType;
  personUpn: string;
  /** Who gives the training, as free text. */
  provider: string;
  /** The skill it works on (business id of a skill record). */
  skillId?: string;
  vendorId?: string;
  startDate?: string;
  dueDate?: string;
  completedDate?: string;
  /** Informative: it is not added to any budget. */
  cost: number;
  notes: string;
  created?: string;
  modified?: string;
  editor?: string;
}
