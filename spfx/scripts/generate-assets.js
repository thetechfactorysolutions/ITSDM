/*
 * Generates the SharePoint provisioning assets that are packed inside the .sppkg:
 *   sharepoint/assets/elements.xml        -> list instances (+ sample rows)
 *   sharepoint/assets/schema_<list>.xml   -> one list schema (columns, view, forms) per list
 *
 * When the app is added to a site, SharePoint activates the feature declared in
 * config/package-solution.json and creates the lists from these files.
 *
 * This file is the single definition of the lists (see also docs/SHAREPOINT_SCHEMA.md).
 * Run it before packaging so the sample dates are relative to the packaging day:
 *   npm run package
 */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const OUT_DIR = process.env.ITSDM_ASSETS_DIR || path.join(__dirname, '..', 'sharepoint', 'assets');
const CUSTOM_LIST_FEATURE_ID = '00bfea71-de22-43b2-a848-c05709900100';
// Placeholder: the installer's identity is not known when the package is built.
const SAMPLE_OWNER = 'demo.owner@example.com';

const LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const T = (name) => ({ name, type: 'Text' });
const N = (name) => ({ name, type: 'Note' });
const D = (name) => ({ name, type: 'Date' });
const NUM = (name, attrs) => ({ name, type: 'Number', attrs: attrs || '' });
const C = (name, choices) => ({ name, type: 'Choice', choices });

