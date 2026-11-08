import assert from 'node:assert/strict';
import {
  ActionPriority, ActionStatus, DecisionStatus, IdeaStatus, InitiativeStatus, LessonCategory, LessonStatus, NoteCategory, NoteStatus, ProjectRiskLevel, ProjectStatus, RiskScale, RiskStatus
} from '../src/models';
import { buildImportPrompt } from '../src/rules/importPrompt';
import { commitPlan, ICommitDeps, planForRetry } from '../src/rules/transcriptCommit';
import {
  applyResolvedOwners, buildPlan, collectOwnerNames, countIncluded, IBuildContext, IExistingRefs, parseAiResult
} from '../src/rules/transcriptImport';

const noExisting: IExistingRefs = { initiatives: [], projects: [], ideas: [], actions: [], notes: [], meetings: [] };
const makeCtx = (existing: Partial<IExistingRefs> = {}): IBuildContext => {
  let counter = 0;
  return {
    today: new Date(2026, 10, 8, 12), userEmail: 'me@x.com', existing: { ...noExisting, ...existing },
    defaultMeetingTitle: date => `Meeting ${date}`, newId: prefix => `${prefix}-${++counter}`
  };
};
const parse = (obj: unknown): Record<string, unknown> => {
  const r = parseAiResult(JSON.stringify(obj));
  assert.equal(r.ok, true);
  return (r as { ok: true; data: Record<string, unknown> }).data;
};
const keys = (list: Array<{ key: string }>): string[] => list.map(w => w.key);

// ---------------------------------------------------------------- reading the text
const testParsing = (): void => {
  assert.equal(parseAiResult('{"a":1}').ok, true);
  const fenced = parseAiResult('Here you go:\n```json\n{ "ideas": [] }\n```\nHope it helps');
  assert.equal(fenced.ok, true);
  const intro = parseAiResult('Sure! { "notes": [ { "title": "x" } ] } That is all.');
  assert.equal(intro.ok, true);
  const trailing = parseAiResult('{ "ideas": [ { "title": "a", }, ], }');
  assert.equal(trailing.ok, true, 'trailing commas are repaired');
  const smart = parseAiResult('{ “title”: “x” }');
  assert.equal(smart.ok, true, 'smart quotes are repaired');

  assert.deepEqual(parseAiResult(''), { ok: false, error: 'import.error.empty' });
  assert.deepEqual(parseAiResult('   '), { ok: false, error: 'import.error.empty' });
  assert.deepEqual(parseAiResult('just words, no json'), { ok: false, error: 'import.error.notJson' });
  assert.deepEqual(parseAiResult('[1,2,3]'), { ok: false, error: 'import.error.notJson' }, 'a bare array is not a result');
};

// ---------------------------------------------------------------- a complete example
const FULL = {
  meeting: { title: 'Weekly IT sync', date: '2026-11-06', summary: 'Laptops and licences', attendees: ['ana@x.com', 'Luis'] },
  initiatives: [{ title: 'Digital Workplace', description: 'Modernise the workplace', owner: 'ana@x.com' }],
  projects: [{ title: 'Laptop refresh', initiative: 'digital workplace', owner: 'ana@x.com', startDate: '2026-12-01', endDate: '2027-02-28', budget: 200000, forecast: 210000, riskLevel: 'medium' }],
  ideas: [{ title: 'Self-service portal', estimatedValue: 25000, tags: ['it', 'portal'] }],
  actions: [
    { title: 'Send purchase request', owner: 'ana@x.com', dueDate: '2026-11-13', priority: 'HIGH', project: 'Laptop refresh' },
    { title: 'Check licences', owner: 'Luis García', dueDate: '2026-11-20', initiative: 'Digital Workplace' }
  ],
  notes: [{ title: 'Budget approved for wave 1', body: 'Finance confirmed', category: 'DECISION', project: 'Laptop refresh' }]
};

