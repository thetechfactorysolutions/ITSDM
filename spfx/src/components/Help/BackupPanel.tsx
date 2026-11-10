import * as React from 'react';
import { DefaultButton, MessageBar, MessageBarType, PrimaryButton, ProgressIndicator, Stack, Text } from '@fluentui/react';
import { IProgress, IRestoreResult, planFor, readEverything, restoreBackup } from '../../data/backupRestore';
import { useT } from '../../i18n/I18n';
import { IBackup, IRestoreRow, parseBackup } from '../../rules/backup';
import { toDayKey } from '../../rules/dates';
import { downloadTextFile } from '../../utils/download';
import { LIST_DEFS } from '../App/SetupBanner';
import { useHubData } from '../shared/HubData';

/** A complete copy of every list in one file, and putting it back in this or another site without losing anything. */
const BackupPanel: React.FC = () => {
  const t = useT();
  const { service, reloadAll } = useHubData();
  const [busy, setBusy] = React.useState<boolean>(false);
  const [progress, setProgress] = React.useState<IProgress | undefined>();
  const [message, setMessage] = React.useState<{ type: MessageBarType; text: string } | undefined>();
  const [backup, setBackup] = React.useState<IBackup | undefined>();
  const [plan, setPlan] = React.useState<IRestoreRow[] | undefined>();
  const [result, setResult] = React.useState<IRestoreResult | undefined>();

  const fail = (err: unknown): void => setMessage({ type: MessageBarType.error, text: err instanceof Error ? err.message : t('common.unknownError') });

  const download = async (): Promise<void> => {
    setBusy(true);
    setMessage(undefined);
    setResult(undefined);
    try {
      const read = await readEverything(service, LIST_DEFS, service.provisioner ? 'sharepoint' : 'local', setProgress);
      downloadTextFile(`itsdm-backup-${toDayKey(new Date())}.json`, JSON.stringify(read.backup, null, 1), 'application/json;charset=utf-8');
      const records = Object.keys(read.backup.lists).reduce((n, k) => n + read.backup.lists[k].items.length, 0);
      setMessage({ type: read.unreadable.length > 0 ? MessageBarType.warning : MessageBarType.success, text: t('backup.done', { records, lists: LIST_DEFS.length - read.unreadable.length, problems: read.unreadable.length }) });
    } catch (err) {
      fail(err);
    }
    setProgress(undefined);
    setBusy(false);
  };

  const choose = async (file: File | undefined): Promise<void> => {
    setMessage(undefined);
    setResult(undefined);
    setBackup(undefined);
    setPlan(undefined);
    if (!file) {
      return;
    }
    setBusy(true);
    try {
      const parsed = parseBackup(await file.text());
      if (!parsed.backup) {
        setMessage({ type: MessageBarType.error, text: t(parsed.errorKey ?? 'backup.errShape') });
      } else {
        setBackup(parsed.backup);
        setPlan(await planFor(service, parsed.backup, LIST_DEFS));
      }
    } catch (err) {
      fail(err);
    }
    setBusy(false);
  };

  const restore = async (): Promise<void> => {
    if (!backup) {
      return;
    }
    setBusy(true);
    setMessage(undefined);
    try {
      const outcome = await restoreBackup(service, backup, LIST_DEFS, setProgress);
      setResult(outcome);
      setPlan(await planFor(service, backup, LIST_DEFS));
      await reloadAll();
    } catch (err) {
      fail(err);
    }
    setProgress(undefined);
    setBusy(false);
  };

  const toRestore = plan ? plan.filter(r => r.action === 'restore') : [];
  const records = toRestore.reduce((n, r) => n + r.incoming, 0);
  const inSite = plan ? plan.reduce((n, r) => n + r.existing, 0) : 0;

  return (
    <Stack tokens={{ childrenGap: 8 }}>
      <Text>{t('backup.intro')}</Text>
      <Text variant="small">{t('backup.notIncluded')}</Text>
      <Stack horizontal wrap tokens={{ childrenGap: 8 }}>
        <DefaultButton text={t('backup.download')} iconProps={{ iconName: 'Download' }} disabled={busy} onClick={() => { download().catch(() => undefined); }} />
        <label style={{ display: 'inline-flex' }}>
          <DefaultButton
            text={t('backup.choose')}
            iconProps={{ iconName: 'Upload' }}
            disabled={busy}
            onClick={() => { const input = document.getElementById('backup-file') as HTMLInputElement | null; if (input) { input.value = ''; input.click(); } }}
          />
          <input id="backup-file" type="file" accept="application/json,.json" aria-label={t('backup.choose')} style={{ display: 'none' }} onChange={event => { choose(event.target.files ? event.target.files[0] : undefined).catch(() => undefined); }} />
        </label>
      </Stack>
      {progress && <ProgressIndicator label={progress.list} percentComplete={progress.total > 0 ? progress.done / progress.total : undefined} />}
      <div aria-live="polite">
        {message && <MessageBar messageBarType={message.type} onDismiss={() => setMessage(undefined)}>{message.text}</MessageBar>}
        {plan && !result && (
          <Stack tokens={{ childrenGap: 6 }}>
            <MessageBar messageBarType={toRestore.length > 0 ? MessageBarType.info : MessageBarType.warning}>
              {toRestore.length > 0 ? t('backup.plan', { records, lists: toRestore.length }) : t('backup.planNothing')}
            </MessageBar>
            {inSite > 0 && <Text variant="small">{t('backup.planFilled')}</Text>}
            <table style={{ borderCollapse: 'collapse', fontSize: 13 }} aria-label={t('backup.planTable')}>
              <thead><tr><th align="left">{t('backup.colList')}</th><th align="right">{t('backup.colFile')}</th><th align="right">{t('backup.colSite')}</th><th align="left">{t('backup.colAction')}</th></tr></thead>
              <tbody>
                {plan.filter(r => r.incoming > 0 || r.existing > 0).map(r => (
                  <tr key={r.title}>
                    <td style={{ paddingRight: 16 }}>{r.title}</td>
                    <td align="right" style={{ paddingRight: 16 }}>{r.incoming}</td>
                    <td align="right" style={{ paddingRight: 16 }}>{r.existing}</td>
                    <td>{t(`backup.action.${r.action}`)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Stack horizontal><PrimaryButton text={t('backup.restore', { records })} disabled={busy || toRestore.length === 0} onClick={() => { restore().catch(() => undefined); }} /></Stack>
          </Stack>
        )}
        {result && (
          <>
            <MessageBar messageBarType={result.failed.length > 0 ? MessageBarType.warning : MessageBarType.success}>
              {t('backup.restored', { records: Object.keys(result.created).reduce((n, k) => n + result.created[k], 0), lists: Object.keys(result.created).filter(k => result.created[k] > 0).length, dropped: result.dropped, failed: result.failed.length })}
            </MessageBar>
            {result.failed.map((f, i) => <MessageBar key={i} messageBarType={MessageBarType.error}>{f.list ? `${f.list}: ` : ''}{f.error}</MessageBar>)}
          </>
        )}
      </div>
    </Stack>
  );
};

export default BackupPanel;