const LISTS = [
  {
    title: 'IT_01_Ideas', file: 'schema_ideas.xml', description: 'Ideas captured by the IT team',
    fields: [T('IdeaId'), N('Description'),
      C('Status', ['NEW', 'DISCOVERY', 'VALIDATED', 'PLANNED', 'IN_PROGRESS', 'PILOT', 'ROLLOUT', 'COMPLETED', 'REJECTED', 'CANCELLED']),
      T('OwnerUPN'), T('SponsorUPN'), NUM('EstimatedValue'), D('TargetDate'), N('Tags'), T('ConvertedInitiativeId')],
    rows: (day) => [
      ['Automate new-joiner laptop provisioning', 'IDEA-DEMO-001', 'NEW', 40000, 90, 'automation,onboarding'],
      ['Self-service password reset portal', 'IDEA-DEMO-002', 'DISCOVERY', 25000, 60, 'service-desk'],
      ['Consolidate SaaS licences', 'IDEA-DEMO-003', 'VALIDATED', 120000, 45, 'cost,licences'],
      ['Chatbot for first-line IT support', 'IDEA-DEMO-004', 'PILOT', 80000, 30, 'ai,service-desk'],
      ['On-premises file server migration', 'IDEA-DEMO-005', 'REJECTED', 15000, 10, 'infrastructure']
    ].map(([t, id, s, v, d, tags]) => ({
      Title: t, IdeaId: id, Description: `Sample idea: ${t}.`, Status: s, OwnerUPN: SAMPLE_OWNER, SponsorUPN: SAMPLE_OWNER,
      EstimatedValue: v, TargetDate: day(d), Tags: tags
    }))
  },
  {
    title: 'IT_02_Initiatives', file: 'schema_initiatives.xml', description: 'Initiatives that deliver validated ideas',
    fields: [T('InitiativeId'), N('Description'), C('Status', ['DRAFT', 'ACTIVE', 'BLOCKED', 'ON_HOLD', 'COMPLETED', 'CANCELLED']),
      T('OwnerUPN'), NUM('ProgressPct', 'Min="0" Max="100"'), D('TargetDate'), T('SourceIdeaId'), T('PlannerPlanId')],
    rows: (day) => [
      ['Digital Workplace 2027', 'INIT-DEMO-001', 'ACTIVE', 55, 120],
      ['Cloud cost optimisation', 'INIT-DEMO-002', 'BLOCKED', 30, 75],
      ['Service desk modernisation', 'INIT-DEMO-003', 'DRAFT', 0, 150]
    ].map(([t, id, s, p, d]) => ({
      Title: t, InitiativeId: id, Description: `Sample initiative: ${t}.`, Status: s, OwnerUPN: SAMPLE_OWNER, ProgressPct: p, TargetDate: day(d)
    }))
  },
  {
    title: 'IT_03_Projects', file: 'schema_projects.xml', description: 'Projects with budget, forecast and risk',
    fields: [T('ProjectId'), T('InitiativeId'), N('Description'),
      C('Status', ['PLANNING', 'ACTIVE', 'AT_RISK', 'BLOCKED', 'ON_HOLD', 'COMPLETED', 'CANCELLED']),
      T('OwnerUPN'), D('StartDate'), D('EndDate'), NUM('BudgetAmount'), NUM('ForecastAmount'), C('RiskLevel', LEVELS), T('PlannerPlanId')],
    rows: (day) => [
      ['Laptop refresh wave 1', 'PROJ-DEMO-001', 'INIT-DEMO-001', 'ACTIVE', 200000, 205000, 'LOW', -60, 60],
      ['Teams telephony rollout', 'PROJ-DEMO-002', 'INIT-DEMO-001', 'ACTIVE', 100000, 128000, 'HIGH', -30, 90],
      ['FinOps tooling', 'PROJ-DEMO-003', 'INIT-DEMO-002', 'PLANNING', 50000, 50000, 'MEDIUM', 15, 120]
    ].map(([t, id, i, s, b, f, r, sd, ed]) => ({
      Title: t, ProjectId: id, InitiativeId: i, Description: `Sample project: ${t}.`, Status: s, OwnerUPN: SAMPLE_OWNER,
      StartDate: day(sd), EndDate: day(ed), BudgetAmount: b, ForecastAmount: f, RiskLevel: r
    }))
  },
  {
    title: 'IT_04_Actions', file: 'schema_actions.xml', description: 'Follow-up actions with owner and due date',
    fields: [T('ActionId'), T('InitiativeId'), T('ProjectId'), N('Description'),
      C('Status', ['OPEN', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED']), C('Priority', LEVELS),
      T('OwnerUPN'), D('DueDate'), D('CompletedDate'), T('PlannerTaskId')],
    rows: (day) => [
      ['Send procurement request', 'ACT-DEMO-001', 'OPEN', 'HIGH', -5],
      ['Review vendor contract', 'ACT-DEMO-002', 'IN_PROGRESS', 'CRITICAL', -1],
      ['Prepare steering committee', 'ACT-DEMO-003', 'OPEN', 'MEDIUM', 0],
      ['Test telephony failover', 'ACT-DEMO-004', 'OPEN', 'HIGH', 3],
      ['Update risk register', 'ACT-DEMO-005', 'BLOCKED', 'MEDIUM', 6],
      ['Plan wave 2 logistics', 'ACT-DEMO-006', 'OPEN', 'LOW', 21],
      ['Close wave 1 purchase order', 'ACT-DEMO-007', 'DONE', 'LOW', -10]
    ].map(([t, id, s, p, d]) => {
      const row = { Title: t, ActionId: id, Description: `Sample action: ${t}.`, Status: s, Priority: p, OwnerUPN: SAMPLE_OWNER, DueDate: day(d) };
      if (s === 'DONE') row.CompletedDate = day(d + 1);
      return row;
    })
  },
  {
    title: 'IT_05_KPIs', file: 'schema_kpis.xml', description: 'Indicators with a target; health and trend are calculated',
    fields: [T('KpiId'), N('Description'), C('Category', ['SERVICE', 'DELIVERY', 'FINANCE', 'PEOPLE', 'OTHER']), C('Status', ['ACTIVE', 'RETIRED']), T('Unit'),
      C('Direction', ['HIGHER', 'LOWER']), NUM('Target'), NUM('CurrentValue'), NUM('PreviousValue'), D('MeasuredOn'), T('OwnerUPN'), T('ProjectId')],
    rows: (day) => [
      ['Average incident resolution time', 'KPI-DEMO-001', 'days', 'LOWER', 3, 3.2, 4.1],
      ['First-contact resolution', 'KPI-DEMO-002', '%', 'HIGHER', 80, 65, 62],
      ['Service availability', 'KPI-DEMO-003', '%', 'HIGHER', 99.5, 99.7, 99.6],
      ['Open critical incidents', 'KPI-DEMO-004', 'incidents', 'LOWER', 0, 1, 0]
    ].map(([t, id, unit, dir, target, current, previous]) => ({
      Title: t, KpiId: id, Description: `Sample indicator: ${t}.`, Category: 'SERVICE', Status: 'ACTIVE', Unit: unit, Direction: dir,
      Target: target, CurrentValue: current, PreviousValue: previous, MeasuredOn: day(-1), OwnerUPN: SAMPLE_OWNER
    }))
  },
  {
    title: 'IT_13_Incidents', file: 'schema_incidents.xml', description: 'Incidents with severity, deadline and resolution',
    fields: [T('IncidentId'), N('Description'), C('Status', ['NEW', 'IN_PROGRESS', 'ON_HOLD', 'RESOLVED', 'CLOSED']), C('Severity', ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
      C('Category', ['APPLICATION', 'INFRASTRUCTURE', 'NETWORK', 'SECURITY', 'ACCESS', 'OTHER']), T('ReportedBy'), T('AssignedTo'), D('ReportedOn'), D('ResolvedOn'),
      N('Resolution'), N('RootCause'), T('ProjectId'), T('VendorId')],
    rows: (day) => [
      ['Email delivery delays', 'INC-DEMO-001', 'IN_PROGRESS', 'CRITICAL', 'APPLICATION', -2, null, '', '', 'VEN-DEMO-002'],
      ['VPN drops for remote users', 'INC-DEMO-002', 'NEW', 'MEDIUM', 'NETWORK', -2, null, '', '', ''],
      ['Printer queue stuck', 'INC-DEMO-003', 'RESOLVED', 'LOW', 'INFRASTRUCTURE', -10, -8, 'Restarted the print spooler.', 'A driver update left the spooler hanging.', '']
    ].map(([t, id, st, sev, cat, rep, res, resolution, cause, ven]) => {
      const row = { Title: t, IncidentId: id, Description: `Sample incident: ${t}.`, Status: st, Severity: sev, Category: cat, ReportedBy: SAMPLE_OWNER, AssignedTo: SAMPLE_OWNER, ReportedOn: day(rep), VendorId: ven };
      if (res !== null) { Object.assign(row, { ResolvedOn: day(res), Resolution: resolution, RootCause: cause }); }
      return row;
    })
  },
  {
    title: 'IT_14_Interactions', file: 'schema_interactions.xml', description: 'Contacts with stakeholders and their follow-ups',
    fields: [T('InteractionId'), C('InteractionType', ['MEETING', 'CALL', 'EMAIL', 'WORKSHOP', 'OTHER']), C('Status', ['LOGGED', 'FOLLOW_UP', 'DONE']), D('InteractionDate'),
      T('ContactName'), T('ContactEmail'), T('Organization'), N('Summary'), N('NextSteps'), D('FollowUpDate'), T('OwnerUPN'), T('ProjectId'), T('VendorId'), T('MeetingId')],
    rows: (day) => [
      ['Quarterly review with Fabrikam', 'INT-DEMO-001', 'MEETING', 'FOLLOW_UP', -10, 'Sam Rivera', 'Fabrikam Telecom', 'Reviewed delivery dates for the telephony rollout.', 'Send the updated delivery plan.', -3, 'VEN-DEMO-002'],
      ['Licence question', 'INT-DEMO-002', 'CALL', 'DONE', -5, 'Alex Morgan', 'Contoso Hardware', 'Clarified the warranty terms.', '', null, 'VEN-DEMO-001'],
      ['Steering committee preparation', 'INT-DEMO-003', 'WORKSHOP', 'LOGGED', -1, 'Jo Bennett', 'Northwind Cloud', 'Agreed the agenda.', '', null, 'VEN-DEMO-003']
    ].map(([t, id, type, st, d, contact, org, summary, next, fu, ven]) => {
      const row = { Title: t, InteractionId: id, InteractionType: type, Status: st, InteractionDate: day(d), ContactName: contact, Organization: org, Summary: summary, NextSteps: next, OwnerUPN: SAMPLE_OWNER, VendorId: ven };
      if (fu !== null) { row.FollowUpDate = day(fu); }
      return row;
    })
  },
  {
    title: 'IT_15_ChangeRequests', file: 'schema_changes.xml', description: 'Change requests; risky and emergency ones need a recorded approval',
    fields: [T('ChangeId'), N('Description'), N('Reason'), C('Status', ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'IMPLEMENTED']), C('ChangeType', ['STANDARD', 'NORMAL', 'EMERGENCY']),
      C('Risk', ['LOW', 'MEDIUM', 'HIGH']), D('PlannedDate'), D('ImplementedDate'), N('BackoutPlan'), T('OwnerUPN'), T('ProjectId')],
    rows: (day) => [
      ['Upgrade the core network switch', 'CHG-DEMO-001', 'SUBMITTED', 'NORMAL', 'HIGH', 14, null, 'Replace the end-of-life switch in the data room.', 'Restore the previous configuration and cable.', true],
      ['Rotate service-account passwords', 'CHG-DEMO-002', 'APPROVED', 'STANDARD', 'LOW', 3, null, 'Quarterly security hygiene.', 'Restore the previous secrets from the vault.', false],
      ['Emergency security patch', 'CHG-DEMO-003', 'IMPLEMENTED', 'EMERGENCY', 'MEDIUM', -6, -5, 'Actively exploited vulnerability.', 'Roll the patch back.', false]
    ].map(([t, id, st, type, risk, planned, implemented, reason, backout, pending]) => {
      const row = { Title: t, ChangeId: id, Description: `Sample change: ${t}.`, Reason: reason, Status: st, ChangeType: type, Risk: risk, PlannedDate: day(planned), BackoutPlan: backout, OwnerUPN: SAMPLE_OWNER };
      if (implemented !== null) { row.ImplementedDate = day(implemented); }
      // This high-risk change waits for a recorded approval before it can be approved.
      if (pending) { Object.assign(row, { ApprovalRule: 'change.approve', ApprovalStatus: 'PENDING', Approver: SAMPLE_OWNER, ApprovalRequestedOn: day(-1) }); }
      return row;
    })
  },
  {
    title: 'IT_06_Budgets', file: 'schema_budgets.xml', description: 'Budgets by year; committed and used are calculated from the expenses linked to them',
    fields: [T('BudgetId'), NUM('FiscalYear'), N('Description'), C('Status', ['DRAFT', 'APPROVED', 'CLOSED']), NUM('PlannedAmount'), T('OwnerUPN')],
    rows: () => [
      ['IT Infrastructure', 'BUD-DEMO-001', 'Laptops, telephony, licences and support for the year.', 500000],
      ['Cloud hosting', 'BUD-DEMO-002', 'Cloud platform costs for the year.', 60000]
    ].map(([t, id, d, planned]) => ({
      Title: t + ' ' + new Date().getFullYear(), BudgetId: id, FiscalYear: new Date().getFullYear(), Description: d, Status: 'APPROVED', PlannedAmount: planned, OwnerUPN: SAMPLE_OWNER
    }))
  },
  {
    title: 'IT_07_CAPEX', file: 'schema_capex.xml', description: 'Investments, linked to a budget, a project and a vendor',
    fields: [T('CapexId'), N('Description'), C('Status', ['PLANNED', 'COMMITTED', 'PAID', 'CANCELLED']), NUM('Amount'), D('ExpenseDate'), T('InvoiceRef'),
      T('OwnerUPN'), T('BudgetId'), T('ProjectId'), T('VendorId')],
    rows: (day) => [
      ['Laptops, wave 1', 'CAPEX-DEMO-001', 'COMMITTED', 205000, -20, 'BUD-DEMO-001', 'PROJ-DEMO-001', 'VEN-DEMO-001', false],
      ['Telephony hardware', 'CAPEX-DEMO-002', 'PLANNED', 90000, 30, 'BUD-DEMO-001', 'PROJ-DEMO-002', 'VEN-DEMO-002', false],
      ['Meeting-room equipment', 'CAPEX-DEMO-003', 'PLANNED', 80000, 45, 'BUD-DEMO-001', '', 'VEN-DEMO-001', true]
    ].map(([t, id, st, amount, d, bud, proj, ven, pending]) => {
      const row = { Title: t, CapexId: id, Description: `Sample investment: ${t}.`, Status: st, Amount: amount, ExpenseDate: day(d), OwnerUPN: SAMPLE_OWNER, BudgetId: bud, ProjectId: proj, VendorId: ven };
      // This one is large and waits for approval before it can be committed.
      if (pending) { Object.assign(row, { ApprovalRule: 'capex.commit', ApprovalStatus: 'PENDING', Approver: SAMPLE_OWNER, ApprovalRequestedOn: day(-1) }); }
      return row;
    })
  },
  {
    title: 'IT_08_OPEX', file: 'schema_opex.xml', description: 'Recurring costs; the annual amount counts against the budget',
    fields: [T('OpexId'), N('Description'), C('Status', ['PLANNED', 'COMMITTED', 'PAID', 'CANCELLED']), NUM('Amount'), C('Frequency', ['ONE_OFF', 'MONTHLY', 'QUARTERLY', 'ANNUAL']),
      D('ExpenseDate'), T('OwnerUPN'), T('BudgetId'), T('ProjectId'), T('VendorId'), T('ContractId')],
    rows: (day) => [
      ['Microsoft 365 licences', 'OPEX-DEMO-001', 'COMMITTED', 8000, 'MONTHLY', -60, 'BUD-DEMO-001', '', '', ''],
      ['Cloud hosting', 'OPEX-DEMO-002', 'COMMITTED', 6500, 'MONTHLY', -90, 'BUD-DEMO-002', '', 'VEN-DEMO-003', 'CON-DEMO-002'],
      ['Support retainer', 'OPEX-DEMO-003', 'PLANNED', 3000, 'QUARTERLY', 15, 'BUD-DEMO-001', '', 'VEN-DEMO-001', '']
    ].map(([t, id, st, amount, freq, d, bud, proj, ven, con]) => ({
      Title: t, OpexId: id, Description: `Sample recurring cost: ${t}.`, Status: st, Amount: amount, Frequency: freq, ExpenseDate: day(d),
      OwnerUPN: SAMPLE_OWNER, BudgetId: bud, ProjectId: proj, VendorId: ven, ContractId: con
    }))
  },
  {
    title: 'IT_09_Vendors', file: 'schema_vendors.xml', description: 'Vendors with contact and relationship owner',
    fields: [T('VendorId'), N('Description'), C('Status', ['ACTIVE', 'UNDER_REVIEW', 'INACTIVE']), C('Category', ['SOFTWARE', 'HARDWARE', 'SERVICES', 'TELECOM', 'CLOUD', 'OTHER']),
      T('ContactName'), T('ContactEmail'), T('Website'), T('OwnerUPN')],
    rows: () => [
      ['Contoso Hardware', 'VEN-DEMO-001', 'ACTIVE', 'HARDWARE', 'Alex Morgan', 'alex.morgan@example.com', 'Laptops, screens and room equipment.'],
      ['Fabrikam Telecom', 'VEN-DEMO-002', 'ACTIVE', 'TELECOM', 'Sam Rivera', 'sam.rivera@example.com', 'Telephony and connectivity.'],
      ['Northwind Cloud', 'VEN-DEMO-003', 'UNDER_REVIEW', 'CLOUD', 'Jo Bennett', 'jo.bennett@example.com', 'Cloud hosting platform.']
    ].map(([t, id, st, cat, contact, email, d]) => ({
      Title: t, VendorId: id, Description: d, Status: st, Category: cat, ContactName: contact, ContactEmail: email, Website: 'https://example.com', OwnerUPN: SAMPLE_OWNER
    }))
  },
  {
    title: 'IT_10_Contracts', file: 'schema_contracts.xml', description: 'Contracts with renewal notice, linked to a vendor',
    fields: [T('ContractId'), N('Description'), C('Status', ['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED']), T('VendorId'), D('StartDate'), D('EndDate'),
      NUM('NoticeDays', 'Min="0" Max="365"'), NUM('AnnualValue'), C('AutoRenew', ['NO', 'YES']), T('OwnerUPN'), T('ProjectId')],
    rows: (day) => [
      ['Hardware supply agreement', 'CON-DEMO-001', 'VEN-DEMO-001', 'ACTIVE', -300, 400, 90, 120000, 'NO'],
      ['Cloud hosting contract', 'CON-DEMO-002', 'VEN-DEMO-003', 'ACTIVE', -325, 40, 90, 78000, 'YES'],
      ['Telephony service', 'CON-DEMO-003', 'VEN-DEMO-002', 'DRAFT', 30, 395, 60, 60000, 'NO']
    ].map(([t, id, ven, st, sd, ed, notice, value, auto]) => ({
      Title: t, ContractId: id, Description: `Sample contract: ${t}.`, Status: st, VendorId: ven, StartDate: day(sd), EndDate: day(ed),
      NoticeDays: notice, AnnualValue: value, AutoRenew: auto, OwnerUPN: SAMPLE_OWNER
    }))
  },
  {
    title: 'IT_11_Risks', file: 'schema_risks.xml', description: 'Risks with probability, impact and mitigation',
    fields: [T('RiskId'), N('Description'), C('Status', ['OPEN', 'MITIGATING', 'ACCEPTED', 'CLOSED']),
      C('Probability', ['LOW', 'MEDIUM', 'HIGH']), C('Impact', ['LOW', 'MEDIUM', 'HIGH']),
      T('OwnerUPN'), N('Mitigation'), D('DueDate'), T('ProjectId'), T('InitiativeId'), T('MeetingId')],
    rows: (day) => [
      ['Telephony vendor may deliver late', 'RISK-DEMO-001', 'OPEN', 'HIGH', 'HIGH', 'Agree a firm delivery date and a penalty clause.', 14, 'PROJ-DEMO-002'],
      ['Users may resist the new laptops', 'RISK-DEMO-002', 'MITIGATING', 'MEDIUM', 'MEDIUM', 'Run short demos in each department.', 30, 'PROJ-DEMO-001'],
      ['Licence renewal could be missed', 'RISK-DEMO-003', 'ACCEPTED', 'LOW', 'MEDIUM', 'Calendar reminder 60 days before.', 60, '']
    ].map(([t, id, st, p, i, mit, d, proj]) => ({
      Title: t, RiskId: id, Description: `Sample risk: ${t}.`, Status: st, Probability: p, Impact: i, OwnerUPN: SAMPLE_OWNER,
      Mitigation: mit, DueDate: day(d), ProjectId: proj, MeetingId: 'MEET-DEMO-001'
    }))
  },
  {
    title: 'IT_12_Decisions', file: 'schema_decisions.xml', description: 'Decisions with their context and rationale',
    fields: [T('DecisionId'), N('Description'), N('Rationale'), C('Status', ['PROPOSED', 'DECIDED', 'SUPERSEDED']),
      T('DecidedBy'), D('DecisionDate'), T('ProjectId'), T('InitiativeId'), T('MeetingId')],
    rows: (day) => [
      ['Buy laptops in two waves', 'DEC-DEMO-001', 'DECIDED', 'Budget is released per wave.', 'A single purchase would exceed the quarterly budget.', -3, 'PROJ-DEMO-001'],
      ['Move telephony to Teams Phone', 'DEC-DEMO-002', 'PROPOSED', 'Waiting for the licence quote.', 'Removes the separate telephony contract.', 0, 'PROJ-DEMO-002']
    ].map(([t, id, st, ctx, why, d, proj]) => {
      const row = { Title: t, DecisionId: id, Description: ctx, Rationale: why, Status: st, ProjectId: proj, MeetingId: 'MEET-DEMO-001' };
      if (st === 'DECIDED') { row.DecidedBy = SAMPLE_OWNER; row.DecisionDate = day(d); }
      return row;
    })
  },
  {
    title: 'IT_16_TeamSkills', file: 'schema_skills.xml', description: 'Skills per person with the level reached and the level expected; certifications with expiry',
    fields: [T('SkillId'), T('PersonUPN'), C('Category', ['TECHNICAL', 'PROCESS', 'TOOLING', 'SOFT', 'OTHER']), C('Level', ['BASIC', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']),
      C('TargetLevel', ['BASIC', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']), C('Status', ['ACTIVE', 'ARCHIVED']), D('LastAssessed'), T('Certification'), D('CertificationExpiry'), N('Notes')],
    rows: (day) => [
      ['Microsoft 365 administration', 'SKL-DEMO-001', 'TOOLING', 'ADVANCED', 'ADVANCED', -30, 'MS-102', 200],
      ['Azure infrastructure', 'SKL-DEMO-002', 'TECHNICAL', 'INTERMEDIATE', 'ADVANCED', -45, 'AZ-104', 30],
      ['Incident management', 'SKL-DEMO-003', 'PROCESS', 'BASIC', 'INTERMEDIATE', -60, '', null]
    ].map(([t, id, cat, level, target, assessed, cert, expiry]) => {
      const row = { Title: t, SkillId: id, PersonUPN: SAMPLE_OWNER, Category: cat, Level: level, TargetLevel: target, Status: 'ACTIVE', LastAssessed: day(assessed), Notes: 'Sample skill record.' };
      if (cert) { Object.assign(row, { Certification: cert, CertificationExpiry: day(expiry) }); }
      return row;
    })
  },
  {
    title: 'IT_17_TrainingPlans', file: 'schema_training.xml', description: 'Training plans per person, linked to the skill they work on',
    fields: [T('TrainingId'), C('Status', ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']), C('TrainingType', ['COURSE', 'CERTIFICATION', 'WORKSHOP', 'SELF_STUDY', 'MENTORING']),
      T('PersonUPN'), T('Provider'), T('SkillId'), T('VendorId'), D('StartDate'), D('DueDate'), D('CompletedDate'), NUM('Cost'), N('Notes')],
    rows: (day) => [
      ['Renew the Azure administrator certification', 'TRN-DEMO-001', 'IN_PROGRESS', 'CERTIFICATION', 'Microsoft Learn', 'SKL-DEMO-002', -10, 20, null, 165],
      ['ITIL foundations course', 'TRN-DEMO-002', 'PLANNED', 'COURSE', 'Northwind Training', 'SKL-DEMO-003', -20, -3, null, 450],
      ['Mentoring on the service desk', 'TRN-DEMO-003', 'COMPLETED', 'MENTORING', 'Internal', 'SKL-DEMO-003', -60, -30, -32, 0]
    ].map(([t, id, st, type, provider, skill, start, due, done, cost]) => {
      const row = { Title: t, TrainingId: id, Status: st, TrainingType: type, PersonUPN: SAMPLE_OWNER, Provider: provider, SkillId: skill, StartDate: day(start), DueDate: day(due), Cost: cost, Notes: 'Sample training plan.' };
      if (done !== null) { row.CompletedDate = day(done); }
      return row;
    })
  },
  {
    title: 'IT_18_KnowledgeBase', file: 'schema_knowledge.xml', description: 'Articles, runbooks and policies; publishing a policy needs a recorded approval',
    fields: [T('ArticleId'), N('Summary'), N('Body'), C('Category', ['HOW_TO', 'RUNBOOK', 'FAQ', 'POLICY', 'REFERENCE']), C('Status', ['DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED']),
      T('OwnerUPN'), T('Tags'), D('PublishedOn'), D('ReviewDate'), T('ProjectId'), T('VendorId'), T('IncidentId')],
    rows: (day) => [
      ['Reset a user password', 'KB-DEMO-001', 'HOW_TO', 'PUBLISHED', 'How the service desk resets a password.', '1. Verify the identity. 2. Reset in the admin centre. 3. Ask the user to change it at sign-in.', 'password, service desk', -185, -5, '', false],
      ['Restart the print spooler', 'KB-DEMO-002', 'RUNBOOK', 'PUBLISHED', 'Fix for a stuck print queue.', 'Restart the Print Spooler service and clear the queue folder.', 'printer', -30, 150, 'INC-DEMO-003', false],
      ['Acceptable use policy', 'KB-DEMO-003', 'POLICY', 'IN_REVIEW', 'What staff may do with company devices.', 'Draft text of the policy.', 'policy, security', null, null, '', true]
    ].map(([t, id, cat, st, summary, body, tags, published, review, incident, pending]) => {
      const row = { Title: t, ArticleId: id, Summary: summary, Body: body, Category: cat, Status: st, OwnerUPN: SAMPLE_OWNER, Tags: tags, IncidentId: incident };
      if (published !== null) { Object.assign(row, { PublishedOn: day(published), ReviewDate: day(review) }); }
      // The policy waits for a recorded approval before it can be published.
      if (pending) { Object.assign(row, { ApprovalRule: 'article.publishPolicy', ApprovalStatus: 'PENDING', Approver: SAMPLE_OWNER, ApprovalRequestedOn: day(-1) }); }
      return row;
    })
  },
  {
    title: 'IT_19_Reviews', file: 'schema_reviews.xml', description: 'Periodic reviews of projects and initiatives',
    fields: [T('ReviewId'), C('ReviewType', ['STATUS', 'RISK', 'FINANCIAL', 'CLOSURE']), C('Status', ['SCHEDULED', 'COMPLETED', 'CANCELLED']),
      C('Health', ['GREEN', 'AMBER', 'RED']), D('ReviewDate'), D('NextReviewDate'), N('Summary'), N('NextSteps'), T('OwnerUPN'), T('ProjectId'), T('InitiativeId')],
    rows: (day) => [
      ['Telephony rollout: status review', 'REV-DEMO-001', 'STATUS', 'COMPLETED', 'AMBER', -7, 7, 'Forecast is above budget; approval pending.', 'Decide on the budget increase.', 'PROJ-DEMO-002'],
      ['Laptop refresh: financial review', 'REV-DEMO-002', 'FINANCIAL', 'SCHEDULED', 'GREEN', 14, 45, '', '', 'PROJ-DEMO-001']
    ].map(([t, id, type, st, health, d, next, summary, steps, proj]) => ({
      Title: t, ReviewId: id, ReviewType: type, Status: st, Health: health, ReviewDate: day(d), NextReviewDate: day(next),
      Summary: summary, NextSteps: steps, OwnerUPN: SAMPLE_OWNER, ProjectId: proj
    }))
  },
  {
    title: 'IT_20_LessonsLearned', file: 'schema_lessons.xml', description: 'What was learned and what to do next time',
    fields: [T('LessonId'), N('Description'), N('Recommendation'), C('Category', ['PROCESS', 'TECHNOLOGY', 'PEOPLE', 'VENDOR', 'OTHER']),
      C('Status', ['NEW', 'REVIEWED', 'APPLIED']), T('OwnerUPN'), T('ProjectId'), T('InitiativeId'), T('MeetingId')],
    rows: () => [
      ['Confirm vendor lead times before committing a date', 'LESS-DEMO-001', 'The first telephony date was set before the vendor confirmed stock.', 'Get written lead times and add a margin.', 'VENDOR', 'NEW', 'PROJ-DEMO-002']
    ].map(([t, id, what, rec, cat, st, proj]) => ({
      Title: t, LessonId: id, Description: what, Recommendation: rec, Category: cat, Status: st, OwnerUPN: SAMPLE_OWNER, ProjectId: proj, MeetingId: 'MEET-DEMO-001'
    }))
  },
  {
    title: 'IT_21_Meetings', file: 'schema_meetings.xml', description: 'Meetings imported from a transcript, with what was created from them',
    fields: [T('MeetingId'), D('MeetingDate'), N('Summary'), N('Attendees'), N('Transcript'), N('ImportedItems')],
    rows: (day) => [
      ['Weekly IT sync', 'MEET-DEMO-001', -3, 'Laptop refresh wave 1 and the telephony rollout were reviewed.', 'ana@example.com; luis@example.com']
    ].map(([t, id, d, summary, attendees]) => ({
      Title: t, MeetingId: id, MeetingDate: day(d), Summary: summary, Attendees: attendees,
      ImportedItems: 'Sample meeting: its notes below are linked to it.'
    }))
  },
  {
    title: 'IT_22_Notes', file: 'schema_notes.xml', description: 'Decisions, risks, information and follow-ups',
    fields: [T('NoteId'), N('Body'), C('Category', ['DECISION', 'RISK', 'INFO', 'FOLLOW_UP']), C('Status', ['ACTIVE', 'ARCHIVED']),
      T('MeetingId'), T('InitiativeId'), T('ProjectId')],
    rows: () => [
      ['Budget approved for wave 1', 'NOTE-DEMO-001', 'Finance confirmed the budget for the first laptop wave.', 'DECISION', 'PROJ-DEMO-001'],
      ['Telephony vendor may delay delivery', 'NOTE-DEMO-002', 'The vendor warned of a possible two-week delay.', 'RISK', 'PROJ-DEMO-002'],
      ['Share the new service catalogue with the team', 'NOTE-DEMO-003', 'Pending: send it before the next sync.', 'FOLLOW_UP', '']
    ].map(([t, id, body, category, project]) => ({
      Title: t, NoteId: id, Body: body, Category: category, Status: 'ACTIVE', MeetingId: 'MEET-DEMO-001', ProjectId: project
    }))
  },
  {
    title: 'IT_23_Matters', file: 'schema_matters.xml', description: 'Everything that asks for attention: the inbox, open matters and their history',
    fields: [T('MatterId'), N('Description'), N('Notes'), C('Status', ['INBOX', 'OPEN', 'IN_PROGRESS', 'WAITING', 'DONE', 'DISCARDED']), C('Priority', LEVELS), T('AreaId'),
      C('Source', ['MANUAL', 'EMAIL', 'TEAMS', 'OTHER']), N('SourceRef'), T('Sender'), D('ReceivedOn'), D('DueDate'), D('ClosedOn'), T('OwnerUPN'),
      T('ProjectId'), T('ContractId'), T('IncidentId'), T('VendorId')],
    rows: (day) => [
      ['Quarterly budget forecast requested by Europe', 'ASU-DEMO-001', 'INBOX', 'MEDIUM', '', 'EMAIL', 'finance.europe@example.com', -1, null, null, '', '', ''],
      ['Network incident reported by the Paris office', 'ASU-DEMO-002', 'INBOX', 'HIGH', '', 'TEAMS', 'corporate.network@example.com', -5, null, null, '', '', ''],
      ['Renew the help desk licences', 'ASU-DEMO-003', 'OPEN', 'HIGH', 'AREA-DEMO-003', 'MANUAL', '', -8, 20, null, 'CON-DEMO-001', '', 'VEN-DEMO-001'],
      ['Locker management app requested by facilities', 'ASU-DEMO-004', 'IN_PROGRESS', 'MEDIUM', 'AREA-DEMO-009', 'EMAIL', 'facilities@example.com', -12, 14, null, '', '', ''],
      ['Orange logistics: delivery slots for the retail stores', 'ASU-DEMO-005', 'WAITING', 'MEDIUM', 'AREA-DEMO-005', 'EMAIL', 'logistics@example.com', -9, -2, null, '', '', ''],
      ['Approve the quarterly budget transfer', 'ASU-DEMO-006', 'DONE', 'MEDIUM', 'AREA-DEMO-001', 'EMAIL', 'finance@example.com', -14, -6, -4, '', '', ''],
      ['Duplicate request from the building team', 'ASU-DEMO-007', 'DISCARDED', 'LOW', 'AREA-DEMO-004', 'EMAIL', 'building@example.com', -10, null, -7, '', '', '']
    ].map(([t, id, st, pr, area, src, sender, received, due, closed, con, inc, ven]) => {
      const row = { Title: t, MatterId: id, Description: `Sample matter: ${t}.`, Status: st, Priority: pr, AreaId: area, Source: src, Sender: sender, ReceivedOn: day(received), OwnerUPN: SAMPLE_OWNER, ContractId: con, IncidentId: inc, VendorId: ven };
      if (due !== null) { row.DueDate = day(due); }
      if (closed !== null) { row.ClosedOn = day(closed); }
      if (id === 'ASU-DEMO-003') { row.Notes = 'Ask for two quotes before the notice date.'; }
      return row;
    })
  },
  {
    title: 'IT_24_Areas', file: 'schema_areas.xml', description: 'Topics that matters are grouped by; editable in the app',
    fields: [T('AreaId'), N('Description'), C('Status', ['ACTIVE', 'ARCHIVED']), NUM('SortOrder')],
    rows: () => [
      ['Budget', 'Forecasts, transfers and spending questions.'],
      ['User requests', 'Requests from users that are not incidents.'],
      ['Renewals', 'Contracts, licences and support that end on a date.'],
      ['Building requests', 'Requests about the building: cabling, rooms, equipment.'],
      ['Orange logistics', 'Logistics and service for Orange.'],
      ['Retail', 'Retail stores and their equipment.'],
      ['Europe and corporate', 'What Europe or the corporation asks for.'],
      ['Network incidents', 'Incidents and changes on the network.'],
      ['Projects and ideas', 'New projects, ideas and apps for other teams.'],
      ['Vendors', 'Vendor contacts, quotes and orders.']
    ].map(([t, d], i) => ({ Title: t, AreaId: 'AREA-DEMO-' + String(i + 1).padStart(3, '0'), Description: d, Status: 'ACTIVE', SortOrder: (i + 1) * 10 }))
  },
  {
    title: 'IT_25_Links', file: 'schema_links.xml', description: 'Pages used often, grouped by category; pinned ones show on the dashboard',
    fields: [T('LinkId'), N('Url'), T('Category'), N('Description'), C('Pinned', ['NO', 'YES']), C('Status', ['ACTIVE', 'ARCHIVED']), T('VendorId')],
    rows: () => [
      ['Lenovo support', 'LNK-DEMO-001', 'https://support.lenovo.com', 'Vendors', 'YES', 'VEN-DEMO-001'],
      ['Oracle support', 'LNK-DEMO-002', 'https://support.oracle.com', 'Vendors', 'YES', ''],
      ['Microsoft 365 admin centre', 'LNK-DEMO-003', 'https://admin.microsoft.com', 'Cloud', 'YES', ''],
      ['Azure portal', 'LNK-DEMO-004', 'https://portal.azure.com', 'Cloud', 'NO', 'VEN-DEMO-003'],
      ['Power Automate', 'LNK-DEMO-005', 'https://make.powerautomate.com', 'Tools', 'NO', '']
    ].map(([t, id, url, cat, pinned, ven]) => ({ Title: t, LinkId: id, Url: url, Category: cat, Description: `Sample link: ${t}.`, Pinned: pinned, Status: 'ACTIVE', VendorId: ven }))
  },
  {
    title: 'IT_26_Entitlements', file: 'schema_entitlements.xml', description: 'Warranties, licences, support and subscriptions that end on a date',
    fields: [T('EntitlementId'), C('EntitlementType', ['WARRANTY', 'LICENSE', 'SUPPORT', 'SUBSCRIPTION']), C('Status', ['ACTIVE', 'EXPIRED', 'RENEWED', 'CANCELLED']), T('Product'), T('Reference'),
      NUM('Quantity'), D('StartDate'), D('EndDate'), NUM('NoticeDays', 'Min="0" Max="365"'), NUM('AnnualCost'), T('VendorId'), T('ContractId'), T('OwnerUPN'), N('Notes')],
    rows: (day) => [
      ['Laptop wave 1 warranty', 'ENT-DEMO-001', 'WARRANTY', 'ACTIVE', 'ThinkPad T14, wave 1', 120, -700, 25, 60, 0, 'VEN-DEMO-001'],
      ['Database support', 'ENT-DEMO-002', 'SUPPORT', 'ACTIVE', 'Oracle Database Standard', 2, -165, 200, 90, 18000, ''],
      ['Help desk software licences', 'ENT-DEMO-003', 'LICENSE', 'ACTIVE', 'Ticketing tool, agent seats', 15, -370, -5, 60, 5400, ''],
      ['Previous backup subscription', 'ENT-DEMO-004', 'SUBSCRIPTION', 'RENEWED', 'Backup service, previous plan', 1, -760, -40, 60, 3200, 'VEN-DEMO-003']
    ].map(([t, id, type, st, product, qty, sd, ed, notice, cost, ven]) => ({
      Title: t, EntitlementId: id, EntitlementType: type, Status: st, Product: product, Reference: '', Quantity: qty, StartDate: day(sd), EndDate: day(ed),
      NoticeDays: notice, AnnualCost: cost, VendorId: ven, OwnerUPN: SAMPLE_OWNER, Notes: 'Sample record.'
    }))
  },
  {
    title: 'IT_27_NpsResponses', file: 'schema_nps.xml', description: 'Survey answers; a detractor waits for a call-back',
    fields: [T('ResponseId'), NUM('Score', 'Min="0" Max="10"'), N('Comment'), D('RespondedOn'), C('Channel', ['KIOSK', 'PHONE', 'CHAT', 'FLOORWALK', 'SELF_SERVICE', 'EMAIL', 'OTHER']),
      C('Country', ['ES', 'PT', 'OTHER']), T('TicketRef'), C('Status', ['NOT_REQUIRED', 'PENDING', 'CONTACTED', 'CLOSED']), D('FollowUpDate'), N('FollowUpNotes'), T('OwnerUPN')],
    rows: (day) => [
      ['Shared mailbox permissions took too long', 'NPS-DEMO-001', 6, 'KIOSK', 'ES', 'PENDING', -9, null, ''],
      ['A distribution list change was cancelled', 'NPS-DEMO-002', 4, 'SELF_SERVICE', 'ES', 'PENDING', -3, null, ''],
      ['Fast fix at the kiosk', 'NPS-DEMO-003', 10, 'KIOSK', 'ES', 'NOT_REQUIRED', -2, null, ''],
      ['Good phone support', 'NPS-DEMO-004', 9, 'PHONE', 'ES', 'NOT_REQUIRED', -6, null, ''],
      ['Laptop swap in Lisbon', 'NPS-DEMO-005', 8, 'KIOSK', 'PT', 'NOT_REQUIRED', -12, null, ''],
      ['Disk space problem came back', 'NPS-DEMO-006', 6, 'CHAT', 'ES', 'CONTACTED', -20, -18, 'Called: the cleanup helped for a week. Explain OneDrive files on demand.']
    ].map(([t, id, score, channel, country, st, answered, called, notes]) => {
      const row = { Title: t, ResponseId: id, Score: score, Comment: 'Sample answer.', RespondedOn: day(answered), Channel: channel, Country: country, Status: st, OwnerUPN: SAMPLE_OWNER, FollowUpNotes: notes };
      if (called !== null) { row.FollowUpDate = day(called); }
      return row;
    })
  },
  {
    title: 'IT_28_ServiceMonths', file: 'schema_servicemonths.xml', description: 'Monthly service figures by country, from the service report',
    fields: [T('MonthId'), D('Period'), C('Country', ['ES', 'PT', 'OTHER']), NUM('Incidents'), NUM('Interactions'), NUM('Requests'), NUM('Calls'), NUM('Users'),
      NUM('SlaPct', 'Min="0" Max="100"'), NUM('NpsScore', 'Min="-100" Max="100"'), NUM('NpsResponses'), NUM('Backlog'), N('Notes')],
    rows: (day) => {
      // Days from today to the first day of a month, so the sample never goes stale.
      const monthOffset = (back) => {
        const now = new Date();
        const first = new Date(now.getFullYear(), now.getMonth() - back, 1);
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return Math.round((first - today) / 86400000);
      };
      return [
        ['Spain, two months ago', 'MON-DEMO-001', 2, 'ES', 205, 118, 540, 150, 950, 97, 79, 30, 13],
        ['Spain, last month', 'MON-DEMO-002', 1, 'ES', 190, 163, 520, 140, 950, 99, 81, 28, 12],
        ['Portugal, two months ago', 'MON-DEMO-003', 2, 'PT', 4, 80, 55, 0, 180, 100, 100, 2, 0],
        ['Portugal, last month', 'MON-DEMO-004', 1, 'PT', 3, 88, 60, 0, 180, 90, 100, 2, 1]
      ].map(([t, id, back, country, inc, inter, req, calls, users, sla, nps, resp, backlog]) => ({
        Title: t, MonthId: id, Period: day(monthOffset(back)), Country: country, Incidents: inc, Interactions: inter, Requests: req, Calls: calls, Users: users,
        SlaPct: sla, NpsScore: nps, NpsResponses: resp, Backlog: backlog, Notes: 'Sample figures.'
      }));
    }
  },
  {
    title: 'IT_29_Catalog', file: 'schema_catalog.xml', description: 'How each kind of contact is recognised and recorded (incident, interaction or request)',
    fields: [T('CatalogId'), C('Category', ['ACCESS', 'EMAIL_TEAMS', 'ONEDRIVE_SHAREPOINT', 'DEVICE', 'ACCESSORY', 'APPLICATION', 'NETWORK_WIFI', 'HOW_TO', 'LOCATION_PEOPLE', 'OTHER']),
      C('Kind', ['INCIDENT', 'INTERACTION', 'REQUEST']), N('Keywords'), N('Guidance'), T('ArticleId'), C('Status', ['ACTIVE', 'ARCHIVED'])],
    rows: () => [
      ['Blocked account or password reset', 'CAT-DEMO-001', 'ACCESS', 'INCIDENT', 'cuenta bloqueada, bloqueado, contraseña, password, locked', 'Verify the identity first (the security procedure). Record it as an incident.'],
      ['Where is a room, or who is who', 'CAT-DEMO-002', 'LOCATION_PEOPLE', 'INTERACTION', 'dónde está, quién es, sala, extensión', 'Answer on the spot and record an interaction.'],
      ['How do I order an accessory', 'CAT-DEMO-003', 'HOW_TO', 'INTERACTION', 'pedir un accesorio, ratón, auriculares, cargador', 'Explain the request form. Record an interaction; it becomes a request if the person asks you to raise it.'],
      ['OneDrive full or not syncing', 'CAT-DEMO-004', 'ONEDRIVE_SHAREPOINT', 'INCIDENT', 'onedrive, espacio, disco lleno, sincroniza', 'Free space (files on demand, temporary files). Record an incident.'],
      ['New starter equipment and mailbox', 'CAT-DEMO-005', 'DEVICE', 'REQUEST', 'onboarding, alta, nuevo empleado, nueva incorporación', 'It is a request with its tasks, not an incident.']
    ].map(([t, id, cat, kind, words, guidance]) => ({ Title: t, CatalogId: id, Category: cat, Kind: kind, Keywords: words, Guidance: guidance, Status: 'ACTIVE' }))
  }
];

// ---------- approvals: the same seven columns on the four main lists ----------
// Mirrors src/rules/approvals.ts: one active approval per item.
const APPROVAL_FIELDS = [
  T('ApprovalRule'), C('ApprovalStatus', ['NONE', 'PENDING', 'APPROVED', 'REJECTED']), T('Approver'),
  D('ApprovalRequestedOn'), D('ApprovalDecidedOn'), T('ApprovalDecidedBy'), N('ApprovalComment')
];
const WITH_APPROVALS = ['IT_01_Ideas', 'IT_02_Initiatives', 'IT_03_Projects', 'IT_04_Actions', 'IT_07_CAPEX', 'IT_08_OPEX', 'IT_10_Contracts', 'IT_15_ChangeRequests', 'IT_18_KnowledgeBase'];
for (const list of LISTS) {
  if (WITH_APPROVALS.indexOf(list.title) > -1) {
    list.fields = list.fields.concat(APPROVAL_FIELDS);
  }
}
// One sample project waits for approval, so the flow can be seen right after installing.
const projectsList = LISTS.filter((l) => l.title === 'IT_03_Projects')[0];
const projectRows = projectsList.rows;
projectsList.rows = (day) => projectRows(day).map((row) => (row.ProjectId === 'PROJ-DEMO-002'
  ? Object.assign({}, row, { ApprovalRule: 'project.overBudget', ApprovalStatus: 'PENDING', Approver: SAMPLE_OWNER, ApprovalRequestedOn: day(-1) })
  : row));

// ---------- helpers ----------
const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Stable GUID per list + column, so regenerating never changes a column's identity. */
const guid = (seed) => {
  const h = crypto.createHash('md5').update(seed).digest('hex');
  return `{${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}}`;
};

// Noon UTC keeps the same calendar day in every timezone (same convention as the web part).
const day = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T12:00:00Z`;
};

const fieldXml = (listTitle, f) => {
  const common = `ID="${guid(listTitle + '/' + f.name)}" Name="${f.name}" StaticName="${f.name}" DisplayName="${f.name}"`;
  switch (f.type) {
    case 'Text': return `<Field Type="Text" ${common} MaxLength="255" />`;
    case 'Note': return `<Field Type="Note" ${common} NumLines="6" RichText="FALSE" Sortable="FALSE" />`;
    case 'Number': return `<Field Type="Number" ${common} ${f.attrs} />`;
    case 'Date': return `<Field Type="DateTime" ${common} Format="DateOnly" />`;
    case 'Choice':
      return `<Field Type="Choice" ${common} Format="Dropdown"><Default>${esc(f.choices[0])}</Default><CHOICES>${f.choices.map((c) => `<CHOICE>${esc(c)}</CHOICE>`).join('')}</CHOICES></Field>`;
    default: throw new Error('Unknown field type ' + f.type);
  }
};

const schemaXml = (list) => {
  const viewFields = ['LinkTitle'].concat(list.fields.map((f) => f.name)).map((n) => `<FieldRef Name="${n}" />`).join('');
  const titleField = '<Field ID="{fa564e0f-0c70-4ab9-b863-0177e6ddd247}" Type="Text" Name="Title" DisplayName="Title" Required="TRUE" SourceID="http://schemas.microsoft.com/sharepoint/v3" StaticName="Title" MaxLength="255" />';
  return `<?xml version="1.0" encoding="utf-8"?>
<!-- Generated by scripts/generate-assets.js. Do not edit by hand. -->
<List xmlns:ows="Microsoft SharePoint" Title="${list.title}" FolderCreation="FALSE" Direction="$Resources:Direction;" Url="Lists/${list.title}" BaseType="0" xmlns="http://schemas.microsoft.com/sharepoint/">
  <MetaData>
    <ContentTypes>
      <ContentTypeRef ID="0x01">
        <Folder TargetName="Item" />
      </ContentTypeRef>
      <ContentTypeRef ID="0x0120" />
    </ContentTypes>
    <Fields>
      ${titleField}
      ${list.fields.map((f) => fieldXml(list.title, f)).join('\n      ')}
    </Fields>
    <Views>
      <View BaseViewID="0" Type="HTML" MobileView="TRUE" TabularView="FALSE">
        <Toolbar Type="Standard" />
        <XslLink Default="TRUE">main.xsl</XslLink>
        <RowLimit Paged="TRUE">30</RowLimit>
        <ViewFields>
          <FieldRef Name="LinkTitle" />
        </ViewFields>
        <Query>
          <OrderBy>
            <FieldRef Name="ID" />
          </OrderBy>
        </Query>
      </View>
      <View BaseViewID="1" Type="HTML" WebPartZoneID="Main" DisplayName="$Resources:core,objectiv_schema_mwsidcamlidC24;" DefaultView="TRUE" MobileView="TRUE" MobileDefaultView="TRUE" SetupPath="pages\\viewpage.aspx" ImageUrl="/_layouts/15/images/generic.png?rev=23" Url="AllItems.aspx">
        <Toolbar Type="Standard" />
        <XslLink Default="TRUE">main.xsl</XslLink>
        <JSLink>clienttemplates.js</JSLink>
        <RowLimit Paged="TRUE">30</RowLimit>
        <ViewFields>
          ${viewFields}
        </ViewFields>
        <Query>
          <OrderBy>
            <FieldRef Name="ID" />
          </OrderBy>
        </Query>
      </View>
    </Views>
    <Forms>
      <Form Type="DisplayForm" Url="DispForm.aspx" SetupPath="pages\\form.aspx" WebPartZoneID="Main" />
      <Form Type="EditForm" Url="EditForm.aspx" SetupPath="pages\\form.aspx" WebPartZoneID="Main" />
      <Form Type="NewForm" Url="NewForm.aspx" SetupPath="pages\\form.aspx" WebPartZoneID="Main" />
    </Forms>
  </MetaData>
</List>
`;
};

const instanceXml = (list) => {
  const rows = list.rows(day).map((row) =>
    `<Row>${Object.keys(row).map((k) => `<Field Name="${k}">${esc(row[k])}</Field>`).join('')}</Row>`
  ).join('\n          ');
  return `  <ListInstance Title="${list.title}" Description="${esc(list.description)}" OnQuickLaunch="TRUE" TemplateType="100" FeatureId="${CUSTOM_LIST_FEATURE_ID}" Url="Lists/${list.title}" CustomSchema="${list.file}">
    <Data>
      <Rows>
          ${rows}
      </Rows>
    </Data>
  </ListInstance>`;
};

// ---------- write ----------
fs.mkdirSync(OUT_DIR, { recursive: true });
for (const list of LISTS) {
  fs.writeFileSync(path.join(OUT_DIR, list.file), schemaXml(list), 'utf8');
}
fs.writeFileSync(path.join(OUT_DIR, 'elements.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<!-- Generated by scripts/generate-assets.js. Do not edit by hand. -->
<Elements xmlns="http://schemas.microsoft.com/sharepoint/">
${LISTS.map(instanceXml).join('\n')}
</Elements>
`, 'utf8');

// ---------- sample data for the local mode ----------
// Same rows as above, with each date written as "@day:<offset>" (days from today). The local app
// resolves them when it creates the data (src/data/seed.ts), so they never go stale.
if (process.env.ITSDM_SEED_OUT) {
  const seed = {};
  for (const list of LISTS) {
    seed[list.title] = list.rows((offset) => `@day:${offset}`);
  }
  fs.mkdirSync(path.dirname(process.env.ITSDM_SEED_OUT), { recursive: true });
  fs.writeFileSync(process.env.ITSDM_SEED_OUT, JSON.stringify(seed, null, 1) + '\n', 'utf8');
}

console.log(`Generated ${LISTS.length + 1} files in ${path.relative(process.cwd(), OUT_DIR)}`);
