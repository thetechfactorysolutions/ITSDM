import './helpers/globals';
import assert from 'node:assert/strict';
import * as React from 'react';
import Catalog from '../src/components/Operations/Catalog';
import Nps from '../src/components/Operations/Nps';
import ServiceMonths from '../src/components/Operations/ServiceMonths';
import { CatalogCategory, CatalogEntry, CatalogKind, CatalogStatus, Country, NpsChannel, NpsFollowUp, NpsResponse, ServiceMonth } from '../src/models';
import { addDays, toDayKey } from '../src/rules/dates';
import { click, mount, settle, typeInto, unmount } from './helpers/dom';
import { button, count, newRec, renderWith, setField, text } from './helpers/hub';

const offset = (days: number): string => addDays(toDayKey(new Date()), days);

const response = (id: number, title: string, score: number, status: NpsFollowUp, answeredDaysAgo: number): NpsResponse => ({
  id, responseId: `NPS-${id}`, title, score, comment: '', respondedOn: offset(-answeredDaysAgo), channel: NpsChannel.KIOSK, country: Country.ES, ticketRef: '', status, followUpNotes: '', ownerUpn: 'me@x.com'
});
const month = (id: number, title: string, country: Country, backMonths: number, o: Partial<ServiceMonth> = {}): ServiceMonth => ({
  id, monthId: `MON-${id}`, title, period: offset(-30 * backMonths), country, incidents: 100, interactions: 100, requests: 0, calls: 0, users: 1000, npsResponses: 0, backlog: 0, notes: '', ...o
});
const entry = (id: number, title: string, kind: CatalogKind, keywords: string, status: CatalogStatus = CatalogStatus.ACTIVE): CatalogEntry => ({
  id, catalogId: `CAT-${id}`, title, category: CatalogCategory.ACCESS, kind, keywords, guidance: '', status
});

const testNps = async (): Promise<void> => {
  const data = {
    nps: [
      response(1, 'Mailbox permissions took too long', 3, NpsFollowUp.PENDING, 9),      // detractor, late for the call
      response(2, 'List change was cancelled', 5, NpsFollowUp.PENDING, 2),                // detractor, still in time
      response(3, 'Quick fix', 10, NpsFollowUp.NOT_REQUIRED, 1),                          // promoter: hidden by default
      response(4, 'Disk space came back', 6, NpsFollowUp.CONTACTED, 20)                   // called already
    ]
  };
  await mount(renderWith(React.createElement(Nps), data));
  await settle();
  assert.ok(text().indexOf('Mailbox permissions took too long') > -1 && text().indexOf('List change was cancelled') > -1 && text().indexOf('Disk space came back') > -1, 'the calls still to make or in progress are listed');
  assert.equal(text().indexOf('Quick fix'), -1, 'an answer that needs no call is hidden by default');
  assert.equal(count('🔴'), 1, 'only the late call is flagged');
  assert.ok(/Last 90 days: NPS -50 \(1 promoters, 0 passive, 3 detractors, 4 responses\)/.test(text()), 'the NPS of the last 90 days is shown');
  await unmount();

  await mount(renderWith(React.createElement(Nps), data, newRec(), 'es'));
  await settle();
  assert.ok(text().indexOf('Nueva respuesta') > -1 && text().indexOf('Últimos 90 días: NPS') > -1, 'the screen in Spanish');
  await unmount();

  const rec = newRec();
  await mount(renderWith(React.createElement(Nps), {}, rec));
  await settle();
  assert.ok(text().indexOf('There are no NPS responses yet') > -1);
  await click(button('New response') as HTMLButtonElement);
  await settle();
  await setField('Title', 'Slow answer to my request');
  await setField('Score', '11');
  await click(button('Save') as HTMLButtonElement);
  await settle();
  assert.equal(rec.created.length, 0, 'a score above 10 is refused');
  assert.ok(text().indexOf('Enter a whole number from 0 to 10.') > -1);
  await setField('Score', '4');
  await click(button('Save') as HTMLButtonElement);
  await settle(80);
  assert.equal(rec.created.length, 1);
  assert.equal(rec.created[0].Score, 4);
  assert.equal(rec.created[0].Status, 'PENDING', 'a new detractor waits for a call');
  assert.equal(rec.created[0].Country, 'ES');
  assert.equal(rec.created[0].OwnerUPN, 'me@x.com');
  assert.ok(String(rec.created[0].ResponseId).indexOf('NPS-') === 0);
  await unmount();
};

