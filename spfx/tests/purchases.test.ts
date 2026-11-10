import assert from 'node:assert/strict';
import { Purchase, PurchaseOrder, PurchaseRoleEntry, PurchaseRoleType as R, PurchaseStatus as S, PoStatus } from '../src/models';
import {
  allowedStatuses, applyPurchaseEffects, awaitingDelivery, canCreatePurchase, canDeletePurchase, canEditPurchase, canSeeAll, categoriesUsed, countsAgainstPo, editableGroups,
  filterPurchases, importedDay, importedPurchaseStatus, poFigures, posToWatch, purchaseAmount, purchaseChangeProblem, requestsToApprove, roleOf, sumAmount, visiblePurchases
} from '../src/rules/purchases';
import { validatePurchase, validatePurchaseOrder, validatePurchaseRole } from '../src/rules/validation';

const ME = 'me@x.com';
const ANA = 'ana@x.com';
const BOB = 'bob@x.com';

const buy = (over: Partial<Purchase> = {}): Purchase => ({
  purchaseId: 'P-1', title: 'Mouse', quantity: 1, unitPrice: 0, amount: 0, category: '', vendorId: '', poNumber: '', status: S.REQUESTED, requestedBy: ANA, requestedOn: '2026-11-01',
  orderedOn: '', receivedOn: '', decisionBy: '', decisionDate: '', decisionNotes: '', reason: '', notes: '', ...over
});
const po = (title: string, amount: number, status: PoStatus = PoStatus.OPEN): PurchaseOrder => ({ poId: `PO-${title}`, title, vendorId: '', amount, status, notes: '' });
const role = (userUpn: string, r: R): PurchaseRoleEntry => ({ title: userUpn, userUpn, role: r, notes: '' });

const testRoles = (): void => {
  // nobody is an approver yet: the person using the app is one
  assert.equal(roleOf(ME, []), R.APPROVER);
  assert.equal(roleOf(ME, [role(ANA, R.BUYER)]), R.APPROVER, 'a list without an approver does not lock anyone out');
  const roles = [role(ME, R.APPROVER), role(ANA, R.BUYER), role(BOB, R.VIEWER)];
  assert.equal(roleOf('ME@X.COM', roles), R.APPROVER, 'case does not matter');
  assert.equal(roleOf(ANA, roles), R.BUYER);
  assert.equal(roleOf(BOB, roles), R.VIEWER);
  assert.equal(roleOf('someone@x.com', roles), R.REQUESTER, 'whoever is not listed is a requester');

  assert.equal(canSeeAll(R.REQUESTER), false);
  assert.ok(canSeeAll(R.BUYER) && canSeeAll(R.VIEWER) && canSeeAll(R.APPROVER));
  assert.equal(canCreatePurchase(R.VIEWER), false);
  assert.ok(canCreatePurchase(R.REQUESTER) && canCreatePurchase(R.BUYER));
  assert.ok(canDeletePurchase(R.APPROVER) && !canDeletePurchase(R.BUYER));
  const items = [buy({ requestedBy: ANA }), buy({ requestedBy: BOB }), buy({ requestedBy: 'ANA@x.com' })];
  assert.equal(visiblePurchases(items, ANA, R.REQUESTER).length, 2, 'a requester sees their own, whatever the case');
  assert.equal(visiblePurchases(items, ANA, R.BUYER).length, 3);
};

