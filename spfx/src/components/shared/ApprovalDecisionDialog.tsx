import * as React from 'react';
import { DefaultButton, Dialog, DialogFooter, DialogType, PrimaryButton, TextField } from '@fluentui/react';
import { useT } from '../../i18n/I18n';
import { ApprovalStatus } from '../../models';

export interface IApprovalDecisionDialogProps {
  /** What the user is deciding. Undefined keeps the dialog closed. */
  decision: ApprovalStatus.APPROVED | ApprovalStatus.REJECTED | undefined;
  title: string;
  onConfirm: (comment: string) => void;
  onCancel: () => void;
}

/** Asks for an optional comment before an approval is approved or rejected. */
const ApprovalDecisionDialog: React.FC<IApprovalDecisionDialogProps> = ({ decision, title, onConfirm, onCancel }) => {
  const t = useT();
  const [comment, setComment] = React.useState<string>('');

  // Start every decision with an empty comment.
  React.useEffect(() => {
    if (decision) {
      setComment('');
    }
  }, [decision]);

  const approving = decision === ApprovalStatus.APPROVED;

  return (
    <Dialog
      hidden={!decision}
      onDismiss={onCancel}
      dialogContentProps={{ type: DialogType.normal, title: approving ? t('approval.decisionApprove', { title }) : t('approval.decisionReject', { title }) }}
    >
      <TextField label={t('approval.comment')} multiline rows={3} value={comment} onChange={(_, v) => setComment(v ?? '')} />
      <DialogFooter>
        <PrimaryButton text={approving ? t('approval.approve') : t('approval.reject')} onClick={() => onConfirm(comment)} />
        <DefaultButton text={t('common.cancel')} onClick={onCancel} />
      </DialogFooter>
    </Dialog>
  );
};

export default ApprovalDecisionDialog;
