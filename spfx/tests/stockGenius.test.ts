import assert from 'node:assert/strict';
import { en } from '../src/i18n/en';
import { es } from '../src/i18n/es';
import { mapGenius, mapStock } from '../src/components/shared/mappers';
import { buildGeniusPayload, buildStockPayload } from '../src/entities/payloads';
import { buildAgenda, IAgendaInput } from '../src/rules/agenda';
import {
  CatalogCategory, CatalogEntry, CatalogKind, CatalogStatus, Country, GeniusSession, GeniusStatus, GeniusType, StockCategory, StockItem, StockOwnership, StockStatus
} from '../src/models';
import { applyGeniusEffects, attendanceRate, geniusImpact, getAllowedGeniusStatuses, isSessionLate, topicsWithoutSession } from '../src/rules/genius';
import { coverage, fleetSize, isOrderLate, needsOrder, needsStockAttention, orderValue, projectedStock, stockLevel } from '../src/rules/stock';
import { isClosedStatus } from '../src/rules/transitions';
import { hasErrors, validateGenius, validateStock } from '../src/rules/validation';

const NOW = new Date(2026, 10, 9, 12);

const item = (o: Partial<StockItem> = {}): StockItem => ({
  stockId: 'S-1', title: 'Laptops', category: StockCategory.LAPTOP, country: Country.ES, onHand: 150, minLevel: 100, inUse: 900, onOrder: 0, unitCost: 1000,
  ownership: StockOwnership.RENTED, status: StockStatus.ACTIVE, notes: '', ...o
});
const session = (o: Partial<GeniusSession> = {}): GeniusSession => ({
  sessionId: 'G-1', title: 'OneDrive corner', type: GeniusType.CORNER, topic: 'OneDrive', status: GeniusStatus.PLANNED, audience: '', ownerUpn: 'a@b.com', invited: 0, attended: 0, materialUrl: '', motivation: '', ...o
});
const entry = (id: string, o: Partial<CatalogEntry> = {}): CatalogEntry => ({
  catalogId: id, title: `Entry ${id}`, category: CatalogCategory.OTHER, kind: CatalogKind.INTERACTION, keywords: '', guidance: '', status: CatalogStatus.ACTIVE, ...o
});

const testStockLevels = (): void => {
  assert.equal(stockLevel(item()), 'OK');
  assert.equal(stockLevel(item({ onHand: 101 })), 'OK', 'just above the alarm level');
  assert.equal(stockLevel(item({ onHand: 100 })), 'LOW', 'at the alarm level');
  assert.equal(stockLevel(item({ onHand: 95 })), 'LOW');
  assert.equal(stockLevel(item({ onHand: 95, onOrder: 5 })), 'LOW', 'an order that only reaches the level does not fix it');
  assert.equal(stockLevel(item({ onHand: 95, onOrder: 6 })), 'ORDERED', 'an order that lifts it above does');
  assert.equal(stockLevel(item({ onHand: 0, minLevel: 0 })), 'OK', 'a zero level turns the alarm off');
  assert.equal(stockLevel(item({ onHand: 5, status: StockStatus.ARCHIVED })), 'OK', 'archived products do not alarm');
  assert.equal(needsOrder(item({ onHand: 50 })), true);
  assert.equal(needsOrder(item({ onHand: 50, onOrder: 200 })), false);
  assert.equal(projectedStock(item({ onHand: 50, onOrder: 200 })), 250);
  assert.equal(fleetSize(item()), 1050);
  assert.equal(coverage(item({ onHand: 150, minLevel: 100 })), 1.5);
  assert.equal(coverage(item({ onHand: 80, minLevel: 0 })), undefined, 'no alarm level, no coverage');
  assert.equal(orderValue(item({ onOrder: 270, unitCost: 560 })), 151200);
};

const testLateOrders = (): void => {
  assert.equal(isOrderLate(item({ onOrder: 10, expectedOn: '2026-11-08' }), NOW), true);
  assert.equal(isOrderLate(item({ onOrder: 10, expectedOn: '2026-11-09' }), NOW), false, 'the expected day itself is still in time');
  assert.equal(isOrderLate(item({ onOrder: 0, expectedOn: '2026-10-01' }), NOW), false, 'nothing on order, nothing late');
  assert.equal(isOrderLate(item({ onOrder: 10, expectedOn: undefined }), NOW), false, 'no date, no judgement');
  assert.equal(isOrderLate(item({ onOrder: 10, expectedOn: '2026-10-01', status: StockStatus.ARCHIVED }), NOW), false);
  assert.equal(needsStockAttention(item({ onHand: 50 }), NOW), true);
  assert.equal(needsStockAttention(item({ onOrder: 10, expectedOn: '2026-10-01' }), NOW), true);
  assert.equal(needsStockAttention(item(), NOW), false);
};

