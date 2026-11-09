import { AppConfig } from '../config/AppConfig';
import { CatalogEntry, CatalogKind, CatalogStatus, Country, NpsFollowUp, NpsResponse, ServiceMonth } from '../models';
import { addDays, dayKeyFromValue, toDayKey } from './dates';

/** Rules for the NPS, the monthly service figures and the classification catalogue. Pure, so they are tested without a screen. */

// ---------------------------------------------------------------- NPS

export type NpsCategory = 'PROMOTER' | 'PASSIVE' | 'DETRACTOR';

/** 9 and 10 promote, 7 and 8 are passive, 0 to 6 detract. */
export const npsCategory = (score: number): NpsCategory => (score >= 9 ? 'PROMOTER' : score >= 7 ? 'PASSIVE' : 'DETRACTOR');

export const isValidNpsScore = (score: number): boolean => isFinite(score) && Math.floor(score) === score && score >= 0 && score <= 10;

export interface INpsBreakdown {
  total: number;
  promoters: number;
  passives: number;
  detractors: number;
  /** % promoters minus % detractors, rounded; undefined without responses. */
  score: number | undefined;
}

export const npsBreakdown = (responses: Array<Pick<NpsResponse, 'score'>>): INpsBreakdown => {
  const total = responses.length;
  const count = (category: NpsCategory): number => responses.filter(r => npsCategory(r.score) === category).length;
  const promoters = count('PROMOTER');
  const detractors = count('DETRACTOR');
  return {
    total, promoters, passives: total - promoters - detractors, detractors,
    score: total === 0 ? undefined : Math.round(((promoters - detractors) / total) * 100)
  };
};

/** A detractor starts waiting for a call; anyone else needs none. */
export const defaultFollowUp = (score: number): NpsFollowUp => (npsCategory(score) === 'DETRACTOR' ? NpsFollowUp.PENDING : NpsFollowUp.NOT_REQUIRED);

const FOLLOW_UP_TRANSITIONS: Record<NpsFollowUp, NpsFollowUp[]> = {
  [NpsFollowUp.NOT_REQUIRED]: [NpsFollowUp.PENDING],
  [NpsFollowUp.PENDING]: [NpsFollowUp.CONTACTED, NpsFollowUp.CLOSED, NpsFollowUp.NOT_REQUIRED],
  [NpsFollowUp.CONTACTED]: [NpsFollowUp.CLOSED, NpsFollowUp.PENDING],
  [NpsFollowUp.CLOSED]: [NpsFollowUp.CONTACTED]
};

export const getAllowedNpsFollowUps = (current: NpsFollowUp): NpsFollowUp[] => [current].concat(FOLLOW_UP_TRANSITIONS[current]);

/**
 * What must follow from a change: a score that is a detractor and has no follow-up yet waits for a
 * call, a score that is not a detractor does not, and the day of the call is filled in (today)
 * when the person is contacted or the case closed.
 */
export const applyNpsEffects = (response: NpsResponse, now: Date = new Date()): NpsResponse => {
  const detractor = npsCategory(response.score) === 'DETRACTOR';
  let next = response;
  if (detractor && response.status === NpsFollowUp.NOT_REQUIRED) {
    next = { ...next, status: NpsFollowUp.PENDING };
  } else if (!detractor && response.status === NpsFollowUp.PENDING) {
    next = { ...next, status: NpsFollowUp.NOT_REQUIRED };
  }
  if ((next.status === NpsFollowUp.CONTACTED || next.status === NpsFollowUp.CLOSED) && !next.followUpDate) {
    next = { ...next, followUpDate: toDayKey(now) };
  }
  return next;
};

/** A detractor nobody has called yet. */
export const isCallPending = (response: Pick<NpsResponse, 'status'>): boolean => response.status === NpsFollowUp.PENDING;

/** Waiting for a call for longer than the allowed days since the answer (the last day of the period is still in time). */
export const isCallOverdue = (response: NpsResponse, now: Date = new Date(), days: number = AppConfig.service.npsFollowUpDays): boolean => {
  const answered = dayKeyFromValue(response.respondedOn);
  return isCallPending(response) && !!answered && addDays(answered, days) < toDayKey(now);
};

