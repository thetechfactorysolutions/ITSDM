import {
  ActionItem, ActionPriority, ActionStatus, Decision, DecisionStatus, Idea, IdeaStatus, Initiative, InitiativeStatus, Lesson, LessonCategory, LessonStatus,
  Meeting, Note, NoteCategory, NoteStatus, Project, ProjectRiskLevel, ProjectStatus, Risk, RiskScale, RiskStatus
} from '../models';
import { dayKeyFromValue, isValidDayKey, toDayKey } from './dates';
import { generateBusinessId } from './ids';
import {
  validateAction, validateDecision, validateIdea, validateInitiative, validateLesson, validateMeeting, validateNote, validateProject, validateRisk, ValidationErrors
} from './validation';

/**
 * Turns the text an AI produced from a meeting transcript into drafts of ideas, initiatives,
 * projects, actions and notes, ready for the user to review. Nothing here talks to SharePoint:
 * the reading, repairing and checking are pure functions so they can be tested exhaustively.
 */

export type ImportKind = 'initiatives' | 'projects' | 'ideas' | 'actions' | 'risks' | 'decisions' | 'lessons' | 'notes';
export const IMPORT_KINDS: ImportKind[] = ['initiatives', 'projects', 'ideas', 'actions', 'risks', 'decisions', 'lessons', 'notes'];

export interface IImportWarning {
  /** Translation key, e.g. import.warn.ownerUnresolved. */
  key: string;
  params?: Record<string, string | number>;
}

export interface IDraft<T> {
  /** Stable key for React and for retrying only the failed ones. */
  key: string;
  include: boolean;
  item: T;
  warnings: IImportWarning[];
  /** Validation keys that still fail; a draft with errors cannot be included. */
  errors: string[];
  /** Owner text the AI gave when it was not an email, to be looked up in the directory. */
  ownerName?: string;
}

export interface IImportPlan {
  meeting: IDraft<Meeting>;
  initiatives: Array<IDraft<Initiative>>;
  projects: Array<IDraft<Project>>;
  ideas: Array<IDraft<Idea>>;
  actions: Array<IDraft<ActionItem>>;
  risks: Array<IDraft<Risk>>;
  decisions: Array<IDraft<Decision>>;
  lessons: Array<IDraft<Lesson>>;
  notes: Array<IDraft<Note>>;
  /** Problems about the result as a whole (unknown sections, nothing found...). */
  problems: IImportWarning[];
}

export interface IExistingRefs {
  initiatives: Array<{ id: string; title: string }>;
  projects: Array<{ id: string; title: string; initiativeId?: string }>;
  ideas: Array<{ title: string }>;
  actions: Array<{ title: string }>;
  notes: Array<{ title: string }>;
  risks?: Array<{ title: string }>;
  decisions?: Array<{ title: string }>;
  lessons?: Array<{ title: string }>;
  meetings: Array<{ title: string; date?: string }>;
}

export interface IBuildContext {
  today: Date;
  userEmail: string;
  existing: IExistingRefs;
  defaultMeetingTitle: (date: string) => string;
  newId?: (prefix: string) => string;
}

export type ParseResult = { ok: true; data: Record<string, unknown> } | { ok: false; error: string };

// ------------------------------------------------------------------ reading the text

const SMART_QUOTES: Array<[RegExp, string]> = [[/[“”„‟]/g, '"'], [/[‘’]/g, "'"]];

const tryParse = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

/** Removes trailing commas before } or ], a frequent slip in generated JSON. */
const repair = (text: string): string => {
  let fixed = text;
  SMART_QUOTES.forEach(([pattern, replacement]) => { fixed = fixed.replace(pattern, replacement); });
  return fixed.replace(/,\s*([}\]])/g, '$1');
};

/**
 * Finds the JSON object in whatever the user pasted: bare JSON, JSON inside a ```json block, or
 * JSON with an introduction and a closing remark around it. Returns an error key when none works.
 */