const testStockValidationAndMapping = (): void => {
  assert.equal(hasErrors(validateStock(item())), false);
  assert.equal(validateStock(item({ title: '' })).title, 'validation.titleRequired');
  assert.equal(validateStock(item({ onHand: -1 })).onHand, 'validation.cannotBeNegative');
  assert.equal(validateStock(item({ minLevel: -1 })).minLevel, 'validation.cannotBeNegative');
  assert.equal(validateStock(item({ unitCost: -5 })).unitCost, 'validation.cannotBeNegative');
  assert.equal(validateStock(item({ expectedOn: '2026-02-30' })).expectedOn, 'validation.dateInvalid');
  const original = item({ onOrder: 30, expectedOn: '2027-01-15', vendorId: 'V-1', notes: 'n' });
  const back = mapStock({ ...buildStockPayload(original), Id: 4 });
  assert.deepEqual({ ...back, id: undefined, created: '', modified: '', editor: '' }, { ...original, id: undefined, created: '', modified: '', editor: '' });
  assert.equal(mapStock({}).status, StockStatus.ACTIVE);
  assert.equal(isClosedStatus('ARCHIVED'), true);
};

const testGenius = (): void => {
  assert.equal(attendanceRate(session({ invited: 40, attended: 18 })), 45);
  assert.equal(attendanceRate(session({ invited: 0, attended: 5 })), undefined);
  assert.equal(isSessionLate(session({ sessionDate: '2026-11-08' }), NOW), true);
  assert.equal(isSessionLate(session({ sessionDate: '2026-11-09' }), NOW), false);
  assert.equal(isSessionLate(session({ sessionDate: '2026-11-01', status: GeniusStatus.DELIVERED }), NOW), false, 'a delivered session is never late');
  assert.equal(isSessionLate(session({ sessionDate: undefined }), NOW), false);

  assert.equal(applyGeniusEffects(session({ status: GeniusStatus.DELIVERED }), NOW).sessionDate, '2026-11-09', 'delivering fills in the day');
  assert.equal(applyGeniusEffects(session({ status: GeniusStatus.DELIVERED, sessionDate: '2026-11-02' }), NOW).sessionDate, '2026-11-02', 'a given day is kept');
  assert.equal(applyGeniusEffects(session({ status: GeniusStatus.PLANNED }), NOW).sessionDate, undefined);
  assert.deepEqual(getAllowedGeniusStatuses(GeniusStatus.DELIVERED), [GeniusStatus.DELIVERED, GeniusStatus.PLANNED], 'a delivered session can be reopened');
  assert.equal(isClosedStatus('DELIVERED'), true);

  const none = geniusImpact([session()]);
  assert.deepEqual(none, { delivered: 0, attendees: 0, averageAttendance: undefined, averageSatisfaction: undefined, rated: 0 }, 'nothing delivered, nothing to average');
  const impact = geniusImpact([
    session({ status: GeniusStatus.DELIVERED, invited: 40, attended: 20, satisfaction: 4.5 }),
    session({ status: GeniusStatus.DELIVERED, invited: 10, attended: 9, satisfaction: 4 }),
    session({ status: GeniusStatus.DELIVERED, invited: 0, attended: 7 }),
    session({ status: GeniusStatus.PLANNED, invited: 99, attended: 99, satisfaction: 1 })
  ]);
  assert.equal(impact.delivered, 3);
  assert.equal(impact.attendees, 36, 'planned sessions do not count');
  assert.equal(impact.averageAttendance, 70, '(50 + 90) / 2, the one without invitations is left out');
  assert.equal(impact.averageSatisfaction, 4.3, '(4.5 + 4) / 2 rounded to a decimal');
  assert.equal(impact.rated, 2);

  const catalog = [entry('A'), entry('B'), entry('C', { status: CatalogStatus.ARCHIVED }), entry('D')];
  const sessions = [session({ catalogId: 'A' }), session({ catalogId: 'D', status: GeniusStatus.CANCELLED }), session({ catalogId: undefined })];
  assert.deepEqual(topicsWithoutSession(catalog, sessions).map(e => e.catalogId), ['B', 'D'], 'covered by a live session, archived and cancelled are handled');
};