const testServiceMonths = async (): Promise<void> => {
  const data = {
    serviceMonths: [
      month(1, 'Spain two months ago', Country.ES, 2, { slaPct: 99 }),
      month(2, 'Spain last month', Country.ES, 1, { incidents: 190, interactions: 163, users: 950, slaPct: 99 }),
      month(3, 'Portugal last month', Country.PT, 1, { incidents: 3, interactions: 88, users: 180, slaPct: 90 })
    ]
  };
  await mount(renderWith(React.createElement(ServiceMonths), data));
  await settle();
  assert.ok(text().indexOf('Latest month by country') > -1, 'a comparison by country is shown');
  assert.ok(text().indexOf('Countries may classify contacts differently') > -1, 'with the warning about how each country records');
  assert.ok(text().indexOf('97 %') > -1, 'the share of interactions shows how different the two countries record');
  assert.ok(text().indexOf('46 %') > -1);
  assert.ok(text().indexOf('37.2') > -1, 'and the contacts per 100 users');
  assert.ok(count('🔴') >= 1, 'the low SLA is flagged');
  assert.equal(text().indexOf('Spain two months ago') > -1, true, 'every month is in the table below');
  await unmount();

  const rec = newRec();
  await mount(renderWith(React.createElement(ServiceMonths), {}, rec));
  await settle();
  assert.ok(text().indexOf('There are no monthly figures yet') > -1);
  await click(button('New month') as HTMLButtonElement);
  await settle();
  await setField('Title', 'Spain, November');
  await setField('SLA %', '120');
  await click(button('Save') as HTMLButtonElement);
  await settle();
  assert.equal(rec.created.length, 0);
  assert.ok(text().indexOf('Enter a number from 0 to 100.') > -1, 'an SLA above 100 is refused');
  await setField('SLA %', '');
  await click(button('Save') as HTMLButtonElement);
  await settle(80);
  assert.equal(rec.created.length, 1);
  assert.equal(rec.created[0].SlaPct, null, 'an SLA left empty is saved as empty, not zero');
  assert.equal(rec.created[0].NpsScore, null);
  assert.equal(rec.created[0].Country, 'ES');
  assert.equal(rec.created[0].Incidents, 0);
  await unmount();
};

const testCatalog = async (): Promise<void> => {
  const data = {
    catalog: [
      entry(1, 'Blocked account', CatalogKind.INCIDENT, 'cuenta bloqueada, contraseña'),
      entry(2, 'Where is a room', CatalogKind.INTERACTION, 'dónde está, sala'),
      entry(3, 'Old entry', CatalogKind.REQUEST, 'bloqueada', CatalogStatus.ARCHIVED)
    ]
  };
  await mount(renderWith(React.createElement(Catalog), data));
  await settle();
  assert.ok(text().indexOf('Blocked account') > -1 && text().indexOf('Where is a room') > -1);
  assert.equal(text().indexOf('Old entry'), -1, 'archived entries are hidden by default');

  const input = document.querySelector('input[aria-label="Try a phrase"]') as HTMLInputElement;
  assert.ok(input, 'the phrase tester is there');
  await typeInto(input, 'Mi cuenta bloqueada otra vez');
  await settle();
  assert.ok(text().indexOf('Record it as: Incident') > -1, 'a phrase is matched to an entry and tells how to record it');
  await typeInto(input, 'donde esta la sala 4');
  await settle();
  assert.ok(text().indexOf('Record it as: Interaction') > -1, 'case and accents do not matter');
  await typeInto(input, 'algo que no está en el catálogo');
  await settle();
  assert.ok(text().indexOf('No entry matches') > -1);
  await unmount();

  const rec = newRec();
  await mount(renderWith(React.createElement(Catalog), {}, rec));
  await settle();
  await click(button('New entry') as HTMLButtonElement);
  await settle();
  await setField('Title', 'How to share a calendar');
  await click(button('Save') as HTMLButtonElement);
  await settle(80);
  assert.equal(rec.created.length, 1);
  assert.equal(rec.created[0].Kind, 'INTERACTION');
  assert.equal(rec.created[0].Status, 'ACTIVE');
  assert.equal(rec.created[0].Category, 'OTHER');
  assert.ok(String(rec.created[0].CatalogId).indexOf('CAT-') === 0);
  await unmount();
};

const run = async (): Promise<void> => {
  await testNps();
  await testServiceMonths();
  await testCatalog();
  console.log('service screen tests passed');
  process.exit(0);
};

run().catch(error => {
  console.error(error);
  process.exit(1);
});
