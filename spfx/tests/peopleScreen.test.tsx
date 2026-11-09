import './helpers/globals';
import assert from 'node:assert/strict';
import * as React from 'react';
import Knowledge from '../src/components/People/Knowledge';
import Skills from '../src/components/People/Skills';
import Trainings from '../src/components/People/Training';
import { HubDataContext, IHubData } from '../src/components/shared/HubData';
import { IListHookState } from '../src/hooks/useListItems';
import { I18nProvider, Language } from '../src/i18n/I18n';
import {
  Article, ArticleCategory, ArticleStatus, Skill, SkillCategory, SkillLevel, SkillStatus, Training, TrainingStatus, TrainingType
} from '../src/models';
import { addDays, toDayKey } from '../src/rules/dates';
import { click, mount, settle, unmount } from './helpers/dom';

const today = (): string => toDayKey(new Date());
const ago = (days: number): string => addDays(today(), -days);

const skill = (id: number, title: string, level: SkillLevel, target: SkillLevel, status: SkillStatus, certification: string, expiryDaysAgo: number | undefined): Skill => ({
  id, skillId: `SKL-${id}`, title, personUpn: 'me@x.com', category: SkillCategory.TECHNICAL, level, targetLevel: target, status, certification,
  certificationExpiry: expiryDaysAgo === undefined ? '' : ago(expiryDaysAgo), notes: ''
});
const training = (id: number, title: string, status: TrainingStatus, dueDaysAgo: number): Training => ({
  id, trainingId: `TRN-${id}`, title, status, type: TrainingType.COURSE, personUpn: 'me@x.com', provider: '', dueDate: ago(dueDaysAgo), cost: 0, notes: ''
});
const article = (id: number, title: string, status: ArticleStatus, reviewDaysAgo: number | undefined): Article => ({
  id, articleId: `KB-${id}`, title, summary: '', body: '', category: ArticleCategory.HOW_TO, status, ownerUpn: 'me@x.com', tags: '',
  reviewDate: reviewDaysAgo === undefined ? '' : ago(reviewDaysAgo)
});

interface IData { skills?: Skill[]; trainings?: Training[]; articles?: Article[] }

