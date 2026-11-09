import * as React from 'react';
import { activeAreas } from '../../rules/matters';
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

export interface IPeopleLinkOptions {
  skillOptions: ILinkOption[];
  vendorOptions: ILinkOption[];
  projectOptions: ILinkOption[];
  incidentOptions: ILinkOption[];
}

/** The choices for skill, vendor, project and incident pickers, used by the people and knowledge screens. */
export const usePeopleLinkOptions = (): IPeopleLinkOptions => {
  const { skills, vendors, projects, incidents } = useHubData();
  const skillOptions = React.useMemo(() => skills.items.map(s => ({ id: s.skillId, title: `${s.title} · ${s.personUpn}` })), [skills.items]);
  const vendorOptions = React.useMemo(() => vendors.items.map(v => ({ id: v.vendorId, title: v.title })), [vendors.items]);
  const projectOptions = React.useMemo(() => projects.items.map(p => ({ id: p.projectId, title: p.title })), [projects.items]);
  const incidentOptions = React.useMemo(() => incidents.items.map(i => ({ id: i.incidentId, title: i.title })), [incidents.items]);
  return { skillOptions, vendorOptions, projectOptions, incidentOptions };
};

export interface IMatterLinkOptions {
  areaOptions: ILinkOption[];
  projectOptions: ILinkOption[];
  contractOptions: ILinkOption[];
  incidentOptions: ILinkOption[];
  vendorOptions: ILinkOption[];
}

/** The choices for the pickers of a matter: the active areas, and what a matter can point to. */
export const useMatterLinkOptions = (): IMatterLinkOptions => {
  const { areas, projects, contracts, incidents, vendors } = useHubData();
  const areaOptions = React.useMemo(() => activeAreas(areas.items).map(a => ({ id: a.areaId, title: a.title })), [areas.items]);
  const projectOptions = React.useMemo(() => projects.items.map(p => ({ id: p.projectId, title: p.title })), [projects.items]);
  const contractOptions = React.useMemo(() => contracts.items.map(c => ({ id: c.contractId, title: c.title })), [contracts.items]);
  const incidentOptions = React.useMemo(() => incidents.items.map(i => ({ id: i.incidentId, title: i.title })), [incidents.items]);
  const vendorOptions = React.useMemo(() => vendors.items.map(v => ({ id: v.vendorId, title: v.title })), [vendors.items]);
  return { areaOptions, projectOptions, contractOptions, incidentOptions, vendorOptions };
};

export interface IStrategyLinkOptions {
  objectiveOptions: ILinkOption[];
  initiativeOptions: ILinkOption[];
  projectOptions: ILinkOption[];
  kpiOptions: ILinkOption[];
}

/** The choices for the pickers of objectives and business cases. */
export const useStrategyLinkOptions = (): IStrategyLinkOptions => {
  const { objectives, initiatives, projects, kpis } = useHubData();
  const objectiveOptions = React.useMemo(() => objectives.items.map(o => ({ id: o.objectiveId, title: o.title })), [objectives.items]);
  const initiativeOptions = React.useMemo(() => initiatives.items.map(i => ({ id: i.initiativeId, title: i.title })), [initiatives.items]);
  const projectOptions = React.useMemo(() => projects.items.map(p => ({ id: p.projectId, title: p.title })), [projects.items]);
  const kpiOptions = React.useMemo(() => kpis.items.map(k => ({ id: k.kpiId, title: k.title })), [kpis.items]);
  return { objectiveOptions, initiativeOptions, projectOptions, kpiOptions };
};