export const parseAiResult = (text: string): ParseResult => {
  const source = (text ?? '').trim();
  if (source.length === 0) {
    return { ok: false, error: 'import.error.empty' };
  }

  const candidates: string[] = [source];
  const fenced = /```(?:json|JSON)?\s*([\s\S]*?)```/g;
  let match: RegExpExecArray | null = fenced.exec(source);
  while (match) {
    candidates.push(match[1].trim());
    match = fenced.exec(source);
  }
  const first = source.indexOf('{');
  const last = source.lastIndexOf('}');
  if (first > -1 && last > first) {
    candidates.push(source.slice(first, last + 1));
  }

  for (const candidate of candidates) {
    for (const attempt of [candidate, repair(candidate)]) {
      const parsed = tryParse(attempt);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return { ok: true, data: parsed as Record<string, unknown> };
      }
    }
  }

  return { ok: false, error: 'import.error.notJson' };
};

// ------------------------------------------------------------------ normalising values

const squash = (value: string): string => value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

/** Value of the first matching key, ignoring case, accents and separators (dueDate = due_date = Fecha límite is not matched, only exact squashes). */
const pick = (obj: Record<string, unknown>, ...names: string[]): unknown => {
  const wanted = names.map(squash);
  const keys = Object.keys(obj);
  for (const name of wanted) {
    for (const key of keys) {
      if (squash(key) === name) {
        return obj[key];
      }
    }
  }
  return undefined;
};

const asText = (value: unknown): string => {
  if (value === undefined || value === null) {
    return '';
  }
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(asText).filter(Boolean).join('; ');
  }
  return '';
};

const asNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number') {
    return isFinite(value) ? value : undefined;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const cleaned = value.replace(/[^\d.,-]/g, '').replace(/,(?=\d{3}\b)/g, '').replace(',', '.');
    const n = Number(cleaned);
    return isFinite(n) ? n : undefined;
  }
  return undefined;
};

const asObjects = (value: unknown): Array<Record<string, unknown>> => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(v => v && typeof v === 'object' && !Array.isArray(v)) as Array<Record<string, unknown>>;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_TITLE = 255;

const ALIASES: Record<string, string> = {
  alta: 'HIGH', alto: 'HIGH', media: 'MEDIUM', medio: 'MEDIUM', baja: 'LOW', bajo: 'LOW', critica: 'CRITICAL', critico: 'CRITICAL', urgente: 'CRITICAL',
  proceso: 'PROCESS', tecnologia: 'TECHNOLOGY', personas: 'PEOPLE', proveedor: 'VENDOR', otra: 'OTHER', otro: 'OTHER',
  decision: 'DECISION', riesgo: 'RISK', informacion: 'INFO', info: 'INFO', seguimiento: 'FOLLOW_UP', followup: 'FOLLOW_UP', pendiente: 'FOLLOW_UP'
};

const toEnum = <T extends string>(value: unknown, allowed: T[], fallback: T): { value: T; recognised: boolean } => {
  const raw = asText(value);
  if (raw === '') {
    return { value: fallback, recognised: true };
  }
  const up = raw.toUpperCase().replace(/[\s-]+/g, '_');
  if (allowed.indexOf(up as T) > -1) {
    return { value: up as T, recognised: true };
  }
  const alias = ALIASES[squash(raw)] as T | undefined;
  if (alias && allowed.indexOf(alias) > -1) {
    return { value: alias, recognised: true };
  }
  return { value: fallback, recognised: false };
};

const norm = (text: string): string => squash(text);

const PRIORITIES = [ActionPriority.LOW, ActionPriority.MEDIUM, ActionPriority.HIGH, ActionPriority.CRITICAL];
const RISKS = [ProjectRiskLevel.LOW, ProjectRiskLevel.MEDIUM, ProjectRiskLevel.HIGH, ProjectRiskLevel.CRITICAL];
const CATEGORIES = [NoteCategory.DECISION, NoteCategory.RISK, NoteCategory.INFO, NoteCategory.FOLLOW_UP];
const RISK_SCALE = [RiskScale.LOW, RiskScale.MEDIUM, RiskScale.HIGH];
const LESSON_CATEGORIES = [LessonCategory.PROCESS, LessonCategory.TECHNOLOGY, LessonCategory.PEOPLE, LessonCategory.VENDOR, LessonCategory.OTHER];

