import { TranslateFn } from '../i18n/I18n';

export interface IApprovalMessageParams {
  /** Translated name of the kind of item, e.g. "Project". */
  entityLabel: string;
  title: string;
  businessId: string;
  ruleTitle: string;
  ruleWhy: string;
  requester: string;
  approver: string;
  /** Page where the item can be opened. */
  pageUrl: string;
}

export interface IApprovalMessage {
  subject: string;
  body: string;
  /** Opens the user's mail program with the message ready to send. */
  mailto: string;
  /** Opens a Teams chat with the approver with the message ready to send. */
  teams: string;
}

/**
 * Drafts the request the user sends to the approver. The app sends nothing itself: it builds a
 * mail link and a Teams link, and the user presses send.
 */
export const buildApprovalMessage = (t: TranslateFn, params: IApprovalMessageParams): IApprovalMessage => {
  const values = {
    entity: params.entityLabel, title: params.title, id: params.businessId, rule: params.ruleTitle, why: params.ruleWhy,
    requester: params.requester, url: params.pageUrl
  };
  const subject = t('approval.message.subject', values);
  const body = t('approval.message.body', values).split('\n').join('\r\n');
  const approver = params.approver.trim();

  return {
    subject,
    body,
    mailto: `mailto:${encodeURIComponent(approver)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    teams: `https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(approver)}&message=${encodeURIComponent(`${subject}\n\n${body}`)}`
  };
};
