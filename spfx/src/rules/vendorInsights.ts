import { CapexItem, Contract, Entitlement, Incident, Interaction, LinkItem, OpexItem, Purchase, PurchaseStatus } from '../models';
import { needsContractAttention } from './finance';
import { needsEntitlementAttention } from './matters';
import { isFollowUpOverdue, isIncidentOpen } from './operations';
import { awaitingDelivery } from './purchases';

/** What each vendor has going on across the whole app, to tell the main ones and the ones with something pending. */

export interface IVendorFacts {
  incidents: Incident[];
  contracts: Contract[];
  entitlements: Entitlement[];
  interactions: Interaction[];
  purchases: Purchase[];
  capex: CapexItem[];
  opex: OpexItem[];
  links: LinkItem[];
}

export interface IVendorPending {
  incidents: number;
  renewals: number;
  followUps: number;
  purchases: number;
  total: number;
}

const mine = <T extends { vendorId?: string }>(items: T[], vendorId: string): T[] => items.filter(i => i.vendorId === vendorId);

/** How many records mention the vendor: the more it appears, the more it is used. */
export const vendorActivity = (vendorId: string, facts: IVendorFacts): number =>
  mine(facts.incidents, vendorId).length + mine(facts.contracts, vendorId).length + mine(facts.entitlements, vendorId).length + mine(facts.interactions, vendorId).length +
  mine(facts.purchases, vendorId).length + mine(facts.capex, vendorId).length + mine(facts.opex, vendorId).length + mine(facts.links, vendorId).length;

/** Open incidents, contracts or warranties to renew, follow-ups that are late, and purchases to approve or waiting to arrive. */
export const vendorPending = (vendorId: string, facts: IVendorFacts, now: Date = new Date()): IVendorPending => {
  const incidents = mine(facts.incidents, vendorId).filter(i => isIncidentOpen(i.status)).length;
  const renewals = mine(facts.contracts, vendorId).filter(c => needsContractAttention(c, now)).length + mine(facts.entitlements, vendorId).filter(e => needsEntitlementAttention(e, now)).length;
  const followUps = mine(facts.interactions, vendorId).filter(i => isFollowUpOverdue(i, now)).length;
  const vendorPurchases = mine(facts.purchases, vendorId);
  const purchases = vendorPurchases.filter(p => p.status === PurchaseStatus.REQUESTED).length + awaitingDelivery(vendorPurchases).length;
  return { incidents, renewals, followUps, purchases, total: incidents + renewals + followUps + purchases };
};
