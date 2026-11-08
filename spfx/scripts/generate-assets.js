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
  }
];

// ---------- approvals: the same seven columns on the four main lists ----------
// Mirrors src/rules/approvals.ts: one active approval per item.
const APPROVAL_FIELDS = [
  T('ApprovalRule'), C('ApprovalStatus', ['NONE', 'PENDING', 'APPROVED', 'REJECTED']), T('Approver'),
  D('ApprovalRequestedOn'), D('ApprovalDecidedOn'), T('ApprovalDecidedBy'), N('ApprovalComment')
];
const WITH_APPROVALS = ['IT_01_Ideas', 'IT_02_Initiatives', 'IT_03_Projects', 'IT_04_Actions', 'IT_07_CAPEX', 'IT_08_OPEX', 'IT_10_Contracts'];
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

console.log(`Generated ${LISTS.length + 1} files in ${path.relative(process.cwd(), OUT_DIR)}`);
