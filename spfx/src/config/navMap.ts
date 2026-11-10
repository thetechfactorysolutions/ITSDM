import { AppConfig } from './AppConfig';
import { IHubData } from '../components/shared/HubData';

/** The main tabs, by key, with the text key of their name. */
export const TABS: Array<[string, string]> = [
  ['dashboard', 'nav.dashboard'], ['matters', 'nav.matters'], ['agenda', 'nav.agenda'], ['links', 'nav.links'], ['ideas', 'nav.ideas'], ['initiatives', 'nav.initiatives'],
  ['projects', 'nav.projects'], ['actions', 'nav.actions'], ['purchases', 'nav.purchases'], ['finance', 'nav.finance'], ['vendors', 'nav.vendorsTab'], ['operations', 'nav.operations'],
  ['people', 'nav.people'], ['devices', 'nav.devices'], ['genius', 'nav.genius'], ['strategy', 'nav.strategy'], ['weekly', 'nav.weeklyReview'], ['governance', 'nav.governance'],
  ['notes', 'nav.notes'], ['alerts', 'nav.alerts'], ['import', 'nav.import'], ['help', 'nav.help']
];

export type ListNames = typeof AppConfig.sharePoint.listNames;

/** The lists a record can be found in: where it lives in the hub, which tab shows it, and what to call it. */
export const SOURCES: Array<{ hub: keyof IHubData; listName: keyof ListNames; tab: string; kind: string }> = [
  { hub: 'ideas', listName: 'ideas', tab: 'ideas', kind: 'nav.ideas' },
  { hub: 'initiatives', listName: 'initiatives', tab: 'initiatives', kind: 'nav.initiatives' },
  { hub: 'projects', listName: 'projects', tab: 'projects', kind: 'nav.projects' },
  { hub: 'actions', listName: 'actions', tab: 'actions', kind: 'nav.actions' },
  { hub: 'matters', listName: 'matters', tab: 'matters', kind: 'nav.matters' },
  { hub: 'links', listName: 'links', tab: 'links', kind: 'nav.links' },
  { hub: 'purchases', listName: 'purchases', tab: 'purchases', kind: 'nav.purchases' },
  { hub: 'purchaseOrders', listName: 'purchaseOrders', tab: 'purchases', kind: 'purchaseOrders.title' },
  { hub: 'budgets', listName: 'budgets', tab: 'finance', kind: 'nav.budgets' },
  { hub: 'capex', listName: 'capex', tab: 'finance', kind: 'nav.capex' },
  { hub: 'opex', listName: 'opex', tab: 'finance', kind: 'nav.opex' },
  { hub: 'vendors', listName: 'vendors', tab: 'vendors', kind: 'nav.vendors' },
  { hub: 'contracts', listName: 'contracts', tab: 'vendors', kind: 'nav.contracts' },
  { hub: 'entitlements', listName: 'entitlements', tab: 'vendors', kind: 'nav.entitlements' },
  { hub: 'incidents', listName: 'incidents', tab: 'operations', kind: 'nav.incidents' },
  { hub: 'changes', listName: 'changeRequests', tab: 'operations', kind: 'nav.changes' },
  { hub: 'kpis', listName: 'kpis', tab: 'operations', kind: 'nav.kpis' },
  { hub: 'skills', listName: 'teamSkills', tab: 'people', kind: 'nav.skills' },
  { hub: 'trainings', listName: 'trainingPlans', tab: 'people', kind: 'nav.training' },
  { hub: 'articles', listName: 'knowledgeBase', tab: 'people', kind: 'nav.knowledge' },
  { hub: 'stock', listName: 'stock', tab: 'devices', kind: 'nav.devices' },
  { hub: 'genius', listName: 'genius', tab: 'genius', kind: 'nav.genius' },
  { hub: 'objectives', listName: 'objectives', tab: 'strategy', kind: 'nav.objectives' },
  { hub: 'businessCases', listName: 'businessCases', tab: 'strategy', kind: 'nav.businessCases' },
  { hub: 'risks', listName: 'risks', tab: 'governance', kind: 'nav.risks' },
  { hub: 'decisions', listName: 'decisions', tab: 'governance', kind: 'nav.decisions' },
  { hub: 'notes', listName: 'notes', tab: 'notes', kind: 'nav.notes' },
  { hub: 'meetings', listName: 'meetings', tab: 'notes', kind: 'nav.meetings' }
];


/** The main tab that shows a list, by the name of the list in SharePoint. */
export const tabForList = (listName: string): string | undefined => {
  const names = AppConfig.sharePoint.listNames as unknown as Record<string, string>;
  const found = SOURCES.filter(s => names[s.listName] === listName)[0];
  return found ? found.tab : undefined;
};