// ------------------------------------------------------------------ building the plan

interface ICommon {
  warnings: IImportWarning[];
  title: string;
  description: string;
  ownerName?: string;
  ownerEmail: string;
}

/** Fields every kind shares: title (required, shortened if too long) and description. */
const readCommon = (raw: Record<string, unknown>, ctx: IBuildContext, titleKeys: string[] = ['title', 'titulo', 'name', 'nombre']): ICommon | undefined => {
  const warnings: IImportWarning[] = [];
  let title = asText(pick(raw, ...titleKeys));
  if (title === '') {
    return undefined;
  }
  if (title.length > MAX_TITLE) {
    title = title.slice(0, MAX_TITLE - 1) + '…';
    warnings.push({ key: 'import.warn.titleShortened' });
  }

  const description = asText(pick(raw, 'description', 'descripcion', 'detail', 'detalle'));
  const ownerText = asText(pick(raw, 'owner', 'responsable', 'propietario', 'assignee', 'asignado'));
  let ownerEmail = ctx.userEmail;
  let ownerName: string | undefined;

  if (EMAIL.test(ownerText)) {
    ownerEmail = ownerText;
  } else if (ownerText !== '') {
    ownerName = ownerText;
    warnings.push({ key: 'import.warn.ownerUnresolved', params: { name: ownerText } });
  }

  return { warnings, title, description, ownerName, ownerEmail };
};

/** A date from the AI: a real day is kept, anything else is dropped with a warning. */
const readDate = (value: unknown, field: string, warnings: IImportWarning[]): string => {
  const text = asText(value);
  if (text === '') {
    return '';
  }
  const day = dayKeyFromValue(text);
  if (day && isValidDayKey(day)) {
    return day;
  }
  warnings.push({ key: 'import.warn.dateDropped', params: { field, value: text } });
  return '';
};

const finish = <T,>(key: string, item: T, common: ICommon, extra: IImportWarning[], errors: ValidationErrors, existsAlready: boolean): IDraft<T> => {
  const warnings = common.warnings.concat(extra);
  if (existsAlready) {
    warnings.push({ key: 'import.warn.duplicate' });
  }
  const errorKeys = Object.keys(errors).map(k => errors[k] as string).filter(Boolean);
  return { key, include: errorKeys.length === 0, item, warnings, errors: errorKeys, ownerName: common.ownerName };
};

const exists = (list: Array<{ title: string }>, title: string): boolean => list.some(entry => norm(entry.title) === norm(title));

