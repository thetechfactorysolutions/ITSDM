import * as React from 'react';
import { DefaultButton, getTheme, MessageBar, MessageBarType, PrimaryButton, Stack, Text, TextField } from '@fluentui/react';
import { SOURCES } from '../../config/navMap';
import { AppConfig } from '../../config/AppConfig';
import { useLanguage, useT } from '../../i18n/I18n';
import { buildDigest, digestText, IDigestSource, isWebhookUrl, mailtoLink, webhookPayload } from '../../rules/digest';
import { readField } from '../../rules/insights';
import { useHubData } from '../shared/HubData';
import { useNav } from '../shared/Nav';
import { readMemory, writeMemory } from '../shared/viewMemory';
import { Card, ModuleHeader, Pill } from '../shared/ui';
import { identityForTab } from '../../config/identity';

const WEBHOOK_KEY = 'webhook';

/**
 * What needs attention, gathered from every list: late, due today and due this week. Read it here, send
 * it to yourself by email, or post it to a Power Automate flow (which can put it in Teams or mail it every
 * morning). Nothing is sent unless a button is pressed.
 */
const Alerts: React.FC = () => {
  const t = useT();
  const language = useLanguage();
  const theme = getTheme();
  const nav = useNav();
  const hub = useHubData();
  const [webhook, setWebhook] = React.useState<string>(() => readMemory<string>(WEBHOOK_KEY) ?? '');
  const [message, setMessage] = React.useState<{ type: MessageBarType; text: string } | undefined>();
  const now = new Date();

  const sources: IDigestSource[] = SOURCES.map(source => {
    const state = hub[source.hub] as unknown as { items: unknown[] } | undefined;
    return {
      key: String(source.hub),
      title: t(source.kind),
      tab: source.tab,
      items: state ? state.items : [],
      getStatus: item => readField(item, 'status'),
      getTitle: item => readField(item, 'title')
    };
  });
  const digest = buildDigest(sources, now);
  const dateLabel = now.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const text = digestText(digest, { title: t('alerts.mailSubject'), late: t('alerts.late'), today: t('alerts.today'), soon: t('alerts.soon'), none: t('alerts.none') }, dateLabel);
  const total = digest.totals.late + digest.totals.today + digest.totals.soon;

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setMessage({ type: MessageBarType.success, text: t('alerts.copied') });
    } catch {
      setMessage({ type: MessageBarType.warning, text: t('alerts.copyFailed') });
    }
  };

  const send = async (): Promise<void> => {
    if (!isWebhookUrl(webhook)) {
      setMessage({ type: MessageBarType.error, text: t('alerts.errUrl') });
      return;
    }
    try {
      // the flow answers without the permission headers a page needs to read it, so the answer cannot be read: "sent" is all that is known
      await fetch(webhook.trim(), { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(webhookPayload(digest, text, hub.userEmail, now)) });
      setMessage({ type: MessageBarType.success, text: t('alerts.sent') });
    } catch (err) {
      setMessage({ type: MessageBarType.error, text: err instanceof Error ? err.message : t('common.unknownError') });
    }
  };

  const keepWebhook = (value: string): void => { setWebhook(value); writeMemory(WEBHOOK_KEY, value.trim()); };

  const listNames = AppConfig.sharePoint.listNames as unknown as Record<string, string>;
  const sourceOf = (key: string): { listName: string } | undefined => {
    const found = SOURCES.filter(s => String(s.hub) === key)[0];
    return found ? { listName: listNames[found.listName as string] } : undefined;
  };

  return (
    <Stack tokens={{ childrenGap: 16 }}>
      <ModuleHeader identity={identityForTab('alerts')} title={t('alerts.title')} subtitle={total === 0 ? t('alerts.none') : t('alerts.summary', { late: digest.totals.late, today: digest.totals.today, soon: digest.totals.soon })} />

      <Stack horizontal wrap tokens={{ childrenGap: 8 }}>
        <PrimaryButton text={t('alerts.email')} iconProps={{ iconName: 'Mail' }} disabled={total === 0} href={mailtoLink(hub.userEmail, `${t('alerts.mailSubject')} · ${dateLabel}`, text)} />
        <DefaultButton text={t('alerts.copy')} iconProps={{ iconName: 'Copy' }} disabled={total === 0} onClick={() => { copy().catch(() => undefined); }} />
      </Stack>
      <div aria-live="polite">{message && <MessageBar messageBarType={message.type} onDismiss={() => setMessage(undefined)}>{message.text}</MessageBar>}</div>

      {digest.sections.map(section => (
        <Card key={section.key} title={`${section.title} · ${section.late.length + section.today.length + section.soon.length}`}>
          <Stack tokens={{ childrenGap: 6 }}>
            {([['late', section.late, 'danger', '🔥'], ['today', section.today, 'warning', '⏰'], ['soon', section.soon, 'info', '📅']] as const).map(([kind, entries, tone, emoji]) =>
              entries.map((e, i) => (
                <button
                  key={`${kind}-${i}`}
                  type="button"
                  onClick={() => { const src = sourceOf(section.key); nav.goTo(section.tab, src ? { listName: src.listName, search: e.title } : undefined); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', border: `1px solid ${theme.palette.neutralLighter}`, background: theme.palette.neutralLighterAlt, color: theme.palette.neutralPrimary, borderRadius: 8, padding: '6px 10px', cursor: 'pointer', font: 'inherit' }}
                >
                  <Pill tone={tone} emoji={emoji}>{t(`alerts.${kind}`)}</Pill>
                  <span style={{ flex: 1 }}>{e.title}</span>
                  <span style={{ color: theme.palette.neutralSecondary, fontSize: 12 }}>{e.due}{e.owner ? ` · ${e.owner}` : ''}</span>
                </button>
              ))
            )}
          </Stack>
        </Card>
      ))}

      <Card title={t('alerts.flowTitle')}>
        <Stack tokens={{ childrenGap: 8 }}>
          <Text>{t('alerts.flowIntro')}</Text>
          <ol style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 4 }}>
            <li>{t('alerts.flow1')}</li>
            <li>{t('alerts.flow2')}</li>
            <li>{t('alerts.flow3')}</li>
            <li>{t('alerts.flow4')}</li>
          </ol>
          <TextField label={t('alerts.webhook')} value={webhook} placeholder="https://prod-…logic.azure.com/workflows/…" onChange={(_, value) => keepWebhook(value ?? '')} />
          <Stack horizontal><DefaultButton text={t('alerts.send')} iconProps={{ iconName: 'Send' }} onClick={() => { send().catch(() => undefined); }} /></Stack>
          <Text variant="small">{t('alerts.flowFilters')}</Text>
          <pre style={{ margin: 0, padding: 10, borderRadius: 8, background: theme.palette.neutralLighter, overflowX: 'auto', fontSize: 12 }}>{`IT_04_Actions     DueDate lt '@{utcNow('yyyy-MM-dd')}' and Status ne 'DONE' and Status ne 'CANCELLED'
IT_10_Contracts   EndDate le '@{addDays(utcNow(),60,'yyyy-MM-dd')}' and Status eq 'ACTIVE'
IT_36_Purchases   Status eq 'REQUESTED'`}</pre>
        </Stack>
      </Card>
    </Stack>
  );
};

export default Alerts;
