import assert from 'node:assert/strict';
import * as cp from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { mapArea, mapArticle, mapBudget, mapCapex, mapChange, mapContract, mapEntitlement, mapIncident, mapInteraction, mapKpi, mapLink, mapMatter, mapOpex, mapSkill, mapTraining } from '../src/components/shared/mappers';
import { entitlementAlert, isInbox, isInboxStale, isMatterClosed, isMatterOpen, isMatterOverdue, isSafeUrl, needsEntitlementAttention } from '../src/rules/matters';
import { APPROVAL_RULES } from '../src/rules/approvals';
import { budgetFigures, contractAlert } from '../src/rules/finance';
import { certificationAlert, hasSkillGap, isReviewDue, isTrainingOverdue } from '../src/rules/people';
import { isFollowUpOverdue, isIncidentOverdue, kpiHealth, kpiTrend } from '../src/rules/operations';

/**
 * Builds the SharePoint package assets into a temporary folder and checks them against the app:
 * every sample value must be allowed by its own list schema, and the samples must produce the
 * cases they were written to show. Dates are relative to the day of the build, so this holds
 * on any day.
 */

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'itsdm-assets-'));
cp.execFileSync(process.execPath, [path.join(__dirname, '..', 'scripts', 'generate-assets.js')], { env: { ...process.env, ITSDM_ASSETS_DIR: outDir }, stdio: 'pipe' });

const unescapeXml = (s: string): string => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
const read = (file: string): string => fs.readFileSync(path.join(outDir, file), 'utf8');

interface ISchemaField { name: string; type: string; choices?: string[] }

const parseSchema = (xml: string): ISchemaField[] => {
  const fields: ISchemaField[] = [];
  const re = /<Field ([^>]*?)(\/>|>([\s\S]*?)<\/Field>)/g;
  let m: RegExpExecArray | null = re.exec(xml);
  while (m) {
    const name = /\bName="(\w+)"/.exec(m[1]);
    const type = /\bType="(\w+)"/.exec(m[1]);
    if (name && type && m[3] !== undefined && /<CHOICES>/.test(m[3])) {
      fields.push({ name: name[1], type: type[1], choices: Array.from(m[3].matchAll(/<CHOICE>([\s\S]*?)<\/CHOICE>/g)).map(c => unescapeXml(c[1])) });
    } else if (name && type) {
      fields.push({ name: name[1], type: type[1] });
    }
    m = re.exec(xml);
  }
  return fields;
};

interface IInstance { title: string; schemaFile: string; rows: Array<Record<string, string>> }

const parseInstances = (xml: string): IInstance[] =>
  Array.from(xml.matchAll(/<ListInstance ([^>]*)>([\s\S]*?)<\/ListInstance>/g)).map(m => ({
    title: /Title="([^"]+)"/.exec(m[1])?.[1] ?? '',
    schemaFile: /CustomSchema="([^"]+)"/.exec(m[1])?.[1] ?? '',
    rows: Array.from(m[2].matchAll(/<Row>([\s\S]*?)<\/Row>/g)).map(r => {
      const row: Record<string, string> = {};
      Array.from(r[1].matchAll(/<Field Name="(\w+)">([\s\S]*?)<\/Field>/g)).forEach(f => { row[f[1]] = unescapeXml(f[2]); });
      return row;
    })
  }));

const instances = parseInstances(read('elements.xml'));
const rowsOf = (title: string): Array<Record<string, string>> => (instances.filter(i => i.title === title)[0] ?? { rows: [] }).rows;
const byId = (title: string, key: string, id: string): Record<string, string> => rowsOf(title).filter(r => r[key] === id)[0];

