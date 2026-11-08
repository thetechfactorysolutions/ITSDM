import assert from 'node:assert/strict';
import { en } from '../src/i18n/en';
import { es } from '../src/i18n/es';
import { translate } from '../src/i18n/I18n';
import {
  ActionStatus, ApprovalStatus, Idea, IdeaStatus, Initiative, InitiativeStatus, Project, ProjectRiskLevel, ProjectStatus
} from '../src/models';
import { buildApprovalMessage } from '../src/rules/approvalMessage';
import {
  APPROVAL_RULES, decideApproval, evaluateChange, EMPTY_APPROVAL, findRule, getApproval, IApprovalRule, isPending, requestApproval
} from '../src/rules/approvals';
import { buildApprovalPayload, buildProjectPayload } from '../src/entities/payloads';

const idea = (o: Partial<Idea> = {}): Idea => ({ ideaId: 'I-1', title: 'Idea', description: '', status: IdeaStatus.DISCOVERY, ownerUpn: 'a@b.com', tags: [], ...o });
const project = (o: Partial<Project> = {}): Project => ({
  projectId: 'P-1', title: 'Proj', description: '', status: ProjectStatus.PLANNING, ownerUpn: 'a@b.com',
  budgetAmount: 50000, forecastAmount: 50000, riskLevel: ProjectRiskLevel.LOW, ...o
});
const initiative = (o: Partial<Initiative> = {}): Initiative => ({
  initiativeId: 'N-1', title: 'Init', description: '', status: InitiativeStatus.DRAFT, ownerUpn: 'a@b.com', progressPct: 0, ...o
});
const approved = (ruleId: string) => ({ ...EMPTY_APPROVAL, ruleId, status: ApprovalStatus.APPROVED, approver: 'boss@x.com', decidedBy: 'boss@x.com', decidedOn: '2026-11-08' });
const ids = (rules: IApprovalRule[]): string[] => rules.map(r => r.id);

// ---------------------------------------------------------------- the rules
const testIdeaValidate = (): void => {
  assert.deepEqual(ids(evaluateChange('ideas', idea(), idea({ status: IdeaStatus.VALIDATED })).required), ['idea.validate']);
  assert.deepEqual(evaluateChange('ideas', idea(), idea({ status: IdeaStatus.REJECTED })).required, [], 'other changes are free');
  assert.deepEqual(evaluateChange('ideas', idea({ status: IdeaStatus.VALIDATED }), idea({ status: IdeaStatus.VALIDATED, title: 'renamed' })).required, [], 'editing an already validated idea is free');
  assert.deepEqual(evaluateChange('ideas', idea({ status: IdeaStatus.VALIDATED }), idea({ status: IdeaStatus.PLANNED })).required, []);
};

const testOverBudget = (): void => {
  const within = project({ budgetAmount: 100000, forecastAmount: 110000 });
  const over = project({ budgetAmount: 100000, forecastAmount: 111000 });
  assert.deepEqual(evaluateChange('projects', within, within).required, [], 'exactly 10% is not over');
  assert.deepEqual(ids(evaluateChange('projects', within, over).required), ['project.overBudget'], 'introducing the excess needs approval');
  assert.deepEqual(ids(evaluateChange('projects', over, project({ budgetAmount: 100000, forecastAmount: 150000 })).required), ['project.overBudget'], 'increasing it needs approval again');
  assert.deepEqual(evaluateChange('projects', over, { ...over, description: 'edited' }).required, [], 'editing other fields of an over-budget project does not ask again');
  assert.deepEqual(evaluateChange('projects', over, { ...over, forecastAmount: 105000 }).required, [], 'lowering the forecast is free');
  assert.deepEqual(evaluateChange('projects', project({ budgetAmount: 0 }), project({ budgetAmount: 0, forecastAmount: 500 })).required, [], 'no budget, no percentage');
};