export const buildPlan = (parsed: Record<string, unknown>, ctx: IBuildContext): IImportPlan => {
  const newId = ctx.newId ?? generateBusinessId;
  const problems: IImportWarning[] = [];
  const todayKey = toDayKey(ctx.today);

  // ----- meeting -----
  const meetingRaw = (pick(parsed, 'meeting', 'reunion') as Record<string, unknown> | undefined) ?? {};
  const meetingWarnings: IImportWarning[] = [];
  let meetingDate = readDate(pick(meetingRaw, 'date', 'fecha'), 'meeting.date', meetingWarnings);
  if (!meetingDate) {
    meetingDate = todayKey;
    meetingWarnings.push({ key: 'import.warn.meetingDateToday' });
  }
  const meetingTitle = asText(pick(meetingRaw, 'title', 'titulo')) || ctx.defaultMeetingTitle(meetingDate);
  const meetingItem: Meeting = {
    meetingId: newId('MEET'),
    title: meetingTitle.slice(0, MAX_TITLE),
    meetingDate,
    summary: asText(pick(meetingRaw, 'summary', 'resumen')),
    attendees: asText(pick(meetingRaw, 'attendees', 'asistentes', 'participantes')),
    transcript: '',
    importedItems: ''
  };
  const meetingDuplicate = ctx.existing.meetings.some(m => norm(m.title) === norm(meetingItem.title) && (m.date ?? '') === meetingDate);
  if (meetingDuplicate) {
    meetingWarnings.push({ key: 'import.warn.meetingDuplicate' });
  }
  const meetingErrors = validateMeeting(meetingItem);
  const meeting: IDraft<Meeting> = {
    key: meetingItem.meetingId, include: Object.keys(meetingErrors).length === 0, item: meetingItem, warnings: meetingWarnings,
    errors: Object.keys(meetingErrors).map(k => meetingErrors[k] as string)
  };

  // ----- initiatives (first, so projects and actions can point at them) -----
  const initiatives: Array<IDraft<Initiative>> = [];
  asObjects(pick(parsed, 'initiatives', 'iniciativas')).forEach((raw, index) => {
    const common = readCommon(raw, ctx);
    if (!common) {
      problems.push({ key: 'import.warn.itemWithoutTitle', params: { section: 'initiatives', position: index + 1 } });
      return;
    }
    const extra: IImportWarning[] = [];
    const item: Initiative = {
      initiativeId: newId('INIT'), title: common.title, description: common.description, status: InitiativeStatus.DRAFT, ownerUpn: common.ownerEmail,
      progressPct: 0, targetDate: readDate(pick(raw, 'targetDate', 'fechaObjetivo', 'fecha'), 'targetDate', extra), sourceIdeaId: '', plannerPlanId: ''
    };
    initiatives.push(finish(item.initiativeId, item, common, extra, validateInitiative(item), exists(ctx.existing.initiatives, item.title)));
  });

  const findInitiative = (title: string): { id: string; known: boolean } | undefined => {
    if (!title) {
      return undefined;
    }
    const inPlan = initiatives.filter(d => norm(d.item.title) === norm(title))[0];
    if (inPlan) {
      return { id: inPlan.item.initiativeId, known: true };
    }
    const existing = ctx.existing.initiatives.filter(i => norm(i.title) === norm(title))[0];
    return existing ? { id: existing.id, known: true } : undefined;
  };

  // ----- projects -----
  const projects: Array<IDraft<Project>> = [];
  asObjects(pick(parsed, 'projects', 'proyectos')).forEach((raw, index) => {
    const common = readCommon(raw, ctx);
    if (!common) {
      problems.push({ key: 'import.warn.itemWithoutTitle', params: { section: 'projects', position: index + 1 } });
      return;
    }
    const extra: IImportWarning[] = [];
    const initiativeTitle = asText(pick(raw, 'initiative', 'iniciativa'));
    const linked = findInitiative(initiativeTitle);
    if (initiativeTitle && !linked) {
      extra.push({ key: 'import.warn.linkUnresolved', params: { kind: 'initiative', title: initiativeTitle } });
    }
    const risk = toEnum(pick(raw, 'riskLevel', 'risk', 'riesgo', 'nivelRiesgo'), RISKS, ProjectRiskLevel.LOW);
    if (!risk.recognised) {
      extra.push({ key: 'import.warn.valueUnknown', params: { field: 'riskLevel', value: asText(pick(raw, 'riskLevel', 'risk', 'riesgo', 'nivelRiesgo')) } });
    }
    const budget = asNumber(pick(raw, 'budget', 'presupuesto', 'budgetAmount'));
    const forecast = asNumber(pick(raw, 'forecast', 'prevision', 'forecastAmount'));
    const item: Project = {
      projectId: newId('PROJ'), initiativeId: linked ? linked.id : '', title: common.title, description: common.description,
      status: ProjectStatus.PLANNING, ownerUpn: common.ownerEmail,
      startDate: readDate(pick(raw, 'startDate', 'fechaInicio', 'inicio'), 'startDate', extra),
      endDate: readDate(pick(raw, 'endDate', 'fechaFin', 'fin'), 'endDate', extra),
      budgetAmount: budget !== undefined && budget >= 0 ? budget : 0,
      forecastAmount: forecast !== undefined && forecast >= 0 ? forecast : (budget !== undefined && budget >= 0 ? budget : 0),
      riskLevel: risk.value, plannerPlanId: ''
    };
    if (item.startDate && item.endDate && item.endDate < item.startDate) {
      extra.push({ key: 'import.warn.endBeforeStart' });
      item.endDate = '';
    }
    projects.push(finish(item.projectId, item, common, extra, validateProject(item), exists(ctx.existing.projects, item.title)));
  });

  const findProject = (title: string): { id: string; initiativeId: string } | undefined => {
    if (!title) {
      return undefined;
    }
    const inPlan = projects.filter(d => norm(d.item.title) === norm(title))[0];
    if (inPlan) {
      return { id: inPlan.item.projectId, initiativeId: inPlan.item.initiativeId ?? '' };
    }
    const existing = ctx.existing.projects.filter(p => norm(p.title) === norm(title))[0];
    return existing ? { id: existing.id, initiativeId: existing.initiativeId ?? '' } : undefined;
  };

  // ----- ideas -----
  const ideas: Array<IDraft<Idea>> = [];
  asObjects(pick(parsed, 'ideas')).forEach((raw, index) => {
    const common = readCommon(raw, ctx);
    if (!common) {
      problems.push({ key: 'import.warn.itemWithoutTitle', params: { section: 'ideas', position: index + 1 } });
      return;
    }
    const extra: IImportWarning[] = [];
    const value = asNumber(pick(raw, 'estimatedValue', 'valorEstimado', 'value', 'valor'));
    const tagsRaw = pick(raw, 'tags', 'etiquetas');
    const tags = (Array.isArray(tagsRaw) ? tagsRaw.map(asText) : asText(tagsRaw).split(/[;,]/)).map(s => s.trim()).filter(Boolean);
    const item: Idea = {
      ideaId: newId('IDEA'), title: common.title, description: common.description, status: IdeaStatus.NEW, ownerUpn: common.ownerEmail, sponsorUpn: '',
      estimatedValue: value !== undefined && value >= 0 ? value : 0,
      targetDate: readDate(pick(raw, 'targetDate', 'fechaObjetivo', 'fecha'), 'targetDate', extra), tags
    };
    ideas.push(finish(item.ideaId, item, common, extra, validateIdea(item), exists(ctx.existing.ideas, item.title)));
  });

  // ----- actions -----
  const actions: Array<IDraft<ActionItem>> = [];
  asObjects(pick(parsed, 'actions', 'acciones', 'tasks', 'tareas')).forEach((raw, index) => {
    const common = readCommon(raw, ctx);
    if (!common) {
      problems.push({ key: 'import.warn.itemWithoutTitle', params: { section: 'actions', position: index + 1 } });
      return;
    }
    const extra: IImportWarning[] = [];
    const priority = toEnum(pick(raw, 'priority', 'prioridad'), PRIORITIES, ActionPriority.MEDIUM);
    if (!priority.recognised) {
      extra.push({ key: 'import.warn.valueUnknown', params: { field: 'priority', value: asText(pick(raw, 'priority', 'prioridad')) } });
    }
    const projectTitle = asText(pick(raw, 'project', 'proyecto'));
    const initiativeTitle = asText(pick(raw, 'initiative', 'iniciativa'));
    const project = findProject(projectTitle);
    let initiative = findInitiative(initiativeTitle);
    if (projectTitle && !project) {
      extra.push({ key: 'import.warn.linkUnresolved', params: { kind: 'project', title: projectTitle } });
    }
    if (initiativeTitle && !initiative) {
      extra.push({ key: 'import.warn.linkUnresolved', params: { kind: 'initiative', title: initiativeTitle } });
    }
    // An action linked to a project belongs to that project's initiative when none was given.
    if (!initiative && project && project.initiativeId) {
      initiative = { id: project.initiativeId, known: true };
    }
    const item: ActionItem = {
      actionId: newId('ACT'), initiativeId: initiative ? initiative.id : '', projectId: project ? project.id : '',
      title: common.title, description: common.description, status: ActionStatus.OPEN, priority: priority.value, ownerUpn: common.ownerEmail,
      dueDate: readDate(pick(raw, 'dueDate', 'fechaLimite', 'fecha', 'deadline'), 'dueDate', extra), completedDate: '', plannerTaskId: ''
    };
    actions.push(finish(item.actionId, item, common, extra, validateAction(item), exists(ctx.existing.actions, item.title)));
  });

  /** Project and initiative links shared by the sections that have both. An initiative follows its project. */
  const readLinks = (raw: Record<string, unknown>, extra: IImportWarning[]): { projectId: string; initiativeId: string } => {
    const projectTitle = asText(pick(raw, 'project', 'proyecto'));
    const initiativeTitle = asText(pick(raw, 'initiative', 'iniciativa'));
    const project = findProject(projectTitle);
    const initiative = findInitiative(initiativeTitle);
    if (projectTitle && !project) {
      extra.push({ key: 'import.warn.linkUnresolved', params: { kind: 'project', title: projectTitle } });
    }
    if (initiativeTitle && !initiative) {
      extra.push({ key: 'import.warn.linkUnresolved', params: { kind: 'initiative', title: initiativeTitle } });
    }
    return { projectId: project ? project.id : '', initiativeId: initiative ? initiative.id : (project ? project.initiativeId : '') };
  };

  // ----- risks -----
  const risks: Array<IDraft<Risk>> = [];
  asObjects(pick(parsed, 'risks', 'riesgos')).forEach((raw, index) => {
    const common = readCommon(raw, ctx);
    if (!common) {
      problems.push({ key: 'import.warn.itemWithoutTitle', params: { section: 'risks', position: index + 1 } });
      return;
    }
    const extra: IImportWarning[] = [];
    const probability = toEnum(pick(raw, 'probability', 'probabilidad'), RISK_SCALE, RiskScale.MEDIUM);
    const impact = toEnum(pick(raw, 'impact', 'impacto'), RISK_SCALE, RiskScale.MEDIUM);
    if (!probability.recognised) {
      extra.push({ key: 'import.warn.valueUnknown', params: { field: 'probability', value: asText(pick(raw, 'probability', 'probabilidad')) } });
    }
    if (!impact.recognised) {
      extra.push({ key: 'import.warn.valueUnknown', params: { field: 'impact', value: asText(pick(raw, 'impact', 'impacto')) } });
    }
    const links = readLinks(raw, extra);
    const item: Risk = {
      riskId: newId('RISK'), title: common.title, description: common.description, status: RiskStatus.OPEN, probability: probability.value, impact: impact.value,
      ownerUpn: common.ownerEmail, mitigation: asText(pick(raw, 'mitigation', 'mitigacion')),
      dueDate: readDate(pick(raw, 'dueDate', 'fechaLimite', 'fecha'), 'dueDate', extra),
      projectId: links.projectId, initiativeId: links.initiativeId, meetingId: meetingItem.meetingId
    };
    risks.push(finish(item.riskId, item, common, extra, validateRisk(item), exists(ctx.existing.risks ?? [], item.title)));
  });

  // ----- decisions -----
  // A decision stated in a meeting is already taken, so it is created as DECIDED with the meeting's date.
  const decisions: Array<IDraft<Decision>> = [];
  asObjects(pick(parsed, 'decisions', 'decisiones')).forEach((raw, index) => {
    const base = readCommon(raw, ctx);
    if (!base) {
      problems.push({ key: 'import.warn.itemWithoutTitle', params: { section: 'decisions', position: index + 1 } });
      return;
    }
    const extra: IImportWarning[] = [];
    // The person who decided: an email is used; a name is looked up later; with none, it stays empty.
    const deciderText = asText(pick(raw, 'decidedBy', 'decididaPor', 'owner', 'responsable'));
    const decider = EMAIL.test(deciderText) ? deciderText : '';
    const deciderName = deciderText !== '' && decider === '' ? deciderText : undefined;
    if (deciderName) {
      extra.push({ key: 'import.warn.deciderUnresolved', params: { name: deciderName } });
    }
    const common: ICommon = { ...base, warnings: base.warnings.filter(w => w.key !== 'import.warn.ownerUnresolved'), ownerName: deciderName };
    const links = readLinks(raw, extra);
    const item: Decision = {
      decisionId: newId('DEC'), title: common.title, description: common.description, rationale: asText(pick(raw, 'rationale', 'motivo', 'porque')),
      status: DecisionStatus.DECIDED, decidedBy: decider, decisionDate: meetingItem.meetingDate,
      projectId: links.projectId, initiativeId: links.initiativeId, meetingId: meetingItem.meetingId
    };
    decisions.push(finish(item.decisionId, item, common, extra, validateDecision(item), exists(ctx.existing.decisions ?? [], item.title)));
  });

  // ----- lessons learned -----
  const lessons: Array<IDraft<Lesson>> = [];
  asObjects(pick(parsed, 'lessons', 'lecciones', 'leccionesAprendidas')).forEach((raw, index) => {
    const common = readCommon(raw, ctx);
    if (!common) {
      problems.push({ key: 'import.warn.itemWithoutTitle', params: { section: 'lessons', position: index + 1 } });
      return;
    }
    const extra: IImportWarning[] = [];
    const category = toEnum(pick(raw, 'category', 'categoria'), LESSON_CATEGORIES, LessonCategory.OTHER);
    if (!category.recognised) {
      extra.push({ key: 'import.warn.valueUnknown', params: { field: 'category', value: asText(pick(raw, 'category', 'categoria')) } });
    }
    const links = readLinks(raw, extra);
    const item: Lesson = {
      lessonId: newId('LESS'), title: common.title, description: common.description, recommendation: asText(pick(raw, 'recommendation', 'recomendacion')),
      category: category.value, status: LessonStatus.NEW, ownerUpn: common.ownerEmail,
      projectId: links.projectId, initiativeId: links.initiativeId, meetingId: meetingItem.meetingId
    };
    lessons.push(finish(item.lessonId, item, common, extra, validateLesson(item), exists(ctx.existing.lessons ?? [], item.title)));
  });

  // ----- notes -----
  const notes: Array<IDraft<Note>> = [];
  asObjects(pick(parsed, 'notes', 'notas')).forEach((raw, index) => {
    const common = readCommon(raw, ctx);
    if (!common) {
      problems.push({ key: 'import.warn.itemWithoutTitle', params: { section: 'notes', position: index + 1 } });
      return;
    }
    const extra: IImportWarning[] = [];
    const category = toEnum(pick(raw, 'category', 'categoria', 'type', 'tipo'), CATEGORIES, NoteCategory.INFO);
    if (!category.recognised) {
      extra.push({ key: 'import.warn.valueUnknown', params: { field: 'category', value: asText(pick(raw, 'category', 'categoria', 'type', 'tipo')) } });
    }
    const projectTitle = asText(pick(raw, 'project', 'proyecto'));
    const initiativeTitle = asText(pick(raw, 'initiative', 'iniciativa'));
    const project = findProject(projectTitle);
    const initiative = findInitiative(initiativeTitle);
    if (projectTitle && !project) {
      extra.push({ key: 'import.warn.linkUnresolved', params: { kind: 'project', title: projectTitle } });
    }
    if (initiativeTitle && !initiative) {
      extra.push({ key: 'import.warn.linkUnresolved', params: { kind: 'initiative', title: initiativeTitle } });
    }
    const body = asText(pick(raw, 'body', 'contenido', 'text', 'texto', 'description', 'descripcion'));
    const item: Note = {
      noteId: newId('NOTE'), title: common.title, body, category: category.value, status: NoteStatus.ACTIVE, meetingId: meetingItem.meetingId,
      initiativeId: initiative ? initiative.id : (project ? project.initiativeId : ''), projectId: project ? project.id : ''
    };
    // A note has no owner, so an unresolved owner is not relevant.
    const noteCommon: ICommon = { ...common, warnings: common.warnings.filter(w => w.key !== 'import.warn.ownerUnresolved'), ownerName: undefined };
    notes.push(finish(item.noteId, item, noteCommon, extra, validateNote(item), exists(ctx.existing.notes, item.title)));
  });

  if (initiatives.length + projects.length + ideas.length + actions.length + risks.length + decisions.length + lessons.length + notes.length === 0) {
    problems.push({ key: 'import.warn.nothingFound' });
  }

  return { meeting, initiatives, projects, ideas, actions, risks, decisions, lessons, notes, problems };
};

