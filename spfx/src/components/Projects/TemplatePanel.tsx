import * as React from 'react';
import { DefaultButton, Dropdown, MessageBar, MessageBarType, Panel, PanelType, PrimaryButton, Stack, TextField } from '@fluentui/react';
import { AppConfig } from '../../config/AppConfig';
import { PROJECT_TEMPLATES } from '../../config/projectTemplates';
import { buildActionPayload, buildProjectPayload } from '../../entities/payloads';
import { useT } from '../../i18n/I18n';
import { toDayKey } from '../../rules/dates';
import { planFromTemplate } from '../../rules/projectTemplates';
import { hasErrors, validateProject } from '../../rules/validation';
import DateField from '../shared/DateField';
import { useHubData } from '../shared/HubData';
import UserField from '../shared/UserField';

export interface ITemplatePanelProps {
  isOpen: boolean;
  onDismiss: () => void;
}

/** Creates a project and its usual actions from a ready-made template, with dates counted from the start date. */
const TemplatePanel: React.FC<ITemplatePanelProps> = ({ isOpen, onDismiss }) => {
  const t = useT();
  const { service, userEmail, projects, actions } = useHubData();
  const [templateId, setTemplateId] = React.useState<string>(PROJECT_TEMPLATES[0].id);
  const [title, setTitle] = React.useState<string>('');
  const [startDay, setStartDay] = React.useState<string>(toDayKey(new Date()));
  const [owner, setOwner] = React.useState<string>(userEmail);
  const [busy, setBusy] = React.useState<boolean>(false);
  const [submitted, setSubmitted] = React.useState<boolean>(false);
  const [message, setMessage] = React.useState<{ type: MessageBarType; text: string } | undefined>();

  const template = PROJECT_TEMPLATES.filter(item => item.id === templateId)[0] ?? PROJECT_TEMPLATES[0];
  const plan = planFromTemplate(template, { title: title || t(`template.${template.id}.name`), ownerUpn: owner, startDay, translate: key => t(key) });
  const errors = submitted ? validateProject({ ...plan.project, title }) : {};

  React.useEffect(() => {
    if (isOpen) {
      setSubmitted(false);
      setMessage(undefined);
      setOwner(userEmail);
    }
  }, [isOpen, userEmail]);

  const create = async (): Promise<void> => {
    setSubmitted(true);
    setMessage(undefined);
    if (hasErrors(validateProject({ ...plan.project, title })) || !title.trim()) {
      return;
    }

    setBusy(true);
    let saved = 0;
    try {
      await service.createItem(AppConfig.sharePoint.listNames.projects, buildProjectPayload({ ...plan.project, title: title.trim() }));
      for (const action of plan.actions) {
        await service.createItem(AppConfig.sharePoint.listNames.actions, buildActionPayload(action));
        saved++;
      }
      setMessage({ type: MessageBarType.success, text: t('template.created', { title: title.trim(), count: plan.actions.length }) });
      setTitle('');
    } catch (err) {
      setMessage({ type: MessageBarType.error, text: t('template.partial', { done: saved, total: plan.actions.length, error: err instanceof Error ? err.message : t('common.unknownError') }) });
    } finally {
      setBusy(false);
      // One reload per list instead of one per action.
      await projects.reload().catch(() => undefined);
      await actions.reload().catch(() => undefined);
    }
  };

  return (
    <Panel isOpen={isOpen} onDismiss={onDismiss} type={PanelType.medium} closeButtonAriaLabel={t('common.close')} headerText={t('template.title')}>
      <Stack tokens={{ childrenGap: 12 }}>
        {message && <MessageBar messageBarType={message.type} onDismiss={() => setMessage(undefined)}>{message.text}</MessageBar>}
        <Dropdown
          label={t('template.choose')}
          selectedKey={templateId}
          options={PROJECT_TEMPLATES.map(item => ({ key: item.id, text: t(`template.${item.id}.name`) }))}
          onChange={(_, option) => option && setTemplateId(String(option.key))}
        />
        <span>{t(`template.${template.id}.description`)}</span>
        <TextField label={t('template.projectTitle')} required value={title} placeholder={t(`template.${template.id}.name`)} errorMessage={submitted && !title.trim() ? t('validation.titleRequired') : errors.title && t(errors.title)}
          onChange={(_, v) => setTitle(v ?? '')} />
        <DateField label={t('template.startDate')} value={startDay} onChange={setStartDay} />
        <UserField label={t('template.owner')} required service={service} value={owner} onChange={setOwner} />
        <span>{t('template.preview', { count: plan.actions.length, days: template.durationDays })}</span>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {plan.actions.map(action => <li key={action.actionId}>{action.dueDate} — {action.title}</li>)}
        </ul>
        <Stack horizontal tokens={{ childrenGap: 8 }}>
          <PrimaryButton text={t('template.create')} disabled={busy} onClick={() => { create().catch(() => undefined); }} />
          <DefaultButton text={t('common.close')} onClick={onDismiss} />
        </Stack>
      </Stack>
    </Panel>
  );
};

export default TemplatePanel;