const testHighBudgetStart = (): void => {
  const big = project({ budgetAmount: 100000, forecastAmount: 100000 });
  assert.deepEqual(ids(evaluateChange('projects', big, { ...big, status: ProjectStatus.ACTIVE }).required), ['project.highBudgetStart']);
  assert.deepEqual(evaluateChange('projects', project({ budgetAmount: 99999, forecastAmount: 99999 }), project({ budgetAmount: 99999, forecastAmount: 99999, status: ProjectStatus.ACTIVE })).required, [], 'below the threshold');
  assert.deepEqual(evaluateChange('projects', { ...big, status: ProjectStatus.ACTIVE }, { ...big, status: ProjectStatus.AT_RISK }).required, [], 'only the start needs approval');
};

const testDisabledRule = (): void => {
  const rule = findRule('initiative.activate') as IApprovalRule;
  assert.equal(rule.enabled, false, 'off by default');
  assert.deepEqual(evaluateChange('initiatives', initiative(), initiative({ status: InitiativeStatus.ACTIVE })).required, []);
  const switchedOn = [{ ...rule, enabled: true }];
  assert.deepEqual(ids(evaluateChange('initiatives', initiative(), initiative({ status: InitiativeStatus.ACTIVE }), switchedOn).required), ['initiative.activate'], 'switching it on is enough');
};

// ---------------------------------------------------------------- the gate
const testGate = (): void => {
  const target = idea({ status: IdeaStatus.VALIDATED });

  const noApproval = evaluateChange('ideas', idea(), target);
  assert.deepEqual(ids(noApproval.blockedBy), ['idea.validate']);
  assert.equal(noApproval.consumesApproval, false);

  const pending = evaluateChange('ideas', idea({ approval: requestApproval('idea.validate', 'boss@x.com') }), target);
  assert.equal(pending.blockedBy.length, 1, 'pending is not approved');

  const rejected = evaluateChange('ideas', idea({ approval: { ...approved('idea.validate'), status: ApprovalStatus.REJECTED } }), target);
  assert.equal(rejected.blockedBy.length, 1, 'rejected does not allow it');

  const wrongRule = evaluateChange('ideas', idea({ approval: approved('project.overBudget') }), target);
  assert.equal(wrongRule.blockedBy.length, 1, 'an approval for another rule does not count');

  const ok = evaluateChange('ideas', idea({ approval: approved('idea.validate') }), target);
  assert.deepEqual(ok.blockedBy, []);
  assert.equal(ok.consumesApproval, true, 'the approval is used up by this change');

  const unrelated = evaluateChange('ideas', idea({ approval: approved('idea.validate') }), idea({ status: IdeaStatus.REJECTED }));
  assert.equal(unrelated.consumesApproval, false, 'an approval is not consumed by a change that did not need it');
};

const testNewItemCannotBypass = (): void => {
  const created = evaluateChange('projects', undefined, project({ budgetAmount: 200000, forecastAmount: 200000, status: ProjectStatus.ACTIVE }));
  assert.equal(created.needsExistingItem, true);
  assert.equal(created.blockedBy.length, 1);
  const fine = evaluateChange('projects', undefined, project());
  assert.equal(fine.needsExistingItem, false);
  assert.deepEqual(fine.blockedBy, []);
};

const testSeveralRulesAtOnce = (): void => {
  const current = project({ budgetAmount: 200000, forecastAmount: 200000, approval: approved('project.highBudgetStart') });
  const next = { ...current, status: ProjectStatus.ACTIVE, forecastAmount: 300000 };
  const result = evaluateChange('projects', current, next);
  assert.deepEqual(ids(result.required).sort(), ['project.highBudgetStart', 'project.overBudget']);
  assert.deepEqual(ids(result.blockedBy), ['project.overBudget'], 'the rule that has an approval is covered, the other one is not');
  assert.equal(result.consumesApproval, false);
};

