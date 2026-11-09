import {
  ActionItem, ActionStatus, Article, ArticleStatus, ChangeRequest, ChangeStatus, Contract, ContractStatus, Entitlement, EntitlementStatus, GeniusSession, GeniusStatus, Incident, Interaction, InteractionStatus,
  Matter, Project, StockItem, StockStatus, ProjectStatus, Review, ReviewStatus, Risk, Skill, Training, TrainingStatus
} from '../models';
import { addDays, dayKeyFromValue, fromDayKey, toDayKey } from './dates';
import { daysBetween } from './finance';
import { isActiveRisk } from './governance';
import { isMatterClosed } from './matters';
import { incidentDueDate, isIncidentOpen } from './operations';
import { isActiveSkill } from './people';

/** One calendar for every date in the app. Pure: it only reads the lists it is given. */

export type AgendaKind =
  | 'MATTER' | 'ACTION' | 'CONTRACT_RENEWAL' | 'CONTRACT_END' | 'ENTITLEMENT_RENEWAL' | 'ENTITLEMENT_END' | 'FOLLOW_UP' | 'REVIEW' | 'RISK'
  | 'TRAINING' | 'CERTIFICATION' | 'PROJECT_END' | 'ARTICLE_REVIEW' | 'CHANGE' | 'INCIDENT' | 'STOCK_ARRIVAL' | 'GENIUS';

/** How close the date is: past, today, within the next 7 days, or later. */
export type AgendaUrgency = 'OVERDUE' | 'TODAY' | 'SOON' | 'LATER';

export interface IAgendaEvent {
  /** Unique and stable: kind plus the business id (plus a suffix when one item has two dates). */
  key: string;
  /** YYYY-MM-DD. */
  date: string;
  kind: AgendaKind;
  title: string;
  urgency: AgendaUrgency;
}

export interface IAgendaInput {
  matters: Matter[];
  actions: ActionItem[];
  contracts: Contract[];
  entitlements: Entitlement[];
  interactions: Interaction[];
  reviews: Review[];
  risks: Risk[];
  trainings: Training[];
  skills: Skill[];
  projects: Project[];
  articles: Article[];
  changes: ChangeRequest[];
  incidents: Incident[];
  stock: StockItem[];
  genius: GeniusSession[];
}

export const AGENDA_KINDS: AgendaKind[] = [
  'MATTER', 'ACTION', 'INCIDENT', 'CONTRACT_RENEWAL', 'CONTRACT_END', 'ENTITLEMENT_RENEWAL', 'ENTITLEMENT_END', 'FOLLOW_UP', 'REVIEW', 'RISK', 'CHANGE',
  'PROJECT_END', 'STOCK_ARRIVAL', 'GENIUS', 'TRAINING', 'CERTIFICATION', 'ARTICLE_REVIEW'
];

/** Days ahead that count as "soon". */
export const SOON_DAYS = 7;

export const agendaUrgency = (date: string, now: Date = new Date()): AgendaUrgency => {
  const today = toDayKey(now);
  if (date < today) {
    return 'OVERDUE';
  }
  if (date === today) {
    return 'TODAY';
  }
  return daysBetween(today, date) <= SOON_DAYS ? 'SOON' : 'LATER';
};

