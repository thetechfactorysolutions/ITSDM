import './helpers/globals';
import assert from 'node:assert/strict';
import * as React from 'react';
import Risks from '../src/components/Governance/Risks';
import { HubDataContext, IHubData } from '../src/components/shared/HubData';
import { IListHookState } from '../src/hooks/useListItems';
import { I18nProvider, Language } from '../src/i18n/I18n';
import { Risk, RiskScale, RiskStatus } from '../src/models';
import { click, mount, settle, unmount } from './helpers/dom';

const risk = (id: number, title: string, status: RiskStatus, probability: RiskScale, impact: RiskScale): Risk => ({
  id, riskId: `RISK-${id}`, title, description: '', status, probability, impact, ownerUpn: 'me@x.com', mitigation: ''
});

const render = (items: Risk[], created: Array<Record<string, unknown>>, language: Language = 'en'): React.ReactElement => {
  const list = <T,>(rows: T[]): IListHookState<T> => ({
    items: rows, loading: false, error: undefined, reload: async () => undefined,
    create: async payload => { created.push(payload); }, update: async () => undefined, remove: async () => undefined
  });
  const none = (): never => list([]) as never;
  const hub: IHubData = {
    service: { capabilities: { versioning: false, userSearch: 'known', attachments: false }, searchUsers: async () => [] } as unknown as IHubData['service'], userEmail: 'me@x.com',
    risks: list(items), projects: none(), initiatives: none(), meetings: none(), ideas: none(), actions: none(), notes: none(), decisions: none(), lessons: none(), reviews: none()
  };
  return React.createElement(I18nProvider, { language }, React.createElement(HubDataContext.Provider, { value: hub }, React.createElement(Risks)));
};

const text = (): string => document.body.textContent ?? '';
const button = (label: string): HTMLButtonElement | undefined =>
  Array.from(document.body.querySelectorAll('button')).filter(b => (b.textContent ?? '').trim() === label)[0] as HTMLButtonElement | undefined;

const testScoresAndClosedHidden = async (): Promise<void> => {
  const items = [
    risk(1, 'Vendor may deliver late', RiskStatus.OPEN, RiskScale.HIGH, RiskScale.HIGH),
    risk(2, 'Minor licence issue', RiskStatus.MITIGATING, RiskScale.LOW, RiskScale.MEDIUM),
    risk(3, 'Old resolved risk', RiskStatus.CLOSED, RiskScale.HIGH, RiskScale.HIGH)
  ];
  await mount(render(items, []));
  await settle();
  assert.ok(text().indexOf('Vendor may deliver late') > -1);
  assert.ok(text().indexOf('9 · High') > -1, 'high x high is score 9, level High');
  assert.ok(text().indexOf('2 · Low') > -1, 'low x medium is score 2, level Low');
  assert.equal(text().indexOf('Old resolved risk'), -1, 'closed risks are hidden by default');
  await unmount();

  await mount(render(items, [], 'es'));
  await settle();
  assert.ok(text().indexOf('9 · Alto') > -1, 'the level is shown in Spanish');
  assert.ok(text().indexOf('Nuevo riesgo') > -1);
  await unmount();
};

const testEmptyAndCreate = async (): Promise<void> => {
  const created: Array<Record<string, unknown>> = [];
  await mount(render([], created));
  await settle();
  assert.ok(text().indexOf('There are no risks yet') > -1, 'a friendly empty state');

  await click(button('New risk') as HTMLButtonElement);
  await settle();
  assert.ok(text().indexOf('Score:') > -1 && text().indexOf('4 · Medium') > -1, 'a new risk shows its score: medium x medium');

  // an empty title is refused
  await click(button('Save') as HTMLButtonElement);
  await settle();
  assert.equal(created.length, 0);
  assert.ok(text().indexOf('Title is required.') > -1);

  const label = Array.from(document.body.querySelectorAll('label')).filter(l => (l.textContent ?? '').trim() === 'Title')[0] as HTMLLabelElement;
  const input = document.getElementById(label.htmlFor) as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set as (v: string) => void;
  const { act } = await import('react-dom/test-utils');
  await act(async () => { setter.call(input, 'Data centre power cut'); input.dispatchEvent(new window.Event('input', { bubbles: true })); });
  await click(button('Save') as HTMLButtonElement);
  await settle(80);

  assert.equal(created.length, 1);
  const payload = created[0];
  assert.equal(payload.Title, 'Data centre power cut');
  assert.equal(payload.Status, 'OPEN');
  assert.equal(payload.Probability, 'MEDIUM');
  assert.equal(payload.Impact, 'MEDIUM');
  assert.equal(payload.OwnerUPN, 'me@x.com', 'the owner defaults to the current user');
  assert.ok(String(payload.RiskId).indexOf('RISK-') === 0, 'the id is generated');
  await unmount();
};

const run = async (): Promise<void> => {
  await testScoresAndClosedHidden();
  await testEmptyAndCreate();
  console.log('governance screen tests passed');
  process.exit(0);
};

run().catch(error => {
  console.error(error);
  process.exit(1);
});