// ------------------------------------------------------------------ owners

/** Distinct owner names the AI gave that are not emails yet. */
export const collectOwnerNames = (plan: IImportPlan): string[] => {
  const names: string[] = [];
  const add = (name: string | undefined): void => {
    if (name && names.indexOf(name) === -1) {
      names.push(name);
    }
  };
  plan.initiatives.forEach(d => add(d.ownerName));
  plan.projects.forEach(d => add(d.ownerName));
  plan.ideas.forEach(d => add(d.ownerName));
  plan.actions.forEach(d => add(d.ownerName));
  plan.risks.forEach(d => add(d.ownerName));
  plan.lessons.forEach(d => add(d.ownerName));
  plan.decisions.forEach(d => add(d.ownerName));
  return names;
};

const resolveIn = <T extends { ownerUpn: string }>(drafts: Array<IDraft<T>>, resolved: Record<string, string | undefined>): Array<IDraft<T>> =>
  drafts.map(draft => {
    const email = draft.ownerName ? resolved[draft.ownerName] : undefined;
    if (!draft.ownerName || !email) {
      return draft;
    }
    return {
      ...draft,
      ownerName: undefined,
      item: { ...draft.item, ownerUpn: email },
      warnings: draft.warnings.filter(w => w.key !== 'import.warn.ownerUnresolved')
    };
  });

