import { AppConfig } from '../config/AppConfig';
import {
  ActionItem, Article, ArticleCategory, ArticleStatus, ApprovalStatus, CapexItem, ChangeRequest, ChangeStatus, ChangeType, Contract, ContractStatus, IApprovalState, Idea, IdeaStatus, Initiative, InitiativeStatus, OpexItem, Project, ProjectStatus, RiskScale
} from '../models';
import { toDayKey } from './dates';
import { isCommitted, opexAnnualAmount } from './finance';

/**
 * Approval rules, as data.
 *
 * To add a case, add one `rule({...})` entry to APPROVAL_RULES below and its two texts
 * (`approval.rule.<id>.title` and `approval.rule.<id>.why`) to src/i18n/en.ts and es.ts. A test
 * fails if a rule has no text in both languages. Nothing else needs to change: the forms, the
 * quick status change, the CSV import and the dashboard all read this list.
 */

export type ApprovalEntity = 'ideas' | 'initiatives' | 'projects' | 'actions' | 'capex' | 'opex' | 'contracts' | 'changes' | 'articles';

export interface IEntityByApprovalKey {
  ideas: Idea;
  initiatives: Initiative;
  projects: Project;
  actions: ActionItem;
  capex: CapexItem;
  opex: OpexItem;
  contracts: Contract;
  changes: ChangeRequest;
  articles: Article;
}

export interface IApprovalRule {
  /** Stable id stored in the list, e.g. "project.overBudget". Never rename one that is in use. */
  id: string;
  entity: ApprovalEntity;
  enabled: boolean;
  /** Text keys: what is approved, and why it is needed. */
  titleKey: string;
  whyKey: string;
  /** True when this particular change needs approval. `current` is undefined for a new item. */
  requires: (current: unknown, next: unknown) => boolean;
}

interface IRuleDefinition<K extends ApprovalEntity> {
  id: string;
  entity: K;
  enabled: boolean;
  requires: (current: IEntityByApprovalKey[K] | undefined, next: IEntityByApprovalKey[K]) => boolean;
}

const rule = <K extends ApprovalEntity>(definition: IRuleDefinition<K>): IApprovalRule => ({
  id: definition.id,
  entity: definition.entity,
  enabled: definition.enabled,
  titleKey: `approval.rule.${definition.id}.title`,
  whyKey: `approval.rule.${definition.id}.why`,
  requires: (current, next) => definition.requires(current as IEntityByApprovalKey[K] | undefined, next as IEntityByApprovalKey[K])
});

const exceedsBudget = (project: Project): boolean =>
  project.budgetAmount > 0 && (project.forecastAmount - project.budgetAmount) / project.budgetAmount > AppConfig.approvals.overBudgetRatio;

export const APPROVAL_RULES: IApprovalRule[] = [
  rule({
    id: 'idea.validate',
    entity: 'ideas',
    enabled: true,
    requires: (current, next) => next.status === IdeaStatus.VALIDATED && (!current || current.status !== IdeaStatus.VALIDATED)
  }),

  rule({
    id: 'project.overBudget',
    entity: 'projects',
    enabled: true,
    // Only the change that introduces or increases the excess needs approval, so editing other
    // fields of a project that was already approved over budget does not ask again.
    requires: (current, next) =>
      exceedsBudget(next) && (!current || !exceedsBudget(current) || next.forecastAmount > current.forecastAmount)
  }),

  rule({
    id: 'project.highBudgetStart',
    entity: 'projects',
    enabled: true,
    requires: (current, next) =>
      next.status === ProjectStatus.ACTIVE && (!current || current.status !== ProjectStatus.ACTIVE) && next.budgetAmount >= AppConfig.approvals.highBudget
  }),

  // Spending: a commitment (or payment) of at least AppConfig.approvals.highSpend, and a contract of that yearly value.
  rule({
    id: 'capex.commit',
    entity: 'capex',
    enabled: true,
    requires: (current, next) =>
      isCommitted(next.status) && (!current || !isCommitted(current.status)) && next.amount >= AppConfig.approvals.highSpend
  }),

  rule({
    id: 'opex.commit',
    entity: 'opex',
    enabled: true,
    // The yearly cost decides, so a small monthly fee that adds up over a year is covered too.
    requires: (current, next) =>
      isCommitted(next.status) && (!current || !isCommitted(current.status)) && opexAnnualAmount(next) >= AppConfig.approvals.highSpend
  }),

  rule({
    id: 'contract.activate',
    entity: 'contracts',
    enabled: true,
    requires: (current, next) =>
      next.status === ContractStatus.ACTIVE && (!current || current.status !== ContractStatus.ACTIVE) && next.annualValue >= AppConfig.approvals.highSpend
  }),

  // Change management: a risky or emergency change needs a recorded sign-off before it is approved.
  rule({
    id: 'change.approve',
    entity: 'changes',
    enabled: true,
    requires: (current, next) =>
      next.status === ChangeStatus.APPROVED && (!current || current.status !== ChangeStatus.APPROVED) &&
      (next.risk === RiskScale.HIGH || next.changeType === ChangeType.EMERGENCY)
  }),

  // Knowledge base: a policy binds people, so publishing one needs a recorded sign-off.
  rule({
    id: 'article.publishPolicy',
    entity: 'articles',
    enabled: true,
    requires: (current, next) =>
      next.status === ArticleStatus.PUBLISHED && (!current || current.status !== ArticleStatus.PUBLISHED) && next.category === ArticleCategory.POLICY
  }),

  // Off by default: an example of a rule that is switched on by changing `enabled` to true.
  rule({
    id: 'initiative.activate',
    entity: 'initiatives',
    enabled: false,
    requires: (current, next) => next.status === InitiativeStatus.ACTIVE && (!current || current.status !== InitiativeStatus.ACTIVE)
  })
];

