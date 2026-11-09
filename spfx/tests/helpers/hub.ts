import * as React from 'react';
import { HubDataContext, IHubData } from '../../src/components/shared/HubData';
import { IDataStore } from '../../src/data/IDataStore';
import { IListHookState } from '../../src/hooks/useListItems';
import { I18nProvider, Language } from '../../src/i18n/I18n';
import { typeInto } from './dom';

/** A fake page data context for screen tests: every list is empty unless the test gives rows. */

export interface IRecorder {
  created: Array<Record<string, unknown>>;
  updated: Array<{ id: number; payload: Record<string, unknown> }>;
  /** Calls to the store's createItem, with the list they went to. */
  createdItems: Array<{ list: string; payload: Record<string, unknown> }>;
}

export const newRec = (): IRecorder => ({ created: [], updated: [], createdItems: [] });

export const list = <T,>(rows: T[], rec?: IRecorder): IListHookState<T> => ({
  items: rows, loading: false, error: undefined, reload: async () => undefined,
  create: async payload => { if (rec) { rec.created.push(payload); } },
  update: async (id, payload) => { if (rec) { rec.updated.push({ id, payload }); } },
  remove: async () => undefined
});

const LIST_KEYS = [
  'ideas', 'initiatives', 'projects', 'actions', 'meetings', 'notes', 'risks', 'decisions', 'lessons', 'reviews', 'budgets', 'capex', 'opex', 'vendors', 'contracts', 'incidents',
  'changes', 'interactions', 'kpis', 'skills', 'trainings', 'articles', 'matters', 'areas', 'links', 'entitlements', 'nps', 'serviceMonths', 'catalog', 'stock', 'genius'
];

export type HubRows = Partial<Record<string, unknown[]>>;

export const hubFor = (data: HubRows, rec: IRecorder, service?: Partial<IDataStore>): IHubData => {
  const hub: Record<string, unknown> = {
    service: {
      capabilities: { versioning: false, userSearch: 'known', attachments: false }, searchUsers: async () => [],
      createItem: async (listName: string, payload: Record<string, unknown>) => { rec.createdItems.push({ list: listName, payload }); return {}; }, ...service
    },
    userEmail: 'me@x.com'
  };
  LIST_KEYS.forEach(key => { hub[key] = list(data[key] ?? [], rec); });
  return hub as unknown as IHubData;
};

export const renderWith = (element: React.ReactElement, data: HubRows = {}, rec: IRecorder = newRec(), language: Language = 'en', service?: Partial<IDataStore>): React.ReactElement =>
  React.createElement(I18nProvider, { language }, React.createElement(HubDataContext.Provider, { value: hubFor(data, rec, service) }, element));

export const text = (): string => document.body.textContent ?? '';
export const count = (needle: string): number => text().split(needle).length - 1;
export const button = (label: string): HTMLButtonElement | undefined =>
  Array.from(document.body.querySelectorAll('button')).filter(b => (b.textContent ?? '').trim() === label)[0] as HTMLButtonElement | undefined;

export const setField = async (label: string, value: string): Promise<void> => {
  const l = Array.from(document.body.querySelectorAll('label')).filter(x => (x.textContent ?? '').trim() === label)[0] as HTMLLabelElement;
  if (!l) {
    throw new Error(`field "${label}" does not exist`);
  }
  await typeInto(document.getElementById(l.htmlFor) as HTMLInputElement, value);
};