const testFullPlan = (): void => {
  const plan = buildPlan(parse(FULL), makeCtx());

  assert.equal(plan.meeting.item.title, 'Weekly IT sync');
  assert.equal(plan.meeting.item.meetingDate, '2026-11-06');
  assert.equal(plan.meeting.item.attendees, 'ana@x.com; Luis');
  assert.equal(plan.problems.length, 0);

  const [init] = plan.initiatives;
  assert.equal(init.item.status, InitiativeStatus.DRAFT, 'the AI never decides the status');
  assert.equal(init.item.ownerUpn, 'ana@x.com');

  const [proj] = plan.projects;
  assert.equal(proj.item.status, ProjectStatus.PLANNING);
  assert.equal(proj.item.initiativeId, init.item.initiativeId, 'project linked to the initiative of the same result, ignoring case');
  assert.equal(proj.item.riskLevel, ProjectRiskLevel.MEDIUM, 'lower case accepted');
  assert.equal(proj.item.budgetAmount, 200000);
  assert.equal(proj.item.forecastAmount, 210000);

  const [a1, a2] = plan.actions;
  assert.equal(a1.item.status, ActionStatus.OPEN);
  assert.equal(a1.item.priority, ActionPriority.HIGH);
  assert.equal(a1.item.projectId, proj.item.projectId);
  assert.equal(a1.item.initiativeId, init.item.initiativeId, 'an action inherits the initiative of its project');
  assert.equal(a2.item.initiativeId, init.item.initiativeId);
  assert.equal(a2.item.ownerUpn, 'me@x.com', 'an unresolved owner falls back to the user');
  assert.equal(a2.ownerName, 'Luis García');
  assert.deepEqual(keys(a2.warnings), ['import.warn.ownerUnresolved']);

  const idea = plan.ideas[0];
  assert.equal(idea.item.status, IdeaStatus.NEW);
  assert.deepEqual(idea.item.tags, ['it', 'portal']);

  const note = plan.notes[0];
  assert.equal(note.item.status, NoteStatus.ACTIVE);
  assert.equal(note.item.category, NoteCategory.DECISION);
  assert.equal(note.item.meetingId, plan.meeting.item.meetingId, 'every note points at the meeting');
  assert.equal(note.item.projectId, proj.item.projectId);
  assert.equal(note.item.initiativeId, init.item.initiativeId);

  assert.equal(countIncluded(plan), 6, '1 initiative + 1 project + 1 idea + 2 actions + 1 note');
};

// ---------------------------------------------------------------- owners
const testOwners = (): void => {
  const plan = buildPlan(parse(FULL), makeCtx());
  assert.deepEqual(collectOwnerNames(plan), ['Luis García']);

  const resolved = applyResolvedOwners(plan, { 'Luis García': 'luis@x.com' });
  assert.equal(resolved.actions[1].item.ownerUpn, 'luis@x.com');
  assert.equal(resolved.actions[1].warnings.length, 0, 'the warning disappears once resolved');
  assert.equal(resolved.actions[1].ownerName, undefined);
  assert.deepEqual(collectOwnerNames(resolved), []);

  const unresolved = applyResolvedOwners(plan, { 'Luis García': undefined });
  assert.equal(unresolved.actions[1].item.ownerUpn, 'me@x.com', 'no unique match keeps the fallback');
  assert.equal(unresolved.actions[1].warnings.length, 1);
};

// ---------------------------------------------------------------- dates and values
const testDatesAndValues = (): void => {
  const plan = buildPlan(parse({
    actions: [
      { title: 'A', dueDate: 'next friday' },
      { title: 'B', dueDate: '2026-02-30' },
      { title: 'C', dueDate: '2026-11-13T09:00:00' },
      { title: 'D', dueDate: '2026-11-13', priority: 'urgentísimo' },
      { title: 'E', priority: 'alta' }
    ]
  }), makeCtx());
  const [a, b, c, d, e] = plan.actions;
  assert.equal(a.item.dueDate, '', 'relative text is dropped');
  assert.deepEqual(keys(a.warnings), ['import.warn.dateDropped']);
  assert.equal(b.item.dueDate, '', 'an impossible day is dropped');
  assert.equal(c.item.dueDate, '2026-11-13', 'a timestamp keeps its day');
  assert.equal(d.item.priority, ActionPriority.MEDIUM, 'unknown value falls back to the default');
  assert.deepEqual(keys(d.warnings), ['import.warn.valueUnknown']);
  assert.equal(e.item.priority, ActionPriority.HIGH, 'Spanish word understood');
  assert.equal(plan.actions.every(x => x.include), true, 'a dropped date does not block the item');
};

