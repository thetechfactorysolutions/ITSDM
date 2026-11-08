import * as React from 'react';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { AppConfig } from '../../config/AppConfig';
import { IListHookState, useListItems } from '../../hooks/useListItems';
import { useSharePointService } from '../../hooks/useSharePointService';
import { ActionItem, Idea, Initiative, Project } from '../../models';
import { SharePointService } from '../../services/SharePointService';
import { mapAction, mapIdea, mapInitiative, mapProject } from './mappers';

export interface IHubData {
  service: SharePointService;
  userEmail: string;
  ideas: IListHookState<Idea>;
  initiatives: IListHookState<Initiative>;
  projects: IListHookState<Project>;
  actions: IListHookState<ActionItem>;
}

const HubDataContext = React.createContext<IHubData | undefined>(undefined);

export interface IHubDataProviderProps {
  context: WebPartContext;
  children?: React.ReactNode;
}

/**
 * Loads each list once for the whole web part. Every tab reads the same state, so switching
 * tabs does not refetch and a change made in one tab shows up in the others.
 */
export const HubDataProvider: React.FC<IHubDataProviderProps> = ({ context, children }) => {
  const service = useSharePointService(context);
  const listNames = AppConfig.sharePoint.listNames;
  const ideas = useListItems<Idea>(service, listNames.ideas, mapIdea);
  const initiatives = useListItems<Initiative>(service, listNames.initiatives, mapInitiative);
  const projects = useListItems<Project>(service, listNames.projects, mapProject);
  const actions = useListItems<ActionItem>(service, listNames.actions, mapAction);

  const value: IHubData = {
    service,
    userEmail: context.pageContext.user.email,
    ideas,
    initiatives,
    projects,
    actions
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
