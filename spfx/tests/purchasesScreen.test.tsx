import './helpers/globals';
import assert from 'node:assert/strict';
import * as React from 'react';
import PurchasesTab from '../src/components/Purchases/PurchasesTab';
import { PoStatus, Purchase, PurchaseOrder, PurchaseRoleEntry, PurchaseRoleType as R, PurchaseStatus as S } from '../src/models';
import { addDays, toDayKey } from '../src/rules/dates';
import { click, mount, settle, unmount } from './helpers/dom';
import { button, newRec, renderWith, setField, text } from './helpers/hub';

const day = (offset: number): string => addDays(toDayKey(new Date()), offset);

const buy = (id: number, title: string, status: S, over: Partial<Purchase> = {}): Purchase => ({
  id, purchaseId: `PUR-${id}`, title, quantity: 2, unitPrice: 10, amount: 20, category: 'Peripherals', vendorId: '', poNumber: 'PO-1', status, requestedBy: 'ana@x.com', requestedOn: day(-3),
  orderedOn: '', receivedOn: '', decisionBy: '', decisionDate: '', decisionNotes: '', reason: '', notes: '', ...over
});
const po = (id: number, title: string, amount: number): PurchaseOrder => ({ id, poId: `PO-ID-${id}`, title, vendorId: '', amount, status: PoStatus.OPEN, notes: '' });
const role = (id: number, userUpn: string, r: R): PurchaseRoleEntry => ({ id, title: userUpn, userUpn, role: r, notes: '' });

const tab = (label: string): HTMLElement | undefined =>
  Array.from(document.body.querySelectorAll('[role="tab"]')).filter(b => (b.textContent ?? '').trim() === label)[0] as HTMLElement | undefined;
const byLabel = (label: string): HTMLButtonElement | undefined =>
  Array.from(document.body.querySelectorAll('button')).filter(b => b.getAttribute('aria-label') === label)[0] as HTMLButtonElement | undefined;

const data = {
  purchases: [
    buy(1, 'Headsets', S.REQUESTED, { requestedBy: 'ana@x.com', amount: 84, quantity: 2, unitPrice: 42 }),
    buy(2, 'Privacy filters', S.REQUESTED, { requestedBy: 'me@x.com', poNumber: '' }),
    buy(3, 'USB-C cables', S.RECEIVED, { requestedBy: 'ana@x.com', amount: 164.8, receivedOn: day(-1) }),
    buy(4, 'Webcams', S.ORDERED, { requestedBy: 'me@x.com', amount: 260 })
  ],
  purchaseOrders: [po(1, 'PO-1', 1000)]
};

const testApprover = async (): Promise<void> => {
  // nobody is listed: the person using the app can do everything
  const rec = newRec();
  await mount(renderWith(React.createElement(PurchasesTab), data, rec));
  await settle();
  assert.ok(text().indexOf('Your role: Approver.') > -1);
  assert.ok(text().indexOf('Waiting for your approval (2)') > -1, 'both pending requests are listed for approval');
  assert.ok(text().indexOf('Headsets') > -1 && text().indexOf('USB-C cables') > -1);
  assert.ok(/Total amount\s*\d/.test(text()), 'the total of what is shown');
  assert.ok(tab('Purchase orders') && tab('Roles'), 'an approver has the three views');

  await click(byLabel('Approve: Headsets') as HTMLButtonElement);
  await settle();
  const confirm = Array.from(document.body.querySelectorAll('button')).filter(b => (b.textContent ?? '').trim() === 'Approve');
  await click(confirm[confirm.length - 1] as HTMLButtonElement);
  await settle();
  assert.equal(rec.updated.length, 1);
  assert.equal(rec.updated[0].id, 1);
  assert.equal(rec.updated[0].payload.Status, 'APPROVED');
  assert.equal(rec.updated[0].payload.DecisionBy, 'me@x.com');

  // the purchase orders show what is left, worked out from the requests
  await click(tab('Purchase orders') as HTMLElement);
  await settle();
  assert.ok(text().indexOf('PO-1') > -1);
  assert.ok(text().indexOf('424.8') > -1, 'charged: the received cables and the ordered webcams');
  assert.ok(text().indexOf('575.2') > -1, 'what remains of the 1000');
  assert.ok(text().indexOf('Waiting for approval') > -1 && text().indexOf('84') > -1, 'and what waits for approval (the headsets)');
  await unmount();

  // in Spanish
  await mount(renderWith(React.createElement(PurchasesTab), data, newRec(), 'es'));
  await settle();
  assert.ok(text().indexOf('Tu rol: Aprobador.') > -1);
  assert.ok(text().indexOf('Esperan tu aprobación (2)') > -1);
  await unmount();
};