// ---------------------------------------------------------------- state helpers
const testStateHelpers = (): void => {
  const now = new Date(2026, 10, 8);
  const req = requestApproval('idea.validate', '  boss@x.com ', now);
  assert.deepEqual(req, { ruleId: 'idea.validate', status: 'PENDING', approver: 'boss@x.com', requestedOn: '2026-11-08', decidedOn: '', decidedBy: '', comment: '' });
  assert.equal(isPending({ approval: req }), true);
  assert.equal(isPending({}), false);

  const decided = decideApproval(req, ApprovalStatus.APPROVED, 'boss@x.com', ' fine ', new Date(2026, 10, 9));
  assert.equal(decided.status, 'APPROVED');
  assert.equal(decided.decidedOn, '2026-11-09');
  assert.equal(decided.comment, 'fine');
  assert.equal(decided.requestedOn, '2026-11-08', 'the request date is kept');
  assert.equal(getApproval(undefined), EMPTY_APPROVAL);

  const request = requestApproval('x', 'a@b.com', now);
  assert.equal(requestApproval('y', 'c@d.com', now).comment, '', 'a new request starts clean');
  assert.equal(request.decidedBy, '');
};

const testPayloads = (): void => {
  const payload = buildApprovalPayload(approved('idea.validate'));
  assert.equal(payload.ApprovalRule, 'idea.validate');
  assert.equal(payload.ApprovalStatus, 'APPROVED');
  assert.equal(payload.ApprovalDecidedOn, '2026-11-08T12:00:00Z');
  assert.equal(payload.ApprovalRequestedOn, null, 'an empty date is cleared with null');
  const saved = buildProjectPayload(project());
  assert.equal(saved.ApprovalStatus, 'NONE', 'every save carries the approval columns, NONE by default');
};

// ---------------------------------------------------------------- texts (this is what makes adding a rule safe)
const testEveryRuleHasTexts = (): void => {
  assert.ok(APPROVAL_RULES.length >= 4);
  const seen: Record<string, boolean> = {};
  for (const rule of APPROVAL_RULES) {
    assert.equal(seen[rule.id], undefined, `duplicate rule id ${rule.id}`);
    seen[rule.id] = true;
    for (const key of [rule.titleKey, rule.whyKey]) {
      assert.ok(key in en && en[key].trim(), `English text missing: ${key}`);
      assert.ok(key in es && es[key].trim(), `Spanish text missing: ${key}`);
    }
  }
};

const testMessage = (): void => {
  const t = (key: string, params?: Record<string, string | number>): string => translate('es', key, params);
  const message = buildApprovalMessage(t, {
    entityLabel: 'Proyecto', title: 'Telefonía & más', businessId: 'PROJ-1', ruleTitle: 'Previsión sobre el presupuesto',
    ruleWhy: 'La previsión supera el presupuesto.', requester: 'me@x.com', approver: ' boss@x.com ', pageUrl: 'https://tenant/sites/x/page.aspx'
  });
  assert.ok(message.subject.indexOf('Telefonía & más') > -1, 'the subject names the item');
  assert.ok(message.body.indexOf('PROJ-1') > -1 && message.body.indexOf('https://tenant/sites/x/page.aspx') > -1);
  assert.ok(message.mailto.indexOf('mailto:boss%40x.com?') === 0, 'the approver is the recipient');
  assert.ok(message.mailto.indexOf('%26%20m%C3%A1s') > -1, 'special characters are encoded, so & does not cut the text');
  assert.ok(message.mailto.indexOf('%0D%0A') > -1, 'line breaks are kept');
  assert.ok(message.teams.indexOf('https://teams.microsoft.com/l/chat/0/0?users=boss%40x.com&message=') === 0);
  assert.equal(message.mailto.indexOf(' '), -1, 'no raw spaces in the link');
};

testIdeaValidate();
testOverBudget();
testHighBudgetStart();
testDisabledRule();
testGate();
testNewItemCannotBypass();
testSeveralRulesAtOnce();
testStateHelpers();
testPayloads();
testEveryRuleHasTexts();
testMessage();
console.log('approvals tests passed');
