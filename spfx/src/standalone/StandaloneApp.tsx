import * as React from 'react';
import { Checkbox, DefaultButton, Dropdown, MessageBar, MessageBarType, PrimaryButton, Stack, Text, TextField } from '@fluentui/react';
import { AppConfig } from '../config/AppConfig';
import HubTabs from '../components/App/HubTabs';
import { HubDataProvider } from '../components/shared/HubData';
import { DocumentStore, IDatabase, IDocumentPersistence } from '../data/DocumentStore';
import { FileHandlePersistence, IFileHandleLike, MemoryPersistence } from '../data/persistence';
import { databaseFromSeed, SeedRows } from '../data/seed';
import { I18nProvider, Language, useT } from '../i18n/I18n';
import { browserFileAccess, downloadText, IFileAccess } from './fileAccess';
import { IStandaloneSettings, loadSettings, saveSettings } from './settings';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATA_FILE_NAME = 'itsdm-data.json';

export interface IStandaloneAppProps {
  seed: SeedRows;
  /** Replaced in tests. */
  files?: IFileAccess;
  now?: () => Date;
}

interface ISession {
  store: DocumentStore;
  persistence: IDocumentPersistence;
  /** What the header shows: the file name, or a note for the demo and backup modes. */
  kind: 'file' | 'demo' | 'copy';
  label: string;
}

const errorText = (error: unknown, fallback: string): string => (error instanceof Error ? error.message : fallback);

interface IStartProps {
  seed: SeedRows;
  files: IFileAccess;
  now: () => Date;
  settings: IStandaloneSettings;
  onSettings: (settings: IStandaloneSettings) => void;
  onStart: (session: ISession) => void;
}

const StartScreen: React.FC<IStartProps> = ({ seed, files, now, settings, onSettings, onStart }) => {
  const t = useT();
  const [withSamples, setWithSamples] = React.useState<boolean>(true);
  const [busy, setBusy] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | undefined>();
  const [last, setLast] = React.useState<IFileHandleLike | undefined>();
  const [submitted, setSubmitted] = React.useState<boolean>(false);
  // Starting replaces this screen, so what runs after it must not touch its state any more.
  const aliveRef = React.useRef<boolean>(true);
  React.useEffect(() => () => { aliveRef.current = false; }, []);

  React.useEffect(() => {
    let alive = true;
    files.lastFile().then(handle => { if (alive) { setLast(handle); } }).catch(() => undefined);
    return () => { alive = false; };
  }, [files]);

  const emailOk = EMAIL_PATTERN.test(settings.email.trim());
  const user = (): { email: string; displayName: string } => ({ email: settings.email.trim(), displayName: settings.name.trim() || settings.email.trim() });

  // Runs a start action, checking the email first and reporting any failure on the screen.
  const run = async (action: () => Promise<ISession | undefined>): Promise<void> => {
    setSubmitted(true);
    setError(undefined);
    if (!emailOk) {
      return;
    }
    setBusy(true);
    try {
      const session = await action();
      if (session) {
        onStart(session);
      }
    } catch (err) {
      if (aliveRef.current) {
        setError(errorText(err, t('common.unknownError')));
      }
    } finally {
      if (aliveRef.current) {
        setBusy(false);
      }
    }
  };

  const fromFile = async (handle: IFileHandleLike, seedIt: boolean): Promise<ISession> => {
    const persistence = new FileHandlePersistence(handle);
    const snapshot = await persistence.load();
    const empty = Object.keys(snapshot.database.lists).length === 0;
    if (seedIt && empty) {
      await persistence.save(databaseFromSeed(seed, user(), now()), snapshot.version);
    }
    await files.rememberFile(handle);
    return { store: new DocumentStore(persistence, { user: user() }), persistence, kind: 'file', label: handle.name };
  };

  const open = (): Promise<void> => run(async () => {
    const handle = await files.openFile();
    return handle ? fromFile(handle, false) : undefined;
  });

  const create = (): Promise<void> => run(async () => {
    const handle = await files.createFile(DATA_FILE_NAME);
    return handle ? fromFile(handle, withSamples) : undefined;
  });

  const resume = (): Promise<void> => run(async () => {
    if (!last) {
      return undefined;
    }
    if (!(await files.ensurePermission(last))) {
      throw new Error(t('standalone.permissionDenied'));
    }
    return fromFile(last, false);
  });

  const demo = (): Promise<void> => run(async () => {
    const persistence = new MemoryPersistence(databaseFromSeed(seed, user(), now()));
    return { store: new DocumentStore(persistence, { user: user() }), persistence, kind: 'demo', label: t('standalone.demoLabel') };
  });

  const openCopy = (file: File | undefined): Promise<void> => run(async () => {
    if (!file) {
      return undefined;
    }
    const parsed = JSON.parse(await file.text()) as IDatabase;
    if (!parsed || parsed.format !== 1 || !parsed.lists) {
      throw new Error(t('standalone.notDataFile', { name: file.name }));
    }
    const persistence = new MemoryPersistence(parsed);
    return { store: new DocumentStore(persistence, { user: user() }), persistence, kind: 'copy', label: file.name };
  });

  return (
    <Stack tokens={{ childrenGap: 14 }} styles={{ root: { maxWidth: 640, margin: '0 auto', padding: 16 } }}>
      <Text variant="xxLarge" as="h1">{AppConfig.appName}</Text>
      <Text variant="large">{t('app.tagline')}</Text>
      <Text>{t('standalone.intro')}</Text>

      <TextField label={t('standalone.yourName')} value={settings.name} onChange={(_, v) => onSettings({ ...settings, name: v ?? '' })} />
      <TextField
        label={t('standalone.yourEmail')} required value={settings.email}
        errorMessage={submitted && !emailOk ? t('standalone.emailRequired') : undefined}
        onChange={(_, v) => onSettings({ ...settings, email: v ?? '' })}
      />
      <Dropdown
        label={t('standalone.language')} selectedKey={settings.language}
        options={[{ key: 'en', text: 'English' }, { key: 'es', text: 'Español' }]}
        onChange={(_, o) => onSettings({ ...settings, language: (o?.key as Language) ?? settings.language })}
      />

      {error && <MessageBar messageBarType={MessageBarType.error}>{error}</MessageBar>}
      {!files.supported && <MessageBar messageBarType={MessageBarType.warning}>{t('standalone.noFileAccess')}</MessageBar>}

      <Stack tokens={{ childrenGap: 10 }}>
        {last && files.supported && <PrimaryButton disabled={busy} text={t('standalone.continue', { name: last.name })} onClick={() => { resume().catch(() => undefined); }} />}
        {files.supported && <DefaultButton disabled={busy} text={t('standalone.open')} onClick={() => { open().catch(() => undefined); }} />}
        {files.supported && (
          <Stack tokens={{ childrenGap: 6 }}>
            <DefaultButton disabled={busy} text={t('standalone.create')} onClick={() => { create().catch(() => undefined); }} />
            <Checkbox label={t('standalone.withSamples')} checked={withSamples} onChange={(_, c) => setWithSamples(!!c)} />
          </Stack>
        )}
        <label>
          <Text>{t('standalone.openCopy')}</Text>
          <input
            type="file" accept=".json,application/json" aria-label={t('standalone.openCopy')} disabled={busy}
            onChange={e => { openCopy(e.target.files ? e.target.files[0] : undefined).catch(() => undefined); e.target.value = ''; }}
          />
        </label>
        <DefaultButton disabled={busy} text={t('standalone.demo')} onClick={() => { demo().catch(() => undefined); }} />
      </Stack>

      <Text variant="small">{t('standalone.oneAtATime')}</Text>
    </Stack>
  );
};