export const EMPTY_APPROVAL: IApprovalState = {
  ruleId: '', status: ApprovalStatus.NONE, approver: '', requestedOn: '', decidedOn: '', decidedBy: '', comment: ''
};

export const getApproval = (item: { approval?: IApprovalState } | undefined): IApprovalState => (item && item.approval ? item.approval : EMPTY_APPROVAL);

export const findRule = (id: string, rules: IApprovalRule[] = APPROVAL_RULES): IApprovalRule | undefined => rules.filter(r => r.id === id)[0];

export interface IGateResult {
  /** Rules that this change triggers. */
  required: IApprovalRule[];
  /** The triggered rules that have no approval yet. Empty means the change may go ahead. */
  blockedBy: IApprovalRule[];
  /** True when the change may go ahead only because of an approval, which must then be consumed. */
  consumesApproval: boolean;
  /** True when approval is needed but the item does not exist yet, so none can be requested. */
  needsExistingItem: boolean;
}

/**
 * Decides whether a change may be saved. The change is allowed when every rule it triggers is
 * covered by an APPROVED approval for that same rule. Approval lives on an existing item, so a
 * new item that triggers a rule is blocked until it has been created in a state that does not.
 */
export const evaluateChange = <K extends ApprovalEntity>(
  entity: K,
  current: IEntityByApprovalKey[K] | undefined,
  next: IEntityByApprovalKey[K],
  rules: IApprovalRule[] = APPROVAL_RULES
): IGateResult => {
  const required = rules.filter(r => r.enabled && r.entity === entity && r.requires(current, next));
  if (required.length === 0) {
    return { required, blockedBy: [], consumesApproval: false, needsExistingItem: false };
  }

  if (!current) {
    return { required, blockedBy: required, consumesApproval: false, needsExistingItem: true };
  }

  const state = getApproval(current as { approval?: IApprovalState });
  const approved = state.status === ApprovalStatus.APPROVED;
  const blockedBy = required.filter(r => !(approved && state.ruleId === r.id));
  return { required, blockedBy, consumesApproval: blockedBy.length === 0, needsExistingItem: false };
};

/** A new pending request. It replaces whatever approval the item had. */
export const requestApproval = (ruleId: string, approver: string, now: Date = new Date()): IApprovalState => ({
  ruleId, status: ApprovalStatus.PENDING, approver: approver.trim(), requestedOn: toDayKey(now), decidedOn: '', decidedBy: '', comment: ''
});

export const decideApproval = (state: IApprovalState, status: ApprovalStatus.APPROVED | ApprovalStatus.REJECTED, decidedBy: string, comment: string, now: Date = new Date()): IApprovalState => ({
  ...state, status, decidedOn: toDayKey(now), decidedBy, comment: comment.trim()
});

export const isPending = (item: { approval?: IApprovalState }): boolean => getApproval(item).status === ApprovalStatus.PENDING;

/**
 * The same check for code that handles any kind of item without knowing which one it is
 * (the generic list screen). It trusts the caller to pass items of the given entity.
 */
export const evaluateAnyChange = (entity: ApprovalEntity, current: unknown, next: unknown, rules: IApprovalRule[] = APPROVAL_RULES): IGateResult =>
  evaluateChange(entity, current as IEntityByApprovalKey[ApprovalEntity] | undefined, next as IEntityByApprovalKey[ApprovalEntity], rules);