const testEveryListAndSample = (): void => {
  const expected = [
    'IT_01_Ideas', 'IT_02_Initiatives', 'IT_03_Projects', 'IT_04_Actions', 'IT_06_Budgets', 'IT_07_CAPEX', 'IT_08_OPEX', 'IT_09_Vendors', 'IT_10_Contracts',
    'IT_05_KPIs', 'IT_13_Incidents', 'IT_14_Interactions', 'IT_15_ChangeRequests',
    'IT_16_TeamSkills', 'IT_17_TrainingPlans', 'IT_18_KnowledgeBase',
    'IT_11_Risks', 'IT_12_Decisions', 'IT_19_Reviews', 'IT_20_LessonsLearned', 'IT_21_Meetings', 'IT_22_Notes',
    'IT_23_Matters', 'IT_24_Areas', 'IT_25_Links', 'IT_26_Entitlements'
  ];
  assert.deepEqual(instances.map(i => i.title).sort(), expected.sort(), 'every list is in the package');

  for (const instance of instances) {
    const fields = parseSchema(read(instance.schemaFile));
    const byName: Record<string, ISchemaField> = {};
    fields.forEach(f => { byName[f.name] = f; });
    assert.ok(byName.Title, `${instance.title} has a Title column`);
    assert.ok(instance.rows.length > 0, `${instance.title} has sample rows`);

    for (const row of instance.rows) {
      for (const key of Object.keys(row)) {
        const field = byName[key];
        assert.ok(field, `${instance.title}: sample column "${key}" does not exist in the schema`);
        if (field.choices) {
          assert.ok(field.choices.indexOf(row[key]) > -1, `${instance.title}.${key}: "${row[key]}" is not one of ${field.choices.join(', ')}`);
        }
        if (field.type === 'Number') {
          assert.ok(isFinite(Number(row[key])), `${instance.title}.${key}: "${row[key]}" is not a number`);
        }
        if (field.type === 'DateTime') {
          assert.match(row[key], /^\d{4}-\d{2}-\d{2}T12:00:00Z$/, `${instance.title}.${key}: dates are written as noon UTC`);
        }
      }
    }
  }
};

const testApprovalColumnsMatchTheRules = (): void => {
  // lists that carry an approval must have the seven columns, and every approval row must name a real rule
  for (const title of ['IT_01_Ideas', 'IT_02_Initiatives', 'IT_03_Projects', 'IT_04_Actions', 'IT_07_CAPEX', 'IT_08_OPEX', 'IT_10_Contracts', 'IT_15_ChangeRequests', 'IT_18_KnowledgeBase']) {
    const instance = instances.filter(i => i.title === title)[0];
    const names = parseSchema(read(instance.schemaFile)).map(f => f.name);
    for (const column of ['ApprovalRule', 'ApprovalStatus', 'Approver', 'ApprovalRequestedOn', 'ApprovalDecidedOn', 'ApprovalDecidedBy', 'ApprovalComment']) {
      assert.ok(names.indexOf(column) > -1, `${title} has ${column}`);
    }
    for (const row of instance.rows.filter(r => r.ApprovalStatus && r.ApprovalStatus !== 'NONE')) {
      assert.ok(APPROVAL_RULES.some(rule => rule.id === row.ApprovalRule), `${title}: unknown approval rule ${row.ApprovalRule}`);
    }
  }
  for (const title of ['IT_06_Budgets', 'IT_09_Vendors', 'IT_11_Risks', 'IT_16_TeamSkills', 'IT_17_TrainingPlans']) {
    const instance = instances.filter(i => i.title === title)[0];
    assert.equal(parseSchema(read(instance.schemaFile)).some(f => f.name === 'ApprovalStatus'), false, `${title} has no approval columns`);
  }
};