/** The answers given in the last `days` days, today included. */
export const responsesInLastDays = (responses: NpsResponse[], days: number, now: Date = new Date()): NpsResponse[] => {
  const from = addDays(toDayKey(now), -(days - 1));
  return responses.filter(r => {
    const answered = dayKeyFromValue(r.respondedOn);
    return !!answered && answered >= from && answered <= toDayKey(now);
  });
};

export interface INpsMonth {
  /** YYYY-MM. */
  month: string;
  breakdown: INpsBreakdown;
}

/** The NPS of each month that has answers, oldest first. */
export const npsByMonth = (responses: NpsResponse[]): INpsMonth[] => {
  const groups: Record<string, NpsResponse[]> = {};
  responses.forEach(r => {
    const answered = dayKeyFromValue(r.respondedOn);
    if (answered) {
      const month = answered.slice(0, 7);
      groups[month] = (groups[month] ?? []).concat(r);
    }
  });
  return Object.keys(groups).sort().map(month => ({ month, breakdown: npsBreakdown(groups[month]) }));
};

// ---------------------------------------------------------------- monthly figures

/** Share of the contacts that were recorded as interactions, in %; undefined when there were none. */
export const interactionShare = (month: Pick<ServiceMonth, 'incidents' | 'interactions'>): number | undefined => {
  const contacts = month.incidents + month.interactions;
  return contacts > 0 ? Math.round((month.interactions / contacts) * 100) : undefined;
};

/** Incidents plus interactions for every 100 people served, with one decimal; undefined without the number of users. */
export const contactsPer100Users = (month: Pick<ServiceMonth, 'incidents' | 'interactions' | 'users'>): number | undefined =>
  month.users > 0 ? Math.round(((month.incidents + month.interactions) / month.users) * 1000) / 10 : undefined;

export type SlaLevel = 'OK' | 'LOW' | 'UNKNOWN';

export const slaLevel = (month: Pick<ServiceMonth, 'slaPct'>, target: number = AppConfig.service.slaTarget): SlaLevel =>
  month.slaPct === undefined ? 'UNKNOWN' : month.slaPct < target ? 'LOW' : 'OK';

/** The most recent month reported for each country. */
export const latestByCountry = (months: ServiceMonth[]): Partial<Record<Country, ServiceMonth>> => {
  const latest: Partial<Record<Country, ServiceMonth>> = {};
  months.forEach(m => {
    const current = latest[m.country];
    if (m.period && (!current || !current.period || m.period > current.period)) {
      latest[m.country] = m;
    }
  });
  return latest;
};

// ---------------------------------------------------------------- classification catalogue

/** Lower case without accents, so "Contraseña" and "contrasena" match. */
export const normaliseText = (value: string): string => value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** The words that identify an entry, one by one. */
export const catalogKeywords = (entry: Pick<CatalogEntry, 'keywords'>): string[] =>
  entry.keywords.split(/[,;\n]/).map(word => normaliseText(word.trim())).filter(Boolean);

export interface ICatalogMatch {
  entry: CatalogEntry;
  /** The keywords of the entry found in the text. */
  matched: string[];
}

/** The active entries whose keywords appear in the text, the ones with more matches first. */
export const classifyText = (text: string, entries: CatalogEntry[]): ICatalogMatch[] => {
  const haystack = normaliseText(text);
  if (haystack.trim().length === 0) {
    return [];
  }
  return entries
    .filter(entry => entry.status === CatalogStatus.ACTIVE)
    .map(entry => ({ entry, matched: catalogKeywords(entry).filter(word => haystack.indexOf(word) > -1) }))
    .filter(match => match.matched.length > 0)
    .sort((a, b) => b.matched.length - a.matched.length || a.entry.title.localeCompare(b.entry.title));
};

/** The kind most of the matches agree on, or undefined when there are none. */
export const suggestedKind = (matches: ICatalogMatch[]): CatalogKind | undefined => (matches.length > 0 ? matches[0].entry.kind : undefined);
