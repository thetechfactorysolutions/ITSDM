export enum KpiStatus {
  ACTIVE = 'ACTIVE',
  RETIRED = 'RETIRED'
}

export enum KpiCategory {
  SERVICE = 'SERVICE',
  DELIVERY = 'DELIVERY',
  FINANCE = 'FINANCE',
  PEOPLE = 'PEOPLE',
  OTHER = 'OTHER'
}

/** Whether a good result is a high number (availability) or a low one (resolution time). */
export enum KpiDirection {
  HIGHER = 'HIGHER',
  LOWER = 'LOWER'
}

export interface Kpi {
  id?: number;
  kpiId: string;
  /** The name of the indicator. */
  title: string;
  description: string;
  category: KpiCategory;
  status: KpiStatus;
  /** Free text shown next to the numbers: %, days, count... */
  unit: string;
  direction: KpiDirection;
  target: number;
  currentValue: number;
  /** The value before the current one. Empty until the value has been updated once. */
  previousValue?: number;
  measuredOn?: string;
  ownerUpn: string;
  projectId?: string;
  created?: string;
  modified?: string;
  editor?: string;
}
