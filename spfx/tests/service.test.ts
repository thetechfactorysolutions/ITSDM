import assert from 'node:assert/strict';
import { en } from '../src/i18n/en';
import { es } from '../src/i18n/es';
import { mapCatalog, mapNps, mapServiceMonth } from '../src/components/shared/mappers';
import { buildCatalogPayload, buildNpsPayload, buildServiceMonthPayload } from '../src/entities/payloads';
import { CatalogCategory, CatalogEntry, CatalogKind, CatalogStatus, Country, NpsChannel, NpsFollowUp, NpsResponse, ServiceMonth } from '../src/models';
import {
  applyNpsEffects, catalogKeywords, classifyText, contactsPer100Users, defaultFollowUp, getAllowedNpsFollowUps, interactionShare, isCallOverdue, isCallPending, isValidNpsScore,
  latestByCountry, normaliseText, npsBreakdown, npsByMonth, npsCategory, responsesInLastDays, slaLevel, suggestedKind
} from '../src/rules/service';
import { isClosedStatus } from '../src/rules/transitions';
import { hasErrors, validateCatalog, validateNps, validateServiceMonth } from '../src/rules/validation';

const NOW = new Date(2026, 10, 9, 12);

const nps = (o: Partial<NpsResponse> = {}): NpsResponse => ({
  responseId: 'N-1', title: 'Answer', score: 10, comment: '', respondedOn: '2026-11-01', channel: NpsChannel.KIOSK, country: Country.ES, ticketRef: '',
  status: NpsFollowUp.NOT_REQUIRED, followUpNotes: '', ownerUpn: 'a@b.com', ...o
});
const month = (o: Partial<ServiceMonth> = {}): ServiceMonth => ({
  monthId: 'M-1', title: 'Spain', period: '2026-10-01', country: Country.ES, incidents: 100, interactions: 100, requests: 0, calls: 0, users: 1000, npsResponses: 0, backlog: 0, notes: '', ...o
});
const entry = (o: Partial<CatalogEntry> = {}): CatalogEntry => ({
  catalogId: 'C-1', title: 'Blocked account', category: CatalogCategory.ACCESS, kind: CatalogKind.INCIDENT, keywords: 'cuenta bloqueada, contraseña', guidance: '', status: CatalogStatus.ACTIVE, ...o
});

const testCategories = (): void => {
  const expected: Array<[number, string]> = [[0, 'DETRACTOR'], [6, 'DETRACTOR'], [7, 'PASSIVE'], [8, 'PASSIVE'], [9, 'PROMOTER'], [10, 'PROMOTER']];
  expected.forEach(([score, category]) => assert.equal(npsCategory(score), category, `score ${score}`));
  [0, 5, 10].forEach(s => assert.equal(isValidNpsScore(s), true));
  [-1, 11, 7.5, NaN, Infinity].forEach(s => assert.equal(isValidNpsScore(s), false, `score ${s} is not valid`));
};

const testBreakdown = (): void => {
  assert.deepEqual(npsBreakdown([]), { total: 0, promoters: 0, passives: 0, detractors: 0, score: undefined }, 'no answers, no score');
  const mixed = npsBreakdown([10, 9, 8, 6, 3].map(score => ({ score })));
  assert.deepEqual(mixed, { total: 5, promoters: 2, passives: 1, detractors: 2, score: 0 });
  assert.equal(npsBreakdown([{ score: 10 }, { score: 9 }]).score, 100);
  assert.equal(npsBreakdown([{ score: 0 }, { score: 6 }]).score, -100);
  assert.equal(npsBreakdown([{ score: 10 }, { score: 10 }, { score: 6 }]).score, 33, 'rounded');
  assert.equal(npsBreakdown([{ score: 7 }, { score: 8 }]).score, 0, 'passives only count in the total');
};

const testFollowUp = (): void => {
  assert.equal(defaultFollowUp(6), NpsFollowUp.PENDING);
  assert.equal(defaultFollowUp(7), NpsFollowUp.NOT_REQUIRED);

  assert.equal(applyNpsEffects(nps({ score: 4, status: NpsFollowUp.NOT_REQUIRED }), NOW).status, NpsFollowUp.PENDING, 'a new detractor waits for a call');
  assert.equal(applyNpsEffects(nps({ score: 9, status: NpsFollowUp.PENDING }), NOW).status, NpsFollowUp.NOT_REQUIRED, 'a raised score needs no call');
  assert.equal(applyNpsEffects(nps({ score: 4, status: NpsFollowUp.CONTACTED }), NOW).status, NpsFollowUp.CONTACTED, 'a call already made is kept');
  assert.equal(applyNpsEffects(nps({ score: 4, status: NpsFollowUp.CONTACTED }), NOW).followUpDate, '2026-11-09', 'the day of the call is filled in');
  assert.equal(applyNpsEffects(nps({ score: 4, status: NpsFollowUp.CLOSED, followUpDate: '2026-11-03' }), NOW).followUpDate, '2026-11-03', 'a given day is kept');
  assert.equal(applyNpsEffects(nps({ score: 4, status: NpsFollowUp.PENDING }), NOW).followUpDate, undefined, 'nothing is filled while waiting');

  assert.deepEqual(getAllowedNpsFollowUps(NpsFollowUp.PENDING), [NpsFollowUp.PENDING, NpsFollowUp.CONTACTED, NpsFollowUp.CLOSED, NpsFollowUp.NOT_REQUIRED]);
  assert.deepEqual(getAllowedNpsFollowUps(NpsFollowUp.CLOSED), [NpsFollowUp.CLOSED, NpsFollowUp.CONTACTED], 'a closed call can be reopened');
  assert.equal(isClosedStatus('NOT_REQUIRED'), true, 'answers that need no call are hidden by default');
  assert.equal(isClosedStatus('PENDING'), false);
  assert.equal(isClosedStatus('CONTACTED'), false);
};

