import { Country } from './Service';

export enum StockCategory {
  LAPTOP = 'LAPTOP',
  TABLET = 'TABLET',
  PHONE = 'PHONE',
  MONITOR = 'MONITOR',
  HEADSET = 'HEADSET',
  ACCESSORY = 'ACCESSORY',
  NETWORK = 'NETWORK',
  OTHER = 'OTHER'
}

export enum StockOwnership {
  RENTED = 'RENTED',
  PURCHASED = 'PURCHASED'
}

export enum StockStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED'
}

/** A type of device, counted: how many are on the shelf, in use and on order, and the level that must raise an alarm. */
export interface StockItem {
  id?: number;
  stockId: string;
  title: string;
  category: StockCategory;
  country: Country;
  onHand: number;
  /** Alarm when the stock is at or below this many. Zero turns the alarm off. */
  minLevel: number;
  inUse: number;
  onOrder: number;
  expectedOn?: string;
  unitCost: number;
  ownership: StockOwnership;
  vendorId?: string;
  status: StockStatus;
  notes: string;
  created?: string;
  modified?: string;
  editor?: string;
}
