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
    IT_19_Reviews: [T('ReviewId'), C('ReviewType', ['STATUS', 'RISK', 'FINANCIAL', 'CLOSURE']), C('Status', ['SCHEDULED', 'COMPLETED', 'CANCELLED']),
      C('Health', ['GREEN', 'AMBER', 'RED']), D('ReviewDate'), D('NextReviewDate'), N('Summary'), N('NextSteps'), T('OwnerUPN'), T('ProjectId'), T('InitiativeId')],
    IT_20_LessonsLearned: [T('LessonId'), N('Description'), N('Recommendation'), C('Category', ['PROCESS', 'TECHNOLOGY', 'PEOPLE', 'VENDOR', 'OTHER']),
      C('Status', ['NEW', 'REVIEWED', 'APPLIED']), T('OwnerUPN'), T('ProjectId'), T('InitiativeId'), T('MeetingId')],
    IT_21_Meetings: [T('MeetingId'), D('MeetingDate'), N('Summary'), N('Attendees'), N('Transcript'), N('ImportedItems')],
    IT_22_Notes: [T('NoteId'), N('Body'), C('Category', ['DECISION', 'RISK', 'INFO', 'FOLLOW_UP']), C('Status', ['ACTIVE', 'ARCHIVED']),
      T('MeetingId'), T('InitiativeId'), T('ProjectId')]
  };

  // Same seven approval columns on the four main lists (see src/rules/approvals.ts).
  const approvalFields = [T('ApprovalRule'), C('ApprovalStatus', ['NONE', 'PENDING', 'APPROVED', 'REJECTED']), T('Approver'),
    D('ApprovalRequestedOn'), D('ApprovalDecidedOn'), T('ApprovalDecidedBy'), N('ApprovalComment')];
  ['IT_01_Ideas', 'IT_02_Initiatives', 'IT_03_Projects', 'IT_04_Actions', 'IT_07_CAPEX', 'IT_08_OPEX', 'IT_10_Contracts'].forEach((name) => { defs[name] = defs[name].concat(approvalFields); });

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

  log('Done. Refresh the page with the IT Management Hub web part.');
  return 'done';
})().catch((e) => { console.error('[ITSDM] FAILED:', e); return 'failed: ' + e.message; });