const testSamplesShowTheirCases = (): void => {
  const capex = rowsOf('IT_07_CAPEX').map(mapCapex);
  const opex = rowsOf('IT_08_OPEX').map(mapOpex);

  const near = budgetFigures(mapBudget(byId('IT_06_Budgets', 'BudgetId', 'BUD-DEMO-001')), capex, opex);
  assert.equal(near.level, 'NEAR', `the first budget is near its limit (${Math.round(near.usedRatio * 100)}%)`);
  assert.ok(near.usedRatio >= 0.9 && near.usedRatio <= 1);

  const over = budgetFigures(mapBudget(byId('IT_06_Budgets', 'BudgetId', 'BUD-DEMO-002')), capex, opex);
  assert.equal(over.level, 'OVER', 'the second budget is over');
  assert.equal(over.committed, 78000, '6,500 a month for a year');

  const renew = contractAlert(mapContract(byId('IT_10_Contracts', 'ContractId', 'CON-DEMO-002')));
  assert.equal(renew.alert, 'RENEWAL', 'one contract is due for renewal');
  assert.equal(contractAlert(mapContract(byId('IT_10_Contracts', 'ContractId', 'CON-DEMO-001'))).alert, 'NONE', 'the other active one is not');

  const pending = mapCapex(byId('IT_07_CAPEX', 'CapexId', 'CAPEX-DEMO-003'));
  assert.equal(pending.approval?.status, 'PENDING', 'one expense waits for approval');
  assert.equal(pending.approval?.ruleId, 'capex.commit');
  assert.ok(pending.amount >= 50000, 'and it is large enough to need it');

  const incidents = rowsOf('IT_13_Incidents').map(mapIncident);
  assert.deepEqual(incidents.filter(i => isIncidentOverdue(i)).map(i => i.incidentId), ['INC-DEMO-001'], 'exactly one incident is past its deadline');

  const kpis = rowsOf('IT_05_KPIs').map(mapKpi);
  const health = (id: string): string => kpiHealth(kpis.filter(k => k.kpiId === id)[0]);
  assert.deepEqual(['KPI-DEMO-001', 'KPI-DEMO-002', 'KPI-DEMO-003', 'KPI-DEMO-004'].map(health), ['AT_RISK', 'OFF_TARGET', 'ON_TARGET', 'OFF_TARGET'], 'one KPI of each health');
  assert.equal(kpiTrend(kpis.filter(k => k.kpiId === 'KPI-DEMO-004')[0]), 'WORSENING');
  assert.equal(kpiTrend(kpis.filter(k => k.kpiId === 'KPI-DEMO-001')[0]), 'IMPROVING');

  const followUps = rowsOf('IT_14_Interactions').map(mapInteraction).filter(i => isFollowUpOverdue(i));
  assert.deepEqual(followUps.map(i => i.interactionId), ['INT-DEMO-001'], 'one follow-up is overdue');

  const pendingChange = mapChange(byId('IT_15_ChangeRequests', 'ChangeId', 'CHG-DEMO-001'));
  assert.equal(pendingChange.approval?.status, 'PENDING', 'a high-risk change waits for approval');
  assert.equal(pendingChange.approval?.ruleId, 'change.approve');
  assert.equal(pendingChange.risk, 'HIGH');

  const skills = rowsOf('IT_16_TeamSkills').map(mapSkill);
  assert.deepEqual(skills.filter(hasSkillGap).map(k => k.skillId).sort(), ['SKL-DEMO-002', 'SKL-DEMO-003'], 'two skills are below their target level');
  assert.deepEqual(skills.map(k => certificationAlert(k).alert), ['NONE', 'EXPIRING', 'NONE'], 'one certification is about to expire');

  const trainings = rowsOf('IT_17_TrainingPlans').map(mapTraining);
  assert.deepEqual(trainings.filter(x => isTrainingOverdue(x)).map(x => x.trainingId), ['TRN-DEMO-002'], 'one training is late');
  assert.ok(trainings.some(x => x.status === 'COMPLETED' && !!x.completedDate), 'a completed training has its completion date');
  assert.ok(trainings.every(x => skills.some(k => k.skillId === x.skillId)), 'every training points to a sample skill');

  const articles = rowsOf('IT_18_KnowledgeBase').map(mapArticle);
  assert.deepEqual(articles.filter(a => isReviewDue(a)).map(a => a.articleId), ['KB-DEMO-001'], 'one published article is due for review');
  const policy = articles.filter(a => a.articleId === 'KB-DEMO-003')[0];
  assert.equal(policy.approval?.status, 'PENDING', 'a policy waits for approval before it is published');
  assert.equal(policy.approval?.ruleId, 'article.publishPolicy');
  assert.equal(policy.category, 'POLICY');

  const areas = rowsOf('IT_24_Areas').map(mapArea);
  assert.equal(areas.length, 10, 'ten areas to classify by');
  assert.ok(areas.every(a => a.status === 'ACTIVE' && a.title), 'every area is active and named');
  assert.equal(new Set(areas.map(a => a.areaId)).size, areas.length, 'area ids are unique');

  const matters = rowsOf('IT_23_Matters').map(mapMatter);
  assert.deepEqual(matters.filter(isInbox).map(m => m.matterId), ['ASU-DEMO-001', 'ASU-DEMO-002'], 'two items wait in the inbox');
  assert.ok(matters.filter(isInbox).every(m => !m.areaId), 'and they have no area yet');
  assert.deepEqual(matters.filter(m => isInboxStale(m)).map(m => m.matterId), ['ASU-DEMO-002'], 'one has waited too long');
  assert.deepEqual(matters.filter(isMatterOpen).map(m => m.matterId), ['ASU-DEMO-003', 'ASU-DEMO-004', 'ASU-DEMO-005'], 'three are being worked on');
  assert.deepEqual(matters.filter(m => isMatterOverdue(m)).map(m => m.matterId), ['ASU-DEMO-005'], 'one is past its due date');
  assert.deepEqual(matters.filter(isMatterClosed).map(m => m.matterId), ['ASU-DEMO-006', 'ASU-DEMO-007'], 'and two are in the history');
  assert.ok(matters.filter(isMatterClosed).every(m => !!m.closedOn), 'closed ones have their closing date');
  assert.ok(matters.filter(m => !isInbox(m)).every(m => areas.some(a => a.areaId === m.areaId)), 'every classified matter has a real area');
  assert.ok(matters.every(m => !m.contractId || rowsOf('IT_10_Contracts').some(c => c.ContractId === m.contractId)), 'matters point to real contracts');
  assert.ok(matters.every(m => !m.vendorId || rowsOf('IT_09_Vendors').some(v => v.VendorId === m.vendorId)), 'and real vendors');

  const links = rowsOf('IT_25_Links').map(mapLink);
  assert.ok(links.length >= 3 && links.every(l => isSafeUrl(l.url)), 'sample links are plain web addresses');
  assert.equal(links.filter(l => l.pinned).length, 3, 'three are pinned for the dashboard');

  const entitlements = rowsOf('IT_26_Entitlements').map(mapEntitlement);
  const alertOf = (id: string): string => entitlementAlert(entitlements.filter(e => e.entitlementId === id)[0]).alert;
  assert.deepEqual(['ENT-DEMO-001', 'ENT-DEMO-002', 'ENT-DEMO-003', 'ENT-DEMO-004'].map(alertOf), ['RENEWAL', 'NONE', 'LAPSED', 'NONE'], 'one to renew, one lapsed, two fine or closed');
  assert.equal(entitlements.filter(e => needsEntitlementAttention(e)).length, 2);

  const project = byId('IT_03_Projects', 'ProjectId', 'PROJ-DEMO-002');
  assert.equal(project.ApprovalStatus, 'PENDING', 'a project also waits for approval, from the earlier round');
};

try {
  testEveryListAndSample();
  testApprovalColumnsMatchTheRules();
  testSamplesShowTheirCases();
  console.log('sample package tests passed');
} finally {
  fs.rmSync(outDir, { recursive: true, force: true });
}