const testProjectNumbersAndDates = (): void => {
  const plan = buildPlan(parse({
    projects: [
      { title: 'P1', budget: '1,500.50', startDate: '2026-12-10', endDate: '2026-12-01' },
      { title: 'P2', budget: -5 },
      { title: 'P3', budget: 100 }
    ]
  }), makeCtx());
  const [p1, p2, p3] = plan.projects;
  assert.equal(p1.item.budgetAmount, 1500.5, 'thousands separator and decimals read');
  assert.equal(p1.item.endDate, '', 'an end before the start is dropped');
  assert.ok(keys(p1.warnings).indexOf('import.warn.endBeforeStart') > -1);
  assert.equal(p2.item.budgetAmount, 0, 'a negative budget is not accepted');
  assert.equal(p3.item.forecastAmount, 100, 'forecast defaults to the budget');
};

// ---------------------------------------------------------------- links, duplicates and gaps
const testLinksAndDuplicates = (): void => {
  const existing: Partial<IExistingRefs> = {
    initiatives: [{ id: 'INIT-OLD-1', title: 'Migración Cloud' }],
    projects: [{ id: 'PROJ-OLD-1', title: 'Plan de seguridad', initiativeId: 'INIT-OLD-1' }],
    actions: [{ title: 'Revisar contrato' }]
  };
  const plan = buildPlan(parse({
    projects: [{ title: 'Nuevo proyecto', initiative: 'migracion cloud' }],
    actions: [
      { title: 'Revisar CONTRATO' },
      { title: 'Probar backups', project: 'plan de seguridad' },
      { title: 'Algo', project: 'Proyecto que no existe' }
    ]
  }), makeCtx(existing));

  assert.equal(plan.projects[0].item.initiativeId, 'INIT-OLD-1', 'links to existing items ignoring case and accents');
  assert.deepEqual(keys(plan.actions[0].warnings), ['import.warn.duplicate']);
  assert.equal(plan.actions[0].include, true, 'a duplicate warns but is not blocked');
  assert.equal(plan.actions[1].item.projectId, 'PROJ-OLD-1');
  assert.equal(plan.actions[1].item.initiativeId, 'INIT-OLD-1', 'initiative inherited from an existing project');
  assert.equal(plan.actions[2].item.projectId, '');
  assert.deepEqual(keys(plan.actions[2].warnings), ['import.warn.linkUnresolved']);
};

const testGaps = (): void => {
  const empty = buildPlan(parse({}), makeCtx());
  assert.deepEqual(keys(empty.problems), ['import.warn.nothingFound']);
  assert.equal(empty.meeting.item.title, 'Meeting 2026-11-08', 'default title and date');
  assert.deepEqual(keys(empty.meeting.warnings), ['import.warn.meetingDateToday']);

  const noTitle = buildPlan(parse({ actions: [{ description: 'no title' }, { title: 'ok' }], unknownSection: [1] }), makeCtx());
  assert.equal(noTitle.actions.length, 1, 'an item without a title is skipped');
  assert.deepEqual(keys(noTitle.problems), ['import.warn.itemWithoutTitle']);

  const dupMeeting = buildPlan(parse({ meeting: { title: 'Weekly', date: '2026-11-06' } }), makeCtx({ meetings: [{ title: 'weekly', date: '2026-11-06' }] }));
  assert.ok(keys(dupMeeting.meeting.warnings).indexOf('import.warn.meetingDuplicate') > -1);

  const long = buildPlan(parse({ notes: [{ title: 'x'.repeat(400) }] }), makeCtx());
  assert.equal(long.notes[0].item.title.length, 255);
  assert.ok(keys(long.notes[0].warnings).indexOf('import.warn.titleShortened') > -1);
  assert.equal(long.notes[0].include, true);
};

const testSpanishKeys = (): void => {
  const plan = buildPlan(parse({
    reunion: { titulo: 'Reunión semanal', fecha: '2026-11-06' },
    acciones: [{ titulo: 'Enviar informe', responsable: 'ana@x.com', fechaLimite: '2026-11-13', prioridad: 'media' }],
    notas: [{ titulo: 'Riesgo de plazos', texto: 'Puede retrasarse', categoria: 'riesgo' }]
  }), makeCtx());
  assert.equal(plan.meeting.item.title, 'Reunión semanal');
  assert.equal(plan.actions[0].item.ownerUpn, 'ana@x.com');
  assert.equal(plan.actions[0].item.dueDate, '2026-11-13');
  assert.equal(plan.actions[0].item.priority, ActionPriority.MEDIUM);
  assert.equal(plan.notes[0].item.category, NoteCategory.RISK);
  assert.equal(plan.notes[0].item.body, 'Puede retrasarse');
};

