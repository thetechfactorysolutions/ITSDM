/** Countries the service is delivered to. */
export enum Country {
  ES = 'ES',
  PT = 'PT',
  OTHER = 'OTHER'
}

export enum NpsChannel {
  KIOSK = 'KIOSK',
  PHONE = 'PHONE',
  CHAT = 'CHAT',
  FLOORWALK = 'FLOORWALK',
  SELF_SERVICE = 'SELF_SERVICE',
  EMAIL = 'EMAIL',
  OTHER = 'OTHER'
}

/** Where a detractor stands in the call-back that follows a low score. */
export enum NpsFollowUp {
  /** Promoters and passives: nobody has to call. */
  NOT_REQUIRED = 'NOT_REQUIRED',
  PENDING = 'PENDING',
  CONTACTED = 'CONTACTED',
  CLOSED = 'CLOSED'
}

/** One answer to the satisfaction survey, with the follow-up it needs when the score is low. */
export interface NpsResponse {
  id?: number;
  responseId: string;
  /** A short reference to recognise it by, e.g. the ticket subject. */
  title: string;
  /** 0 to 10. 9-10 promoter, 7-8 passive, 0-6 detractor. */
  score: number;
  comment: string;
  respondedOn?: string;
  channel: NpsChannel;
  country: Country;
  ticketRef: string;
  status: NpsFollowUp;
  /** The day the person was called. */
  followUpDate?: string;
  /** What they said and what could be improved. */
  followUpNotes: string;
  /** Who makes the call. */
  ownerUpn: string;
  created?: string;
  modified?: string;
  editor?: string;
}

/** The figures of one month in one country, taken from the service report. */
export interface ServiceMonth {
  id?: number;
  monthId: string;
  title: string;
  /** First day of the month. */
  period?: string;
  country: Country;
  incidents: number;
  interactions: number;
  requests: number;
  calls: number;
  /** People served, to compare countries of different size. */
  users: number;
  /** Percentage of incidents solved in time; empty when not reported. */
  slaPct?: number;
  /** Net promoter score, -100 to 100; empty when not reported. */
  npsScore?: number;
  npsResponses: number;
  backlog: number;
  notes: string;
  created?: string;
  modified?: string;
  editor?: string;
}

export enum CatalogCategory {
  ACCESS = 'ACCESS',
  EMAIL_TEAMS = 'EMAIL_TEAMS',
  ONEDRIVE_SHAREPOINT = 'ONEDRIVE_SHAREPOINT',
  DEVICE = 'DEVICE',
  ACCESSORY = 'ACCESSORY',
  APPLICATION = 'APPLICATION',
  NETWORK_WIFI = 'NETWORK_WIFI',
  HOW_TO = 'HOW_TO',
  LOCATION_PEOPLE = 'LOCATION_PEOPLE',
  OTHER = 'OTHER'
}

/** How a contact of that kind is recorded, so every team classifies the same way. */
export enum CatalogKind {
  INCIDENT = 'INCIDENT',
  INTERACTION = 'INTERACTION',
  REQUEST = 'REQUEST'
}

export enum CatalogStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED'
}

/** One type of contact the service gets, with the words that identify it and how to record it. */
export interface CatalogEntry {
  id?: number;
  catalogId: string;
  title: string;
  category: CatalogCategory;
  kind: CatalogKind;
  /** Words or phrases that identify it, separated by commas. */
  keywords: string;
  /** How to answer and record it. */
  guidance: string;
  /** The knowledge base article that explains it, if any. */
  articleId?: string;
  status: CatalogStatus;
  created?: string;
  modified?: string;
  editor?: string;
}
