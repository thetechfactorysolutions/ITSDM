import { AppConfig } from '../config/AppConfig';
import {
  ChangeRequest, ChangeStatus, Incident, IncidentSeverity, IncidentStatus, Interaction, InteractionStatus, Kpi, KpiDirection, KpiStatus
} from '../models';
import { addDays, dayKeyFromValue, toDayKey } from './dates';
import { daysBetween } from './finance';

/** Rules for incidents, changes, interactions and KPIs. Pure, so they are tested without a screen. */

// ---------------------------------------------------------------- incidents

/** Not yet resolved: still needs work. */
export const isIncidentOpen = (status: IncidentStatus): boolean => status !== IncidentStatus.RESOLVED && status !== IncidentStatus.CLOSED;

/** The last day by which the incident should be resolved: the day it was reported plus the days allowed for its severity. */
export const incidentDueDate = (incident: Pick<Incident, 'reportedOn' | 'severity'>): string | undefined => {
  const reported = dayKeyFromValue(incident.reportedOn);
  return reported ? addDays(reported, AppConfig.service.slaDays[incident.severity]) : undefined;
};

/** An unresolved incident is overdue when today is after its due date (the due day itself is still in time). */
export const isIncidentOverdue = (incident: Incident, now: Date = new Date()): boolean => {
  const due = incidentDueDate(incident);
  return isIncidentOpen(incident.status) && !!due && toDayKey(now) > due;
};

/** Days since it was reported: until today while open, until the resolution date once resolved. */
export const incidentDaysOpen = (incident: Incident, now: Date = new Date()): number | undefined => {
  const reported = dayKeyFromValue(incident.reportedOn);
  if (!reported) {
    return undefined;
  }
  const end = !isIncidentOpen(incident.status) && dayKeyFromValue(incident.resolvedOn) ? (dayKeyFromValue(incident.resolvedOn) as string) : toDayKey(now);
  return Math.max(0, daysBetween(reported, end));
};

/** The resolution date (today) is filled in when an incident is resolved, and cleared when it is reopened. */
export const applyIncidentEffects = (incident: Incident, previousStatus: IncidentStatus | undefined, now: Date = new Date()): Incident => {
  const wasOpen = previousStatus === undefined || isIncidentOpen(previousStatus);
  if (!isIncidentOpen(incident.status) && wasOpen && !incident.resolvedOn) {
    return { ...incident, resolvedOn: toDayKey(now) };
  }
  if (isIncidentOpen(incident.status) && previousStatus !== undefined && !isIncidentOpen(previousStatus)) {
    return { ...incident, resolvedOn: '' };
  }
  return incident;
};

// ---------------------------------------------------------------- changes

/** The implementation date (today) is filled in when a change becomes IMPLEMENTED, if empty. */
export const applyChangeEffects = (change: ChangeRequest, previousStatus: ChangeStatus | undefined, now: Date = new Date()): ChangeRequest =>
  change.status === ChangeStatus.IMPLEMENTED && previousStatus !== ChangeStatus.IMPLEMENTED && !change.implementedDate
    ? { ...change, implementedDate: toDayKey(now) }
    : change;

// ---------------------------------------------------------------- interactions

/** A follow-up is overdue when the interaction waits for one and its date has passed. */
export const isFollowUpOverdue = (interaction: Interaction, now: Date = new Date()): boolean => {
  const due = dayKeyFromValue(interaction.followUpDate);
  return interaction.status === InteractionStatus.FOLLOW_UP && !!due && due < toDayKey(now);
};

// ---------------------------------------------------------------- KPIs

export type KpiHealth = 'ON_TARGET' | 'AT_RISK' | 'OFF_TARGET';
export type KpiTrend = 'IMPROVING' | 'WORSENING' | 'STABLE' | 'UNKNOWN';

/**
 * ON_TARGET when the current value meets the target; AT_RISK when it is within the tolerance
 * (10% by default) of it; OFF_TARGET otherwise. For "higher is better" the margin is below the
 * target, for "lower is better" it is above it.
 */
export const kpiHealth = (kpi: Pick<Kpi, 'direction' | 'target' | 'currentValue'>, tolerance: number = AppConfig.service.kpiTolerance): KpiHealth => {
  if (kpi.direction === KpiDirection.HIGHER) {
    return kpi.currentValue >= kpi.target ? 'ON_TARGET' : kpi.currentValue >= kpi.target * (1 - tolerance) ? 'AT_RISK' : 'OFF_TARGET';
  }
  return kpi.currentValue <= kpi.target ? 'ON_TARGET' : kpi.currentValue <= kpi.target * (1 + tolerance) ? 'AT_RISK' : 'OFF_TARGET';
};