const testNoteOwnerIsIgnored = (): void => {
  const plan = buildPlan(parse({ notes: [{ title: 'N', owner: 'Someone' }] }), makeCtx());
  assert.deepEqual(plan.notes[0].warnings, [], 'notes have no owner, so no owner warning');
  assert.deepEqual(collectOwnerNames(plan), []);
};

// ---------------------------------------------------------------- creating
interface ICall { op: 'create' | 'update'; list: string; payload: Record<string, unknown>; id?: number }

const makeDeps = (calls: ICall[], failTitles: string[] = []): ICommitDeps => {
  let nextId = 100;
  return {
    listNames: { initiatives: 'L_INIT', projects: 'L_PROJ', ideas: 'L_IDEA', actions: 'L_ACT', notes: 'L_NOTE', meetings: 'L_MEET', risks: 'L_RISK', decisions: 'L_DEC', lessons: 'L_LESS' },
    sourceTag: id => `[Source: ${id}]`,
    createItem: async (list, payload) => {
      if (failTitles.indexOf(String(payload.Title)) > -1) {
        throw new Error(`boom ${payload.Title}`);
      }
      calls.push({ op: 'create', list, payload });
      return { Id: nextId++ };
    },
    updateItem: async (list, id, payload) => { calls.push({ op: 'update', list, payload, id }); }
  };
};

const testCommit = async (): Promise<void> => {
  const plan = buildPlan(parse(FULL), makeCtx());
  const calls: ICall[] = [];
  const progress: Array<[number, number]> = [];
  const result = await commitPlan(plan, makeDeps(calls), { transcript: 'full text', onProgress: (d, t) => progress.push([d, t]) });

  assert.equal(result.failed.length, 0);
  assert.equal(result.created.length, 7, 'meeting + 6 items');
  assert.deepEqual(calls.filter(c => c.op === 'create').map(c => c.list), ['L_MEET', 'L_INIT', 'L_PROJ', 'L_IDEA', 'L_ACT', 'L_ACT', 'L_NOTE'], 'meeting first, then the rest in order');
  assert.equal(calls[0].payload.Transcript, 'full text', 'the transcript is stored with the meeting');
  assert.ok(String(calls[1].payload.Description).indexOf('[Source: MEET-1]') > -1, 'created items point back to the meeting');
  assert.equal(String(calls[1].payload.Status), 'DRAFT');
  assert.deepEqual(progress[progress.length - 1], [7, 7]);

  const update = calls.filter(c => c.op === 'update')[0];
  assert.equal(update.list, 'L_MEET');
  assert.equal(update.id, 100, 'the summary goes to the meeting item that was created');
  assert.ok(String(update.payload.ImportedItems).indexOf('Laptop refresh') > -1);
  assert.equal(result.summarySaved, true);
};

const testPartialFailureAndRetry = async (): Promise<void> => {
  const plan = buildPlan(parse(FULL), makeCtx());
  const calls: ICall[] = [];
  const first = await commitPlan(plan, makeDeps(calls, ['Send purchase request']), { transcript: '' });

  assert.equal(first.failed.length, 1);
  assert.equal(first.failed[0].title, 'Send purchase request');
  assert.match(first.failed[0].error, /boom/);
  assert.equal(first.created.length, 6, 'everything else was still created');
  assert.equal(calls.filter(c => c.list === 'L_NOTE').length, 1, 'a failure does not stop the following items');

  const retryPlan = planForRetry(plan, first.failed.map(f => f.key));
  assert.equal(countIncluded(retryPlan), 1);
  assert.equal(retryPlan.meeting.include, false, 'the meeting is not recreated');

  const retryCalls: ICall[] = [];
  const second = await commitPlan(retryPlan, makeDeps(retryCalls), { transcript: '', skipMeeting: true, meetingItemId: first.meetingItemId });
  assert.equal(second.failed.length, 0);
  assert.deepEqual(retryCalls.filter(c => c.op === 'create').map(c => c.list), ['L_ACT']);
  assert.equal(retryCalls.filter(c => c.op === 'update')[0].id, first.meetingItemId, 'the retry updates the same meeting');
};

