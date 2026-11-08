import * as React from 'react';
import {
  Checkbox, DefaultButton, Dropdown, MessageBar, MessageBarType, PrimaryButton, ProgressIndicator, Spinner, Stack, Text, TextField
} from '@fluentui/react';
import { AppConfig } from '../../config/AppConfig';
import { TranslateFn, useLanguage, useT } from '../../i18n/I18n';
import { buildImportPrompt, PromptLanguage } from '../../rules/importPrompt';
import { commitPlan, ICommitResult, planForRetry } from '../../rules/transcriptCommit';
import {
  applyResolvedOwners, buildPlan, collectOwnerNames, countIncluded, IDraft, IImportPlan, IImportWarning, IMPORT_KINDS, ImportKind, IExistingRefs, parseAiResult
} from '../../rules/transcriptImport';
import { useHubData } from '../shared/HubData';

type Step = 'input' | 'preview' | 'done';

const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the textarea method
  }

  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  document.body.removeChild(area);
  return ok;
};

/** Warning text with its parameters translated (field and kind names, section names). */
const warningText = (t: TranslateFn, warning: IImportWarning): string => {
  const params: Record<string, string | number> = { ...(warning.params ?? {}) };
  if (typeof params.kind === 'string') {
    params.kind = t(`field.${params.kind}`).toLowerCase();
  }
  if (typeof params.section === 'string') {
    params.section = t(`nav.${params.section}`);
  }
  if (typeof params.field === 'string') {
    params.field = t(`importField.${params.field}`);
  }
  return t(warning.key, params);
};

const metaFor = (t: TranslateFn, kind: ImportKind, item: Record<string, unknown>): string => {
  const parts: string[] = [];
  const owner = item.ownerUpn as string | undefined;
  if (owner) {
    parts.push(owner);
  }
  const date = (item.dueDate ?? item.targetDate ?? item.endDate) as string | undefined;
  if (date) {
    parts.push(date);
  }
  if (kind === 'actions' && item.priority) {
    parts.push(t(`priority.${item.priority as string}`));
  }
  if (kind === 'projects' && item.riskLevel) {
    parts.push(t(`risk.${item.riskLevel as string}`));
  }
  if (kind === 'risks' && item.probability && item.impact) {
    parts.push(`${t(`probability.${item.probability as string}`)} / ${t(`impact.${item.impact as string}`)}`);
  }
  if (kind === 'decisions' && item.decidedBy) {
    parts.push(item.decidedBy as string);
  }
  if (kind === 'lessons' && item.category) {
    parts.push(t(`lessonCategory.${item.category as string}`));
  }
  if (kind === 'notes' && item.category) {
    parts.push(t(`category.${item.category as string}`));
  }
  return parts.join(' · ');
};

