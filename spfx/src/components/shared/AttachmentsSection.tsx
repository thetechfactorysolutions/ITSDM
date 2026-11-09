import * as React from 'react';
import { DefaultButton, IconButton, Link, MessageBar, MessageBarType, Spinner, Stack, Text } from '@fluentui/react';
import { IAttachment, IDataStore } from '../../data/IDataStore';
import { useT } from '../../i18n/I18n';

/** Largest file accepted from the page. SharePoint itself allows far more, but a big upload from a browser tab is slow and fragile. */
export const MAX_ATTACHMENT_MB = 25;

export interface IAttachmentsSectionProps {
  service: IDataStore;
  listName: string;
  /** SharePoint id of the item. Without it the item is not saved yet. */
  itemId: number | undefined;
}

const toMessage = (err: unknown, fallback: string): string => (err instanceof Error ? err.message : fallback);

/** Reads a file into memory. FileReader is used instead of Blob.arrayBuffer() so older browsers and the test DOM work. */
const readFile = (file: File): Promise<ArrayBuffer> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result as ArrayBuffer);
  reader.onerror = () => reject(reader.error ?? new Error('The file could not be read.'));
  reader.readAsArrayBuffer(file);
});

/** Looks like the error SharePoint gives for a list without attachments. */
const looksLikeAttachmentsOff = (message: string): boolean => /attachment/i.test(message) && /(not|disabled|enabled|allowed)/i.test(message);

/**
 * Files attached to one item: list, open, add and remove. Only shown when the store supports
 * attachments, so the local mode and the tests without them are unaffected.
 */
const AttachmentsSection: React.FC<IAttachmentsSectionProps> = ({ service, listName, itemId }) => {
  const t = useT();
  const [files, setFiles] = React.useState<IAttachment[]>([]);
  const [busy, setBusy] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | undefined>();
  const [off, setOff] = React.useState<boolean>(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const aliveRef = React.useRef<boolean>(true);
  React.useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  const load = React.useCallback(async (): Promise<void> => {
    if (itemId === undefined || !service.listAttachments) {
      setFiles([]);
      return;
    }
    try {
      const found = await service.listAttachments(listName, itemId);
      if (aliveRef.current) {
        setFiles(found);
      }
    } catch (err) {
      if (aliveRef.current) {
        setError(toMessage(err, t('common.unknownError')));
      }
    }
  }, [service, listName, itemId, t]);

  React.useEffect(() => {
    setError(undefined);
    setOff(false);
    load().catch(() => undefined);
  }, [load]);

  const run = async (work: () => Promise<void>): Promise<void> => {
    setBusy(true);
    setError(undefined);
    try {
      await work();
      await load();
    } catch (err) {
      const message = toMessage(err, t('common.unknownError'));
      if (aliveRef.current) {
        setError(message);
        setOff(looksLikeAttachmentsOff(message));
      }
    } finally {
      if (aliveRef.current) {
        setBusy(false);
      }
    }
  };

  const onPick = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file || itemId === undefined || !service.addAttachment) {
      return;
    }
    if (file.size > MAX_ATTACHMENT_MB * 1024 * 1024) {
      setError(t('attachments.tooBig', { mb: MAX_ATTACHMENT_MB }));
      return;
    }
    const add = service.addAttachment.bind(service);
    run(async () => {
      const content = await readFile(file);
      await add(listName, itemId, file.name, content);
    }).catch(() => undefined);
  };

  const remove = (file: IAttachment): void => {
    const del = service.deleteAttachment;
    if (itemId === undefined || !del) {
      return;
    }
    run(() => del.call(service, listName, itemId, file.fileName)).catch(() => undefined);
  };

  const enable = (): void => {
    const turnOn = service.enableAttachments;
    if (!turnOn) {
      return;
    }
    run(() => turnOn.call(service, listName)).then(() => setOff(false)).catch(() => undefined);
  };

  return (
    <Stack tokens={{ childrenGap: 6 }} role="group" aria-label={t('attachments.title')}>
      <Text variant="mediumPlus" as="h3">{t('attachments.title')}</Text>

      {itemId === undefined && <Text>{t('attachments.saveFirst')}</Text>}

      {itemId !== undefined && (
        <>
          {files.length === 0 && !busy && !error && <Text>{t('attachments.none')}</Text>}
          {files.map(file => (
            <Stack key={file.fileName} horizontal verticalAlign="center" tokens={{ childrenGap: 8 }}>
              <Link href={file.url} target="_blank" rel="noopener noreferrer">{file.fileName}</Link>
              <IconButton
                iconProps={{ iconName: 'Delete' }}
                title={t('attachments.remove')}
                ariaLabel={`${t('attachments.remove')}: ${file.fileName}`}
                disabled={busy}
                onClick={() => remove(file)}
              />
            </Stack>
          ))}

          <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }}>
            <input ref={inputRef} type="file" hidden onChange={onPick} aria-label={t('attachments.add')} data-testid="attachment-input" />
            <DefaultButton text={t('attachments.add')} iconProps={{ iconName: 'Attach' }} disabled={busy} onClick={() => inputRef.current && inputRef.current.click()} />
            {busy && <Spinner label={t('attachments.adding')} labelPosition="right" />}
          </Stack>

          {off && (
            <MessageBar messageBarType={MessageBarType.warning} actions={service.enableAttachments ? <DefaultButton text={t('attachments.enable')} onClick={enable} /> : undefined}>
              {t('attachments.disabled')}
            </MessageBar>
          )}
          {error && !off && <MessageBar messageBarType={MessageBarType.error} onDismiss={() => setError(undefined)}>{error}</MessageBar>}
        </>
      )}
    </Stack>
  );
};

export default AttachmentsSection;