const testExcludedAndMeetingFailure = async (): Promise<void> => {
  const plan = buildPlan(parse(FULL), makeCtx());
  plan.actions[0].include = false;
  plan.notes[0].include = false;
  const calls: ICall[] = [];
  const r = await commitPlan(plan, makeDeps(calls, ['Weekly IT sync']), { transcript: '' });

  assert.equal(r.failed[0].kind, 'meeting');
  assert.equal(r.meetingItemId, undefined);
  assert.equal(calls.filter(c => c.list === 'L_ACT').length, 1, 'excluded items are not created');
  assert.equal(calls.filter(c => c.list === 'L_NOTE').length, 0);
  assert.equal(calls.filter(c => c.op === 'update').length, 0, 'no summary is written when the meeting does not exist');
};

// ---------------------------------------------------------------- risks, decisions and lessons
const GOV = {
  meeting: { title: 'Weekly sync', date: '2026-11-06' },
  projects: [{ title: 'Laptop refresh' }],
  risks: [
    { title: 'Vendor may deliver late', owner: 'ana@x.com', probability: 'alta', impact: 'HIGH', mitigation: 'Agree a firm date', dueDate: '2026-11-20', project: 'Laptop refresh' },
    { title: 'Odd one', impact: 'catastrophic' }
  ],
  decisions: [
    { title: 'Buy in two waves', description: 'Budget is tight', rationale: 'Released per wave', decidedBy: 'Luis García', project: 'Laptop refresh' },
    { title: 'Keep the old contract', decidedBy: 'boss@x.com' }
  ],
  lessons: [{ title: 'Confirm lead times', recommendation: 'Ask in writing', categoria: 'proveedor', project: 'Laptop refresh' }]
};

const testGovernanceSections = (): void => {
  const plan = buildPlan(parse(GOV), makeCtx());
  const project = plan.projects[0].item;
  const [r1, r2] = plan.risks;

  assert.equal(r1.item.status, RiskStatus.OPEN, 'a new risk starts open');
  assert.equal(r1.item.probability, RiskScale.HIGH, 'a Spanish word is understood');
  assert.equal(r1.item.impact, RiskScale.HIGH);
  assert.equal(r1.item.ownerUpn, 'ana@x.com');
  assert.equal(r1.item.dueDate, '2026-11-20');
  assert.equal(r1.item.projectId, project.projectId);
  assert.equal(r1.item.meetingId, plan.meeting.item.meetingId, 'linked back to the meeting');
  assert.equal(r2.item.impact, RiskScale.MEDIUM, 'an unknown value falls back to the default');
  assert.deepEqual(keys(r2.warnings), ['import.warn.valueUnknown']);
  assert.equal(r2.include, true);

  const [d1, d2] = plan.decisions;
  assert.equal(d1.item.status, DecisionStatus.DECIDED, 'a decision taken in a meeting is already decided');
  assert.equal(d1.item.decisionDate, '2026-11-06', 'with the date of the meeting');
  assert.equal(d1.item.decidedBy, '', 'a name is not an email, so the decider waits for the directory');
  assert.equal(d1.ownerName, 'Luis García');
  assert.deepEqual(keys(d1.warnings), ['import.warn.deciderUnresolved'], 'the decision-specific warning, not the "assigned to you" one');
  assert.equal(d1.item.rationale, 'Released per wave');
  assert.equal(d1.include, true, 'an unresolved decider does not block it');
  assert.equal(d2.item.decidedBy, 'boss@x.com');
  assert.deepEqual(d2.warnings, []);

  const lesson = plan.lessons[0];
  assert.equal(lesson.item.category, LessonCategory.VENDOR);
  assert.equal(lesson.item.status, LessonStatus.NEW);
  assert.equal(lesson.item.recommendation, 'Ask in writing');
  assert.equal(lesson.item.projectId, project.projectId);

  assert.equal(countIncluded(plan), 6, '1 project + 2 risks + 2 decisions + 1 lesson');
  assert.equal(plan.problems.length, 0);

  // the directory lookup covers the person who decided
  assert.deepEqual(collectOwnerNames(plan), ['Luis García']);
  const resolved = applyResolvedOwners(plan, { 'Luis García': 'luis@x.com' });
  assert.equal(resolved.decisions[0].item.decidedBy, 'luis@x.com');
  assert.deepEqual(resolved.decisions[0].warnings, [], 'the warning goes away once resolved');
  assert.deepEqual(collectOwnerNames(resolved), []);
};

