import * as React from 'react';
import { DefaultButton, MessageBar, MessageBarType, Panel, PanelType, PrimaryButton, Stack, TextField } from '@fluentui/react';
import { buildMatterPayload } from '../../entities/payloads';
import { useT } from '../../i18n/I18n';
import { Matter, MatterPriority, MatterSource, MatterStatus } from '../../models';
import { generateBusinessId } from '../../rules/ids';
import { statusForNewMatter } from '../../rules/matters';
import { toDayKey } from '../../rules/dates';
import { hasErrors, validateMatter } from '../../rules/validation';
import DateField from '../shared/DateField';
import { useHubData } from '../shared/HubData';
import LinkField from '../shared/LinkField';
import { useMatterLinkOptions } from '../shared/linkOptions';

const emptyMatter = (userEmail: string): Matter => ({
  matterId: generateBusinessId('ASU'), title: '', description: '', notes: '', status: MatterStatus.INBOX, priority: MatterPriority.MEDIUM, areaId: '', source: MatterSource.MANUAL,
  sourceRef: '', sender: '', receivedOn: toDayKey(new Date()), dueDate: '', closedOn: '', ownerUpn: userEmail, projectId: '', contractId: '', incidentId: '', vendorId: ''
});

/**
 * A button for the page header that opens a short form: title, area, due date and notes. With an
 * area the matter goes straight to the open ones; without, to the inbox to be classified later.
 */
const QuickAdd: React.FC = () => {
  const t = useT();
  const { userEmail, matters } = useHubData();
  const { areaOptions } = useMatterLinkOptions();
  const [isOpen, setIsOpen] = React.useState<boolean>(false);
  const [form, setForm] = React.useState<Matter>(() => emptyMatter(userEmail));
  const [submitted, setSubmitted] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | undefined>();
  const [done, setDone] = React.useState<string | undefined>();

  const open = (): void => {
    setForm(emptyMatter(userEmail));
    setSubmitted(false);
    setError(undefined);
    setDone(undefined);
    setIsOpen(true);
  };

  const candidate: Matter = { ...form, status: statusForNewMatter(form.areaId) };
  const errors = submitted ? validateMatter(candidate) : {};

  const save = async (): Promise<void> => {
    setSubmitted(true);
    setError(undefined);
    if (hasErrors(validateMatter(candidate))) {
      return;
    }
    try {
      await matters.create(buildMatterPayload(candidate));
      setDone(candidate.status === MatterStatus.INBOX ? t('quickAdd.toInbox') : t('quickAdd.toOpen'));
      setForm(emptyMatter(userEmail));
      setSubmitted(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.unknownError'));
    }
  };

  return (
    <>
      <DefaultButton text={t('quickAdd.button')} iconProps={{ iconName: 'Add' }} onClick={open} />
      <Panel isOpen={isOpen} onDismiss={() => setIsOpen(false)} type={PanelType.medium} closeButtonAriaLabel={t('common.close')} headerText={t('quickAdd.title')}>
        <Stack tokens={{ childrenGap: 12 }}>
          <span>{t('quickAdd.hint')}</span>
          {error && <MessageBar messageBarType={MessageBarType.error}>{error}</MessageBar>}
          {done && <MessageBar messageBarType={MessageBarType.success} onDismiss={() => setDone(undefined)}>{done}</MessageBar>}
          <TextField label={t('field.title')} required value={form.title} errorMessage={errors.title && t(errors.title)} onChange={(_, v) => setForm(p => ({ ...p, title: v ?? '' }))} />
          <LinkField label={t('quickAdd.area')} value={form.areaId} options={areaOptions} onChange={id => setForm(p => ({ ...p, areaId: id }))} />
          <DateField label={t('field.dueDate')} value={form.dueDate} errorMessage={errors.dueDate && t(errors.dueDate)} onChange={v => setForm(p => ({ ...p, dueDate: v }))} />
          <TextField label={t('field.notes')} multiline rows={4} value={form.notes} onChange={(_, v) => setForm(p => ({ ...p, notes: v ?? '' }))} />
          <Stack horizontal tokens={{ childrenGap: 8 }}>
            <PrimaryButton text={t('quickAdd.save')} onClick={() => { save().catch(() => undefined); }} />
            <DefaultButton text={t('common.close')} onClick={() => setIsOpen(false)} />
          </Stack>
        </Stack>
      </Panel>
    </>
  );
};

export default QuickAdd;
