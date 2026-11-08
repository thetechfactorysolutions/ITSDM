import * as React from 'react';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { AppConfig } from '../../config/AppConfig';
import { EXPAND_EDITOR, SELECT } from '../../entities/payloads';
import { IListHookState, useListItems } from '../../hooks/useListItems';
import { useSharePointService } from '../../hooks/useSharePointService';
import {
  ActionItem, Budget, CapexItem, ChangeRequest, Contract, Decision, Idea, Incident, Initiative, Interaction, Kpi, Lesson, Meeting, Note, OpexItem, Project, Review, Risk, Vendor
} from '../../models';
import { IQueryOptions, SharePointService } from '../../services/SharePointService';
import {
  mapAction, mapBudget, mapCapex, mapChange, mapContract, mapDecision, mapIdea, mapIncident, mapInitiative, mapInteraction, mapKpi, mapLesson, mapMeeting, mapNote, mapOpex, mapProject,
  mapReview, mapRisk, mapVendor
} from './mappers';

export interface IHubData {
  service: SharePointService;
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
}

export const HubDataContext = React.createContext<IHubData | undefined>(undefined);

export interface IHubDataProviderProps {
  context: WebPartContext;
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

/**
 * Loads each list once for the whole web part. Every tab reads the same state, so switching
 * tabs does not refetch and a change made in one tab shows up in the others.
 */
export const HubDataProvider: React.FC<IHubDataProviderProps> = ({ context, children }) => {
  const service = useSharePointService(context);
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

  const value: IHubData = {
    service,
    userEmail: context.pageContext.user.email,
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
    kpis
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
