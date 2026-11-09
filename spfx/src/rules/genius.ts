import { CatalogEntry, CatalogStatus, GeniusSession, GeniusStatus } from '../models';
import { dayKeyFromValue, toDayKey } from './dates';

/** Rules for the Genius Help Desk sessions. Pure, so they are tested without a screen. */

const TRANSITIONS: Record<GeniusStatus, GeniusStatus[]> = {
  [GeniusStatus.IDEA]: [GeniusStatus.PLANNED, GeniusStatus.CANCELLED],
  [GeniusStatus.PLANNED]: [GeniusStatus.DELIVERED, GeniusStatus.IDEA, GeniusStatus.CANCELLED],
  [GeniusStatus.DELIVERED]: [GeniusStatus.PLANNED],
  [GeniusStatus.CANCELLED]: [GeniusStatus.IDEA]
};

export const getAllowedGeniusStatuses = (current: GeniusStatus): GeniusStatus[] => [current].concat(TRANSITIONS[current]);

export const isDelivered = (session: Pick<GeniusSession, 'status'>): boolean => session.status === GeniusStatus.DELIVERED;

/** % of the invited people who came; undefined when nobody was invited. */
export const attendanceRate = (session: Pick<GeniusSession, 'invited' | 'attended'>): number | undefined =>
  session.invited > 0 ? Math.round((session.attended / session.invited) * 100) : undefined;

/** A planned session whose day has passed: it should have been marked as delivered or cancelled. */
export const isSessionLate = (session: GeniusSession, now: Date = new Date()): boolean => {
  const day = dayKeyFromValue(session.sessionDate);
  return session.status === GeniusStatus.PLANNED && !!day && day < toDayKey(now);
};

/** The date (today) is filled in when a session is marked as delivered without one. */
export const applyGeniusEffects = (session: GeniusSession, now: Date = new Date()): GeniusSession =>
  session.status === GeniusStatus.DELIVERED && !session.sessionDate ? { ...session, sessionDate: toDayKey(now) } : session;

export interface IGeniusImpact {
  delivered: number;
  attendees: number;
  /** Mean of the attendance rates of the sessions that had invitations; undefined when none did. */
  averageAttendance: number | undefined;
  /** Mean rating of the delivered sessions that were rated, with one decimal; undefined when none was. */
  averageSatisfaction: number | undefined;
  rated: number;
}

/**
 * What the delivered sessions add up to: participation and satisfaction. It does not claim that any
 * interaction was avoided; that cannot be known from these numbers.
 */
export const geniusImpact = (sessions: GeniusSession[]): IGeniusImpact => {
  const delivered = sessions.filter(isDelivered);
  const rates = delivered.map(attendanceRate).filter((r): r is number => r !== undefined);
  const ratings = delivered.map(s => s.satisfaction).filter((r): r is number => r !== undefined);
  // Mean rounded to 1 / scale: scale 1 gives whole numbers, 10 gives one decimal.
  const mean = (values: number[], scale: number): number | undefined =>
    values.length === 0 ? undefined : Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * scale) / scale;
  return {
    delivered: delivered.length,
    attendees: delivered.reduce((sum, s) => sum + s.attended, 0),
    averageAttendance: mean(rates, 1),
    averageSatisfaction: mean(ratings, 10),
    rated: ratings.length
  };
};

/** Active catalogue entries that no session (other than a cancelled one) has been planned for: topics worth teaching. */
export const topicsWithoutSession = (catalog: CatalogEntry[], sessions: GeniusSession[]): CatalogEntry[] => {
  const covered: Record<string, boolean> = {};
  sessions.filter(s => s.status !== GeniusStatus.CANCELLED && s.catalogId).forEach(s => { covered[s.catalogId as string] = true; });
  return catalog.filter(entry => entry.status === CatalogStatus.ACTIVE && !covered[entry.catalogId]);
};
