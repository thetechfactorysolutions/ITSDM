import assert from 'node:assert/strict';
import {
  ChangeRequest, ChangeStatus, ChangeType, Incident, IncidentCategory, IncidentSeverity, IncidentStatus, Interaction, InteractionStatus, InteractionType, Kpi,
  KpiCategory, KpiDirection, KpiStatus, RiskScale
} from '../src/models';
import { addDays } from '../src/rules/dates';
import { evaluateChange } from '../src/rules/approvals';
import {
  applyChangeEffects, applyIncidentEffects, applyKpiMeasurement, getAllowedChangeStatuses, getAllowedIncidentStatuses, getAllowedInteractionStatuses,
  getAllowedKpiStatuses, incidentDaysOpen, incidentDueDate, isActiveKpi, isFollowUpOverdue, isIncidentOpen, isIncidentOverdue, kpiHealth, kpiTrend
} from '../src/rules/operations';
import { isClosedStatus } from '../src/rules/transitions';
import { hasErrors, validateChange, validateIncident, validateInteraction, validateKpi } from '../src/rules/validation';
import { buildChangePayload, buildIncidentPayload, buildInteractionPayload, buildKpiPayload } from '../src/entities/payloads';
import { mapChange, mapIncident, mapInteraction, mapKpi } from '../src/components/shared/mappers';

const day = (y: number, m: number, d: number, h: number = 12): Date => new Date(y, m - 1, d, h);

const incident = (o: Partial<Incident> = {}): Incident => ({
  incidentId: 'I-1', title: 'Incident', description: '', status: IncidentStatus.IN_PROGRESS, severity: IncidentSeverity.CRITICAL, category: IncidentCategory.APPLICATION,
  reportedBy: '', assignedTo: '', reportedOn: '2026-11-08', resolution: '', rootCause: '', ...o
});
const change = (o: Partial<ChangeRequest> = {}): ChangeRequest => ({
  changeId: 'C-1', title: 'Change', description: '', reason: '', status: ChangeStatus.SUBMITTED, changeType: ChangeType.NORMAL, risk: RiskScale.MEDIUM, backoutPlan: '', ownerUpn: 'a@b.com', ...o
});
const interaction = (o: Partial<Interaction> = {}): Interaction => ({
  interactionId: 'N-1', title: 'Call', type: InteractionType.CALL, status: InteractionStatus.FOLLOW_UP, contactName: '', contactEmail: '', organization: '', summary: '', nextSteps: '', ownerUpn: '', ...o
});
const kpi = (o: Partial<Kpi> = {}): Kpi => ({
  kpiId: 'K-1', title: 'Kpi', description: '', category: KpiCategory.SERVICE, status: KpiStatus.ACTIVE, unit: '%', direction: KpiDirection.HIGHER, target: 80, currentValue: 80, ownerUpn: '', ...o
});

// ---------------------------------------------------------------- incidents: plazos
const testDueDates = (): void => {
  const due = (severity: IncidentSeverity, reportedOn: string | undefined): string | undefined => incidentDueDate({ severity, reportedOn });
  assert.equal(due(IncidentSeverity.CRITICAL, '2026-11-08'), '2026-11-09', 'critical: 1 day');
  assert.equal(due(IncidentSeverity.HIGH, '2026-11-08'), '2026-11-11', 'high: 3 days');
  assert.equal(due(IncidentSeverity.MEDIUM, '2026-11-08'), '2026-11-15', 'medium: 7 days');
  assert.equal(due(IncidentSeverity.LOW, '2026-11-08'), '2026-11-22', 'low: 14 days');
  assert.equal(due(IncidentSeverity.HIGH, '2026-11-29'), '2026-12-02', 'across a month');
  assert.equal(due(IncidentSeverity.LOW, '2026-12-25'), '2027-01-08', 'across a year');
  assert.equal(due(IncidentSeverity.HIGH, undefined), undefined, 'no report date, no due date');
  assert.equal(due(IncidentSeverity.HIGH, ''), undefined);
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(addDays('not a date', 5), 'not a date');
};

