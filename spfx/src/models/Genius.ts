/** The formats of the Genius Help Desk programme, a way to teach users instead of only fixing what breaks. */
export enum GeniusType {
  /** A short weekly session. */
  CORNER = 'CORNER',
  /** A short practical tip. */
  TIP = 'TIP',
  /** Structured learning. */
  ACADEMY = 'ACADEMY',
  /** A quiz or challenge. */
  CHALLENGE = 'CHALLENGE',
  /** An open session where anyone asks IT. */
  ASK_IT = 'ASK_IT'
}

export enum GeniusStatus {
  IDEA = 'IDEA',
  PLANNED = 'PLANNED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED'
}

export interface GeniusSession {
  id?: number;
  sessionId: string;
  title: string;
  type: GeniusType;
  /** What it is about, e.g. OneDrive space. */
  topic: string;
  status: GeniusStatus;
  sessionDate?: string;
  /** Who it is for. */
  audience: string;
  /** Who gives it. */
  ownerUpn: string;
  invited: number;
  attended: number;
  /** Average rating from 0 to 5; empty when nobody rated it. */
  satisfaction?: number;
  /** Link to the slides or the recording (http or https). */
  materialUrl: string;
  articleId?: string;
  /** The catalogue entry (a kind of recurring contact) that motivated it. */
  catalogId?: string;
  /** What made you plan it. */
  motivation: string;
  created?: string;
  modified?: string;
  editor?: string;
}
