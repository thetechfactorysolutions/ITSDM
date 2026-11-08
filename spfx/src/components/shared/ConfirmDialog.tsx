import * as React from 'react';
import { DefaultButton, Dialog, DialogFooter, DialogType, PrimaryButton } from '@fluentui/react';
import { useT } from '../../i18n/I18n';

export interface IConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Asks before something that cannot be undone, such as deleting an item. */
const ConfirmDialog: React.FC<IConfirmDialogProps> = ({ isOpen, title, message, confirmText, onConfirm, onCancel }) => {
  const t = useT();

  return (
    <Dialog
      hidden={!isOpen}
      onDismiss={onCancel}
      dialogContentProps={{ type: DialogType.normal, title, subText: message }}
    >
      <DialogFooter>
        <PrimaryButton text={confirmText} onClick={onConfirm} />
        <DefaultButton text={t('common.cancel')} onClick={onCancel} />
      </DialogFooter>
    </Dialog>
  );
};

export default ConfirmDialog;
