import * as React from 'react';
import { DefaultButton, MessageBar, MessageBarType, ProgressIndicator, Stack } from '@fluentui/react';
import { useT } from '../../i18n/I18n';
import { IListDef } from '../../provisioning/fieldXml';
import { ensureLists, findMissingLists, IEnsureResult } from '../../provisioning/provision';
import listSchema from '../../provisioning/listSchema.json';
import { useHubData } from '../shared/HubData';

export const LIST_DEFS = listSchema as unknown as IListDef[];

/**
 * Shown when the site is missing some of the lists. One button creates them (keeping everything
 * that exists) and reloads the data. Only on stores that can create lists, i.e. SharePoint.
 */
const SetupBanner: React.FC = () => {
  const t = useT();
  const { service, reloadAll } = useHubData();
  const provisioner = service.provisioner;
  const [missing, setMissing] = React.useState<string[]>([]);
  const [progress, setProgress] = React.useState<{ done: number; total: number } | undefined>();
  const [result, setResult] = React.useState<IEnsureResult | undefined>();
  const aliveRef = React.useRef<boolean>(true);
  React.useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  React.useEffect(() => {
    if (!provisioner) {
      return;
    }
    provisioner.getListTitles()
      .then(titles => { if (aliveRef.current) { setMissing(findMissingLists(LIST_DEFS, titles).map(def => def.title)); } })
      // Not being able to read the lists is no reason to bother the person; the screens say what failed.
      .catch(() => undefined);
  }, [provisioner]);

  if (!provisioner || (missing.length === 0 && !result)) {
    return null;
  }

  const run = async (): Promise<void> => {
    setResult(undefined);
    setProgress({ done: 0, total: missing.length });
    const outcome = await ensureLists(provisioner, LIST_DEFS, {
      onlyMissing: true,
      onProgress: p => { if (aliveRef.current) { setProgress({ done: p.done, total: p.total }); } }
    });
    if (!aliveRef.current) {
      return;
    }
    setProgress(undefined);
    setResult(outcome);
    setMissing(outcome.failed.map(f => f.list));
    await reloadAll();
  };

  return (
    <Stack tokens={{ childrenGap: 6 }} aria-live="polite">
      {missing.length > 0 && !progress && (
        <MessageBar
          messageBarType={MessageBarType.warning}
          isMultiline
          actions={<DefaultButton text={t('setup.create')} onClick={() => { run().catch(() => undefined); }} />}
        >
          <strong>{t('setup.title')}</strong> {t('setup.message', { count: missing.length, names: missing.slice(0, 6).join(', ') + (missing.length > 6 ? '…' : '') })}
        </MessageBar>
      )}
      {progress && <ProgressIndicator label={t('setup.creating', { done: progress.done, total: progress.total })} percentComplete={progress.total === 0 ? 1 : progress.done / progress.total} />}
      {result && result.created.length > 0 && <MessageBar messageBarType={MessageBarType.success} onDismiss={() => setResult(undefined)}>{t('setup.done', { count: result.created.length })}</MessageBar>}
      {result && result.failed.map(f => <MessageBar key={f.list} messageBarType={MessageBarType.error}>{t('setup.failed', { list: f.list, error: f.error })}</MessageBar>)}
    </Stack>
  );
};

export default SetupBanner;