/** Whether the value moved the right way compared with the previous one. UNKNOWN without a previous value. */
export const kpiTrend = (kpi: Pick<Kpi, 'direction' | 'currentValue' | 'previousValue'>): KpiTrend => {
  if (kpi.previousValue === undefined || !isFinite(kpi.previousValue)) {
    return 'UNKNOWN';
  }
  if (kpi.currentValue === kpi.previousValue) {
    return 'STABLE';
  }
  const increased = kpi.currentValue > kpi.previousValue;
  return (increased && kpi.direction === KpiDirection.HIGHER) || (!increased && kpi.direction === KpiDirection.LOWER) ? 'IMPROVING' : 'WORSENING';
};

export const isActiveKpi = (kpi: Pick<Kpi, 'status'>): boolean => kpi.status === KpiStatus.ACTIVE;

/**
 * When the current value changes on save, the old one becomes the previous value and the
 * measurement date is today. Any other edit leaves both untouched.
 */
export const applyKpiMeasurement = (kpi: Kpi, original: Kpi | undefined, now: Date = new Date()): Kpi => {
  if (!original || kpi.currentValue === original.currentValue) {
    return kpi;
  }
  return { ...kpi, previousValue: original.currentValue, measuredOn: toDayKey(now) };
};

// ---------------------------------------------------------------- status changes

const INCIDENT_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  [IncidentStatus.NEW]: [IncidentStatus.IN_PROGRESS, IncidentStatus.ON_HOLD, IncidentStatus.RESOLVED],
  [IncidentStatus.IN_PROGRESS]: [IncidentStatus.ON_HOLD, IncidentStatus.RESOLVED],
  [IncidentStatus.ON_HOLD]: [IncidentStatus.IN_PROGRESS, IncidentStatus.RESOLVED],
  [IncidentStatus.RESOLVED]: [IncidentStatus.CLOSED, IncidentStatus.IN_PROGRESS],
  [IncidentStatus.CLOSED]: [IncidentStatus.IN_PROGRESS]
};

const CHANGE_TRANSITIONS: Record<ChangeStatus, ChangeStatus[]> = {
  [ChangeStatus.DRAFT]: [ChangeStatus.SUBMITTED],
  [ChangeStatus.SUBMITTED]: [ChangeStatus.APPROVED, ChangeStatus.REJECTED, ChangeStatus.DRAFT],
  [ChangeStatus.APPROVED]: [ChangeStatus.IMPLEMENTED, ChangeStatus.SUBMITTED],
  [ChangeStatus.REJECTED]: [ChangeStatus.DRAFT],
  [ChangeStatus.IMPLEMENTED]: []
};

const INTERACTION_TRANSITIONS: Record<InteractionStatus, InteractionStatus[]> = {
  [InteractionStatus.LOGGED]: [InteractionStatus.FOLLOW_UP, InteractionStatus.DONE],
  [InteractionStatus.FOLLOW_UP]: [InteractionStatus.LOGGED, InteractionStatus.DONE],
  [InteractionStatus.DONE]: [InteractionStatus.LOGGED, InteractionStatus.FOLLOW_UP]
};

const KPI_TRANSITIONS: Record<KpiStatus, KpiStatus[]> = {
  [KpiStatus.ACTIVE]: [KpiStatus.RETIRED],
  [KpiStatus.RETIRED]: [KpiStatus.ACTIVE]
};

/** The current status plus every status it may move to. */
export const getAllowedIncidentStatuses = (current: IncidentStatus): IncidentStatus[] => [current].concat(INCIDENT_TRANSITIONS[current]);
export const getAllowedChangeStatuses = (current: ChangeStatus): ChangeStatus[] => [current].concat(CHANGE_TRANSITIONS[current]);
export const getAllowedInteractionStatuses = (current: InteractionStatus): InteractionStatus[] => [current].concat(INTERACTION_TRANSITIONS[current]);
export const getAllowedKpiStatuses = (current: KpiStatus): KpiStatus[] => [current].concat(KPI_TRANSITIONS[current]);

/** Severities from the least to the most serious, for sorting. */
export const SEVERITY_ORDER: IncidentSeverity[] = [IncidentSeverity.LOW, IncidentSeverity.MEDIUM, IncidentSeverity.HIGH, IncidentSeverity.CRITICAL];
