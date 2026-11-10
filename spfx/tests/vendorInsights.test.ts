import assert from 'node:assert/strict';
import { IVendorFacts, vendorActivity, vendorPending } from '../src/rules/vendorInsights';

const NOW = new Date(2026, 10, 10);
const none: IVendorFacts = { incidents: [], contracts: [], entitlements: [], interactions: [], purchases: [], capex: [], opex: [], links: [] };

const facts: IVendorFacts = {
  ...none,
  incidents: [
    { status: 'OPEN', vendorId: 'V1' }, { status: 'IN_PROGRESS', vendorId: 'V1' }, { status: 'RESOLVED', vendorId: 'V1' }, { status: 'OPEN', vendorId: 'V2' }
  ] as unknown as IVendorFacts['incidents'],
  contracts: [
    { vendorId: 'V1', status: 'ACTIVE', endDate: '2026-11-20', noticeDays: 30, autoRenew: false }, { vendorId: 'V1', status: 'ACTIVE', endDate: '2030-01-01', noticeDays: 30, autoRenew: false }
  ] as unknown as IVendorFacts['contracts'],
  interactions: [{ vendorId: 'V1', status: 'FOLLOW_UP', followUpDate: '2026-11-01' }, { vendorId: 'V2', status: 'FOLLOW_UP', followUpDate: '2027-01-01' }] as unknown as IVendorFacts['interactions'],
  purchases: [
    { vendorId: 'V1', status: 'REQUESTED' }, { vendorId: 'V1', status: 'ORDERED' }, { vendorId: 'V1', status: 'RECEIVED' }, { vendorId: 'V2', status: 'APPROVED' }
  ] as unknown as IVendorFacts['purchases'],
  links: [{ vendorId: 'V1' }, { vendorId: 'V3' }] as unknown as IVendorFacts['links']
};

assert.equal(vendorActivity('V1', facts), 3 + 2 + 0 + 1 + 3 + 0 + 0 + 1, 'every record that mentions the vendor counts');
assert.equal(vendorActivity('V2', facts), 1 + 0 + 0 + 1 + 1);
assert.equal(vendorActivity('V9', facts), 0);
assert.equal(vendorActivity('V1', none), 0);

const p1 = vendorPending('V1', facts, NOW);
assert.equal(p1.incidents, 2, 'the resolved one is not pending');
assert.equal(p1.renewals, 1, 'the contract that ends soon, not the one that ends in 2030');
assert.equal(p1.followUps, 1);
assert.equal(p1.purchases, 2, 'one to approve and one waiting to arrive; the received one is done');
assert.equal(p1.total, 6);
const p2 = vendorPending('V2', facts, NOW);
assert.deepEqual(p2, { incidents: 1, renewals: 0, followUps: 0, purchases: 1, total: 2 });
assert.equal(vendorPending('V3', facts, NOW).total, 0);

console.log('vendor insights tests passed');
