export enum LessonCategory {
  PROCESS = 'PROCESS',
  TECHNOLOGY = 'TECHNOLOGY',
  PEOPLE = 'PEOPLE',
  VENDOR = 'VENDOR',
  OTHER = 'OTHER'
}

export enum LessonStatus {
  NEW = 'NEW',
  REVIEWED = 'REVIEWED',
  APPLIED = 'APPLIED'
}

export interface Lesson {
  id?: number;
  lessonId: string;
  title: string;
  /** What happened. */
  description: string;
  /** What to do next time. */
  recommendation: string;
  category: LessonCategory;
  status: LessonStatus;
  ownerUpn: string;
  projectId?: string;
  initiativeId?: string;
  meetingId?: string;
  created?: string;
  modified?: string;
  editor?: string;
}
