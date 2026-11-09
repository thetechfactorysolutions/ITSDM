import './helpers/globals';
import assert from 'node:assert/strict';
import * as React from 'react';
import Incidents from '../src/components/Operations/Incidents';
import Interactions from '../src/components/Operations/Interactions';
import Kpis from '../src/components/Operations/Kpis';
import { HubDataContext, IHubData } from '../src/components/shared/HubData';
import { IListHookState } from '../src/hooks/useListItems';
import { I18nProvider, Language } from '../src/i18n/I18n';
import {
  Incident, IncidentCategory, IncidentSeverity, IncidentStatus, Interaction, InteractionStatus, InteractionType, Kpi, KpiCategory, KpiDirection, KpiStatus
} from '../src/models';
import { addDays, toDayKey } from '../src/rules/dates';
import { click, mount, settle, unmount } from './helpers/dom';

const today = (): string => toDayKey(new Date());
const ago = (days: number): string => addDays(today(), -days);

const incident = (id: number, title: string, status: IncidentStatus, severity: IncidentSeverity, reportedDaysAgo: number): Incident => ({
  id, incidentId: `INC-${id}`, title, description: '', status, severity, category: IncidentCategory.APPLICATION, reportedBy: '', assignedTo: 'me@x.com',
  reportedOn: ago(reportedDaysAgo), resolution: '', rootCause: ''
});
const kpi = (id: number, title: string, direction: KpiDirection, target: number, current: number, previous: number | undefined): Kpi => ({
  id, kpiId: `KPI-${id}`, title, description: '', category: KpiCategory.SERVICE, status: KpiStatus.ACTIVE, unit: direction === KpiDirection.LOWER ? 'days' : '%', direction,
  target, currentValue: current, previousValue: previous, ownerUpn: ''
});
const interaction = (id: number, title: string, status: InteractionStatus, followUpDaysAgo: number | undefined): Interaction => ({
  id, interactionId: `INT-${id}`, title, type: InteractionType.CALL, status, interactionDate: ago(5), contactName: 'Sam', contactEmail: '', organization: 'Fabrikam',
  summary: '', nextSteps: '', followUpDate: followUpDaysAgo === undefined ? '' : ago(followUpDaysAgo), ownerUpn: ''
});

interface IData { incidents?: Incident[]; kpis?: Kpi[]; interactions?: Interaction[] }

const render = (Screen: React.FC, data: IData, created: Array<Record<string, unknown>> = [], language: Language = 'en'): React.ReactElement => {
  const list = <T,>(rows: T[]): IListHookState<T> => ({
    items: rows, loading: false, error: undefined, reload: async () => undefined,
    create: async payload => { created.push(payload); }, update: async () => undefined, remove: async () => undefined
  });
  const none = (): never => list([]) as never;
  const hub: IHubData = {
    service: { capabilities: { versioning: false, userSearch: 'known', attachments: false }, searchUsers: async () => [] } as unknown as IHubData['service'], userEmail: 'me@x.com',
    incidents: list(data.incidents ?? []), kpis: list(data.kpis ?? []), interactions: list(data.interactions ?? []),
    changes: none(), projects: none(), vendors: none(), meetings: none(), initiatives: none(), ideas: none(), actions: none(), notes: none(), risks: none(), decisions: none(), lessons: none(),
    reviews: none(), budgets: none(), capex: none(), opex: none(), contracts: none()
  };
  return React.createElement(I18nProvider, { language }, React.createElement(HubDataContext.Provider, { value: hub }, React.createElement(Screen)));
};

const text = (): string => document.body.textContent ?? '';
const count = (needle: string): number => text().split(needle).length - 1;
const button = (label: string): HTMLButtonElement | undefined =>
  Array.from(document.body.querySelectorAll('button')).filter(b => (b.textContent ?? '').trim() === label)[0] as HTMLButtonElement | undefined;

const setField = async (label: string, value: string): Promise<void> => {
  const l = Array.from(document.body.querySelectorAll('label')).filter(x => (x.textContent ?? '').trim() === label)[0] as HTMLLabelElement;
  assert.ok(l, `field "${label}" exists`);
  const input = document.getElementById(l.htmlFor) as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set as (v: string) => void;
  const { act } = await import('react-dom/test-utils');
  await act(async () => { setter.call(input, value); input.dispatchEvent(new window.Event('input', { bubbles: true })); });
};

const testIncidentDeadlines = async (): Promise<void> => {
  const data: IData = {
    incidents: [
      incident(1, 'Email delays', IncidentStatus.IN_PROGRESS, IncidentSeverity.CRITICAL, 2), // due yesterday -> over the deadline
      incident(2, 'VPN drops', IncidentStatus.NEW, IncidentSeverity.MEDIUM, 2),              // 7 days -> in time
      incident(3, 'Old printer issue', IncidentStatus.RESOLVED, IncidentSeverity.CRITICAL, 30)
    ]
  };
  await mount(render(Incidents, data));
  await settle();
  assert.ok(text().indexOf('Email delays') > -1 && text().indexOf('VPN drops') > -1);
  assert.equal(text().indexOf('Old printer issue'), -1, 'resolved incidents are hidden by default');
  assert.equal(count('🔴'), 1, 'only the critical one past its deadline is flagged');
  await unmount();

  await mount(render(Incidents, data, [], 'es'));
  await settle();
  assert.ok(text().indexOf('Nuevo incidente') > -1);
  assert.equal(count('🔴'), 1);
  await unmount();
};

