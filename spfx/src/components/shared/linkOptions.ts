import * as React from 'react';
import { ILinkOption } from './LinkField';
import { useHubData } from './HubData';

export interface IFinanceLinkOptions {
  budgetOptions: ILinkOption[];
  vendorOptions: ILinkOption[];
  contractOptions: ILinkOption[];
  projectOptions: ILinkOption[];
}

/** The choices for budget, vendor, contract and project pickers, used by the finance and vendor screens. */
export const useFinanceLinkOptions = (): IFinanceLinkOptions => {
  const { budgets, vendors, contracts, projects } = useHubData();
  const budgetOptions = React.useMemo(() => budgets.items.map(b => ({ id: b.budgetId, title: b.title })), [budgets.items]);
  const vendorOptions = React.useMemo(() => vendors.items.map(v => ({ id: v.vendorId, title: v.title })), [vendors.items]);
  const contractOptions = React.useMemo(() => contracts.items.map(c => ({ id: c.contractId, title: c.title })), [contracts.items]);
  const projectOptions = React.useMemo(() => projects.items.map(p => ({ id: p.projectId, title: p.title })), [projects.items]);
  return { budgetOptions, vendorOptions, contractOptions, projectOptions };
};

export interface IOperationsLinkOptions {
  projectOptions: ILinkOption[];
  vendorOptions: ILinkOption[];
  meetingOptions: ILinkOption[];
}

/** The choices for project, vendor and meeting pickers, used by the operations screens. */
export const useOperationsLinkOptions = (): IOperationsLinkOptions => {
  const { projects, vendors, meetings } = useHubData();
  const projectOptions = React.useMemo(() => projects.items.map(p => ({ id: p.projectId, title: p.title })), [projects.items]);
  const vendorOptions = React.useMemo(() => vendors.items.map(v => ({ id: v.vendorId, title: v.title })), [vendors.items]);
  const meetingOptions = React.useMemo(() => meetings.items.map(m => ({ id: m.meetingId, title: m.title })), [meetings.items]);
  return { projectOptions, vendorOptions, meetingOptions };
};

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
