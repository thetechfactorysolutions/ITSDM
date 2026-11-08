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

const OUT_DIR = path.join(__dirname, '..', 'sharepoint', 'assets');
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
const WITH_APPROVALS = ['IT_01_Ideas', 'IT_02_Initiatives', 'IT_03_Projects', 'IT_04_Actions'];
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