const testGeniusValidationAndMapping = (): void => {
  assert.equal(hasErrors(validateGenius(session())), false);
  assert.equal(validateGenius(session({ title: ' ' })).title, 'validation.titleRequired');
  assert.equal(validateGenius(session({ invited: 10, attended: 11 })).attended, 'validation.attendedAboveInvited');
  assert.equal(hasErrors(validateGenius(session({ invited: 0, attended: 11 }))), false, 'attendance without a guest list is allowed');
  assert.equal(validateGenius(session({ invited: -1 })).invited, 'validation.cannotBeNegative');
  assert.equal(validateGenius(session({ satisfaction: 5.5 })).satisfaction, 'validation.satisfactionRange');
  assert.equal(hasErrors(validateGenius(session({ satisfaction: 0 }))), false);
  assert.equal(validateGenius(session({ materialUrl: 'javascript:alert(1)' })).materialUrl, 'validation.urlInvalid', 'the material link must be a web address');
  assert.equal(hasErrors(validateGenius(session({ materialUrl: 'https://example.com/slides' }))), false);
  assert.equal(validateGenius(session({ sessionDate: 'x' })).sessionDate, 'validation.dateInvalid');
  assert.equal(validateGenius(session({ ownerUpn: 'nope' })).ownerUpn, 'validation.ownerInvalid');

  const original = session({ status: GeniusStatus.DELIVERED, sessionDate: '2026-11-02', invited: 40, attended: 18, satisfaction: 4.5, materialUrl: 'https://x.com', catalogId: 'CAT-1', motivation: 'm' });
  const payload = buildGeniusPayload(original);
  assert.equal(payload.SessionDate, '2026-11-02T12:00:00Z');
  const back = mapGenius({ ...payload, Id: 2 });
  assert.deepEqual({ ...back, id: undefined, created: '', modified: '', editor: '', articleId: undefined }, { ...original, id: undefined, created: '', modified: '', editor: '', articleId: undefined });
  assert.equal(buildGeniusPayload(session()).Satisfaction, null, 'an unrated session is saved as empty');
  assert.equal(mapGenius({ ...buildGeniusPayload(session()) }).satisfaction, undefined, 'and read back as empty, not zero');
  assert.equal(mapGenius({ Satisfaction: 0 }).satisfaction, 0);
};

const testAgendaAndTexts = (): void => {
  const input: IAgendaInput = {
    matters: [], actions: [], contracts: [], entitlements: [], interactions: [], reviews: [], risks: [], trainings: [], skills: [], projects: [], articles: [], changes: [], incidents: [], objectives: [],
    stock: [item({ stockId: 'S-1', title: 'iPads', onOrder: 270, expectedOn: '2026-12-15' }), item({ stockId: 'S-2', title: 'No order', onOrder: 0, expectedOn: '2026-12-15' }), item({ stockId: 'S-3', title: 'Old', onOrder: 5, expectedOn: '2026-12-01', status: StockStatus.ARCHIVED })],
    genius: [session({ sessionId: 'G-1', title: 'Corner', sessionDate: '2026-11-20' }), session({ sessionId: 'G-2', title: 'Done', status: GeniusStatus.DELIVERED, sessionDate: '2026-11-01' }), session({ sessionId: 'G-3', title: 'No date' })]
  };
  const events = buildAgenda(input, NOW);
  assert.deepEqual(events.map(e => e.key), ['GENIUS:G-1', 'STOCK_ARRIVAL:S-1'], 'an order on its way and a planned session; the rest is left out');
  assert.equal(events[1].title, 'iPads (270)', 'the quantity is in the title');

  const groups: Array<[string, string[]]> = [
    ['stockCategory', Object.keys(StockCategory)], ['stockOwnership', Object.keys(StockOwnership)], ['geniusType', Object.keys(GeniusType)],
    ['status', ['IDEA', 'DELIVERED', 'PLANNED']], ['agenda.kind', ['STOCK_ARRIVAL', 'GENIUS']]
  ];
  groups.forEach(([prefix, values]) => values.forEach(value => assert.ok(en[`${prefix}.${value}`] && es[`${prefix}.${value}`], `${prefix}.${value} is translated`)));
};

testStockLevels();
testLateOrders();
testStockValidationAndMapping();
testGenius();
testGeniusValidationAndMapping();
testAgendaAndTexts();
console.log('stock and genius tests passed');
