/*
 * Creates the SharePoint lists used by the IT Management Hub (and sample data for the first four; the Meetings and Notes lists are created empty)
 * using the SharePoint REST API with the signed-in user's session.
 *
 * Use it when PowerShell/PnP cannot sign in (for example no Entra app registration is available):
 *   1. Open any page of the target site in your browser (signed in).
 *   2. Open the developer tools console (F12) and paste this whole file.
 *   3. Read the log. It is safe to run again: existing lists and columns are kept, and sample
 *      data is added only to empty lists.
 *
 * Set `SAMPLE_DATA = false` below to create the structure only.
 * Same structure as scripts/Provision-ItsdmLists.ps1 and docs/SHAREPOINT_SCHEMA.md.
 */
(async () => {
  const SAMPLE_DATA = true;
  const log = (...args) => console.log('[ITSDM]', ...args);

  const ctx = window._spPageContextInfo;
  const web = (ctx && ctx.webAbsoluteUrl) || location.origin + location.pathname.split('/SitePages')[0];
  const me = (ctx && ctx.userEmail) || '';
  log('Site:', web, '| sample owner:', me);

  // ---------- REST helpers ----------
  let digestValue = '';
  let digestAt = 0;
  const getDigest = async () => {
    if (digestValue && Date.now() - digestAt < 20 * 60 * 1000) return digestValue;
    const r = await fetch(`${web}/_api/contextinfo`, { method: 'POST', headers: { Accept: 'application/json;odata=nometadata' }, credentials: 'same-origin' });
    if (!r.ok) throw new Error(`contextinfo failed (${r.status}). Are you signed in?`);
    digestValue = (await r.json()).FormDigestValue;
    digestAt = Date.now();
    return digestValue;
  };
  const rest = async (method, path, body, verbose) => {
    const odata = verbose ? 'application/json;odata=verbose' : 'application/json;odata=nometadata';
    const headers = { Accept: odata };
    if (method !== 'GET') {
      headers['Content-Type'] = odata;
      headers['X-RequestDigest'] = await getDigest();
    }
    const r = await fetch(`${web}/_api/${path}`, { method, headers, credentials: 'same-origin', body: body ? JSON.stringify(body) : undefined });
    if (!r.ok) {
      const text = await r.text();
      const err = new Error(`${method} ${path} -> ${r.status} ${text.slice(0, 300)}`);
      err.status = r.status;
      throw err;
    }
    return r.status === 204 ? null : r.json();
  };
  const enc = (s) => encodeURIComponent(s).replace(/'/g, "''");

  // ---------- field XML ----------
  const guid = () => '{' + crypto.randomUUID() + '}';
  const fieldXml = (f) => {
    const base = `ID="${guid()}" Name="${f.name}" StaticName="${f.name}" DisplayName="${f.name}"`;
    switch (f.type) {
      case 'Text': return `<Field Type="Text" ${base} />`;
      case 'Note': return `<Field Type="Note" ${base} RichText="FALSE" NumLines="6" />`;
      case 'Number': return `<Field Type="Number" ${base} ${f.extra || ''} />`;
      case 'Date': return `<Field Type="DateTime" ${base} Format="DateOnly" />`;
      case 'Choice': return `<Field Type="Choice" ${base} Format="Dropdown"><Default>${f.choices[0]}</Default><CHOICES>${f.choices.map((c) => `<CHOICE>${c}</CHOICE>`).join('')}</CHOICES></Field>`;
      default: throw new Error('Unknown field type ' + f.type);
    }
  };

  const ensureList = async (title, fields) => {
    let exists = true;
    try { await rest('GET', `web/lists/getbytitle('${enc(title)}')?$select=Id`); } catch (e) { if (e.status === 404) exists = false; else throw e; }
    if (!exists) {
      await rest('POST', 'web/lists', { Title: title, BaseTemplate: 100, AllowContentTypes: true, ContentTypesEnabled: false, OnQuickLaunch: true });
      log('list created:', title);
    } else {
      log('list exists:', title);
    }

    const current = await rest('GET', `web/lists/getbytitle('${enc(title)}')/fields?$select=InternalName`);
    const have = new Set(current.value.map((f) => f.InternalName));
    for (const f of fields) {
      if (have.has(f.name)) continue;
      // Options 24 = AddFieldInternalNameHint (8) + AddFieldToDefaultView (16)
      await rest('POST', `web/lists/getbytitle('${enc(title)}')/fields/createfieldasxml`,
        { parameters: { __metadata: { type: 'SP.XmlSchemaFieldCreationInformation' }, SchemaXml: fieldXml(f), Options: 24 } }, true);
      log('  + field', f.name);
    }
  };

  const isEmpty = async (title) => {
    const r = await rest('GET', `web/lists/getbytitle('${enc(title)}')/items?$top=1&$select=Id`);
    return r.value.length === 0;
  };
  const addItems = async (title, rows) => {
    for (const row of rows) await rest('POST', `web/lists/getbytitle('${enc(title)}')/items`, row);
  };
  // Same convention as the web part: noon UTC keeps the calendar day in every timezone.
  const day = (offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T12:00:00Z`;
  };

  // ---------- definitions ----------
  const level = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  const T = (name) => ({ name, type: 'Text' });
  const N = (name) => ({ name, type: 'Note' });
  const D = (name) => ({ name, type: 'Date' });
  const NUM = (name, extra) => ({ name, type: 'Number', extra });
  const C = (name, choices) => ({ name, type: 'Choice', choices });

  const defs = {
    IT_01_Ideas: [T('IdeaId'), N('Description'),
      C('Status', ['NEW', 'DISCOVERY', 'VALIDATED', 'PLANNED', 'IN_PROGRESS', 'PILOT', 'ROLLOUT', 'COMPLETED', 'REJECTED', 'CANCELLED']),
      T('OwnerUPN'), T('SponsorUPN'), NUM('EstimatedValue'), D('TargetDate'), N('Tags'), T('ConvertedInitiativeId')],
    IT_02_Initiatives: [T('InitiativeId'), N('Description'),
      C('Status', ['DRAFT', 'ACTIVE', 'BLOCKED', 'ON_HOLD', 'COMPLETED', 'CANCELLED']),
      T('OwnerUPN'), NUM('ProgressPct', 'Min="0" Max="100"'), D('TargetDate'), T('SourceIdeaId'), T('PlannerPlanId')],
    IT_03_Projects: [T('ProjectId'), T('InitiativeId'), N('Description'),
      C('Status', ['PLANNING', 'ACTIVE', 'AT_RISK', 'BLOCKED', 'ON_HOLD', 'COMPLETED', 'CANCELLED']),
      T('OwnerUPN'), D('StartDate'), D('EndDate'), NUM('BudgetAmount'), NUM('ForecastAmount'), C('RiskLevel', level), T('PlannerPlanId')],
    IT_04_Actions: [T('ActionId'), T('InitiativeId'), T('ProjectId'), N('Description'),
      C('Status', ['OPEN', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED']), C('Priority', level),
      T('OwnerUPN'), D('DueDate'), D('CompletedDate'), T('PlannerTaskId')],
    IT_05_KPIs: [T('KpiId'), N('Description'), C('Category', ['SERVICE', 'DELIVERY', 'FINANCE', 'PEOPLE', 'OTHER']), C('Status', ['ACTIVE', 'RETIRED']), T('Unit'),
      C('Direction', ['HIGHER', 'LOWER']), NUM('Target'), NUM('CurrentValue'), NUM('PreviousValue'), D('MeasuredOn'), T('OwnerUPN'), T('ProjectId')],
    IT_13_Incidents: [T('IncidentId'), N('Description'), C('Status', ['NEW', 'IN_PROGRESS', 'ON_HOLD', 'RESOLVED', 'CLOSED']), C('Severity', ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
      C('Category', ['APPLICATION', 'INFRASTRUCTURE', 'NETWORK', 'SECURITY', 'ACCESS', 'OTHER']), T('ReportedBy'), T('AssignedTo'), D('ReportedOn'), D('ResolvedOn'),
      N('Resolution'), N('RootCause'), T('ProjectId'), T('VendorId')],
    IT_14_Interactions: [T('InteractionId'), C('InteractionType', ['MEETING', 'CALL', 'EMAIL', 'WORKSHOP', 'OTHER']), C('Status', ['LOGGED', 'FOLLOW_UP', 'DONE']), D('InteractionDate'),
      T('ContactName'), T('ContactEmail'), T('Organization'), N('Summary'), N('NextSteps'), D('FollowUpDate'), T('OwnerUPN'), T('ProjectId'), T('VendorId'), T('MeetingId')],
    IT_15_ChangeRequests: [T('ChangeId'), N('Description'), N('Reason'), C('Status', ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'IMPLEMENTED']), C('ChangeType', ['STANDARD', 'NORMAL', 'EMERGENCY']),
      C('Risk', ['LOW', 'MEDIUM', 'HIGH']), D('PlannedDate'), D('ImplementedDate'), N('BackoutPlan'), T('OwnerUPN'), T('ProjectId')],
    IT_06_Budgets: [T('BudgetId'), NUM('FiscalYear'), N('Description'), C('Status', ['DRAFT', 'APPROVED', 'CLOSED']), NUM('PlannedAmount'), T('OwnerUPN')],
    IT_07_CAPEX: [T('CapexId'), N('Description'), C('Status', ['PLANNED', 'COMMITTED', 'PAID', 'CANCELLED']), NUM('Amount'), D('ExpenseDate'), T('InvoiceRef'), T('OwnerUPN'),
      T('BudgetId'), T('ProjectId'), T('VendorId')],
    IT_08_OPEX: [T('OpexId'), N('Description'), C('Status', ['PLANNED', 'COMMITTED', 'PAID', 'CANCELLED']), NUM('Amount'), C('Frequency', ['ONE_OFF', 'MONTHLY', 'QUARTERLY', 'ANNUAL']),
      D('ExpenseDate'), T('OwnerUPN'), T('BudgetId'), T('ProjectId'), T('VendorId'), T('ContractId')],
    IT_09_Vendors: [T('VendorId'), N('Description'), C('Status', ['ACTIVE', 'UNDER_REVIEW', 'INACTIVE']), C('Category', ['SOFTWARE', 'HARDWARE', 'SERVICES', 'TELECOM', 'CLOUD', 'OTHER']),
      T('ContactName'), T('ContactEmail'), T('Website'), T('OwnerUPN')],
    IT_10_Contracts: [T('ContractId'), N('Description'), C('Status', ['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED']), T('VendorId'), D('StartDate'), D('EndDate'),
      NUM('NoticeDays', 'Min="0" Max="365"'), NUM('AnnualValue'), C('AutoRenew', ['NO', 'YES']), T('OwnerUPN'), T('ProjectId')],
    IT_11_Risks: [T('RiskId'), N('Description'), C('Status', ['OPEN', 'MITIGATING', 'ACCEPTED', 'CLOSED']), C('Probability', ['LOW', 'MEDIUM', 'HIGH']),
      C('Impact', ['LOW', 'MEDIUM', 'HIGH']), T('OwnerUPN'), N('Mitigation'), D('DueDate'), T('ProjectId'), T('InitiativeId'), T('MeetingId')],
    IT_12_Decisions: [T('DecisionId'), N('Description'), N('Rationale'), C('Status', ['PROPOSED', 'DECIDED', 'SUPERSEDED']), T('DecidedBy'), D('DecisionDate'),
      T('ProjectId'), T('InitiativeId'), T('MeetingId')],
    IT_16_TeamSkills: [T('SkillId'), T('PersonUPN'), C('Category', ['TECHNICAL', 'PROCESS', 'TOOLING', 'SOFT', 'OTHER']), C('Level', ['BASIC', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']),
      C('TargetLevel', ['BASIC', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']), C('Status', ['ACTIVE', 'ARCHIVED']), D('LastAssessed'), T('Certification'), D('CertificationExpiry'), N('Notes')],
    IT_17_TrainingPlans: [T('TrainingId'), C('Status', ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']), C('TrainingType', ['COURSE', 'CERTIFICATION', 'WORKSHOP', 'SELF_STUDY', 'MENTORING']),
      T('PersonUPN'), T('Provider'), T('SkillId'), T('VendorId'), D('StartDate'), D('DueDate'), D('CompletedDate'), NUM('Cost'), N('Notes')],
    IT_18_KnowledgeBase: [T('ArticleId'), N('Summary'), N('Body'), C('Category', ['HOW_TO', 'RUNBOOK', 'FAQ', 'POLICY', 'REFERENCE']), C('Status', ['DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED']),
      T('OwnerUPN'), T('Tags'), D('PublishedOn'), D('ReviewDate'), T('ProjectId'), T('VendorId'), T('IncidentId')],
    IT_19_Reviews: [T('ReviewId'), C('ReviewType', ['STATUS', 'RISK', 'FINANCIAL', 'CLOSURE']), C('Status', ['SCHEDULED', 'COMPLETED', 'CANCELLED']),
      C('Health', ['GREEN', 'AMBER', 'RED']), D('ReviewDate'), D('NextReviewDate'), N('Summary'), N('NextSteps'), T('OwnerUPN'), T('ProjectId'), T('InitiativeId')],
    IT_20_LessonsLearned: [T('LessonId'), N('Description'), N('Recommendation'), C('Category', ['PROCESS', 'TECHNOLOGY', 'PEOPLE', 'VENDOR', 'OTHER']),
      C('Status', ['NEW', 'REVIEWED', 'APPLIED']), T('OwnerUPN'), T('ProjectId'), T('InitiativeId'), T('MeetingId')],
    IT_21_Meetings: [T('MeetingId'), D('MeetingDate'), N('Summary'), N('Attendees'), N('Transcript'), N('ImportedItems')],
    IT_22_Notes: [T('NoteId'), N('Body'), C('Category', ['DECISION', 'RISK', 'INFO', 'FOLLOW_UP']), C('Status', ['ACTIVE', 'ARCHIVED']),
      T('MeetingId'), T('InitiativeId'), T('ProjectId')],
    IT_23_Matters: [T('MatterId'), N('Description'), N('Notes'), C('Status', ['INBOX', 'OPEN', 'IN_PROGRESS', 'WAITING', 'DONE', 'DISCARDED']), C('Priority', level), T('AreaId'),
      C('Source', ['MANUAL', 'EMAIL', 'TEAMS', 'OTHER']), N('SourceRef'), T('Sender'), D('ReceivedOn'), D('DueDate'), D('ClosedOn'), T('OwnerUPN'),
      T('ProjectId'), T('ContractId'), T('IncidentId'), T('VendorId')],
    IT_24_Areas: [T('AreaId'), N('Description'), C('Status', ['ACTIVE', 'ARCHIVED']), NUM('SortOrder')],
    IT_25_Links: [T('LinkId'), N('Url'), T('Category'), N('Description'), C('Pinned', ['NO', 'YES']), C('Status', ['ACTIVE', 'ARCHIVED']), T('VendorId')],
    IT_26_Entitlements: [T('EntitlementId'), C('EntitlementType', ['WARRANTY', 'LICENSE', 'SUPPORT', 'SUBSCRIPTION']), C('Status', ['ACTIVE', 'EXPIRED', 'RENEWED', 'CANCELLED']), T('Product'), T('Reference'),
      NUM('Quantity'), D('StartDate'), D('EndDate'), NUM('NoticeDays', 'Min="0" Max="365"'), NUM('AnnualCost'), T('VendorId'), T('ContractId'), T('OwnerUPN'), N('Notes')],
    IT_27_NpsResponses: [T('ResponseId'), NUM('Score', 'Min="0" Max="10"'), N('Comment'), D('RespondedOn'), C('Channel', ['KIOSK', 'PHONE', 'CHAT', 'FLOORWALK', 'SELF_SERVICE', 'EMAIL', 'OTHER']),
      C('Country', ['ES', 'PT', 'OTHER']), T('TicketRef'), C('Status', ['NOT_REQUIRED', 'PENDING', 'CONTACTED', 'CLOSED']), D('FollowUpDate'), N('FollowUpNotes'), T('OwnerUPN')],
    IT_28_ServiceMonths: [T('MonthId'), D('Period'), C('Country', ['ES', 'PT', 'OTHER']), NUM('Incidents'), NUM('Interactions'), NUM('Requests'), NUM('Calls'), NUM('Users'),
      NUM('SlaPct', 'Min="0" Max="100"'), NUM('NpsScore', 'Min="-100" Max="100"'), NUM('NpsResponses'), NUM('Backlog'), N('Notes')],
    IT_29_Catalog: [T('CatalogId'), C('Category', ['ACCESS', 'EMAIL_TEAMS', 'ONEDRIVE_SHAREPOINT', 'DEVICE', 'ACCESSORY', 'APPLICATION', 'NETWORK_WIFI', 'HOW_TO', 'LOCATION_PEOPLE', 'OTHER']),
      C('Kind', ['INCIDENT', 'INTERACTION', 'REQUEST']), N('Keywords'), N('Guidance'), T('ArticleId'), C('Status', ['ACTIVE', 'ARCHIVED'])],
    IT_30_Stock: [T('StockId'), C('Category', ['LAPTOP', 'TABLET', 'PHONE', 'MONITOR', 'HEADSET', 'ACCESSORY', 'NETWORK', 'OTHER']), C('Country', ['ES', 'PT', 'OTHER']), NUM('OnHand'), NUM('MinLevel'),
      NUM('InUse'), NUM('OnOrder'), D('ExpectedOn'), NUM('UnitCost'), C('Ownership', ['RENTED', 'PURCHASED']), T('VendorId'), C('Status', ['ACTIVE', 'ARCHIVED']), N('Notes')],
    IT_31_GeniusSessions: [T('SessionId'), C('SessionType', ['CORNER', 'TIP', 'ACADEMY', 'CHALLENGE', 'ASK_IT']), T('Topic'), C('Status', ['IDEA', 'PLANNED', 'DELIVERED', 'CANCELLED']), D('SessionDate'), T('Audience'),
      T('OwnerUPN'), NUM('Invited'), NUM('Attended'), NUM('Satisfaction', 'Min="0" Max="5"'), N('MaterialUrl'), T('ArticleId'), T('CatalogId'), N('Motivation')],
    IT_32_Objectives: [T('ObjectiveId'), N('Description'), T('OwnerUPN'), T('SponsorUPN'), D('StartDate'), D('TargetDate'), C('Status', ['DRAFT', 'ACTIVE', 'ACHIEVED', 'CANCELLED']), C('Priority', level), N('Goal'), T('KpiId')],
    IT_33_BusinessCases: [T('CaseId'), N('Problem'), N('Options'), N('Recommendation'), N('Risks'), NUM('EstimatedCost'), NUM('AnnualBenefit'), T('ObjectiveId'), T('InitiativeId'), T('ProjectId'), T('OwnerUPN'),
      C('Status', ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'ARCHIVED']), D('DecisionDate'), N('DecisionNotes')],
    IT_34_WeeklyReviews: [T('ReviewId'), D('WeekStart'), C('Status', ['DRAFT', 'COMPLETED']), N('Happened'), N('WentWell'), N('WentWrong'), N('Attention'), N('Decisions'), N('Risks'), N('Priorities'), N('StopDoing'), N('StartDoing'), T('OwnerUPN')],
    IT_35_PurchaseOrders: [T('PoId'), T('VendorId'), NUM('Amount'), C('Status', ['OPEN', 'CLOSED']), N('Notes')],
    IT_36_Purchases: [T('PurchaseId'), NUM('Quantity'), NUM('UnitPrice'), NUM('Amount'), T('Category'), T('VendorId'), T('PoNumber'), C('Status', ['REQUESTED', 'APPROVED', 'ORDERED', 'RECEIVED', 'REJECTED', 'CANCELLED']), T('RequestedBy'), D('RequestedOn'), D('OrderedOn'), D('ReceivedOn'), T('DecisionBy'), D('DecisionDate'), N('DecisionNotes'), N('Reason'), N('Notes')],
    IT_37_PurchaseRoles: [T('UserUPN'), C('Role', ['APPROVER', 'BUYER', 'REQUESTER', 'VIEWER']), N('Notes')]
  };

  // Same seven approval columns on the four main lists (see src/rules/approvals.ts).
  const approvalFields = [T('ApprovalRule'), C('ApprovalStatus', ['NONE', 'PENDING', 'APPROVED', 'REJECTED']), T('Approver'),
    D('ApprovalRequestedOn'), D('ApprovalDecidedOn'), T('ApprovalDecidedBy'), N('ApprovalComment')];
  ['IT_01_Ideas', 'IT_02_Initiatives', 'IT_03_Projects', 'IT_04_Actions', 'IT_07_CAPEX', 'IT_08_OPEX', 'IT_10_Contracts', 'IT_15_ChangeRequests', 'IT_18_KnowledgeBase', 'IT_33_BusinessCases'].forEach((name) => { defs[name] = defs[name].concat(approvalFields); });

  for (const [title, fields] of Object.entries(defs)) await ensureList(title, fields);

  if (!SAMPLE_DATA) { log('Structure created. Sample data skipped.'); return 'done'; }

  // ---------- sample data ----------
  if (await isEmpty('IT_01_Ideas')) {
    await addItems('IT_01_Ideas', [
      ['Automate new-joiner laptop provisioning', 'IDEA-DEMO-001', 'NEW', 40000, 90, 'automation,onboarding'],
      ['Self-service password reset portal', 'IDEA-DEMO-002', 'DISCOVERY', 25000, 60, 'service-desk'],
      ['Consolidate SaaS licences', 'IDEA-DEMO-003', 'VALIDATED', 120000, 45, 'cost,licences'],
      ['Chatbot for first-line IT support', 'IDEA-DEMO-004', 'PILOT', 80000, 30, 'ai,service-desk'],
      ['On-premises file server migration', 'IDEA-DEMO-005', 'REJECTED', 15000, 10, 'infrastructure']
    ].map(([t, id, s, v, d, tags]) => ({ Title: t, IdeaId: id, Description: `Sample idea: ${t}.`, Status: s, OwnerUPN: me, SponsorUPN: me, EstimatedValue: v, TargetDate: day(d), Tags: tags })));
    log('  5 sample ideas (one VALIDATED to try "Convert to Initiative")');
  }
  if (await isEmpty('IT_02_Initiatives')) {
    await addItems('IT_02_Initiatives', [
      ['Digital Workplace 2027', 'INIT-DEMO-001', 'ACTIVE', 55, 120],
      ['Cloud cost optimisation', 'INIT-DEMO-002', 'BLOCKED', 30, 75],
      ['Service desk modernisation', 'INIT-DEMO-003', 'DRAFT', 0, 150]
    ].map(([t, id, s, p, d]) => ({ Title: t, InitiativeId: id, Description: `Sample initiative: ${t}.`, Status: s, OwnerUPN: me, ProgressPct: p, TargetDate: day(d) })));
    log('  3 sample initiatives');
  }
  if (await isEmpty('IT_03_Projects')) {
    await addItems('IT_03_Projects', [
      ['Laptop refresh wave 1', 'PROJ-DEMO-001', 'INIT-DEMO-001', 'ACTIVE', 200000, 205000, 'LOW', -60, 60],
      ['Teams telephony rollout', 'PROJ-DEMO-002', 'INIT-DEMO-001', 'ACTIVE', 100000, 128000, 'HIGH', -30, 90],
      ['FinOps tooling', 'PROJ-DEMO-003', 'INIT-DEMO-002', 'PLANNING', 50000, 50000, 'MEDIUM', 15, 120]
    ].map(([t, id, i, s, b, f, r, sd, ed]) => ({ Title: t, ProjectId: id, InitiativeId: i, Description: `Sample project: ${t}.`, Status: s, OwnerUPN: me, StartDate: day(sd), EndDate: day(ed), BudgetAmount: b, ForecastAmount: f, RiskLevel: r })));
    log('  3 sample projects (one over budget by more than 10%: at risk)');
  }
  if (await isEmpty('IT_04_Actions')) {
    await addItems('IT_04_Actions', [
      ['Send procurement request', 'ACT-DEMO-001', 'OPEN', 'HIGH', -5, me],
      ['Review vendor contract', 'ACT-DEMO-002', 'IN_PROGRESS', 'CRITICAL', -1, me],
      ['Prepare steering committee', 'ACT-DEMO-003', 'OPEN', 'MEDIUM', 0, me],
      ['Test telephony failover', 'ACT-DEMO-004', 'OPEN', 'HIGH', 3, me],
      ['Update risk register', 'ACT-DEMO-005', 'BLOCKED', 'MEDIUM', 6, me],
      ['Plan wave 2 logistics', 'ACT-DEMO-006', 'OPEN', 'LOW', 21, me],
      ['Close wave 1 purchase order', 'ACT-DEMO-007', 'DONE', 'LOW', -10, me],
      ['Colleague task (not mine)', 'ACT-DEMO-008', 'OPEN', 'MEDIUM', -2, 'someone.else@example.com']
    ].map(([t, id, s, p, d, o]) => {
      const row = { Title: t, ActionId: id, Description: `Sample action: ${t}.`, Status: s, Priority: p, OwnerUPN: o, DueDate: day(d) };
      if (s === 'DONE') row.CompletedDate = day(d + 1);
      return row;
    }));
    log("  8 sample actions (overdue, due today, this week, later, done, and someone else's)");
  }

  // The areas are what matters are classified by, so they are worth having from the start.
  if (await isEmpty('IT_24_Areas')) {
    await addItems('IT_24_Areas', ['Budget', 'User requests', 'Renewals', 'Building requests', 'Orange logistics', 'Retail', 'Europe and corporate', 'Network incidents', 'Projects and ideas', 'Vendors']
      .map((name, i) => ({ Title: name, AreaId: 'AREA-DEMO-' + String(i + 1).padStart(3, '0'), Description: `Sample area: ${name}.`, Status: 'ACTIVE', SortOrder: (i + 1) * 10 })));
    log('  10 sample areas (rename, archive or add your own in the app)');
  }

  log('Done. Refresh the page with the IT Management Hub web part.');
  return 'done';
})().catch((e) => { console.error('[ITSDM] FAILED:', e); return 'failed: ' + e.message; });