/** Every dated thing that still needs attention, in date order. Finished or closed work is left out. */
export const buildAgenda = (input: IAgendaInput, now: Date = new Date()): IAgendaEvent[] => {
  const events: IAgendaEvent[] = [];
  const add = (kind: AgendaKind, id: string, title: string, value: string | undefined, suffix: string = ''): void => {
    const date = dayKeyFromValue(value);
    if (date) {
      events.push({ key: `${kind}:${id}${suffix}`, date, kind, title, urgency: agendaUrgency(date, now) });
    }
  };

  input.matters.filter(m => !isMatterClosed(m)).forEach(m => add('MATTER', m.matterId, m.title, m.dueDate));
  input.actions.filter(a => a.status !== ActionStatus.DONE && a.status !== ActionStatus.CANCELLED).forEach(a => add('ACTION', a.actionId, a.title, a.dueDate));
  input.incidents.filter(i => isIncidentOpen(i.status)).forEach(i => add('INCIDENT', i.incidentId, i.title, incidentDueDate(i)));

  input.contracts.filter(c => c.status === ContractStatus.ACTIVE).forEach(c => {
    const end = dayKeyFromValue(c.endDate);
    if (end) {
      // Once it has ended, the decision to renew is moot: only the lapsed end date is left to deal with.
      if (end >= toDayKey(now)) {
        add('CONTRACT_RENEWAL', c.contractId, c.title, addDays(end, -c.noticeDays));
      }
      add('CONTRACT_END', c.contractId, c.title, end);
    }
  });
  input.entitlements.filter(e => e.status === EntitlementStatus.ACTIVE).forEach(e => {
    const end = dayKeyFromValue(e.endDate);
    if (end) {
      if (end >= toDayKey(now)) {
        add('ENTITLEMENT_RENEWAL', e.entitlementId, e.title, addDays(end, -e.noticeDays));
      }
      add('ENTITLEMENT_END', e.entitlementId, e.title, end);
    }
  });

  input.interactions.filter(i => i.status === InteractionStatus.FOLLOW_UP).forEach(i => add('FOLLOW_UP', i.interactionId, i.title, i.followUpDate));
  input.reviews.filter(r => r.status === ReviewStatus.SCHEDULED).forEach(r => add('REVIEW', r.reviewId, r.title, r.reviewDate));
  input.risks.filter(isActiveRisk).forEach(r => add('RISK', r.riskId, r.title, r.dueDate));
  input.changes.filter(c => c.status === ChangeStatus.SUBMITTED || c.status === ChangeStatus.APPROVED).forEach(c => add('CHANGE', c.changeId, c.title, c.plannedDate));
  input.projects.filter(p => p.status !== ProjectStatus.COMPLETED && p.status !== ProjectStatus.CANCELLED).forEach(p => add('PROJECT_END', p.projectId, p.title, p.endDate));
  input.trainings.filter(t => t.status !== TrainingStatus.COMPLETED && t.status !== TrainingStatus.CANCELLED).forEach(t => add('TRAINING', t.trainingId, t.title, t.dueDate));
  input.skills.filter(s => isActiveSkill(s) && s.certification.trim()).forEach(s => add('CERTIFICATION', s.skillId, `${s.certification} · ${s.title}`, s.certificationExpiry));
  input.stock.filter(i => i.status === StockStatus.ACTIVE && i.onOrder > 0).forEach(i => add('STOCK_ARRIVAL', i.stockId, `${i.title} (${i.onOrder})`, i.expectedOn));
  input.genius.filter(g => g.status === GeniusStatus.PLANNED).forEach(g => add('GENIUS', g.sessionId, g.title, g.sessionDate));
  input.articles.filter(a => a.status === ArticleStatus.PUBLISHED).forEach(a => add('ARTICLE_REVIEW', a.articleId, a.title, a.reviewDate));

  const order = (kind: AgendaKind): number => AGENDA_KINDS.indexOf(kind);
  return events.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : order(a.kind) - order(b.kind) || a.title.localeCompare(b.title)));
};

/** The events of each day, by day key. */
export const eventsByDay = (events: IAgendaEvent[]): Record<string, IAgendaEvent[]> => {
  const days: Record<string, IAgendaEvent[]> = {};
  events.forEach(event => {
    days[event.date] = (days[event.date] ?? []).concat(event);
  });
  return days;
};

export interface IMonthCell {
  /** YYYY-MM-DD. */
  date: string;
  /** False for the days of the previous or next month that fill the first and last week. */
  inMonth: boolean;
}

/**
 * The weeks to draw for a month, each with seven days, starting on Monday. `month` is 0 for
 * January. The first and last weeks are completed with days of the neighbouring months.
 */
export const monthGrid = (year: number, month: number): IMonthCell[][] => {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const total = Math.ceil((lead + daysInMonth) / 7) * 7;
  const weeks: IMonthCell[][] = [];
  for (let index = 0; index < total; index++) {
    const date = new Date(year, month, 1 - lead + index);
    if (index % 7 === 0) {
      weeks.push([]);
    }
    weeks[weeks.length - 1].push({ date: toDayKey(date), inMonth: date.getMonth() === month });
  }
  return weeks;
};

/** The month (year and 0-based month) that follows or precedes the given one by `delta` months. */
export const shiftMonth = (year: number, month: number, delta: number): { year: number; month: number } => {
  const moved = new Date(year, month + delta, 1);
  return { year: moved.getFullYear(), month: moved.getMonth() };
};

/** The year and month of a day key; today's when the key is invalid. */
export const monthOf = (day: string, now: Date = new Date()): { year: number; month: number } => {
  const date = fromDayKey(day) ?? now;
  return { year: date.getFullYear(), month: date.getMonth() };
};