/** Same for decisions, where the person found is the one who decided. */
const resolveDeciders = (drafts: Array<IDraft<Decision>>, resolved: Record<string, string | undefined>): Array<IDraft<Decision>> =>
  drafts.map(draft => {
    const email = draft.ownerName ? resolved[draft.ownerName] : undefined;
    if (!draft.ownerName || !email) {
      return draft;
    }
    return {
      ...draft,
      ownerName: undefined,
      item: { ...draft.item, decidedBy: email },
      warnings: draft.warnings.filter(w => w.key !== 'import.warn.deciderUnresolved')
    };
  });

/** Applies directory matches (name -> email, only for unique matches) and drops the warnings they fix. */
export const applyResolvedOwners = (plan: IImportPlan, resolved: Record<string, string | undefined>): IImportPlan => ({
  ...plan,
  initiatives: resolveIn(plan.initiatives, resolved),
  projects: resolveIn(plan.projects, resolved),
  ideas: resolveIn(plan.ideas, resolved),
  actions: resolveIn(plan.actions, resolved),
  risks: resolveIn(plan.risks, resolved),
  lessons: resolveIn(plan.lessons, resolved),
  decisions: resolveDeciders(plan.decisions, resolved)
});

export const countIncluded = (plan: IImportPlan): number =>
  IMPORT_KINDS.reduce((sum, kind) => sum + (plan[kind] as Array<IDraft<unknown>>).filter(d => d.include).length, 0);