const testOverdue = (): void => {
  const waiting = (answered: string | undefined, status: NpsFollowUp = NpsFollowUp.PENDING): NpsResponse => nps({ score: 3, status, respondedOn: answered });
  assert.equal(isCallPending(waiting('2026-11-09')), true);
  assert.equal(isCallOverdue(waiting('2026-11-09'), NOW), false);
  assert.equal(isCallOverdue(waiting('2026-11-02'), NOW), false, 'seven days is still in time');
  assert.equal(isCallOverdue(waiting('2026-11-01'), NOW), true, 'eight days is late');
  assert.equal(isCallOverdue(waiting('2026-11-01'), NOW, 14), false, 'a custom limit');
  assert.equal(isCallOverdue(waiting('2026-10-01', NpsFollowUp.CONTACTED), NOW), false, 'a call already made is never late');
  assert.equal(isCallOverdue(waiting(undefined), NOW), false, 'no date to count from');
};

const testPeriods = (): void => {
  const list = [nps({ respondedOn: '2026-11-09' }), nps({ respondedOn: '2026-08-12' }), nps({ respondedOn: '2026-08-11' }), nps({ respondedOn: undefined })];
  assert.equal(responsesInLastDays(list, 90, NOW).length, 2, 'the 90th day back counts, the 91st does not, no date does not');
  assert.equal(responsesInLastDays(list, 1, NOW).length, 1, 'only today');

  const months = npsByMonth([nps({ score: 10, respondedOn: '2026-10-05' }), nps({ score: 3, respondedOn: '2026-10-20' }), nps({ score: 9, respondedOn: '2026-09-02' })]);
  assert.deepEqual(months.map(m => m.month), ['2026-09', '2026-10'], 'oldest first');
  assert.equal(months[1].breakdown.score, 0);
  assert.equal(months[0].breakdown.score, 100);
};

const testMonths = (): void => {
  assert.equal(interactionShare(month({ incidents: 3, interactions: 88 })), 97);
  assert.equal(interactionShare(month({ incidents: 190, interactions: 163 })), 46);
  assert.equal(interactionShare(month({ incidents: 0, interactions: 0 })), undefined, 'no contacts, no share');
  assert.equal(contactsPer100Users(month({ incidents: 190, interactions: 163, users: 950 })), 37.2);
  assert.equal(contactsPer100Users(month({ users: 0 })), undefined, 'no users, no ratio');
  assert.equal(slaLevel(month({ slaPct: 94 })), 'LOW');
  assert.equal(slaLevel(month({ slaPct: 95 })), 'OK', 'the target itself is fine');
  assert.equal(slaLevel(month({ slaPct: undefined })), 'UNKNOWN');
  assert.equal(slaLevel(month({ slaPct: 96 }), 97), 'LOW', 'a custom target');

  const latest = latestByCountry([
    month({ monthId: 'a', period: '2026-08-01' }), month({ monthId: 'b', period: '2026-10-01' }), month({ monthId: 'c', period: '2026-09-01' }),
    month({ monthId: 'd', country: Country.PT, period: '2026-07-01' }), month({ monthId: 'e', country: Country.PT, period: undefined })
  ]);
  assert.equal(latest.ES?.monthId, 'b');
  assert.equal(latest.PT?.monthId, 'd', 'a month without a date is never "the latest"');
  assert.equal(latest.OTHER, undefined);
};

const testCatalog = (): void => {
  assert.equal(normaliseText('Contraseña'), 'contrasena');
  assert.deepEqual(catalogKeywords(entry({ keywords: 'Cuenta Bloqueada; contraseña,\n  Ratón ' })), ['cuenta bloqueada', 'contrasena', 'raton']);
  assert.deepEqual(catalogKeywords(entry({ keywords: ' , ;' })), []);

  const entries = [
    entry(),
    entry({ catalogId: 'C-2', title: 'Where is a room', kind: CatalogKind.INTERACTION, category: CatalogCategory.LOCATION_PEOPLE, keywords: 'dónde está, sala' }),
    entry({ catalogId: 'C-3', title: 'Old', keywords: 'bloqueada', status: CatalogStatus.ARCHIVED }),
    entry({ catalogId: 'C-4', title: 'Password help', keywords: 'contraseña, cuenta bloqueada, olvidé' })
  ];
  const matches = classifyText('Mi CUENTA bloqueada y la contrasena', entries);
  assert.deepEqual(matches.map(m => m.entry.catalogId), ['C-1', 'C-4'], 'both active entries match; the archived one does not');
  assert.equal(matches[0].matched.length, 2);
  assert.equal(suggestedKind(matches), CatalogKind.INCIDENT);
  assert.deepEqual(classifyText('donde esta la sala 4', entries).map(m => m.entry.catalogId), ['C-2'], 'case and accents do not matter');
  assert.equal(suggestedKind(classifyText('donde esta la sala 4', entries)), CatalogKind.INTERACTION);
  assert.deepEqual(classifyText('   ', entries), [], 'an empty phrase matches nothing');
  assert.deepEqual(classifyText('algo sin relación', entries), []);
  assert.equal(suggestedKind([]), undefined);
};