const testEditing = (): void => {
  const mine = buy({ requestedBy: ANA });
  assert.deepEqual(editableGroups(R.APPROVER, mine, ME), ['request', 'record', 'tracking']);
  assert.deepEqual(editableGroups(R.VIEWER, mine, ANA), []);
  assert.deepEqual(editableGroups(R.REQUESTER, mine, ANA), ['request'], 'a requester edits their own request');
  assert.deepEqual(editableGroups(R.REQUESTER, mine, BOB), [], 'not somebody else\'s');
  assert.deepEqual(editableGroups(R.REQUESTER, buy({ status: S.APPROVED, requestedBy: ANA }), ANA), [], 'not once it is decided');
  assert.deepEqual(editableGroups(R.REQUESTER, undefined, ANA), ['request'], 'a new one');
  assert.deepEqual(editableGroups(R.BUYER, buy({ status: S.APPROVED }), BOB), ['tracking']);
  assert.deepEqual(editableGroups(R.BUYER, buy({ status: S.REQUESTED }), BOB), [], 'a buyer does not touch what is not approved');
  assert.deepEqual(editableGroups(R.BUYER, buy({ status: S.RECEIVED }), BOB), []);
  assert.ok(canEditPurchase(R.BUYER, buy({ status: S.ORDERED }), BOB));
  assert.ok(!canEditPurchase(R.VIEWER, mine, ANA));

  const a = (role: R, status: S, who = BOB, requestedBy = ANA): S[] => allowedStatuses(role, buy({ status, requestedBy }), who);
  assert.deepEqual(a(R.APPROVER, S.REQUESTED), [S.REQUESTED, S.APPROVED, S.REJECTED, S.CANCELLED]);
  assert.deepEqual(a(R.REQUESTER, S.REQUESTED, ANA), [S.REQUESTED, S.CANCELLED], 'a requester can only cancel their own');
  assert.deepEqual(a(R.REQUESTER, S.REQUESTED, BOB), [S.REQUESTED]);
  assert.deepEqual(a(R.BUYER, S.REQUESTED), [S.REQUESTED], 'a buyer cannot approve');
  assert.deepEqual(a(R.BUYER, S.APPROVED), [S.APPROVED, S.ORDERED]);
  assert.deepEqual(a(R.BUYER, S.ORDERED), [S.ORDERED, S.RECEIVED]);
  assert.deepEqual(a(R.BUYER, S.RECEIVED), [S.RECEIVED], 'only an approver reopens');
  assert.deepEqual(a(R.APPROVER, S.RECEIVED), [S.RECEIVED, S.ORDERED]);
  assert.deepEqual(a(R.APPROVER, S.REJECTED), [S.REJECTED, S.REQUESTED]);
  assert.deepEqual(a(R.VIEWER, S.REQUESTED), [S.REQUESTED]);
};

const testChanges = (): void => {
  const approved = buy({ status: S.APPROVED, title: 'Cable', amount: 50, poNumber: 'PO1' });
  // a buyer changes the tracking and the status, nothing else
  assert.equal(purchaseChangeProblem({ ...approved, status: S.ORDERED, orderedOn: '2026-11-05', notes: 'sent' }, approved, R.BUYER, BOB), undefined);
  assert.equal(purchaseChangeProblem({ ...approved, amount: 5 }, approved, R.BUYER, BOB), 'purchase.fieldsLocked', 'a buyer does not change the amount');
  assert.equal(purchaseChangeProblem({ ...approved, status: S.REJECTED }, approved, R.BUYER, BOB), 'purchase.statusNotAllowed');
  // a requester edits their request but cannot approve it
  const mine = buy({ requestedBy: ANA });
  assert.equal(purchaseChangeProblem({ ...mine, quantity: 3 }, mine, R.REQUESTER, ANA), undefined);
  assert.equal(purchaseChangeProblem({ ...mine, status: S.APPROVED }, mine, R.REQUESTER, ANA), 'purchase.statusNotAllowed');
  assert.equal(purchaseChangeProblem({ ...mine, poNumber: 'PO1' }, mine, R.REQUESTER, ANA), 'purchase.fieldsLocked', 'the PO is not for the requester');
  assert.equal(purchaseChangeProblem({ ...mine, title: 'x' }, mine, R.VIEWER, ANA), 'purchase.fieldsLocked');
  // new ones
  assert.equal(purchaseChangeProblem(buy(), undefined, R.REQUESTER, ANA), undefined);
  assert.equal(purchaseChangeProblem(buy({ status: S.APPROVED }), undefined, R.REQUESTER, ANA), 'purchase.statusNotAllowed', 'a requester cannot create an approved one');
  assert.equal(purchaseChangeProblem(buy({ status: S.RECEIVED }), undefined, R.APPROVER, ME), undefined, 'an approver can, for history');
  assert.equal(purchaseChangeProblem(buy(), undefined, R.VIEWER, ANA), 'purchase.cannotCreate');
};

