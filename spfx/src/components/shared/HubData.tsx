import * as React from 'react';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { AppConfig } from '../../config/AppConfig';
import { EXPAND_EDITOR, SELECT } from '../../entities/payloads';
import { IListHookState, useListItems } from '../../hooks/useListItems';
import { useSharePointService } from '../../hooks/useSharePointService';
import { ActionItem, Idea, Initiative, Meeting, Note, Project } from '../../models';
import { IQueryOptions, SharePointService } from '../../services/SharePointService';
import { mapAction, mapIdea, mapInitiative, mapMeeting, mapNote, mapProject } from './mappers';

export interface IHubData {
  service: SharePointService;
  userEmail: string;
  ideas: IListHookState<Idea>;
  initiatives: IListHookState<Initiative>;
  projects: IListHookState<Project>;
  actions: IListHookState<ActionItem>;
  meetings: IListHookState<Meeting>;
  notes: IListHookState<Note>;
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

  const value: IHubData = {
    service,
    userEmail: context.pageContext.user.email,
    ideas,
    initiatives,
    projects,
    actions,
    meetings,
    notes
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
