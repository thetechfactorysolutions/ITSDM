import * as React from 'react';
import { ILinkOption } from './LinkField';
import { useHubData } from './HubData';

export interface ILinkOptions {
  initiativeOptions: ILinkOption[];
  projectOptions: ILinkOption[];
  meetingOptions: ILinkOption[];
}

/** The choices for the link pickers (initiative, project, meeting), built once from the shared data. */
export const useLinkOptions = (): ILinkOptions => {
  const { initiatives, projects, meetings } = useHubData();
  const initiativeOptions = React.useMemo(() => initiatives.items.map(i => ({ id: i.initiativeId, title: i.title })), [initiatives.items]);
  const projectOptions = React.useMemo(() => projects.items.map(p => ({ id: p.projectId, title: p.title })), [projects.items]);
  const meetingOptions = React.useMemo(() => meetings.items.map(m => ({ id: m.meetingId, title: m.title })), [meetings.items]);
  return { initiativeOptions, projectOptions, meetingOptions };
};