const testMoney = (): void => {
  assert.equal(purchaseAmount(40, 4.12, 0), 164.8);
  assert.equal(purchaseAmount(3, 0, 119.97), 119.97, 'without a unit price the amount written is kept');
  assert.equal(purchaseAmount(2, 0.1, 99), 0.2, 'the unit price wins');

  assert.ok(countsAgainstPo(S.APPROVED) && countsAgainstPo(S.ORDERED) && countsAgainstPo(S.RECEIVED));
  assert.ok(!countsAgainstPo(S.REQUESTED) && !countsAgainstPo(S.REJECTED) && !countsAgainstPo(S.CANCELLED));

  const items = [
    buy({ poNumber: 'PO1', amount: 100, status: S.RECEIVED }),
    buy({ poNumber: ' po1 ', amount: 50.5, status: S.ORDERED }),
    buy({ poNumber: 'PO1', amount: 30, status: S.REQUESTED }),
    buy({ poNumber: 'PO1', amount: 999, status: S.REJECTED }),
    buy({ poNumber: 'PO2', amount: 10, status: S.APPROVED }),
    buy({ poNumber: '', amount: 77, status: S.APPROVED })
  ];
  const f = poFigures(po('PO1', 200), items);
  assert.deepEqual(f, { amount: 200, spent: 150.5, pending: 30, remaining: 49.5, level: 'OK' });
  assert.equal(poFigures(po('PO1', 160), items).level, 'NEAR', 'from 90 % used');
  assert.equal(poFigures(po('PO1', 150), items).level, 'OVER');
  assert.equal(poFigures(po('PO1', 0), items).level, 'OK', 'a PO without an amount has no limit to warn about');
  assert.equal(poFigures(po('PO9', 100), items).spent, 0);
  assert.equal(sumAmount(items.slice(0, 2)), 150.5);

  const watch = posToWatch([po('PO1', 150), po('PO2', 1000), po('PO3', 1, PoStatus.CLOSED)], items);
  assert.deepEqual(watch.map(p => p.title), ['PO1'], 'only open orders that are near or over');
};

const testLists = (): void => {
  const items = [buy({ status: S.REQUESTED }), buy({ status: S.APPROVED }), buy({ status: S.ORDERED }), buy({ status: S.RECEIVED })];
  assert.equal(requestsToApprove(items).length, 1);
  assert.equal(awaitingDelivery(items).length, 2);
  assert.deepEqual(categoriesUsed([buy({ category: 'Cables' }), buy({ category: ' cables ' }), buy({ category: 'Audio' }), buy({ category: '' })]), ['Audio', 'Cables']);

  const dated = [buy({ requestedOn: '2026-10-01', poNumber: 'PO1' }), buy({ requestedOn: '2026-11-05', poNumber: 'PO1' }), buy({ requestedOn: '2026-11-20', poNumber: 'PO2' }), buy({ requestedOn: '' })];
  assert.equal(filterPurchases(dated, {}).length, 4);
  assert.equal(filterPurchases(dated, { poNumber: 'po1' }).length, 2);
  assert.equal(filterPurchases(dated, { from: '2026-11-01' }).length, 2);
  assert.equal(filterPurchases(dated, { from: '2026-10-01', to: '2026-11-05' }).length, 2, 'both limits are inclusive');
};