const testRequester = async (): Promise<void> => {
  const rec = newRec();
  const withRoles = { ...data, purchaseRoles: [role(1, 'boss@x.com', R.APPROVER), role(2, 'me@x.com', R.REQUESTER)] };
  await mount(renderWith(React.createElement(PurchasesTab), withRoles, rec));
  await settle();
  assert.ok(text().indexOf('Your role: Requester.') > -1);
  assert.ok(text().indexOf('Privacy filters') > -1 && text().indexOf('Webcams') > -1, 'a requester sees their own requests');
  assert.equal(text().indexOf('Headsets'), -1, 'and not the ones of other people');
  assert.equal(text().indexOf('USB-C cables'), -1);
  assert.equal(tab('Purchase orders'), undefined, 'the money is not theirs');
  assert.equal(tab('Roles'), undefined);
  assert.equal(text().indexOf('Waiting for your approval'), -1, 'no approvals for a requester');
  assert.equal(button('Import CSV'), undefined, 'and no import');

  // a request: it starts as REQUESTED, from this person, with the amount worked out
  await click(button('New request') as HTMLButtonElement);
  await settle();
  await setField('Product', 'Wireless mouse');
  await setField('Quantity', '3');
  await setField('Unit price', '12.5');
  await click(button('Save') as HTMLButtonElement);
  await settle(80);
  assert.equal(rec.created.length, 1);
  const created = rec.created[0];
  assert.equal(created.Status, 'REQUESTED');
  assert.equal(created.RequestedBy, 'me@x.com');
  assert.equal(created.Quantity, 3);
  assert.equal(created.Amount, 37.5, 'quantity times unit price');
  assert.ok(String(created.PurchaseId).indexOf('PUR-') === 0);
  assert.ok(String(created.RequestedOn).length > 0);
  await unmount();
};

const testViewer = async (): Promise<void> => {
  const withRoles = { ...data, purchaseRoles: [role(1, 'boss@x.com', R.APPROVER), role(2, 'me@x.com', R.VIEWER)] };
  await mount(renderWith(React.createElement(PurchasesTab), withRoles, newRec()));
  await settle();
  assert.ok(text().indexOf('Your role: View only.') > -1);
  assert.ok(text().indexOf('Headsets') > -1, 'a viewer sees everything');
  assert.equal(button('New request'), undefined, 'and creates nothing');
  assert.equal(text().indexOf('Waiting for your approval'), -1);
  assert.ok(tab('Purchase orders'), 'the viewer may look at the purchase orders');
  assert.equal(tab('Roles'), undefined);
  const edit = button('Edit') as HTMLButtonElement;
  assert.ok(edit.disabled || edit.getAttribute('aria-disabled') === 'true', 'nothing to edit');
  await unmount();
};

const testManager = async (): Promise<void> => {
  const withRoles = { ...data, purchaseRoles: [role(1, 'boss@x.com', R.APPROVER), role(2, 'me@x.com', R.BUYER)] };
  await mount(renderWith(React.createElement(PurchasesTab), withRoles, newRec()));
  await settle();
  assert.ok(text().indexOf('Your role: Order manager.') > -1);
  assert.ok(text().indexOf('Headsets') > -1, 'the manager sees every request');
  assert.equal(text().indexOf('Waiting for your approval'), -1, 'but cannot approve');
  assert.equal(byLabel('Approve: Headsets'), undefined);
  assert.ok(tab('Purchase orders'));
  assert.equal(tab('Roles'), undefined);
  await unmount();
};

const testImport = async (): Promise<void> => {
  // the data of the old app goes in with its own column names, dates and Yes/No
  const rec = newRec();
  await mount(renderWith(React.createElement(PurchasesTab), {}, rec));
  await settle();
  await click(button('Import CSV') as HTMLButtonElement);
  await settle();
  const csv = [
    'Cantidad,Producto,Usuario,Fecha Pedido,Importe,PO,Fecha Recibido,Notas,Recibido',
    '2,Trailing limpieza,Ana,28/10/2026,75,PO-1,,,No',
    '40,Cable USB C,Luis,"Wed, Sep 3, 2026",164.8,PO-1,25/09/2026,Stock,Sí'
  ].join(String.fromCharCode(10));
  await setField('Or paste the CSV text', csv);
  await settle();
  assert.ok(text().indexOf('2 rows, 2 valid') > -1 || text().indexOf('Import 2 rows') > -1, 'both rows are read');
  await click(button('Import 2 rows') as HTMLButtonElement);
  await settle(100);
  assert.equal(rec.createdItems.length, 2);
  const [a, b] = rec.createdItems.map(c => c.payload);
  assert.equal(rec.createdItems[0].list, 'IT_36_Purchases');
  assert.equal(a.Title, 'Trailing limpieza');
  assert.equal(a.Quantity, 2);
  assert.equal(a.Amount, 75, 'no unit price: the amount written is kept');
  assert.equal(a.RequestedBy, 'Ana');
  assert.ok(String(a.RequestedOn).indexOf('2026-10-28') === 0, 'the date in day/month/year');
  assert.equal(a.PoNumber, 'PO-1');
  assert.equal(a.Status, 'ORDERED', '"No" means not received yet');
  assert.equal(b.Status, 'RECEIVED', '"Sí" means received');
  assert.ok(String(b.RequestedOn).indexOf('2026-09-03') === 0, 'and the date as the old app shows it');
  assert.ok(String(b.ReceivedOn).indexOf('2026-09-25') === 0);
  assert.equal(b.Notes, 'Stock');
  await unmount();
};

const run = async (): Promise<void> => {
  await testImport();
  await testApprover();
  await testRequester();
  await testViewer();
  await testManager();
  console.log('purchases screen tests passed');
  process.exit(0);
};

run().catch(error => {
  console.error(error);
  process.exit(1);
});