const testOverdue = (): void => {
  const i = incident();
  assert.equal(isIncidentOverdue(i, day(2026, 11, 8)), false, 'the day it was reported');
  assert.equal(isIncidentOverdue(i, day(2026, 11, 9, 23)), false, 'the due day itself is still in time, even late in the day');
  assert.equal(isIncidentOverdue(i, day(2026, 11, 10, 0)), true, 'the day after the due day it is overdue');
  assert.equal(isIncidentOverdue(incident({ status: IncidentStatus.RESOLVED }), day(2026, 12, 1)), false, 'a resolved incident is never overdue');
  assert.equal(isIncidentOverdue(incident({ status: IncidentStatus.CLOSED }), day(2026, 12, 1)), false);
  assert.equal(isIncidentOverdue(incident({ status: IncidentStatus.ON_HOLD }), day(2026, 11, 10)), true, 'on hold still counts: the clock does not stop');
  assert.equal(isIncidentOverdue(incident({ reportedOn: '' }), day(2026, 12, 1)), false);
  assert.equal(isIncidentOpen(IncidentStatus.NEW) && isIncidentOpen(IncidentStatus.ON_HOLD), true);
  assert.equal(isIncidentOpen(IncidentStatus.RESOLVED) || isIncidentOpen(IncidentStatus.CLOSED), false);
};

const testDaysOpen = (): void => {
  assert.equal(incidentDaysOpen(incident(), day(2026, 11, 13)), 5, 'open: until today');
  assert.equal(incidentDaysOpen(incident({ status: IncidentStatus.RESOLVED, resolvedOn: '2026-11-10' }), day(2026, 12, 25)), 2, 'resolved: until the resolution date');
  assert.equal(incidentDaysOpen(incident({ status: IncidentStatus.RESOLVED, resolvedOn: '' }), day(2026, 11, 13)), 5, 'resolved without a date falls back to today');
  assert.equal(incidentDaysOpen(incident(), day(2026, 11, 1)), 0, 'never negative');
  assert.equal(incidentDaysOpen(incident({ reportedOn: '' }), day(2026, 11, 13)), undefined);
};

const testIncidentEffects = (): void => {
  const now = day(2026, 11, 20);
  assert.equal(applyIncidentEffects(incident({ status: IncidentStatus.RESOLVED }), IncidentStatus.IN_PROGRESS, now).resolvedOn, '2026-11-20');
  assert.equal(applyIncidentEffects(incident({ status: IncidentStatus.RESOLVED }), IncidentStatus.NEW, now).resolvedOn, '2026-11-20', 'straight from new to resolved');
  assert.equal(applyIncidentEffects(incident({ status: IncidentStatus.RESOLVED, resolvedOn: '2026-11-12' }), IncidentStatus.IN_PROGRESS, now).resolvedOn, '2026-11-12', 'a date typed by the user is kept');
  assert.equal(applyIncidentEffects(incident({ status: IncidentStatus.CLOSED, resolvedOn: '2026-11-12' }), IncidentStatus.RESOLVED, now).resolvedOn, '2026-11-12', 'closing keeps the resolution date');
  assert.equal(applyIncidentEffects(incident({ status: IncidentStatus.IN_PROGRESS, resolvedOn: '2026-11-12' }), IncidentStatus.RESOLVED, now).resolvedOn, '', 'reopening clears it');
  const same = incident({ status: IncidentStatus.IN_PROGRESS });
  assert.equal(applyIncidentEffects(same, IncidentStatus.NEW, now), same, 'nothing to do, same object');
};

const testIncidentTransitions = (): void => {
  assert.ok(getAllowedIncidentStatuses(IncidentStatus.NEW).indexOf(IncidentStatus.CLOSED) === -1, 'an incident is resolved before it is closed');
  assert.ok(getAllowedIncidentStatuses(IncidentStatus.IN_PROGRESS).indexOf(IncidentStatus.ON_HOLD) > -1);
  assert.ok(getAllowedIncidentStatuses(IncidentStatus.RESOLVED).indexOf(IncidentStatus.IN_PROGRESS) > -1, 'a resolved incident can be reopened');
  assert.ok(getAllowedIncidentStatuses(IncidentStatus.CLOSED).indexOf(IncidentStatus.IN_PROGRESS) > -1);
  assert.equal(getAllowedIncidentStatuses(IncidentStatus.ON_HOLD)[0], IncidentStatus.ON_HOLD, 'the current status comes first');
  for (const s of ['RESOLVED', 'CLOSED', 'IMPLEMENTED', 'RETIRED']) {
    assert.equal(isClosedStatus(s), true, s);
  }
  for (const s of ['NEW', 'IN_PROGRESS', 'ON_HOLD', 'SUBMITTED', 'APPROVED', 'FOLLOW_UP', 'LOGGED']) {
    assert.equal(isClosedStatus(s), false, s);
  }
};

