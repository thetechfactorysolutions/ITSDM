export enum LinkStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED'
}

/** A web page used often (a vendor portal, a console...). Named LinkItem so it does not clash with Fluent's Link. */
export interface LinkItem {
  id?: number;
  linkId: string;
  title: string;
  /** Only http and https addresses are accepted. */
  url: string;
  /** Free text; the lists group by it. */
  category: string;
  description: string;
  /** Pinned links are shown on the dashboard. */
  pinned: boolean;
  status: LinkStatus;
  vendorId?: string;
  created?: string;
  modified?: string;
  editor?: string;
}
