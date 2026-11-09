import * as React from 'react';
import { DefaultButton, Link, MessageBar, MessageBarType, Stack, Text } from '@fluentui/react';
import { AppConfig } from '../../config/AppConfig';
import { useT } from '../../i18n/I18n';
import { useHubData } from '../shared/HubData';

const Section: React.FC<{ title: string; children?: React.ReactNode }> = ({ title, children }) => (
  <Stack tokens={{ childrenGap: 4 }}>
    <Text variant="large" as="h3">{title}</Text>
    {children}
  </Stack>
);

const VERSIONED_LISTS: Array<keyof typeof AppConfig.sharePoint.listNames> = ['ideas', 'initiatives', 'projects', 'actions', 'meetings', 'notes'];

const Help: React.FC = () => {
  const t = useT();
  const { service } = useHubData();
  const lists = AppConfig.sharePoint.listNames;
  const [versioning, setVersioning] = React.useState<Array<{ list: string; error?: string }> | undefined>();
  const [busy, setBusy] = React.useState<boolean>(false);
  const [attachments, setAttachments] = React.useState<Array<{ list: string; error?: string }> | undefined>();

  const enableHistory = async (): Promise<void> => {
    setBusy(true);
    const outcome: Array<{ list: string; error?: string }> = [];
    for (const key of VERSIONED_LISTS) {
      const name = lists[key];
      try {
        if (service.enableVersioning) {
          await service.enableVersioning(name);
        }
        outcome.push({ list: name });
      } catch (err) {
        outcome.push({ list: name, error: err instanceof Error ? err.message : t('common.unknownError') });
      }
    }
    setVersioning(outcome);
    setBusy(false);
  };

  const enableAttachments = async (): Promise<void> => {
    setBusy(true);
    const outcome: Array<{ list: string; error?: string }> = [];
    for (const key of Object.keys(lists) as Array<keyof typeof lists>) {
      try {
        if (service.enableAttachments) {
          await service.enableAttachments(lists[key]);
        }
        outcome.push({ list: lists[key] });
      } catch (err) {
        outcome.push({ list: lists[key], error: err instanceof Error ? err.message : t('common.unknownError') });
      }
    }
    setAttachments(outcome);
    setBusy(false);
  };

  return (
    <Stack tokens={{ childrenGap: 16 }}>
      <Text variant="xLarge" as="h2">{t('help.title')}</Text>

      <Section title={t('help.flowTitle')}><Text>{t('help.flow')}</Text></Section>
      <Section title={t('help.dashboardTitle')}>
        <Text>{t('help.dashboard1')}</Text>
        <Text>{t('help.dashboard2')}</Text>
        <Text>{t('help.dashboard3')}</Text>
      </Section>
      <Section title={t('help.tablesTitle')}>
        <Text>{t('help.tables1')}</Text>
        <Text>{t('help.tables2')}</Text>
        <Text>{t('help.tables3')}</Text>
      </Section>
      <Section title={t('help.ideasTitle')}>
        <Text>{t('help.ideas1')}</Text>
        <Text>{t('help.ideas2')}</Text>
      </Section>
      <Section title={t('help.importTitle')}>
        <Text>{t('help.import1')}</Text>
        <Text>{t('help.import2')}</Text>
        <Text>{t('help.import3')}</Text>
      </Section>
      <Section title={t('help.approvalsTitle')}>
        <Text>{t('help.approvals1')}</Text>
        <Text>{t('help.approvals2')}</Text>
        <Text>{t('help.approvals3')}</Text>
      </Section>
      <Section title={t('help.operationsTitle')}>
        <Text>{t('help.operations1')}</Text>
        <Text>{t('help.operations2')}</Text>
      </Section>
      <Section title={t('help.serviceTitle')}>
        <Text>{t('help.service1')}</Text>
        <Text>{t('help.service2')}</Text>
      </Section>
      <Section title={t('help.stockTitle')}>
        <Text>{t('help.stock1')}</Text>
        <Text>{t('help.stock2')}</Text>
      </Section>
      <Section title={t('help.peopleTitle')}>
        <Text>{t('help.people1')}</Text>
        <Text>{t('help.people2')}</Text>
      </Section>
      <Section title={t('help.mattersTitle')}>
        <Text>{t('help.matters1')}</Text>
        <Text>{t('help.matters2')}</Text>
      </Section>
      <Section title={t('help.linksTitle')}>
        <Text>{t('help.links1')}</Text>
        <Text>{t('help.links2')}</Text>
      </Section>
      <Section title={t('help.templatesTitle')}><Text>{t('help.templates1')}</Text></Section>
      <Section title={t('help.financeTitle')}>
        <Text>{t('help.finance1')}</Text>
        <Text>{t('help.finance2')}</Text>
      </Section>
      <Section title={t('help.governanceTitle')}>
        <Text>{t('help.governance1')}</Text>
        <Text>{t('help.governance2')}</Text>
      </Section>
      <Section title={t('help.notesTitle')}><Text>{t('help.notes1')}</Text></Section>
      <Section title={t('help.formsTitle')}>
        <Text>{t('help.forms1')}</Text>
        <Text>{t('help.forms2')}</Text>
      </Section>
      <Section title={t('help.dataTitle')}>
        <Text>{t('help.data1')}</Text>
        <Text>{lists.ideas} · {lists.initiatives} · {lists.projects} · {lists.actions} · {lists.notes} · {lists.meetings}</Text>
        <Text>{t('help.data2')}{' '}
          <Link href="https://github.com/thetechfactorysolutions/ITSDM" target="_blank" rel="noopener noreferrer">GitHub</Link>
        </Text>
      </Section>
      {service.capabilities.attachments && <Section title={t('help.attachmentsTitle')}>
        <Text>{t('help.attachments1')}</Text>
        <Stack horizontal><DefaultButton text={t('help.attachmentsButton')} disabled={busy} onClick={() => { enableAttachments().catch(() => undefined); }} /></Stack>
        <div aria-live="polite">
          {attachments && attachments.map(row => (
            <MessageBar key={row.list} messageBarType={row.error ? MessageBarType.error : MessageBarType.success}>
              {row.list}: {row.error ? row.error : t('help.attachmentsEnabled')}
            </MessageBar>
          ))}
        </div>
      </Section>}
      {service.capabilities.versioning && <Section title={t('help.historyTitle')}>
        <Text>{t('help.history1')}</Text>
        <Stack horizontal><DefaultButton text={t('help.historyButton')} disabled={busy} onClick={() => { enableHistory().catch(() => undefined); }} /></Stack>
        <div aria-live="polite">
          {versioning && versioning.map(row => (
            <MessageBar key={row.list} messageBarType={row.error ? MessageBarType.error : MessageBarType.success}>
              {row.list}: {row.error ? row.error : t('help.historyEnabled')}
            </MessageBar>
          ))}
        </div>
      </Section>}
      <Section title={t('help.languageTitle')}><Text>{t('help.language1')}</Text></Section>
    </Stack>
  );
};

export default Help;