const testEffects = (): void => {
  const now = new Date(2026, 10, 10);
  const created = applyPurchaseEffects(buy({ requestedBy: '', requestedOn: '', quantity: 2, unitPrice: 10 }), undefined, ME, now);
  assert.equal(created.amount, 20);
  assert.equal(created.requestedBy, ME, 'the person who creates it is the requester');
  assert.equal(created.requestedOn, '2026-11-10');

  const asked = buy();
  const approved = applyPurchaseEffects({ ...asked, status: S.APPROVED }, asked, ME, now);
  assert.equal(approved.decisionBy, ME);
  assert.equal(approved.decisionDate, '2026-11-10');
  const ordered = applyPurchaseEffects({ ...approved, status: S.ORDERED }, approved, BOB, now);
  assert.equal(ordered.orderedOn, '2026-11-10');
  assert.equal(ordered.decisionBy, ME, 'the decision is not rewritten');
  const typed = applyPurchaseEffects({ ...ordered, status: S.RECEIVED, receivedOn: '2026-11-08' }, ordered, BOB, now);
  assert.equal(typed.receivedOn, '2026-11-08', 'a date typed by hand is kept');
  const history = applyPurchaseEffects(buy({ status: S.RECEIVED, requestedBy: 'Ana', receivedOn: '' }), undefined, ME, now);
  assert.equal(history.requestedBy, 'Ana', 'a name from an import is kept');
  assert.equal(history.receivedOn, '2026-11-10');
};

const testImportStatus = (): void => {
  assert.equal(importedPurchaseStatus('Sí', S.ORDERED), S.RECEIVED);
  assert.equal(importedPurchaseStatus('SI', S.ORDERED), S.RECEIVED);
  assert.equal(importedPurchaseStatus('yes', S.ORDERED), S.RECEIVED);
  assert.equal(importedPurchaseStatus('No', S.RECEIVED), S.ORDERED);
  assert.equal(importedPurchaseStatus('', S.ORDERED), S.ORDERED);
  assert.equal(importedPurchaseStatus('approved', S.ORDERED), S.APPROVED);
  assert.equal(importedPurchaseStatus('nonsense', S.ORDERED), S.ORDERED);
};

const testImportedDay = (): void => {
  assert.equal(importedDay('2026-10-28'), '2026-10-28');
  assert.equal(importedDay('28/10/2026'), '2026-10-28');
  assert.equal(importedDay('8-3-2026'), '2026-03-08', 'day first, as in Spain');
  assert.equal(importedDay('Wed, Oct 28, 2026'), '2026-10-28', 'the format the old app shows');
  assert.equal(importedDay(''), '');
  assert.equal(importedDay('31/02/2026'), '31/02/2026', 'an impossible day is kept so the preview flags it');
  assert.equal(importedDay('not a date'), 'not a date');
};

const testValidation = (): void => {
  assert.deepEqual(validatePurchase(buy({ title: 'x', quantity: 1 })), {});
  assert.equal(validatePurchase(buy({ title: ' ' })).title, 'validation.titleRequired');
  assert.equal(validatePurchase(buy({ quantity: 0 })).quantity, 'validation.quantityInvalid');
  assert.equal(validatePurchase(buy({ amount: -1 })).amount, 'validation.cannotBeNegative');
  assert.equal(validatePurchase(buy({ receivedOn: '2026-02-30' })).receivedOn, 'validation.dateInvalid');
  assert.equal(validatePurchaseOrder(po('', 5)).title, 'validation.titleRequired');
  assert.equal(validatePurchaseOrder(po('PO1', -5)).amount, 'validation.cannotBeNegative');
  assert.equal(validatePurchaseRole({ title: 'Ana', userUpn: 'nope', role: R.BUYER, notes: '' }).ownerUpn, 'validation.ownerInvalid');
  assert.deepEqual(validatePurchaseRole(role(ANA, R.BUYER)), {});
};

testRoles();
testEditing();
testChanges();
testMoney();
testLists();
testEffects();
testImportStatus();
testImportedDay();
testValidation();
console.log('purchases tests passed');