// ---------------------------------------------------------------- changes
const testChanges = (): void => {
  assert.deepEqual(getAllowedChangeStatuses(ChangeStatus.DRAFT), [ChangeStatus.DRAFT, ChangeStatus.SUBMITTED]);
  assert.equal(getAllowedChangeStatuses(ChangeStatus.DRAFT).indexOf(ChangeStatus.APPROVED), -1, 'a draft must be submitted first');
  assert.deepEqual(getAllowedChangeStatuses(ChangeStatus.IMPLEMENTED), [ChangeStatus.IMPLEMENTED], 'implemented is final');
  assert.ok(getAllowedChangeStatuses(ChangeStatus.REJECTED).indexOf(ChangeStatus.DRAFT) > -1);

  const now = day(2026, 11, 8);
  assert.equal(applyChangeEffects(change({ status: ChangeStatus.IMPLEMENTED }), ChangeStatus.APPROVED, now).implementedDate, '2026-11-08');
  assert.equal(applyChangeEffects(change({ status: ChangeStatus.IMPLEMENTED, implementedDate: '2026-11-01' }), ChangeStatus.APPROVED, now).implementedDate, '2026-11-01');
  const approved = change({ status: ChangeStatus.APPROVED });
  assert.equal(applyChangeEffects(approved, ChangeStatus.SUBMITTED, now), approved);
};

const testChangeApprovalRule = (): void => {
  const ids = (r: { required: Array<{ id: string }> }): string[] => r.required.map(x => x.id);
  const toApproved = (o: Partial<ChangeRequest>): string[] => ids(evaluateChange('changes', change(o), change({ ...o, status: ChangeStatus.APPROVED })));

  assert.deepEqual(toApproved({ risk: RiskScale.HIGH }), ['change.approve'], 'a high-risk change needs a sign-off');
  assert.deepEqual(toApproved({ changeType: ChangeType.EMERGENCY, risk: RiskScale.LOW }), ['change.approve'], 'an emergency change does too, whatever its risk');
  assert.deepEqual(toApproved({ risk: RiskScale.MEDIUM }), [], 'a medium-risk normal change does not');
  assert.deepEqual(toApproved({ risk: RiskScale.LOW, changeType: ChangeType.STANDARD }), []);

  const high = change({ risk: RiskScale.HIGH, status: ChangeStatus.DRAFT });
  assert.deepEqual(ids(evaluateChange('changes', high, { ...high, status: ChangeStatus.SUBMITTED })), [], 'submitting is free');
  const approvedHigh = change({ risk: RiskScale.HIGH, status: ChangeStatus.APPROVED });
  assert.deepEqual(ids(evaluateChange('changes', approvedHigh, { ...approvedHigh, status: ChangeStatus.IMPLEMENTED })), [], 'implementing it does not ask again');
  assert.equal(evaluateChange('changes', undefined, change({ risk: RiskScale.HIGH, status: ChangeStatus.APPROVED })).needsExistingItem, true, 'cannot be created already approved');
};

// ---------------------------------------------------------------- interactions
const testFollowUps = (): void => {
  const now = day(2026, 11, 8, 15);
  assert.equal(isFollowUpOverdue(interaction({ followUpDate: '2026-11-07' }), now), true);
  assert.equal(isFollowUpOverdue(interaction({ followUpDate: '2026-11-08' }), now), false, 'due today is not overdue');
  assert.equal(isFollowUpOverdue(interaction({ followUpDate: '2026-11-07', status: InteractionStatus.DONE }), now), false, 'done is done');
  assert.equal(isFollowUpOverdue(interaction({ followUpDate: '2026-11-07', status: InteractionStatus.LOGGED }), now), false, 'only interactions waiting for a follow-up');
  assert.equal(isFollowUpOverdue(interaction({ followUpDate: '' }), now), false);
  assert.ok(getAllowedInteractionStatuses(InteractionStatus.DONE).indexOf(InteractionStatus.FOLLOW_UP) > -1, 'a done one can come back for a follow-up');
};