const testNewIncident = async (): Promise<void> => {
  const created: Array<Record<string, unknown>> = [];
  await mount(render(Incidents, {}, created));
  await settle();
  assert.ok(text().indexOf('There are no incidents') > -1);

  await click(button('New incident') as HTMLButtonElement);
  await settle();
  // a new medium incident gets its deadline from the severity: reported today + 7 days
  assert.ok(text().indexOf(addDays(today(), 7)) > -1, 'the form shows the deadline for the default severity');
  await setField('Title', 'Wi-Fi down on floor 3');
  await click(button('Save') as HTMLButtonElement);
  await settle(80);

  assert.equal(created.length, 1);
  assert.equal(created[0].Status, 'NEW');
  assert.equal(created[0].Severity, 'MEDIUM');
  assert.equal(created[0].ReportedOn, `${today()}T12:00:00Z`, 'reported today, as the local day');
  assert.equal(created[0].ReportedBy, 'me@x.com');
  assert.ok(String(created[0].IncidentId).indexOf('INC-') === 0);
  await unmount();
};

const testKpiHealthAndTrend = async (): Promise<void> => {
  const data: IData = {
    kpis: [
      kpi(1, 'Resolution time', KpiDirection.LOWER, 3, 3.2, 4.1),   // at risk, improving
      kpi(2, 'First-contact resolution', KpiDirection.HIGHER, 80, 65, 62), // off target, improving
      kpi(3, 'Availability', KpiDirection.HIGHER, 99.5, 99.7, 99.6),     // on target, improving
      kpi(4, 'Critical incidents', KpiDirection.LOWER, 0, 1, 0)           // off target, worsening
    ]
  };
  await mount(render(Kpis, data));
  await settle();
  assert.equal(count('🟢 On target'), 1);
  assert.equal(count('🟠 At risk'), 1);
  assert.equal(count('🔴 Off target'), 2);
  assert.ok(/3[.,]2 days ↗/.test(text()), 'a value that improved shows an upward arrow');
  assert.ok(/1 days ↘/.test(text()), 'a value that got worse shows a downward arrow');
  await unmount();

  await mount(render(Kpis, data, [], 'es'));
  await settle();
  assert.equal(count('🔴 Fuera de objetivo'), 2, 'health in Spanish');
  assert.ok(text().indexOf('Nuevo KPI') > -1);
  await unmount();
};

const testNewKpiHasNoPreviousValue = async (): Promise<void> => {
  const created: Array<Record<string, unknown>> = [];
  await mount(render(Kpis, {}, created));
  await settle();
  await click(button('New KPI') as HTMLButtonElement);
  await settle();
  await setField('KPI name', 'Ticket backlog');
  await setField('Target', '20');
  await setField('Current value', '35');
  await click(button('Save') as HTMLButtonElement);
  await settle(80);

  assert.equal(created.length, 1);
  assert.equal(created[0].Title, 'Ticket backlog');
  assert.equal(created[0].Target, 20);
  assert.equal(created[0].CurrentValue, 35);
  assert.equal(created[0].PreviousValue, null, 'a new KPI has no previous value (not zero)');
  assert.equal(created[0].Direction, 'HIGHER');
  assert.equal(created[0].Status, 'ACTIVE');
  await unmount();
};

const testOverdueFollowUps = async (): Promise<void> => {
  const data: IData = {
    interactions: [
      interaction(1, 'Review with Fabrikam', InteractionStatus.FOLLOW_UP, 3),   // follow-up date passed
      interaction(2, 'Licence question', InteractionStatus.FOLLOW_UP, -4),       // follow-up in the future
      interaction(3, 'Agenda workshop', InteractionStatus.LOGGED, undefined)
    ]
  };
  await mount(render(Interactions, data));
  await settle();
  assert.ok(text().indexOf('Review with Fabrikam') > -1 && text().indexOf('Agenda workshop') > -1);
  assert.equal(count('🔴'), 1, 'only the follow-up whose date has passed is flagged');
  assert.ok(text().indexOf('Sam · Fabrikam') > -1, 'the contact is shown with the organisation');
  await unmount();
};

const run = async (): Promise<void> => {
  await testIncidentDeadlines();
  await testNewIncident();
  await testKpiHealthAndTrend();
  await testNewKpiHasNoPreviousValue();
  await testOverdueFollowUps();
  console.log('operations screen tests passed');
  process.exit(0);
};

run().catch(error => {
  console.error(error);
  process.exit(1);
});
