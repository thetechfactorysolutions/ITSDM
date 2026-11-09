import { StockItem, StockStatus } from '../models';
import { dayKeyFromValue, toDayKey } from './dates';

/** Rules for the stock of devices. Pure, so they are tested without a screen. */

/** OK; LOW (at or below the alarm level and nothing on order that would fix it); ORDERED (at or below the level but what is on order would lift it above). */
export type StockLevel = 'OK' | 'LOW' | 'ORDERED';

/** What there will be once the order arrives. */
export const projectedStock = (item: Pick<StockItem, 'onHand' | 'onOrder'>): number => item.onHand + item.onOrder;

export const stockLevel = (item: StockItem): StockLevel => {
  if (item.status !== StockStatus.ACTIVE || item.minLevel <= 0 || item.onHand > item.minLevel) {
    return 'OK';
  }
  return projectedStock(item) > item.minLevel ? 'ORDERED' : 'LOW';
};

/** True when something has to be ordered now. */
export const needsOrder = (item: StockItem): boolean => stockLevel(item) === 'LOW';

/** An order that should have arrived by now: there are devices on order and the expected day has passed. */
export const isOrderLate = (item: StockItem, now: Date = new Date()): boolean => {
  const expected = dayKeyFromValue(item.expectedOn);
  return item.status === StockStatus.ACTIVE && item.onOrder > 0 && !!expected && expected < toDayKey(now);
};

/** Everything of this kind in the company's hands: on the shelf and in use. */
export const fleetSize = (item: Pick<StockItem, 'onHand' | 'inUse'>): number => item.onHand + item.inUse;

/** How many times the alarm level is covered by what is on the shelf, with two decimals; undefined without an alarm level. */
export const coverage = (item: Pick<StockItem, 'onHand' | 'minLevel'>): number | undefined =>
  item.minLevel > 0 ? Math.round((item.onHand / item.minLevel) * 100) / 100 : undefined;

/** The value of what is on order. */
export const orderValue = (item: Pick<StockItem, 'onOrder' | 'unitCost'>): number => item.onOrder * item.unitCost;

export const needsStockAttention = (item: StockItem, now: Date = new Date()): boolean => needsOrder(item) || isOrderLate(item, now);
