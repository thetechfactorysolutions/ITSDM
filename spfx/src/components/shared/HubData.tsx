import * as React from 'react';
import { AppConfig } from '../../config/AppConfig';
import { EXPAND_EDITOR, SELECT } from '../../entities/payloads';
import { IListHookState, useListItems } from '../../hooks/useListItems';
import {
  ActionItem, Area, Favorite, FileLink, Purchase, PurchaseOrder, PurchaseRoleEntry, Article, BusinessCase, Budget, CatalogEntry, GeniusSession, NpsResponse, Objective, ServiceMonth, StockItem, WeeklyReview, CapexItem, ChangeRequest, Contract, Decision, Entitlement, Idea, Incident, Initiative, Interaction, Kpi, Lesson, LinkItem, Matter, Meeting, Note, OpexItem, Project, Review, Risk, Skill, Training, Vendor
} from '../../models';
import { IDataStore, IQueryOptions } from '../../data/IDataStore';
import {
  mapAction, mapBudget, mapCapex, mapChange, mapContract, mapDecision, mapIdea, mapIncident, mapInitiative, mapInteraction, mapKpi, mapLesson, mapMeeting, mapNote, mapOpex, mapProject,
  mapFavorite, mapFileLink, mapPurchase, mapPurchaseOrder, mapPurchaseRole, mapArea, mapArticle, mapCase, mapCatalog, mapGenius, mapObjective, mapStock, mapWeekly, mapNps, mapServiceMonth, mapEntitlement, mapLink, mapMatter, mapReview, mapRisk, mapSkill, mapTraining, mapVendor
} from './mappers';

export interface IHubData {
  service: IDataStore;
  userEmail: string;
  ideas: IListHookState<Idea>;
  initiatives: IListHookState<Initiative>;
  projects: IListHookState<Project>;
  actions: IListHookState<ActionItem>;
  meetings: IListHookState<Meeting>;
  notes: IListHookState<Note>;
  risks: IListHookState<Risk>;
  decisions: IListHookState<Decision>;
  lessons: IListHookState<Lesson>;
  reviews: IListHookState<Review>;
  budgets: IListHookState<Budget>;
  capex: IListHookState<CapexItem>;
  opex: IListHookState<OpexItem>;
  vendors: IListHookState<Vendor>;
  contracts: IListHookState<Contract>;
  incidents: IListHookState<Incident>;
  changes: IListHookState<ChangeRequest>;
  interactions: IListHookState<Interaction>;
  kpis: IListHookState<Kpi>;
  skills: IListHookState<Skill>;
  trainings: IListHookState<Training>;
  articles: IListHookState<Article>;
  matters: IListHookState<Matter>;
  areas: IListHookState<Area>;
  links: IListHookState<LinkItem>;
  entitlements: IListHookState<Entitlement>;
  nps: IListHookState<NpsResponse>;
  serviceMonths: IListHookState<ServiceMonth>;
  catalog: IListHookState<CatalogEntry>;
  stock: IListHookState<StockItem>;
  genius: IListHookState<GeniusSession>;
  objectives: IListHookState<Objective>;
  businessCases: IListHookState<BusinessCase>;
  weeklyReviews: IListHookState<WeeklyReview>;
  purchases: IListHookState<Purchase>;
  purchaseOrders: IListHookState<PurchaseOrder>;
  purchaseRoles: IListHookState<PurchaseRoleEntry>;
  favorites: IListHookState<Favorite>;
  fileLinks: IListHookState<FileLink>;
  /** Loads every list again, e.g. after the lists were created. */
  reloadAll: () => Promise<void>;
}

export const HubDataContext = React.createContext<IHubData | undefined>(undefined);

export interface IHubDataProviderProps {
  /** Where the data lives: SharePoint lists, a JSON file... */
  store: IDataStore;
  /** Email of the person using the app. */
  userEmail: string;
  children?: React.ReactNode;
}