// ---------------------------------------------------------------- KPIs
const testKpiHealth = (): void => {
  assert.equal(kpiHealth(kpi({ currentValue: 80 })), 'ON_TARGET', 'meeting the target exactly');
  assert.equal(kpiHealth(kpi({ currentValue: 95 })), 'ON_TARGET');
  assert.equal(kpiHealth(kpi({ currentValue: 75 })), 'AT_RISK', 'within 10% below the target');
  assert.equal(kpiHealth(kpi({ currentValue: 71 })), 'OFF_TARGET');

  const lower = (current: number, target: number = 3): KpiHealth => kpiHealth(kpi({ direction: KpiDirection.LOWER, target, currentValue: current }));
  type KpiHealth = ReturnType<typeof kpiHealth>;
  assert.equal(lower(2), 'ON_TARGET', 'lower is better: under the target');
  assert.equal(lower(3), 'ON_TARGET');
  assert.equal(lower(3.2), 'AT_RISK', 'within 10% above the target');
  assert.equal(lower(3.5), 'OFF_TARGET');
  assert.equal(lower(0, 0), 'ON_TARGET', 'a target of zero is met by zero');
  assert.equal(lower(1, 0), 'OFF_TARGET', 'and missed by anything above');

  assert.equal(kpiHealth(kpi({ currentValue: 76 }), 0.2), 'AT_RISK', 'the tolerance can be changed');
  assert.equal(kpiHealth(kpi({ currentValue: 76 }), 0.01), 'OFF_TARGET');
  assert.equal(isActiveKpi(kpi()), true);
  assert.equal(isActiveKpi(kpi({ status: KpiStatus.RETIRED })), false);
  assert.deepEqual(getAllowedKpiStatuses(KpiStatus.RETIRED), [KpiStatus.RETIRED, KpiStatus.ACTIVE]);
};

const testKpiTrend = (): void => {
  assert.equal(kpiTrend(kpi({ currentValue: 82, previousValue: 78 })), 'IMPROVING', 'higher is better and it went up');
  assert.equal(kpiTrend(kpi({ currentValue: 70, previousValue: 78 })), 'WORSENING');
  assert.equal(kpiTrend(kpi({ direction: KpiDirection.LOWER, currentValue: 3, previousValue: 4 })), 'IMPROVING', 'lower is better and it went down');
  assert.equal(kpiTrend(kpi({ direction: KpiDirection.LOWER, currentValue: 5, previousValue: 4 })), 'WORSENING');
  assert.equal(kpiTrend(kpi({ currentValue: 80, previousValue: 80 })), 'STABLE');
  assert.equal(kpiTrend(kpi({ currentValue: 80 })), 'UNKNOWN', 'no previous value, no trend');
  assert.equal(kpiTrend(kpi({ currentValue: 80, previousValue: 0 })), 'IMPROVING', 'a previous value of zero is a real value');
  assert.equal(kpiTrend(kpi({ currentValue: 80, previousValue: NaN })), 'UNKNOWN');
};

const testKpiMeasurement = (): void => {
  const now = day(2026, 11, 8);
  const original = kpi({ currentValue: 72, previousValue: 70, measuredOn: '2026-10-01' });

  const updated = applyKpiMeasurement({ ...original, currentValue: 78 }, original, now);
  assert.equal(updated.previousValue, 72, 'the old current value becomes the previous one');
  assert.equal(updated.measuredOn, '2026-11-08');
  assert.equal(updated.currentValue, 78);

  const retargeted = { ...original, target: 90 };
  assert.equal(applyKpiMeasurement(retargeted, original, now), retargeted, 'changing something else leaves the measurement alone');
  const created = kpi({ currentValue: 50 });
  assert.equal(applyKpiMeasurement(created, undefined, now), created, 'a new KPI has no previous value');
};

