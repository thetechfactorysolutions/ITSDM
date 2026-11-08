export enum NoteCategory {
  DECISION = 'DECISION',
  RISK = 'RISK',
  INFO = 'INFO',
  FOLLOW_UP = 'FOLLOW_UP'
}

export enum NoteStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED'
}

export interface Note {
  id?: number;
  noteId: string;
  title: string;
  body: string;
  category: NoteCategory;
  status: NoteStatus;
  meetingId?: string;
  initiativeId?: string;
  projectId?: string;
  created?: string;
  modified?: string;
  editor?: string;
}
