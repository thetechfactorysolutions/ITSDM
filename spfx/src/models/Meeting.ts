export interface Meeting {
  id?: number;
  meetingId: string;
  title: string;
  meetingDate?: string;
  summary: string;
  attendees: string;
  transcript: string;
  importedItems: string;
  created?: string;
  modified?: string;
  editor?: string;
}
