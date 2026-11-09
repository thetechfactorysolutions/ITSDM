import * as React from 'react';
import { DefaultButton, MessageBar, MessageBarType, Panel, PanelType, PrimaryButton, ProgressIndicator, Stack, Text, TextField } from '@fluentui/react';
import { useT } from '../../i18n/I18n';
import { downloadTextFile } from '../../utils/download';
import { csvToObjects, parseCsv } from '../../rules/csv';
import { ValidationErrors } from '../../rules/validation';

export interface ICsvImportPanelProps<T> {
  isOpen: boolean;
  onDismiss: () => void;
  /** Header names the file should have (shown as a hint). */
  headers: string[];
  fromRow: (row: Record<string, string>) => T;
  validate: (item: T) => ValidationErrors;
  buildPayload: (item: T) => Record<string, unknown>;
  createItem: (payload: Record<string, unknown>) => Promise<unknown>;
  /** Called once after the import, so the list is reloaded a single time. */
  onFinished: () => void;
  /** A ready-to-fill file: the column names and one example row. Leave it out to hide the button. */
  template?: { fileName: string; content: () => string };
}

interface IParsedRow<T> {
  line: number;
  item: T;
  errors: string[];
}

function CsvImportPanel<T>(props: ICsvImportPanelProps<T>): React.ReactElement {
  const t = useT();
  const { isOpen, onDismiss, headers, fromRow, validate, buildPayload, createItem, onFinished } = props;
  const [text, setText] = React.useState<string>('');
  const [running, setRunning] = React.useState<boolean>(false);
  const [progress, setProgress] = React.useState<number>(0);
  const [result, setResult] = React.useState<{ created: number; failed: string[] } | undefined>();

  const parsed: Array<IParsedRow<T>> = React.useMemo(() => {
    if (text.trim().length === 0) {
      return [];
    }

    return csvToObjects(parseCsv(text)).map((row, index) => {
      const item = fromRow(row);
      const errors = validate(item) as ValidationErrors;
      return { line: index + 2, item, errors: Object.keys(errors).map(key => errors[key] as string).filter(Boolean).map(key => t(key)) };
    });
  }, [text, fromRow, validate, t]);

  const valid = parsed.filter(row => row.errors.length === 0);
  const invalid = parsed.filter(row => row.errors.length > 0);

  const readFile = (file: File | undefined): void => {
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result ?? ''));
    reader.readAsText(file);
  };

  const close = (): void => {
    setText('');
    setResult(undefined);
    setProgress(0);
    onDismiss();
  };

  const run = async (): Promise<void> => {
    setRunning(true);
    setResult(undefined);
    const failed: string[] = [];
    let created = 0;

    for (let i = 0; i < valid.length; i++) {
      try {
        await createItem(buildPayload(valid[i].item));
        created++;
      } catch (err) {
        failed.push(`${t('csv.line', { line: valid[i].line })}: ${err instanceof Error ? err.message : t('common.unknownError')}`);
      }
      setProgress((i + 1) / valid.length);
    }

    setRunning(false);
    setResult({ created, failed });
    onFinished();
  };

  return (
    <Panel isOpen={isOpen} onDismiss={close} type={PanelType.large} headerText={t('csv.title')} closeButtonAriaLabel={t('common.close')}>
      <Stack tokens={{ childrenGap: 12 }}>
        <Text>{t('csv.hint')}</Text>
        <Text variant="small" styles={{ root: { fontFamily: 'monospace', wordBreak: 'break-word' } }}>{headers.join(', ')}</Text>

        {props.template && (
          <Stack tokens={{ childrenGap: 4 }}>
            <Text>{t('csv.templateHint')}</Text>
            <Stack horizontal>
              <DefaultButton text={t('csv.template')} iconProps={{ iconName: 'Download' }} onClick={() => downloadTextFile((props.template as { fileName: string }).fileName, (props.template as { content: () => string }).content())} />
            </Stack>
          </Stack>
        )}

        <label>
          <Text block>{t('csv.chooseFile')}</Text>
          <input type="file" accept=".csv,text/csv,text/plain" onChange={event => readFile(event.target.files ? event.target.files[0] : undefined)} />
        </label>

        <TextField label={t('csv.paste')} multiline rows={6} value={text} onChange={(_, value) => { setText(value ?? ''); setResult(undefined); }} />

        {parsed.length > 0 && (
          <Stack tokens={{ childrenGap: 6 }} aria-live="polite">
            <Text variant="large" as="h3">{t('csv.preview')}</Text>
            <Text>{t('csv.summary', { total: parsed.length, valid: valid.length, invalid: invalid.length })}</Text>
            {invalid.slice(0, 8).map(row => (
              <MessageBar key={row.line} messageBarType={MessageBarType.warning}>
                {t('csv.line', { line: row.line })}: {row.errors.join(' ')}
              </MessageBar>
            ))}
            {invalid.length > 8 && <Text>{t('csv.moreErrors', { count: invalid.length - 8 })}</Text>}
          </Stack>
        )}

        {running && <ProgressIndicator label={t('csv.importing')} percentComplete={progress} />}

        {result && (
          <Stack tokens={{ childrenGap: 6 }} aria-live="polite">
            <MessageBar messageBarType={result.failed.length === 0 ? MessageBarType.success : MessageBarType.warning}>
              {t('csv.done', { created: result.created, failed: result.failed.length })}
            </MessageBar>
            {result.failed.map((message, index) => <MessageBar key={index} messageBarType={MessageBarType.error}>{message}</MessageBar>)}
          </Stack>
        )}

        <Stack horizontal tokens={{ childrenGap: 8 }}>
          <PrimaryButton text={t('csv.import', { count: valid.length })} disabled={running || valid.length === 0} onClick={() => { run().catch(() => undefined); }} />
          <DefaultButton text={t('common.close')} onClick={close} />
        </Stack>
      </Stack>
    </Panel>
  );
}

export default CsvImportPanel;