const testValidation = (): void => {
  assert.equal(hasErrors(validateNps(nps())), false);
  assert.equal(validateNps(nps({ title: '' })).title, 'validation.titleRequired');
  assert.equal(validateNps(nps({ score: 11 })).score, 'validation.npsScoreRange');
  assert.equal(validateNps(nps({ score: 3.5 })).score, 'validation.npsScoreRange');
  assert.equal(validateNps(nps({ respondedOn: '2026-02-30' })).respondedOn, 'validation.dateInvalid');
  assert.equal(validateNps(nps({ ownerUpn: 'nope' })).ownerUpn, 'validation.ownerInvalid');
  assert.equal(hasErrors(validateNps(nps({ ownerUpn: '' }))), false, 'who calls is optional');

  assert.equal(hasErrors(validateServiceMonth(month())), false);
  assert.equal(validateServiceMonth(month({ incidents: -1 })).incidents, 'validation.cannotBeNegative');
  assert.equal(validateServiceMonth(month({ slaPct: 101 })).slaPct, 'validation.percentRange');
  assert.equal(validateServiceMonth(month({ slaPct: -1 })).slaPct, 'validation.percentRange');
  assert.equal(hasErrors(validateServiceMonth(month({ slaPct: undefined }))), false, 'an unreported SLA is allowed');
  assert.equal(validateServiceMonth(month({ npsScore: -101 })).npsScore, 'validation.npsRange');
  assert.equal(hasErrors(validateServiceMonth(month({ npsScore: -100 }))), false);
  assert.equal(validateServiceMonth(month({ period: 'x' })).period, 'validation.dateInvalid');
  assert.equal(validateCatalog(entry({ title: ' ' })).title, 'validation.titleRequired');
};

const testMappers = (): void => {
  const original = nps({ score: 4, status: NpsFollowUp.CONTACTED, followUpDate: '2026-11-05', followUpNotes: 'Called', comment: 'Slow', ticketRef: 'INC1' });
  const payload = buildNpsPayload(original);
  assert.equal(payload.FollowUpDate, '2026-11-05T12:00:00Z');
  const back = mapNps({ ...payload, Id: 3, Editor: { Title: 'Ana' } });
  assert.deepEqual({ ...back, id: undefined, editor: undefined, created: undefined, modified: undefined }, { ...original, id: undefined, editor: undefined, created: undefined, modified: undefined });
  assert.equal(mapNps({}).status, NpsFollowUp.NOT_REQUIRED);

  const m = month({ slaPct: undefined, npsScore: undefined });
  const mp = buildServiceMonthPayload(m);
  assert.equal(mp.SlaPct, null, 'an empty SLA clears the column');
  assert.equal(mapServiceMonth({ ...mp, Id: 1 }).slaPct, undefined, 'and reads back as empty, not zero');
  assert.equal(mapServiceMonth({ SlaPct: 0 }).slaPct, 0, 'a real zero stays a zero');
  assert.equal(mapServiceMonth({ ...buildServiceMonthPayload(month({ slaPct: 97.5, npsScore: -20 })) }).npsScore, -20);

  const c = entry({ articleId: 'KB-1' });
  assert.equal(mapCatalog({ ...buildCatalogPayload(c), Id: 2 }).kind, CatalogKind.INCIDENT);
  assert.equal(mapCatalog({}).status, CatalogStatus.ACTIVE);
};

const testTexts = (): void => {
  const groups: Array<[string, string[]]> = [
    ['country', Object.keys(Country)], ['npsChannel', Object.keys(NpsChannel)], ['catalogCategory', Object.keys(CatalogCategory)], ['catalogKind', Object.keys(CatalogKind)],
    ['npsCategory', ['PROMOTER', 'PASSIVE', 'DETRACTOR']], ['status', ['NOT_REQUIRED', 'PENDING', 'CONTACTED']]
  ];
  groups.forEach(([prefix, values]) => values.forEach(value => {
    assert.ok(en[`${prefix}.${value}`] && es[`${prefix}.${value}`], `${prefix}.${value} is translated`);
  }));
};

testCategories();
testBreakdown();
testFollowUp();
testOverdue();
testPeriods();
testMonths();
testCatalog();
testValidation();
testMappers();
testTexts();
console.log('service tests passed');
