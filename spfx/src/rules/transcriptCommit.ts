import {
  buildActionPayload, buildDecisionPayload, buildIdeaPayload, buildInitiativePayload, buildLessonPayload, buildMeetingPayload, buildNotePayload, buildProjectPayload, buildRiskPayload
} from '../entities/payloads';
import { IDraft, IImportPlan, ImportKind, IMPORT_KINDS } from './transcriptImport';

export interface ICommitDeps {
  createItem: (listName: string, payload: Record<string, unknown>) => Promise<{ Id?: number }>;
  updateItem: (listName: string, id: number, payload: Record<string, unknown>) => Promise<void>;
  listNames: Record<ImportKind | 'meetings', string>;
  /** Text that links a created item back to the meeting, e.g. "[Source: MEET-…]". */
  sourceTag: (meetingId: string) => string;
}

export interface ICommitOptions {
  /** Original transcript text, stored with the meeting. */
  transcript: string;
  /** True when retrying: the meeting already exists. */
  skipMeeting?: boolean;
  meetingItemId?: number;
  onProgress?: (done: number, total: number) => void;
}

export interface ICreatedEntry {
  kind: ImportKind | 'meeting';
  key: string;
  businessId: string;
  title: string;
}

export interface IFailedEntry {
  kind: ImportKind | 'meeting';
  key: string;
  title: string;
  error: string;
}

export interface ICommitResult {
  created: ICreatedEntry[];
  failed: IFailedEntry[];
  /** SharePoint id of the meeting item, needed to retry without creating the meeting twice. */
  meetingItemId?: number;
  /** False when the summary could not be written back to the meeting. */
  summarySaved: boolean;
}

const withSource = (description: string, tag: string): string => (description ? `${description}\n\n${tag}` : tag);

const message = (err: unknown): string => (err instanceof Error ? err.message : String(err));

/**
 * Creates what the user confirmed: the meeting first, then initiatives, projects, ideas, actions
 * and notes. Every item is attempted even if another fails, so one bad row never blocks the rest.
 * Nothing already created is undone; the result says exactly what was created and what failed.
 */
export const commitPlan = async (plan: IImportPlan, deps: ICommitDeps, options: ICommitOptions): Promise<ICommitResult> => {
  const created: ICreatedEntry[] = [];
  const failed: IFailedEntry[] = [];
  let meetingItemId = options.meetingItemId;
  let summarySaved = true;
  const tag = deps.sourceTag(plan.meeting.item.meetingId);

  const included = IMPORT_KINDS.reduce((sum, kind) => sum + (plan[kind] as Array<IDraft<unknown>>).filter(d => d.include).length, 0);
  const meetingTurn = plan.meeting.include && !options.skipMeeting;
  const total = included + (meetingTurn ? 1 : 0);
  let done = 0;
  const tick = (): void => {
    done++;
    if (options.onProgress) {
      options.onProgress(done, total);
    }
  };

  if (meetingTurn) {
    try {
      const meeting = { ...plan.meeting.item, transcript: options.transcript };
      const meetingResult = await deps.createItem(deps.listNames.meetings, buildMeetingPayload(meeting));
      meetingItemId = meetingResult.Id;
      created.push({ kind: 'meeting', key: plan.meeting.key, businessId: meeting.meetingId, title: meeting.title });
    } catch (err) {
      failed.push({ kind: 'meeting', key: plan.meeting.key, title: plan.meeting.item.title, error: message(err) });
    }
    tick();
  }

  const run = async <T>(kind: ImportKind, drafts: Array<IDraft<T>>, payload: (item: T) => Record<string, unknown>,
    idOf: (item: T) => string, titleOf: (item: T) => string): Promise<void> => {
    for (const draft of drafts) {
      if (!draft.include) {
        continue;
      }
      try {
        await deps.createItem(deps.listNames[kind], payload(draft.item));
        created.push({ kind, key: draft.key, businessId: idOf(draft.item), title: titleOf(draft.item) });
      } catch (err) {
        failed.push({ kind, key: draft.key, title: titleOf(draft.item), error: message(err) });
      }
      tick();
    }
  };

  await run('initiatives', plan.initiatives, i => buildInitiativePayload({ ...i, description: withSource(i.description, tag) }), i => i.initiativeId, i => i.title);
  await run('projects', plan.projects, p => buildProjectPayload({ ...p, description: withSource(p.description, tag) }), p => p.projectId, p => p.title);
  await run('ideas', plan.ideas, i => buildIdeaPayload({ ...i, description: withSource(i.description, tag) }), i => i.ideaId, i => i.title);
  await run('actions', plan.actions, a => buildActionPayload({ ...a, description: withSource(a.description, tag) }), a => a.actionId, a => a.title);
  await run('risks', plan.risks, r => buildRiskPayload({ ...r, description: withSource(r.description, tag) }), r => r.riskId, r => r.title);
  await run('decisions', plan.decisions, d => buildDecisionPayload({ ...d, description: withSource(d.description, tag) }), d => d.decisionId, d => d.title);
  await run('lessons', plan.lessons, l => buildLessonPayload({ ...l, description: withSource(l.description, tag) }), l => l.lessonId, l => l.title);
  await run('notes', plan.notes, n => buildNotePayload(n), n => n.noteId, n => n.title);

  // Write what was created back to the meeting, so it is traceable from there.
  const createdItems = created.filter(entry => entry.kind !== 'meeting');
  if (meetingItemId !== undefined && createdItems.length > 0) {
    const summary = createdItems.map(entry => `${entry.businessId} — ${entry.title}`).join('\n');
    try {
      await deps.updateItem(deps.listNames.meetings, meetingItemId, { ImportedItems: summary });
    } catch {
      summarySaved = false;
    }
  }

  return { created, failed, meetingItemId, summarySaved };
};

/** The same plan with only the failed drafts still included, for "retry what failed". */
export const planForRetry = (plan: IImportPlan, failedKeys: string[]): IImportPlan => {
  const only = <T>(drafts: Array<IDraft<T>>): Array<IDraft<T>> => drafts.map(d => ({ ...d, include: d.include && failedKeys.indexOf(d.key) > -1 }));
  return {
    ...plan,
    meeting: { ...plan.meeting, include: plan.meeting.include && failedKeys.indexOf(plan.meeting.key) > -1 },
    initiatives: only(plan.initiatives),
    projects: only(plan.projects),
    ideas: only(plan.ideas),
    actions: only(plan.actions),
    risks: only(plan.risks),
    decisions: only(plan.decisions),
    lessons: only(plan.lessons),
    notes: only(plan.notes)
  };
};