interface IBarProps {
  session: ISession;
  userEmail: string;
  onReload: () => void;
  onClose: () => void;
}

const SessionBar: React.FC<IBarProps> = ({ session, userEmail, onReload, onClose }) => {
  const t = useT();
  const [error, setError] = React.useState<string | undefined>();

  const download = async (): Promise<void> => {
    setError(undefined);
    try {
      const snapshot = await session.persistence.load();
      downloadText(`itsdm-copy-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(snapshot.database, null, 1));
    } catch (err) {
      setError(errorText(err, t('common.unknownError')));
    }
  };

  return (
    <Stack tokens={{ childrenGap: 6 }}>
      <Stack horizontal wrap verticalAlign="center" tokens={{ childrenGap: 10 }}>
        <Text>{session.kind === 'file' ? t('standalone.fileLabel', { name: session.label }) : session.label} · {userEmail}</Text>
        <DefaultButton text={t('standalone.reload')} onClick={onReload} />
        <DefaultButton text={t('standalone.download')} onClick={() => { download().catch(() => undefined); }} />
        <DefaultButton text={t('standalone.close')} onClick={onClose} />
      </Stack>
      {session.kind !== 'file' && <MessageBar messageBarType={MessageBarType.info}>{t('standalone.notSaved')}</MessageBar>}
      {error && <MessageBar messageBarType={MessageBarType.error}>{error}</MessageBar>}
    </Stack>
  );
};

/** The local version of the app: picks where the data lives, then shows the same tabs as the SharePoint web part. */
const StandaloneApp: React.FC<IStandaloneAppProps> = ({ seed, files = browserFileAccess, now = () => new Date() }) => {
  const [settings, setSettings] = React.useState<IStandaloneSettings>(loadSettings);
  const [session, setSession] = React.useState<ISession | undefined>();
  const [reloadKey, setReloadKey] = React.useState<number>(0);

  const changeSettings = (next: IStandaloneSettings): void => {
    setSettings(next);
    saveSettings(next);
  };

  return (
    <I18nProvider language={settings.language}>
      <div lang={settings.language}>
        {!session && <StartScreen seed={seed} files={files} now={now} settings={settings} onSettings={changeSettings} onStart={setSession} />}
        {session && (
          <Stack tokens={{ childrenGap: 10 }} styles={{ root: { padding: 16 } }}>
            <SessionBar
              session={session} userEmail={settings.email.trim()}
              onReload={() => { session.store.invalidate(); setReloadKey(reloadKey + 1); }}
              onClose={() => setSession(undefined)}
            />
            <HubDataProvider key={reloadKey} store={session.store} userEmail={settings.email.trim()}>
              <HubTabs description="" />
            </HubDataProvider>
          </Stack>
        )}
      </div>
    </I18nProvider>
  );
};

export default StandaloneApp;