const testGovernanceDuplicates = (): void => {
  const plan = buildPlan(parse(GOV), makeCtx({ risks: [{ title: 'vendor MAY deliver late' }], decisions: [{ title: 'Buy in two waves' }], lessons: [{ title: 'Confirm lead times' }] }));
  assert.ok(keys(plan.risks[0].warnings).indexOf('import.warn.duplicate') > -1);
  assert.ok(keys(plan.decisions[0].warnings).indexOf('import.warn.duplicate') > -1);
  assert.ok(keys(plan.lessons[0].warnings).indexOf('import.warn.duplicate') > -1);
  assert.equal(plan.risks[0].include, true, 'a duplicate warns but is not blocked');
};

const testGovernanceCommit = async (): Promise<void> => {
  const plan = buildPlan(parse(GOV), makeCtx());
  const calls: ICall[] = [];
  const result = await commitPlan(plan, makeDeps(calls), { transcript: '' });
  assert.equal(result.failed.length, 0);
  assert.deepEqual(calls.filter(c => c.op === 'create').map(c => c.list),
    ['L_MEET', 'L_PROJ', 'L_RISK', 'L_RISK', 'L_DEC', 'L_DEC', 'L_LESS'], 'each kind goes to its own list, in order');

  const risk = calls.filter(c => c.list === 'L_RISK')[0].payload as Record<string, unknown>;
  assert.equal(risk.Status, 'OPEN');
  assert.equal(risk.Probability, 'HIGH');
  assert.ok(String(risk.Description).indexOf('[Source: MEET-') > -1, 'the origin is written in the description');
  const decision = calls.filter(c => c.list === 'L_DEC')[0].payload as Record<string, unknown>;
  assert.equal(decision.Status, 'DECIDED');
  assert.equal(decision.DecisionDate, '2026-11-06T12:00:00Z');
  assert.equal(String(decision.MeetingId).indexOf('MEET-'), 0);

  // retrying only what failed also covers the new kinds
  const retry = planForRetry(plan, [plan.decisions[1].key]);
  assert.equal(countIncluded(retry), 1);
  assert.equal(retry.decisions[1].include, true);
  assert.equal(retry.risks.every(d => !d.include), true);
};

// ---------------------------------------------------------------- prompt
const testPrompt = (): void => {
  const es = buildImportPrompt('es', new Date(2026, 10, 8));
  const en = buildImportPrompt('en', new Date(2026, 10, 8));
  for (const text of [es, en]) {
    for (const section of ['"meeting"', '"ideas"', '"initiatives"', '"projects"', '"actions"', '"risks"', '"decisions"', '"lessons"', '"notes"']) {
      assert.ok(text.indexOf(section) > -1, `prompt mentions ${section}`);
    }
    assert.ok(text.indexOf('2026-11-08') > -1, 'today is given for relative dates');
  }
  assert.ok(es.indexOf('TRANSCRIPCIÓN') > -1);
  assert.ok(en.indexOf('TRANSCRIPT') > -1);

  // The template inside the prompt must itself be something the importer accepts.
  const block = en.slice(en.indexOf('{'), en.lastIndexOf('}', en.indexOf('Rules:')) + 1);
  assert.equal(parseAiResult(block).ok, true, 'the template in the prompt is valid JSON');
};

const run = async (): Promise<void> => {
  testParsing();
  testFullPlan();
  testOwners();
  testDatesAndValues();
  testProjectNumbersAndDates();
  testLinksAndDuplicates();
  testGaps();
  testSpanishKeys();
  testNoteOwnerIsIgnored();
  testGovernanceSections();
  testGovernanceDuplicates();
  await testGovernanceCommit();
  await testCommit();
  await testPartialFailureAndRetry();
  await testExcludedAndMeetingFailure();
  testPrompt();
  console.log('transcriptImport tests passed');
};

run().catch(error => {
  console.error(error);
  process.exit(1);
});
