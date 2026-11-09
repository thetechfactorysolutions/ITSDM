import './helpers/globals';
import assert from 'node:assert/strict';
import * as React from 'react';
import Stock from '../src/components/Devices/Stock';
import Genius from '../src/components/Genius/Genius';
import { CatalogCategory, CatalogEntry, CatalogKind, CatalogStatus, Country, GeniusSession, GeniusStatus, GeniusType, StockCategory, StockItem, StockOwnership, StockStatus } from '../src/models';
import { addDays, toDayKey } from '../src/rules/dates';
import { click, mount, settle, unmount } from './helpers/dom';
import { button, count, newRec, renderWith, setField, text } from './helpers/hub';

const offset = (days: number): string => addDays(toDayKey(new Date()), days);

const stock = (id: number, title: string, o: Partial<StockItem> = {}): StockItem => ({
  id, stockId: `STK-${id}`, title, category: StockCategory.LAPTOP, country: Country.ES, onHand: 150, minLevel: 100, inUse: 500, onOrder: 0, unitCost: 1000, ownership: StockOwnership.RENTED,
  status: StockStatus.ACTIVE, notes: '', ...o
});
const sessionRow = (id: number, title: string, o: Partial<GeniusSession> = {}): GeniusSession => ({
  id, sessionId: `GEN-${id}`, title, type: GeniusType.CORNER, topic: '', status: GeniusStatus.PLANNED, audience: '', ownerUpn: 'me@x.com', invited: 0, attended: 0, materialUrl: '', motivation: '', ...o
});
const entry = (id: number, title: string): CatalogEntry => ({
  id, catalogId: `CAT-${id}`, title, category: CatalogCategory.OTHER, kind: CatalogKind.INTERACTION, keywords: '', guidance: '', status: CatalogStatus.ACTIVE
});

const testStock = async (): Promise<void> => {
  const data = {
    stock: [
      stock(1, 'Laptops Spain', { onHand: 95 }),                                          // low, nothing on order
      stock(2, 'Laptops Portugal', { onHand: 20, minLevel: 25, onOrder: 30, expectedOn: offset(-10) }),   // low but ordered, and the order is late
      stock(3, 'Headsets', { onHand: 400 }),                                              // fine
      stock(4, 'Old model', { status: StockStatus.ARCHIVED, onHand: 1 })                 // archived: hidden
    ]
  };
  await mount(renderWith(React.createElement(Stock), data));
  await settle();
  assert.ok(text().indexOf('Laptops Spain') > -1 && text().indexOf('Laptops Portugal') > -1 && text().indexOf('Headsets') > -1);
  assert.equal(text().indexOf('Old model'), -1, 'archived products are hidden by default');
  assert.ok(text().indexOf('🔴 Low: order') > -1, 'the product that needs an order is flagged');
  assert.ok(text().indexOf('🟠 Low, order on the way') > -1, 'and the one with an order on the way is told apart');
  assert.equal(count('🔴 ' + offset(-10)), 1, 'the late order is flagged on its date');
  assert.ok(text().indexOf('1 product(s) are at or below their alarm level') > -1, 'a summary says how many need ordering');
  await unmount();

  await mount(renderWith(React.createElement(Stock), data, newRec(), 'es'));
  await settle();
  assert.ok(text().indexOf('Nuevo producto') > -1 && text().indexOf('🔴 Bajo: pedir') > -1, 'the screen in Spanish');
  await unmount();

  const rec = newRec();
  await mount(renderWith(React.createElement(Stock), {}, rec));
  await settle();
  assert.ok(text().indexOf('There are no products yet') > -1);
  await click(button('New product') as HTMLButtonElement);
  await settle();
  await setField('Title', 'iPad mini');
  await setField('In stock', '-4');
  await click(button('Save') as HTMLButtonElement);
  await settle();
  assert.equal(rec.created.length, 0, 'a negative stock is refused');
  assert.ok(text().indexOf('cannot be negative') > -1 || text().indexOf('negative') > -1);
  await setField('In stock', '12');
  await setField('Alarm level', '10');
  await click(button('Save') as HTMLButtonElement);
  await settle(80);
  assert.equal(rec.created.length, 1);
  assert.equal(rec.created[0].OnHand, 12);
  assert.equal(rec.created[0].MinLevel, 10);
  assert.equal(rec.created[0].Category, 'LAPTOP');
  assert.equal(rec.created[0].Country, 'ES');
  assert.equal(rec.created[0].Ownership, 'RENTED');
  assert.equal(rec.created[0].ExpectedOn, null);
  assert.ok(String(rec.created[0].StockId).indexOf('STK-') === 0);
  await unmount();
};