const Import: React.FC = () => {
  const t = useT();
  const language = useLanguage();
  const hub = useHubData();
  const [step, setStep] = React.useState<Step>('input');
  const [aiText, setAiText] = React.useState<string>('');
  const [transcript, setTranscript] = React.useState<string>('');
  const [promptLanguage, setPromptLanguage] = React.useState<PromptLanguage>(language);
  const [copied, setCopied] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | undefined>();
  const [plan, setPlan] = React.useState<IImportPlan | undefined>();
  const [resolving, setResolving] = React.useState<boolean>(false);
  const [creating, setCreating] = React.useState<boolean>(false);
  const [progress, setProgress] = React.useState<number>(0);
  const [result, setResult] = React.useState<ICommitResult | undefined>();
  const mountedRef = React.useRef<boolean>(true);
  React.useEffect(() => () => { mountedRef.current = false; }, []);

  const prompt = React.useMemo(() => buildImportPrompt(promptLanguage), [promptLanguage]);

  const existing: IExistingRefs = {
    initiatives: hub.initiatives.items.map(i => ({ id: i.initiativeId, title: i.title })),
    projects: hub.projects.items.map(p => ({ id: p.projectId, title: p.title, initiativeId: p.initiativeId })),
    ideas: hub.ideas.items.map(i => ({ title: i.title })),
    actions: hub.actions.items.map(a => ({ title: a.title })),
    notes: hub.notes.items.map(n => ({ title: n.title })),
    risks: hub.risks.items.map(r => ({ title: r.title })),
    decisions: hub.decisions.items.map(d => ({ title: d.title })),
    lessons: hub.lessons.items.map(l => ({ title: l.title })),
    meetings: hub.meetings.items.map(m => ({ title: m.title, date: m.meetingDate }))
  };

  // ----- step 1 -> 2: read the pasted result -----
  const preview = async (): Promise<void> => {
    setError(undefined);
    const parsed = parseAiResult(aiText);
    if (!parsed.ok) {
      setError(t(parsed.error));
      return;
    }

    let built = buildPlan(parsed.data, {
      today: new Date(),
      userEmail: hub.userEmail,
      existing,
      defaultMeetingTitle: date => t('import.defaultMeetingTitle', { date })
    });
    setPlan(built);
    setStep('preview');

    // Look up the owners the AI gave as names. Only a single clear match is applied.
    const names = collectOwnerNames(built);
    if (names.length > 0) {
      setResolving(true);
      const resolved: Record<string, string | undefined> = {};
      for (const name of names) {
        try {
          const found = await hub.service.searchUsers(name, 5);
          const exact = found.filter(u => u.displayName.toLowerCase() === name.toLowerCase());
          const unique = found.length === 1 ? found : exact.length === 1 ? exact : [];
          resolved[name] = unique.length === 1 ? unique[0].email : undefined;
        } catch {
          resolved[name] = undefined;
        }
      }
      built = applyResolvedOwners(built, resolved);
      if (mountedRef.current) {
        setPlan(built);
        setResolving(false);
      }
    }
  };

  // ----- include / exclude -----
  const setInclude = <T,>(kind: ImportKind, key: string, include: boolean): void => {
    setPlan(prev => {
      if (!prev) {
        return prev;
      }
      const list = (prev[kind] as Array<IDraft<T>>).map(d => (d.key === key ? { ...d, include } : d));
      return { ...prev, [kind]: list } as IImportPlan;
    });
  };

  const setAll = (include: boolean): void => {
    setPlan(prev => {
      if (!prev) {
        return prev;
      }
      const all = <T,>(drafts: Array<IDraft<T>>): Array<IDraft<T>> => drafts.map(d => ({ ...d, include: include && d.errors.length === 0 }));
      return {
        ...prev,
        meeting: { ...prev.meeting, include: include && prev.meeting.errors.length === 0 },
        initiatives: all(prev.initiatives), projects: all(prev.projects), ideas: all(prev.ideas), actions: all(prev.actions),
        risks: all(prev.risks), decisions: all(prev.decisions), lessons: all(prev.lessons), notes: all(prev.notes)
      };
    });
  };

  // ----- step 2 -> 3: create -----
  const create = async (target: IImportPlan, retry: boolean): Promise<void> => {
    setCreating(true);
    setProgress(0);
    const outcome = await commitPlan(target, {
      createItem: (list, payload) => hub.service.createItem<{ Id?: number }>(list, payload),
      updateItem: (list, id, payload) => hub.service.updateItem(list, id, payload),
      listNames: {
        initiatives: AppConfig.sharePoint.listNames.initiatives, projects: AppConfig.sharePoint.listNames.projects,
        ideas: AppConfig.sharePoint.listNames.ideas, actions: AppConfig.sharePoint.listNames.actions,
        notes: AppConfig.sharePoint.listNames.notes, meetings: AppConfig.sharePoint.listNames.meetings,
        risks: AppConfig.sharePoint.listNames.risks, decisions: AppConfig.sharePoint.listNames.decisions, lessons: AppConfig.sharePoint.listNames.lessonsLearned
      },
      sourceTag: id => t('import.sourceTag', { id })
    }, {
      transcript,
      skipMeeting: retry && !!result && result.meetingItemId !== undefined,
      meetingItemId: result ? result.meetingItemId : undefined,
      onProgress: (done, total) => mountedRef.current && setProgress(total === 0 ? 1 : done / total)
    });

    if (!mountedRef.current) {
      return;
    }

    setResult(prev => (retry && prev ? { ...outcome, created: prev.created.concat(outcome.created), meetingItemId: outcome.meetingItemId ?? prev.meetingItemId } : outcome));
    setCreating(false);
    setStep('done');

    // Every list may have changed, so reload them once.
    [hub.initiatives, hub.projects, hub.ideas, hub.actions, hub.notes, hub.meetings, hub.risks, hub.decisions, hub.lessons].forEach(state => { state.reload().catch(() => undefined); });
  };

  const retryFailed = (): void => {
    if (!plan || !result) {
      return;
    }
    create(planForRetry(plan, result.failed.map(f => f.key)), true).catch(() => undefined);
  };

  const startOver = (): void => {
    setStep('input');
    setAiText('');
    setTranscript('');
    setPlan(undefined);
    setResult(undefined);
    setError(undefined);
    setProgress(0);
  };

  // ----------------------------------------------------------------- render
  const renderDrafts = <T extends object>(kind: ImportKind, drafts: Array<IDraft<T>>): React.ReactNode => {
    if (drafts.length === 0) {
      return null;
    }

    return (
      <Stack key={kind} tokens={{ childrenGap: 6 }}>
        <Text variant="large" as="h3">{t(`nav.${kind}`)} ({drafts.filter(d => d.include).length}/{drafts.length})</Text>
        {drafts.map(draft => {
          const title = (draft.item as unknown as { title: string }).title;
          const meta = metaFor(t, kind, draft.item as unknown as Record<string, unknown>);
          return (
            <div key={draft.key} style={{ borderLeft: '3px solid transparent', paddingLeft: 8 }}>
              <Checkbox
                checked={draft.include}
                disabled={draft.errors.length > 0}
                label={meta ? `${title} — ${meta}` : title}
                onChange={(_, checked) => setInclude(kind, draft.key, !!checked)}
              />
              {draft.warnings.map((w, index) => (
                <Text key={index} variant="small" block styles={{ root: { marginLeft: 26, color: '#8a5a00' } }}>⚠ {warningText(t, w)}</Text>
              ))}
              {draft.errors.map((e, index) => (
                <Text key={`e${index}`} variant="small" block styles={{ root: { marginLeft: 26, color: '#a4262c' } }}>✖ {t(e)}</Text>
              ))}
            </div>
          );
        })}
      </Stack>
    );
  };

  const includedCount = plan ? countIncluded(plan) + (plan.meeting.include ? 1 : 0) : 0;

  return (
    <Stack tokens={{ childrenGap: 16 }}>
      <Text variant="xLarge" as="h2">{t('import.title')}</Text>
      <Text>{t('import.intro')}</Text>

      {step === 'input' && (
        <Stack tokens={{ childrenGap: 16 }}>
          <Stack tokens={{ childrenGap: 8 }}>
            <Text variant="large" as="h3">{t('import.step1')}</Text>
            <Text>{t('import.step1Text')}</Text>
            <Stack horizontal wrap verticalAlign="end" tokens={{ childrenGap: 12 }}>
              <PrimaryButton
                text={copied ? t('import.copied') : t('import.copyPrompt')}
                iconProps={{ iconName: copied ? 'CheckMark' : 'Copy' }}
                onClick={() => { copyToClipboard(prompt).then(ok => { setCopied(ok); setTimeout(() => setCopied(false), 2500); }).catch(() => undefined); }}
              />
              <Dropdown
                label={t('import.promptLanguage')}
                selectedKey={promptLanguage}
                options={[{ key: 'es', text: 'Español' }, { key: 'en', text: 'English' }]}
                onChange={(_, o) => setPromptLanguage(((o?.key as PromptLanguage) ?? language))}
                styles={{ root: { minWidth: 150 } }}
              />
            </Stack>
            <details>
              <summary>{t('import.showPrompt')}</summary>
              <TextField multiline rows={12} readOnly value={prompt} ariaLabel={t('import.showPrompt')} styles={{ field: { fontFamily: 'monospace', fontSize: 12 } }} />
            </details>
          </Stack>

          <Stack tokens={{ childrenGap: 8 }}>
            <Text variant="large" as="h3">{t('import.step2')}</Text>
            <Text>{t('import.step2Text')}</Text>
            <TextField
              label={t('import.resultLabel')}
              multiline
              rows={12}
              value={aiText}
              placeholder={t('import.resultPlaceholder')}
              onChange={(_, v) => setAiText(v ?? '')}
              styles={{ field: { fontFamily: 'monospace', fontSize: 12 } }}
            />
            <TextField label={t('import.transcriptLabel')} description={t('import.transcriptHelp')} multiline rows={5} value={transcript} onChange={(_, v) => setTranscript(v ?? '')} />
            <div aria-live="polite">{error && <MessageBar messageBarType={MessageBarType.error}>{error}</MessageBar>}</div>
            <Stack horizontal><PrimaryButton text={t('import.preview')} disabled={aiText.trim().length === 0} onClick={() => { preview().catch(() => undefined); }} /></Stack>
          </Stack>
        </Stack>
      )}

      {step === 'preview' && plan && (
        <Stack tokens={{ childrenGap: 16 }}>
          <Text variant="large" as="h3">{t('import.step3')}</Text>
          <Text>{t('import.step3Text')}</Text>

          <div aria-live="polite">
            {resolving && <Spinner label={t('import.resolving')} labelPosition="right" styles={{ root: { justifyContent: 'flex-start' } }} />}
            {plan.problems.map((p, i) => <MessageBar key={i} messageBarType={MessageBarType.warning}>{warningText(t, p)}</MessageBar>)}
          </div>

          <Stack tokens={{ childrenGap: 6 }}>
            <Text variant="large" as="h3">{t('nav.meetings')}</Text>
            <Checkbox
              checked={plan.meeting.include}
              disabled={plan.meeting.errors.length > 0}
              label={`${plan.meeting.item.title} — ${plan.meeting.item.meetingDate}`}
              onChange={(_, checked) => setPlan(prev => (prev ? { ...prev, meeting: { ...prev.meeting, include: !!checked } } : prev))}
            />
            {plan.meeting.warnings.map((w, i) => <Text key={i} variant="small" block styles={{ root: { marginLeft: 26, color: '#8a5a00' } }}>⚠ {warningText(t, w)}</Text>)}
          </Stack>

          {IMPORT_KINDS.map(kind => renderDrafts(kind, plan[kind] as Array<IDraft<object>>))}

          {creating && <ProgressIndicator label={t('import.creating')} percentComplete={progress} />}

          <Stack horizontal wrap tokens={{ childrenGap: 8 }}>
            <PrimaryButton text={t('import.createButton', { count: includedCount })} disabled={creating || resolving || includedCount === 0}
              onClick={() => { create(plan, false).catch(() => undefined); }} />
            <DefaultButton text={t('import.selectAll')} disabled={creating} onClick={() => setAll(true)} />
            <DefaultButton text={t('import.selectNone')} disabled={creating} onClick={() => setAll(false)} />
            <DefaultButton text={t('import.back')} disabled={creating} onClick={() => setStep('input')} />
          </Stack>
        </Stack>
      )}

      {step === 'done' && result && (
        <Stack tokens={{ childrenGap: 12 }} aria-live="polite">
          <MessageBar messageBarType={result.failed.length === 0 ? MessageBarType.success : MessageBarType.warning}>
            {t('import.doneSummary', { created: result.created.filter(c => c.kind !== 'meeting').length, failed: result.failed.length })}
          </MessageBar>
          {!result.summarySaved && <MessageBar messageBarType={MessageBarType.warning}>{t('import.summaryNotSaved')}</MessageBar>}

          {result.created.length > 0 && (
            <Stack tokens={{ childrenGap: 2 }}>
              <Text variant="large" as="h3">{t('import.createdHeader')}</Text>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {result.created.map(c => <li key={c.key}>{t(`nav.${c.kind === 'meeting' ? 'meetings' : c.kind}`)}: {c.title} ({c.businessId})</li>)}
              </ul>
            </Stack>
          )}

          {result.failed.length > 0 && (
            <Stack tokens={{ childrenGap: 6 }}>
              <Text variant="large" as="h3">{t('import.failedHeader')}</Text>
              {result.failed.map(f => (
                <MessageBar key={f.key} messageBarType={MessageBarType.error}>{t(`nav.${f.kind === 'meeting' ? 'meetings' : f.kind}`)}: {f.title} — {f.error}</MessageBar>
              ))}
              <Stack horizontal><PrimaryButton text={t('import.retry')} disabled={creating} onClick={retryFailed} /></Stack>
              {creating && <ProgressIndicator label={t('import.creating')} percentComplete={progress} />}
            </Stack>
          )}

          <Stack horizontal><DefaultButton text={t('import.startOver')} onClick={startOver} /></Stack>
        </Stack>
      )}
    </Stack>
  );
};

export default Import;