const render = (Screen: React.FC, data: IData, created: Array<Record<string, unknown>> = [], language: Language = 'en'): React.ReactElement => {
  const list = <T,>(rows: T[]): IListHookState<T> => ({
    items: rows, loading: false, error: undefined, reload: async () => undefined,
    create: async payload => { created.push(payload); }, update: async () => undefined, remove: async () => undefined
  });
  const none = (): never => list([]) as never;
  const hub: IHubData = {
    service: { capabilities: { versioning: false, userSearch: 'known', attachments: false }, searchUsers: async () => [] } as unknown as IHubData['service'], userEmail: 'me@x.com',
    skills: list(data.skills ?? []), trainings: list(data.trainings ?? []), articles: list(data.articles ?? []),
    incidents: none(), changes: none(), projects: none(), vendors: none(), meetings: none(), initiatives: none(), ideas: none(), actions: none(), notes: none(), risks: none(),
    decisions: none(), lessons: none(), reviews: none(), budgets: none(), capex: none(), opex: none(), contracts: none(), interactions: none(), kpis: none()
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

const testSkillsGapsAndCertifications = async (): Promise<void> => {
  const data: IData = {
    skills: [
      skill(1, 'Azure', SkillLevel.INTERMEDIATE, SkillLevel.ADVANCED, SkillStatus.ACTIVE, 'AZ-104', 5),          // gap, expired
      skill(2, 'Networking', SkillLevel.ADVANCED, SkillLevel.ADVANCED, SkillStatus.ACTIVE, 'CCNA', -20),          // no gap, expires in 20 days
      skill(3, 'ITIL', SkillLevel.BASIC, SkillLevel.EXPERT, SkillStatus.ACTIVE, 'ITIL 4', -300),                  // gap of 3, certification far away
      skill(4, 'Old skill', SkillLevel.BASIC, SkillLevel.EXPERT, SkillStatus.ARCHIVED, 'OLD', 100)                 // archived: hidden
    ]
  };
  await mount(render(Skills, data));
  await settle();
  assert.ok(text().indexOf('Azure') > -1 && text().indexOf('Networking') > -1 && text().indexOf('ITIL') > -1);
  assert.equal(text().indexOf('Old skill'), -1, 'archived skills are hidden by default');
  assert.equal(count('🔴'), 1, 'only the expired certification is red');
  assert.equal(count('🟠'), 1, 'only the one about to expire is orange');
  assert.equal(count('▼ 1'), 1, 'a gap of one level');
  assert.equal(count('▼ 3'), 1, 'a gap of three levels');
  await unmount();

  await mount(render(Skills, data, [], 'es'));
  await settle();
  assert.ok(text().indexOf('Nueva habilidad') > -1);
  assert.equal(count('🔴'), 1);
  await unmount();
};

const testNewSkill = async (): Promise<void> => {
  const created: Array<Record<string, unknown>> = [];
  await mount(render(Skills, {}, created));
  await settle();
  assert.ok(text().indexOf('There are no skills') > -1);
  await click(button('New skill') as HTMLButtonElement);
  await settle();
  await setField('Skill', 'Power Automate');
  await click(button('Save') as HTMLButtonElement);
  await settle(80);

  assert.equal(created.length, 1);
  assert.equal(created[0].Title, 'Power Automate');
  assert.equal(created[0].PersonUPN, 'me@x.com');
  assert.equal(created[0].Level, 'BASIC');
  assert.equal(created[0].TargetLevel, 'INTERMEDIATE');
  assert.equal(created[0].Status, 'ACTIVE');
  assert.ok(String(created[0].SkillId).indexOf('SKL-') === 0);
  await unmount();
};

const testTrainings = async (): Promise<void> => {
  const data: IData = {
    trainings: [
      training(1, 'Azure course', TrainingStatus.PLANNED, 3),            // late
      training(2, 'ITIL workshop', TrainingStatus.IN_PROGRESS, -5),      // in time
      training(3, 'Old course', TrainingStatus.COMPLETED, 10)            // completed: hidden
    ]
  };
  await mount(render(Trainings, data));
  await settle();
  assert.ok(text().indexOf('Azure course') > -1 && text().indexOf('ITIL workshop') > -1);
  assert.equal(text().indexOf('Old course'), -1, 'completed trainings are hidden by default');
  assert.equal(count('🔴'), 1, 'only the late training is flagged');
  await unmount();

  const created: Array<Record<string, unknown>> = [];
  await mount(render(Trainings, {}, created));
  await settle();
  await click(button('New training') as HTMLButtonElement);
  await settle();
  await setField('Title', 'Security awareness');
  await click(button('Save') as HTMLButtonElement);
  await settle(80);
  assert.equal(created.length, 1);
  assert.equal(created[0].Status, 'PLANNED');
  assert.equal(created[0].TrainingType, 'COURSE');
  assert.equal(created[0].PersonUPN, 'me@x.com');
  assert.equal(created[0].Cost, 0);
  assert.ok(String(created[0].TrainingId).indexOf('TRN-') === 0);
  await unmount();
};

const testArticles = async (): Promise<void> => {
  const data: IData = {
    articles: [
      article(1, 'Reset a password', ArticleStatus.PUBLISHED, 3),   // review date passed
      article(2, 'Restart the spooler', ArticleStatus.PUBLISHED, -90),
      article(3, 'Draft article', ArticleStatus.DRAFT, 400),        // a draft is never flagged
      article(4, 'Old article', ArticleStatus.ARCHIVED, 1)
    ]
  };
  await mount(render(Knowledge, data));
  await settle();
  assert.ok(text().indexOf('Reset a password') > -1 && text().indexOf('Draft article') > -1);
  assert.equal(text().indexOf('Old article'), -1, 'archived articles are hidden by default');
  assert.equal(count('🟠'), 1, 'only the published article past its review date is flagged');
  await unmount();

  const created: Array<Record<string, unknown>> = [];
  await mount(render(Knowledge, {}, created));
  await settle();
  assert.ok(text().indexOf('There are no articles') > -1);
  await click(button('New article') as HTMLButtonElement);
  await settle();
  await setField('Title', 'Onboard a new starter');
  await click(button('Save') as HTMLButtonElement);
  await settle(80);
  assert.equal(created.length, 1);
  assert.equal(created[0].Status, 'DRAFT');
  assert.equal(created[0].Category, 'HOW_TO');
  assert.equal(created[0].OwnerUPN, 'me@x.com');
  assert.ok(String(created[0].ArticleId).indexOf('KB-') === 0);
  await unmount();

  await mount(render(Knowledge, data, [], 'es'));
  await settle();
  assert.ok(text().indexOf('Nuevo artículo') > -1);
  await unmount();
};

const run = async (): Promise<void> => {
  await testSkillsGapsAndCertifications();
  await testNewSkill();
  await testTrainings();
  await testArticles();
  console.log('people screen tests passed');
  process.exit(0);
};

run().catch(error => {
  console.error(error);
  process.exit(1);
});
