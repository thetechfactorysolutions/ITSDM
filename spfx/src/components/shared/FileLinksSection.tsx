import * as React from 'react';
import { DefaultButton, getTheme, IconButton, MessageBar, MessageBarType, Stack, Text, TextField } from '@fluentui/react';
import { buildFileLinkPayload } from '../../entities/payloads';
import { useT } from '../../i18n/I18n';
import { checkNewLink, fileKind, fileNameFromUrl, linksFor } from '../../rules/fileLinks';
import { useHubData } from './HubData';

export interface IFileLinksSectionProps {
  listName: string;
  /** Undefined while the record is new: files are linked once it exists. */
  itemId: number | undefined;
}

/** Files linked to a record by pasting their link, for example from OneDrive. Needs no permissions. */
const FileLinksSection: React.FC<IFileLinksSectionProps> = ({ listName, itemId }) => {
  const t = useT();
  const theme = getTheme();
  const { fileLinks } = useHubData();
  const [url, setUrl] = React.useState<string>('');
  const [name, setName] = React.useState<string>('');
  const [error, setError] = React.useState<string | undefined>();
  const [busy, setBusy] = React.useState<boolean>(false);

  // a screen can be shown without every list around it (a test, an embed): then there is nothing to link to
  if (!fileLinks) {
    return <></>;
  }
  const mine = linksFor(fileLinks.items, listName, itemId);

  const add = async (): Promise<void> => {
    setError(undefined);
    const problem = checkNewLink(url, mine);
    if (problem) {
      setError(t(problem.key));
      return;
    }
    setBusy(true);
    try {
      await fileLinks.create(buildFileLinkPayload({ title: name.trim() || fileNameFromUrl(url, t('fileLinks.defaultName')), listName, itemKey: String(itemId), url }));
      setUrl('');
      setName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setBusy(false);
    }
  };

  const remove = (id: number | undefined): void => {
    if (id === undefined) {
      return;
    }
    fileLinks.remove(id).catch(err => setError(err instanceof Error ? err.message : t('common.unknownError')));
  };

  return (
    <Stack tokens={{ childrenGap: 8 }} aria-label={t('fileLinks.title')} role="group">
      <Text variant="mediumPlus" as="h3" styles={{ root: { fontWeight: 600, margin: 0 } }}>📎 {t('fileLinks.title')}</Text>
      {itemId === undefined ? (
        <Text variant="small">{t('fileLinks.saveFirst')}</Text>
      ) : (
        <>
          {mine.length === 0 && <Text variant="small">{t('fileLinks.none')}</Text>}
          {mine.map(link => {
            const kind = fileKind(link.title);
            return (
              <div key={link.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: theme.palette.neutralLighterAlt, border: `1px solid ${theme.palette.neutralLighter}` }}>
                <span aria-hidden="true" title={kind.label} style={{ fontSize: 20 }}>{kind.emoji}</span>
                <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.title}</a>
                <IconButton iconProps={{ iconName: 'Delete' }} title={t('fileLinks.remove')} ariaLabel={`${t('fileLinks.remove')}: ${link.title}`} onClick={() => remove(link.id)} />
              </div>
            );
          })}
          {error && <MessageBar messageBarType={MessageBarType.error} onDismiss={() => setError(undefined)}>{error}</MessageBar>}
          <TextField label={t('fileLinks.url')} value={url} placeholder="https://…-my.sharepoint.com/…" onChange={(_, value) => setUrl(value ?? '')} />
          <TextField label={t('fileLinks.name')} value={name} onChange={(_, value) => setName(value ?? '')} />
          <Text variant="small">{t('fileLinks.hint')}</Text>
          <Stack horizontal><DefaultButton text={t('fileLinks.add')} iconProps={{ iconName: 'Link' }} disabled={busy || url.trim() === ''} onClick={() => { add().catch(() => undefined); }} /></Stack>
        </>
      )}
    </Stack>
  );
};

export default FileLinksSection;