const query = (select: string[]): IQueryOptions => ({ select, expand: EXPAND_EDITOR });
const IDEAS_QUERY = query(SELECT.ideas);
const INITIATIVES_QUERY = query(SELECT.initiatives);
const PROJECTS_QUERY = query(SELECT.projects);
const ACTIONS_QUERY = query(SELECT.actions);
const MEETINGS_QUERY = query(SELECT.meetings);
const NOTES_QUERY = query(SELECT.notes);
const RISKS_QUERY = query(SELECT.risks);
const DECISIONS_QUERY = query(SELECT.decisions);
const LESSONS_QUERY = query(SELECT.lessons);
const REVIEWS_QUERY = query(SELECT.reviews);
const BUDGETS_QUERY = query(SELECT.budgets);
const CAPEX_QUERY = query(SELECT.capex);
const OPEX_QUERY = query(SELECT.opex);
const VENDORS_QUERY = query(SELECT.vendors);
const CONTRACTS_QUERY = query(SELECT.contracts);
const INCIDENTS_QUERY = query(SELECT.incidents);
const CHANGES_QUERY = query(SELECT.changes);
const INTERACTIONS_QUERY = query(SELECT.interactions);
const KPIS_QUERY = query(SELECT.kpis);
const SKILLS_QUERY = query(SELECT.skills);
const TRAININGS_QUERY = query(SELECT.trainings);
const ARTICLES_QUERY = query(SELECT.articles);
const MATTERS_QUERY = query(SELECT.matters);
const AREAS_QUERY = query(SELECT.areas);
const LINKS_QUERY = query(SELECT.links);
const ENTITLEMENTS_QUERY = query(SELECT.entitlements);
const NPS_QUERY = query(SELECT.nps);
const SERVICE_MONTHS_QUERY = query(SELECT.serviceMonths);
const CATALOG_QUERY = query(SELECT.catalog);
const STOCK_QUERY = query(SELECT.stock);
const GENIUS_QUERY = query(SELECT.genius);
const OBJECTIVES_QUERY = query(SELECT.objectives);
const CASES_QUERY = query(SELECT.businessCases);
const WEEKLY_QUERY = query(SELECT.weeklyReviews);
const PURCHASES_QUERY = query(SELECT.purchases);
const PURCHASE_ORDERS_QUERY = query(SELECT.purchaseOrders);
const PURCHASE_ROLES_QUERY = query(SELECT.purchaseRoles);
const FAVORITES_QUERY = query(SELECT.favorites);
const FILE_LINKS_QUERY = query(SELECT.fileLinks);

/**
 * Loads each list once for the whole web part. Every tab reads the same state, so switching
 * tabs does not refetch and a change made in one tab shows up in the others.
 */
