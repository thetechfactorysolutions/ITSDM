import * as React from 'react';
import { DefaultButton, MessageBar, MessageBarType, PrimaryButton, Stack, Text } from '@fluentui/react';
import { useT } from '../../i18n/I18n';
import { ApprovalStatus, IApprovalState } from '../../models';
import { buildApprovalMessage } from '../../rules/approvalMessage';
import { ApprovalEntity, findRule, IApprovalRule, IGateResult } from '../../rules/approvals';
import { IDataStore } from '../../data/IDataStore';
import ApprovalDecisionDialog from './ApprovalDecisionDialog';
import { DetailFields } from './DetailSection';
import UserField from './UserField';

const LAST_APPROVER_KEY = 'itsdm.lastApprover';

const readLastApprover = (): string => {
  try {
    return window.localStorage.getItem(LAST_APPROVER_KEY) ?? '';
  } catch {
    return '';
  }
};

const rememberApprover = (email: string): void => {
  try {
    window.localStorage.setItem(LAST_APPROVER_KEY, email);
  } catch {
    // Remembering the approver is a convenience only.
  }
};

export interface IApprovalSectionProps {
  entity: ApprovalEntity;
  title: string;
  businessId: string;
  /** Approval stored on the item. */
  approval: IApprovalState;
  /** Set when the last save was blocked by a rule. */
  gate?: IGateResult;
  service: IDataStore;
  userEmail: string;
  onRequest: (ruleId: string, approver: string) => Promise<void>;
  onDecide: (status: ApprovalStatus.APPROVED | ApprovalStatus.REJECTED, comment: string) => Promise<void>;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Everything about the approval of the item being edited: why the change is blocked, who to ask,
 * the ready-made email and Teams message, and the decision once it is known.
 */
const ApprovalSection: React.FC<IApprovalSectionProps> = ({ entity, title, businessId, approval, gate, service, userEmail, onRequest, onDecide }) => {
  const t = useT();
  const [approver, setApprover] = React.useState<string>(approval.approver || readLastApprover());
  const [approverError, setApproverError] = React.useState<string | undefined>();
  const [error, setError] = React.useState<string | undefined>();
  const [requestedFor, setRequestedFor] = React.useState<string | undefined>();
  const [busy, setBusy] = React.useState<boolean>(false);
  const [decision, setDecision] = React.useState<ApprovalStatus.APPROVED | ApprovalStatus.REJECTED | undefined>();

  const blockingRule = gate && gate.blockedBy.length > 0 ? gate.blockedBy[0] : undefined;
  const ruleOf = (id: string): IApprovalRule | undefined => findRule(id);
  const ruleTitle = (id: string): string => { const r = ruleOf(id); return r ? t(r.titleKey) : id; };

  const sameRule = !!blockingRule && approval.ruleId === blockingRule.id;
  const waiting = sameRule && approval.status === ApprovalStatus.PENDING;
  const rejected = sameRule && approval.status === ApprovalStatus.REJECTED;
  const canRequest = !!blockingRule && !gate?.needsExistingItem && !waiting;

  const messageFor = (ruleId: string, to: string): { mailto: string; teams: string } => {
    const rule = ruleOf(ruleId);
    return buildApprovalMessage(t, {
      entityLabel: t(`approval.entity.${entity}`), title, businessId, ruleTitle: rule ? t(rule.titleKey) : ruleId, ruleWhy: rule ? t(rule.whyKey) : '',
      requester: userEmail, approver: to, pageUrl: window.location.href.split('#')[0]
    });
  };

  const request = async (): Promise<void> => {
    if (!blockingRule) {
      return;
    }
    if (!EMAIL.test(approver.trim())) {
      setApproverError(t('approval.approverRequired'));
      return;
    }
    setApproverError(undefined);
    setError(undefined);
    setBusy(true);
    try {
      await onRequest(blockingRule.id, approver.trim());
      rememberApprover(approver.trim());
      setRequestedFor(blockingRule.id);
    } catch (err) {
      setError(t('approval.requestFailed', { reason: err instanceof Error ? err.message : t('common.unknownError') }));
    }
    setBusy(false);
  };

  const decide = async (comment: string): Promise<void> => {
    const chosen = decision;
    setDecision(undefined);
    if (!chosen) {
      return;
    }
    setError(undefined);
    try {
      await onDecide(chosen, comment);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.unknownError'));
    }
  };

  const links = (ruleId: string, to: string): React.ReactNode => {
    const message = messageFor(ruleId, to);
    return (
      <Stack horizontal wrap tokens={{ childrenGap: 8 }}>
        <DefaultButton text={t('approval.openEmail')} iconProps={{ iconName: 'Mail' }} href={message.mailto} />
        <DefaultButton text={t('approval.openTeams')} iconProps={{ iconName: 'TeamsLogo' }} href={message.teams} target="_blank" rel="noopener noreferrer" />
      </Stack>
    );
  };

  const hasState = approval.status !== ApprovalStatus.NONE;
  if (!hasState && !blockingRule) {
    return null;
  }

  return (
    <Stack tokens={{ childrenGap: 10 }} styles={{ root: { borderTop: '1px solid #c8c6c4', paddingTop: 12 } }} aria-live="polite">
      <Text variant="large" as="h3">{t('approval.section')}</Text>

      {blockingRule && gate?.needsExistingItem && (
        <MessageBar messageBarType={MessageBarType.warning}>{t('approval.createFirst', { rule: t(blockingRule.titleKey) })}</MessageBar>
      )}
      {blockingRule && !gate?.needsExistingItem && waiting && (
        <MessageBar messageBarType={MessageBarType.warning}>{t('approval.pendingBlocked', { approver: approval.approver, rule: t(blockingRule.titleKey) })}</MessageBar>
      )}
      {blockingRule && !gate?.needsExistingItem && rejected && (
        <MessageBar messageBarType={MessageBarType.error}>{t('approval.rejectedBlocked', { by: approval.decidedBy || approval.approver, rule: t(blockingRule.titleKey) })}</MessageBar>
      )}
      {blockingRule && !gate?.needsExistingItem && !waiting && !rejected && (
        <MessageBar messageBarType={MessageBarType.warning}>{t('approval.needed', { rule: t(blockingRule.titleKey), why: t(blockingRule.whyKey) })}</MessageBar>
      )}

      {canRequest && !requestedFor && (
        <Stack tokens={{ childrenGap: 8 }}>
          <UserField label={t('approval.approver')} required service={service} value={approver} errorMessage={approverError} onChange={setApprover} />
          <Stack horizontal><PrimaryButton text={t('approval.request')} disabled={busy} onClick={() => { request().catch(() => undefined); }} /></Stack>
        </Stack>
      )}

      {requestedFor && (
        <Stack tokens={{ childrenGap: 8 }}>
          <MessageBar messageBarType={MessageBarType.success}>{t('approval.requested', { approver })}</MessageBar>
          {links(requestedFor, approver)}
        </Stack>
      )}

      {error && <MessageBar messageBarType={MessageBarType.error} onDismiss={() => setError(undefined)}>{error}</MessageBar>}

      {hasState && (
        <>
          <DetailFields rows={[
            { label: t('approval.field.rule'), value: ruleTitle(approval.ruleId) },
            { label: t('approval.field.status'), value: t(`approval.status.${approval.status}`) },
            { label: t('approval.field.approver'), value: approval.approver },
            { label: t('approval.field.requestedOn'), value: approval.requestedOn },
            { label: t('approval.field.decidedBy'), value: approval.decidedBy },
            { label: t('approval.field.decidedOn'), value: approval.decidedOn },
            { label: t('approval.field.comment'), value: approval.comment }
          ]} />
          {approval.status === ApprovalStatus.PENDING && (
            <Stack horizontal wrap tokens={{ childrenGap: 8 }}>
              <PrimaryButton text={t('approval.approve')} iconProps={{ iconName: 'CheckMark' }} onClick={() => setDecision(ApprovalStatus.APPROVED)} />
              <DefaultButton text={t('approval.reject')} iconProps={{ iconName: 'Cancel' }} onClick={() => setDecision(ApprovalStatus.REJECTED)} />
              {approval.approver && EMAIL.test(approval.approver) && !requestedFor && links(approval.ruleId, approval.approver)}
            </Stack>
          )}
        </>
      )}

      <ApprovalDecisionDialog decision={decision} title={title} onConfirm={comment => { decide(comment).catch(() => undefined); }} onCancel={() => setDecision(undefined)} />
    </Stack>
  );
};

export default ApprovalSection;