const testGenius = async (): Promise<void> => {
  const data = {
    genius: [
      sessionRow(1, 'OneDrive corner', { status: GeniusStatus.DELIVERED, sessionDate: offset(-14), invited: 40, attended: 18, satisfaction: 4.5, catalogId: 'CAT-1' }),
      sessionRow(2, 'Tip: files on demand', { type: GeniusType.TIP, sessionDate: offset(7) }),
      sessionRow(3, 'Ask IT anything', { type: GeniusType.ASK_IT, sessionDate: offset(-3) })
    ],
    catalog: [entry(1, 'OneDrive full'), entry(2, 'Blocked account'), entry(3, 'Where is a room')]
  };
  await mount(renderWith(React.createElement(Genius), data));
  await settle();
  assert.ok(text().indexOf('Tip: files on demand') > -1 && text().indexOf('Ask IT anything') > -1, 'planned sessions are listed');
  assert.equal(text().indexOf('OneDrive corner'), -1, 'a delivered session is history: hidden by default');
  assert.equal(count('🔴'), 1, 'only the planned session past its date is flagged');
  assert.ok(text().indexOf('1 session(s) delivered, 18 attendees, attendance 45 %, satisfaction 4.5/5 (1 rated).') > -1, 'the impact of what was delivered');
  assert.ok(text().indexOf('They do not prove that interactions were avoided') > -1, 'with the honest note');
  assert.ok(text().indexOf('Blocked account') > -1 && text().indexOf('Where is a room') > -1, 'topics with no session are suggested');
  assert.equal(text().indexOf('• OneDrive full'), -1, 'a topic that already has a session is not');
  await unmount();

  await mount(renderWith(React.createElement(Genius), data, newRec(), 'es'));
  await settle();
  assert.ok(text().indexOf('Nueva sesión') > -1 && text().indexOf('Impacto hasta ahora') > -1, 'the screen in Spanish');
  await unmount();

  const rec = newRec();
  await mount(renderWith(React.createElement(Genius), {}, rec));
  await settle();
  assert.ok(text().indexOf('There are no sessions yet') > -1);
  assert.ok(text().indexOf('No session has been delivered yet.') > -1);
  await click(button('New session') as HTMLButtonElement);
  await settle();
  await setField('Title', 'Teams tips');
  await setField('Link to the material', 'javascript:alert(1)');
  await click(button('Save') as HTMLButtonElement);
  await settle();
  assert.equal(rec.created.length, 0, 'a link that would run code is refused');
  assert.ok(text().indexOf('Enter an address that starts with http:// or https://.') > -1);
  await setField('Link to the material', '');
  await click(button('Save') as HTMLButtonElement);
  await settle(80);
  assert.equal(rec.created.length, 1);
  assert.equal(rec.created[0].Status, 'IDEA');
  assert.equal(rec.created[0].SessionType, 'CORNER');
  assert.equal(rec.created[0].Satisfaction, null);
  assert.equal(rec.created[0].SessionDate, null);
  assert.equal(rec.created[0].OwnerUPN, 'me@x.com');
  assert.ok(String(rec.created[0].SessionId).indexOf('GEN-') === 0);
  await unmount();
};

const run = async (): Promise<void> => {
  await testStock();
  await testGenius();
  console.log('stock and genius screen tests passed');
  process.exit(0);
};

run().catch(error => {
  console.error(error);
  process.exit(1);
});