export const HubDataProvider: React.FC<IHubDataProviderProps> = ({ store, userEmail, children }) => {
  const service = store;
  const listNames = AppConfig.sharePoint.listNames;
  const ideas = useListItems<Idea>(service, listNames.ideas, mapIdea, IDEAS_QUERY);
  const initiatives = useListItems<Initiative>(service, listNames.initiatives, mapInitiative, INITIATIVES_QUERY);
  const projects = useListItems<Project>(service, listNames.projects, mapProject, PROJECTS_QUERY);
  const actions = useListItems<ActionItem>(service, listNames.actions, mapAction, ACTIONS_QUERY);
  const meetings = useListItems<Meeting>(service, listNames.meetings, mapMeeting, MEETINGS_QUERY);
  const notes = useListItems<Note>(service, listNames.notes, mapNote, NOTES_QUERY);
  const risks = useListItems<Risk>(service, listNames.risks, mapRisk, RISKS_QUERY);
  const decisions = useListItems<Decision>(service, listNames.decisions, mapDecision, DECISIONS_QUERY);
  const lessons = useListItems<Lesson>(service, listNames.lessonsLearned, mapLesson, LESSONS_QUERY);
  const reviews = useListItems<Review>(service, listNames.reviews, mapReview, REVIEWS_QUERY);
  const budgets = useListItems<Budget>(service, listNames.budgets, mapBudget, BUDGETS_QUERY);
  const capex = useListItems<CapexItem>(service, listNames.capex, mapCapex, CAPEX_QUERY);
  const opex = useListItems<OpexItem>(service, listNames.opex, mapOpex, OPEX_QUERY);
  const vendors = useListItems<Vendor>(service, listNames.vendors, mapVendor, VENDORS_QUERY);
  const contracts = useListItems<Contract>(service, listNames.contracts, mapContract, CONTRACTS_QUERY);
  const incidents = useListItems<Incident>(service, listNames.incidents, mapIncident, INCIDENTS_QUERY);
  const changes = useListItems<ChangeRequest>(service, listNames.changeRequests, mapChange, CHANGES_QUERY);
  const interactions = useListItems<Interaction>(service, listNames.interactions, mapInteraction, INTERACTIONS_QUERY);
  const kpis = useListItems<Kpi>(service, listNames.kpis, mapKpi, KPIS_QUERY);
  const skills = useListItems<Skill>(service, listNames.teamSkills, mapSkill, SKILLS_QUERY);
  const trainings = useListItems<Training>(service, listNames.trainingPlans, mapTraining, TRAININGS_QUERY);
  const articles = useListItems<Article>(service, listNames.knowledgeBase, mapArticle, ARTICLES_QUERY);
  const matters = useListItems<Matter>(service, listNames.matters, mapMatter, MATTERS_QUERY);
  const areas = useListItems<Area>(service, listNames.areas, mapArea, AREAS_QUERY);
  const links = useListItems<LinkItem>(service, listNames.links, mapLink, LINKS_QUERY);
  const entitlements = useListItems<Entitlement>(service, listNames.entitlements, mapEntitlement, ENTITLEMENTS_QUERY);
  const nps = useListItems<NpsResponse>(service, listNames.nps, mapNps, NPS_QUERY);
  const serviceMonths = useListItems<ServiceMonth>(service, listNames.serviceMonths, mapServiceMonth, SERVICE_MONTHS_QUERY);
  const catalog = useListItems<CatalogEntry>(service, listNames.catalog, mapCatalog, CATALOG_QUERY);
  const stock = useListItems<StockItem>(service, listNames.stock, mapStock, STOCK_QUERY);
  const genius = useListItems<GeniusSession>(service, listNames.genius, mapGenius, GENIUS_QUERY);
  const objectives = useListItems<Objective>(service, listNames.objectives, mapObjective, OBJECTIVES_QUERY);
  const businessCases = useListItems<BusinessCase>(service, listNames.businessCases, mapCase, CASES_QUERY);
  const weeklyReviews = useListItems<WeeklyReview>(service, listNames.weeklyReviews, mapWeekly, WEEKLY_QUERY);
  const purchases = useListItems<Purchase>(service, listNames.purchases, mapPurchase, PURCHASES_QUERY);
  const purchaseOrders = useListItems<PurchaseOrder>(service, listNames.purchaseOrders, mapPurchaseOrder, PURCHASE_ORDERS_QUERY);
  const purchaseRoles = useListItems<PurchaseRoleEntry>(service, listNames.purchaseRoles, mapPurchaseRole, PURCHASE_ROLES_QUERY);
  const favorites = useListItems<Favorite>(service, listNames.favorites, mapFavorite, FAVORITES_QUERY);
  const fileLinks = useListItems<FileLink>(service, listNames.fileLinks, mapFileLink, FILE_LINKS_QUERY);

  const everyList: Array<IListHookState<unknown>> = [
    ideas, initiatives, projects, actions, meetings, notes, risks, decisions, lessons, reviews, budgets, capex, opex, vendors, contracts, incidents, changes, interactions, kpis, skills,
    trainings, articles, matters, areas, links, entitlements, nps, serviceMonths, catalog, stock, genius, objectives, businessCases, weeklyReviews, purchases, purchaseOrders, purchaseRoles, favorites, fileLinks
  ] as Array<IListHookState<unknown>>;
  const reloadAll = async (): Promise<void> => {
    await Promise.all(everyList.map(state => state.reload().catch(() => undefined)));
  };

  const value: IHubData = {
    service,
    userEmail,
    ideas,
    initiatives,
    projects,
    actions,
    meetings,
    notes,
    risks,
    decisions,
    lessons,
    reviews,
    budgets,
    capex,
    opex,
    vendors,
    contracts,
    incidents,
    changes,
    interactions,
    kpis,
    skills,
    trainings,
    articles,
    matters,
    areas,
    links,
    entitlements,
    nps,
    serviceMonths,
    catalog,
    stock,
    genius,
    objectives,
    businessCases,
    weeklyReviews,
    purchases,
    purchaseOrders,
    purchaseRoles,
    favorites,
    fileLinks,
    reloadAll
  };

  return <HubDataContext.Provider value={value}>{children}</HubDataContext.Provider>;
};

export const useHubData = (): IHubData => {
  const value = React.useContext(HubDataContext);
  if (!value) {
    throw new Error('useHubData must be used inside HubDataProvider.');
  }

  return value;
};