// ---------------------------------------------------------------- validation
const testValidation = (): void => {
  assert.equal(hasErrors(validateIncident(incident())), false);
  assert.equal(validateIncident(incident({ title: '' })).title, 'validation.titleRequired');
  assert.equal(validateIncident(incident({ reportedOn: '2026-11-10', resolvedOn: '2026-11-08' })).resolvedOn, 'validation.resolvedBeforeReported');
  assert.equal(hasErrors(validateIncident(incident({ reportedOn: '2026-11-10', resolvedOn: '2026-11-10' }))), false);
  assert.equal(validateIncident(incident({ assignedTo: 'nobody' })).assignedTo, 'validation.ownerInvalid');

  assert.equal(validateChange(change({ ownerUpn: '' })).ownerUpn, 'validation.ownerRequired', 'a change needs a requester');
  assert.equal(validateChange(change({ plannedDate: '2026-02-30' })).plannedDate, 'validation.dateInvalid');

  assert.equal(validateInteraction(interaction({ contactEmail: 'bad' })).contactEmail, 'validation.contactInvalid');
  assert.equal(hasErrors(validateInteraction(interaction())), false, 'an interaction needs no owner');

  assert.equal(hasErrors(validateKpi(kpi({ target: -5, currentValue: -2 }))), false, 'negative values are fine for a KPI');
  assert.equal(validateKpi(kpi({ target: NaN })).target, 'validation.mustBeNumber');
  assert.equal(validateKpi(kpi({ previousValue: NaN })).previousValue, 'validation.mustBeNumber');
  assert.equal(hasErrors(validateKpi(kpi({ previousValue: undefined }))), false, 'an empty previous value is allowed');
};

// ---------------------------------------------------------------- what is written and read
const testPayloadsAndMappers = (): void => {
  assert.equal(buildKpiPayload(kpi()).PreviousValue, null, 'no previous value is cleared with null, not written as zero');
  assert.equal(buildKpiPayload(kpi({ previousValue: 0 })).PreviousValue, 0, 'zero stays zero');
  assert.equal(buildKpiPayload(kpi({ measuredOn: '2026-11-08' })).MeasuredOn, '2026-11-08T12:00:00Z');
  assert.equal(buildIncidentPayload(incident({ resolvedOn: '2026-11-09' })).ResolvedOn, '2026-11-09T12:00:00Z');
  assert.equal(buildChangePayload(change()).ApprovalStatus, 'NONE', 'changes carry the approval columns');
  assert.equal(buildChangePayload(change({ risk: RiskScale.HIGH })).Risk, 'HIGH');
  assert.equal(buildInteractionPayload(interaction({ type: InteractionType.WORKSHOP })).InteractionType, 'WORKSHOP');

  assert.equal(mapKpi({ PreviousValue: null }).previousValue, undefined, 'an empty column is "no previous value"');
  assert.equal(mapKpi({}).previousValue, undefined);
  assert.equal(mapKpi({ PreviousValue: 0 }).previousValue, 0, 'a real zero is kept');
  assert.equal(mapKpi({ Direction: 'LOWER', Target: 3, CurrentValue: 3.4 }).direction, KpiDirection.LOWER);
  assert.equal(mapKpi({ Direction: 'sideways' }).direction, KpiDirection.HIGHER, 'an unknown value falls back to the default');
  assert.equal(mapIncident({ Severity: 'HIGH', ReportedOn: '2026-11-08T08:00:00Z', Status: 'weird' }).status, IncidentStatus.NEW);
  assert.equal(mapIncident({ Severity: 'HIGH' }).severity, IncidentSeverity.HIGH);
  assert.equal(mapChange({ ChangeType: 'EMERGENCY', Risk: 'HIGH', ApprovalStatus: 'PENDING' }).approval?.status, 'PENDING');
  assert.equal(mapChange({}).status, ChangeStatus.DRAFT);
  assert.equal(mapInteraction({ InteractionType: 'EMAIL' }).type, InteractionType.EMAIL);
};

testDueDates();
testOverdue();
testDaysOpen();
testIncidentEffects();
testIncidentTransitions();
testChanges();
testChangeApprovalRule();
testFollowUps();
testKpiHealth();
testKpiTrend();
testKpiMeasurement();
testValidation();
testPayloadsAndMappers();
console.log('operations tests passed');
