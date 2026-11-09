export enum AreaStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED'
}

/** A topic that matters are grouped by (budget, building, a service...). Editable in the app. */
export interface Area {
  id?: number;
  areaId: string;
  title: string;
  description: string;
  status: AreaStatus;
  /** Position in the lists; lower comes first. */
  sortOrder: number;
  created?: string;
  modified?: string;
  editor?: string;
}
