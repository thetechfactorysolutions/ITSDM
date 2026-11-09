import assert from 'node:assert/strict';
import { en } from '../src/i18n/en';
import { es } from '../src/i18n/es';
import { PROJECT_TEMPLATES } from '../src/config/projectTemplates';
import {
  Area, AreaStatus, Entitlement, EntitlementStatus, EntitlementType, LinkItem, LinkStatus, Matter, MatterPriority, MatterSource, MatterStatus,
  ActionStatus, ContractStatus, InteractionStatus, ProjectStatus
} from '../src/models';
import { mapArea, mapEntitlement, mapLink, mapMatter } from '../src/components/shared/mappers';
import { buildAreaPayload, buildEntitlementPayload, buildLinkPayload, buildMatterPayload } from '../src/entities/payloads';
import { AGENDA_KINDS, agendaUrgency, buildAgenda, eventsByDay, IAgendaInput, monthGrid, shiftMonth } from '../src/rules/agenda';
import {
  activeAreas, applyMatterEffects, entitlementAlert, getAllowedEntitlementStatuses, getAllowedMatterStatuses, groupLinksByCategory, isInbox, isInboxStale, isMatterClosed,
  isMatterOpen, isMatterOverdue, isSafeUrl, linkCategories, matterAgeDays, needsEntitlementAttention, statusForNewMatter
} from '../src/rules/matters';
import { planFromTemplate } from '../src/rules/projectTemplates';
import { isClosedStatus } from '../src/rules/transitions';
import { hasErrors, validateArea, validateEntitlement, validateLink, validateMatter } from '../src/rules/validation';

const day = (y: number, m: number, d: number, h: number = 12): Date => new Date(y, m - 1, d, h);
const NOW = day(2026, 11, 9);

const matter = (o: Partial<Matter> = {}): Matter => ({
  matterId: 'M-1', title: 'Renew the helpdesk', description: '', notes: '', status: MatterStatus.OPEN, priority: MatterPriority.MEDIUM, areaId: 'AREA-1',
  source: MatterSource.MANUAL, sourceRef: '', sender: '', ownerUpn: 'a@b.com', ...o
});
const area = (o: Partial<Area> = {}): Area => ({ areaId: 'AREA-1', title: 'Budget', description: '', status: AreaStatus.ACTIVE, sortOrder: 10, ...o });
const link = (o: Partial<LinkItem> = {}): LinkItem => ({
  linkId: 'L-1', title: 'Lenovo support', url: 'https://support.lenovo.com', category: 'Vendors', description: '', pinned: false, status: LinkStatus.ACTIVE, ...o
});
const entitlement = (o: Partial<Entitlement> = {}): Entitlement => ({
  entitlementId: 'E-1', title: 'ThinkPad warranty', type: EntitlementType.WARRANTY, status: EntitlementStatus.ACTIVE, product: '', reference: '', quantity: 10,
  noticeDays: 60, annualCost: 0, ownerUpn: 'a@b.com', notes: '', ...o
});

// ---------------------------------------------------------------- matters
const testMatterStates = (): void => {
  assert.equal(isInbox(matter({ status: MatterStatus.INBOX })), true);
  assert.equal(isMatterOpen(matter({ status: MatterStatus.INBOX })), false, 'the inbox is not "open"');
  assert.equal(isMatterOpen(matter({ status: MatterStatus.WAITING })), true);
  assert.equal(isMatterClosed(matter({ status: MatterStatus.DONE })), true);
  assert.equal(isMatterClosed(matter({ status: MatterStatus.DISCARDED })), true);
  assert.equal(isClosedStatus('DISCARDED'), true, 'discarded matters are hidden by default in the tables');
  assert.equal(isClosedStatus('RENEWED'), true);
  assert.equal(isClosedStatus('INBOX'), false, 'the inbox is never hidden');
  assert.equal(isClosedStatus('WAITING'), false);
};

const testMatterTransitions = (): void => {
  assert.deepEqual(getAllowedMatterStatuses(MatterStatus.INBOX).slice(0, 2), [MatterStatus.INBOX, MatterStatus.OPEN]);
  assert.ok(getAllowedMatterStatuses(MatterStatus.INBOX).indexOf(MatterStatus.DISCARDED) > -1, 'an inbox item can be discarded');
  assert.equal(getAllowedMatterStatuses(MatterStatus.OPEN).indexOf(MatterStatus.INBOX), -1, 'a classified matter does not go back to the inbox');
  assert.deepEqual(getAllowedMatterStatuses(MatterStatus.DONE), [MatterStatus.DONE, MatterStatus.OPEN], 'a done matter can be reopened');
  assert.ok(getAllowedMatterStatuses(MatterStatus.DISCARDED).indexOf(MatterStatus.INBOX) > -1);
};

const testOverdueAndStale = (): void => {
  assert.equal(isMatterOverdue(matter({ dueDate: '2026-11-08' }), NOW), true);
  assert.equal(isMatterOverdue(matter({ dueDate: '2026-11-09' }), NOW), false, 'the due day is still in time');
  assert.equal(isMatterOverdue(matter({ dueDate: '2026-11-01', status: MatterStatus.DONE }), NOW), false, 'closed is never overdue');
  assert.equal(isMatterOverdue(matter({ dueDate: '2026-11-01', status: MatterStatus.INBOX }), NOW), false, 'the inbox has its own warning');
  assert.equal(isMatterOverdue(matter({ dueDate: undefined }), NOW), false);

  const inbox = (received: string | undefined, created?: string): Matter => matter({ status: MatterStatus.INBOX, areaId: '', receivedOn: received, created });
  assert.equal(isInboxStale(inbox('2026-11-06'), NOW), false, '3 days is still fine');
  assert.equal(isInboxStale(inbox('2026-11-05'), NOW), true, '4 days is stale');
  assert.equal(isInboxStale(inbox('2026-11-05'), NOW, 7), false, 'custom limit');
  assert.equal(isInboxStale(inbox(undefined, '2026-11-01T08:00:00Z'), NOW), true, 'falls back to the creation day');
  assert.equal(isInboxStale(inbox(undefined), NOW), false, 'no date to count from');
  assert.equal(isInboxStale(matter({ receivedOn: '2026-10-01' }), NOW), false, 'only the inbox can be stale');
  assert.equal(matterAgeDays(inbox('2026-11-05'), NOW), 4);
  assert.equal(matterAgeDays(inbox(undefined), NOW), undefined);
};

const testStatusForNew = (): void => {
  assert.equal(statusForNewMatter(''), MatterStatus.INBOX, 'without an area it goes to the inbox');
  assert.equal(statusForNewMatter(undefined), MatterStatus.INBOX);
  assert.equal(statusForNewMatter('   '), MatterStatus.INBOX);
  assert.equal(statusForNewMatter('AREA-1'), MatterStatus.OPEN, 'with an area it goes straight to open');
};

const testMatterEffects = (): void => {
  const done = applyMatterEffects(matter({ status: MatterStatus.DONE }), MatterStatus.OPEN, NOW);
  assert.equal(done.closedOn, '2026-11-09', 'closing fills the closed date');
  assert.equal(applyMatterEffects(matter({ status: MatterStatus.DISCARDED }), MatterStatus.INBOX, NOW).closedOn, '2026-11-09');
  assert.equal(applyMatterEffects(matter({ status: MatterStatus.DONE, closedOn: '2026-10-01' }), MatterStatus.OPEN, NOW).closedOn, '2026-10-01', 'a given date is kept');
  assert.equal(applyMatterEffects(matter({ status: MatterStatus.OPEN, closedOn: '2026-10-01' }), MatterStatus.DONE, NOW).closedOn, '', 'reopening clears it');
  assert.equal(applyMatterEffects(matter({ status: MatterStatus.WAITING }), MatterStatus.OPEN, NOW).closedOn, undefined, 'other changes leave it alone');
  assert.equal(applyMatterEffects(matter({ status: MatterStatus.DONE }), MatterStatus.DISCARDED, NOW).closedOn, undefined, 'moving between closed states does not touch it');
};

const testMatterValidation = (): void => {
  assert.equal(hasErrors(validateMatter(matter())), false);
  assert.equal(validateMatter(matter({ title: ' ' })).title, 'validation.titleRequired');
  assert.equal(validateMatter(matter({ ownerUpn: 'nope' })).ownerUpn, 'validation.ownerInvalid');
  assert.equal(validateMatter(matter({ areaId: '' })).areaId, 'validation.areaRequired', 'classified without an area');
  assert.equal(validateMatter(matter({ areaId: undefined, status: MatterStatus.IN_PROGRESS })).areaId, 'validation.areaRequired');
  assert.equal(hasErrors(validateMatter(matter({ areaId: '', status: MatterStatus.INBOX }))), false, 'the inbox may have no area');
  assert.equal(validateMatter(matter({ dueDate: '2026-02-30' })).dueDate, 'validation.dateInvalid');
  assert.equal(validateMatter(matter({ receivedOn: 'x' })).receivedOn, 'validation.dateInvalid');
};

// ---------------------------------------------------------------- areas and links
const testAreas = (): void => {
  const list = activeAreas([area({ areaId: 'C', title: 'Orange', sortOrder: 20 }), area({ areaId: 'B', title: 'Building', sortOrder: 10 }), area({ areaId: 'A', title: 'Budget', sortOrder: 10 }),
    area({ areaId: 'D', title: 'Old', status: AreaStatus.ARCHIVED, sortOrder: 0 })]);
  assert.deepEqual(list.map(a => a.areaId), ['A', 'B', 'C'], 'by order, then name, archived left out');
  assert.equal(validateArea(area({ title: '' })).title, 'validation.titleRequired');
  assert.equal(validateArea(area({ sortOrder: NaN })).sortOrder, 'validation.mustBeNumber');
  assert.equal(hasErrors(validateArea(area())), false);
};

const testUrls = (): void => {
  assert.equal(isSafeUrl('https://support.lenovo.com'), true);
  assert.equal(isSafeUrl('  http://intranet.local/path?x=1#top  '), true);
  assert.equal(isSafeUrl('HTTPS://EXAMPLE.COM'), true);
  assert.equal(isSafeUrl('javascript:alert(1)'), false, 'code must never be stored as a link');
  assert.equal(isSafeUrl('JavaScript:alert(1)'), false);
  assert.equal(isSafeUrl('data:text/html,<script>1</script>'), false);
  assert.equal(isSafeUrl('vbscript:x'), false);
  assert.equal(isSafeUrl('file:///c:/secret.txt'), false);
  assert.equal(isSafeUrl('ftp://example.com'), false);
  assert.equal(isSafeUrl('//example.com'), false);
  assert.equal(isSafeUrl('https://'), false);
  assert.equal(isSafeUrl('https://exa mple.com'), false, 'no spaces');
  assert.equal(isSafeUrl('example.com'), false, 'needs the scheme');
  assert.equal(isSafeUrl(''), false);
  assert.equal(validateLink(link({ url: '' })).url, 'validation.urlRequired');
  assert.equal(validateLink(link({ url: 'javascript:alert(1)' })).url, 'validation.urlInvalid');
  assert.equal(validateLink(link({ title: '' })).title, 'validation.titleRequired');
  assert.equal(hasErrors(validateLink(link())), false);
};

const testLinkGroups = (): void => {
  const links = [
    link({ linkId: '1', title: 'Oracle support', category: 'Vendors' }),
    link({ linkId: '2', title: 'Lenovo support', category: 'Vendors', pinned: true }),
    link({ linkId: '3', title: 'Azure portal', category: 'Cloud' }),
    link({ linkId: '4', title: 'Loose page', category: '  ' }),
    link({ linkId: '5', title: 'Old page', category: 'Cloud', status: LinkStatus.ARCHIVED })
  ];
  const groups = groupLinksByCategory(links, 'No category');
  assert.deepEqual(groups.map(g => g.category), ['Cloud', 'Vendors', 'No category'], 'sorted, the group without a category last');
  assert.deepEqual(groups[1].links.map(l => l.linkId), ['2', '1'], 'pinned first');
  assert.deepEqual(groups[0].links.map(l => l.linkId), ['3'], 'archived links are left out');
  assert.deepEqual(linkCategories(links), ['Cloud', 'Vendors']);
};

// ---------------------------------------------------------------- warranties and licences
const testEntitlements = (): void => {
  const e = (end: string | undefined, o: Partial<Entitlement> = {}): Entitlement => entitlement({ endDate: end, ...o });
  assert.equal(entitlementAlert(e('2026-11-08'), NOW).alert, 'LAPSED');
  assert.equal(entitlementAlert(e('2026-11-08'), NOW).daysLeft, -1);
  assert.equal(entitlementAlert(e('2026-11-09'), NOW).alert, 'RENEWAL', 'the end day is still valid but inside the notice');
  assert.equal(entitlementAlert(e('2027-01-08'), NOW).alert, 'RENEWAL', '60 days left is inside the notice');
  assert.equal(entitlementAlert(e('2027-01-09'), NOW).alert, 'NONE', '61 days is outside it');
  assert.equal(entitlementAlert(e('2027-01-09', { noticeDays: 90 }), NOW).alert, 'RENEWAL', 'its own notice period');
  assert.equal(entitlementAlert(e('2026-11-01', { status: EntitlementStatus.RENEWED }), NOW).alert, 'NONE', 'only active ones are checked');
  assert.equal(entitlementAlert(e(undefined), NOW).alert, 'NONE');
  assert.equal(needsEntitlementAttention(e('2026-12-01'), NOW), true);
  assert.deepEqual(getAllowedEntitlementStatuses(EntitlementStatus.ACTIVE), [EntitlementStatus.ACTIVE, EntitlementStatus.EXPIRED, EntitlementStatus.RENEWED, EntitlementStatus.CANCELLED]);
  assert.deepEqual(getAllowedEntitlementStatuses(EntitlementStatus.RENEWED), [EntitlementStatus.RENEWED, EntitlementStatus.ACTIVE]);

  assert.equal(hasErrors(validateEntitlement(entitlement())), false);
  assert.equal(validateEntitlement(entitlement({ startDate: '2026-05-01', endDate: '2026-04-01' })).endDate, 'validation.endBeforeStart');
  assert.equal(validateEntitlement(entitlement({ quantity: -1 })).quantity, 'validation.cannotBeNegative');
  assert.equal(validateEntitlement(entitlement({ annualCost: -5 })).annualCost, 'validation.cannotBeNegative');
  assert.equal(validateEntitlement(entitlement({ noticeDays: 400 })).noticeDays, 'validation.noticeDaysRange');
  assert.equal(validateEntitlement(entitlement({ ownerUpn: '' })).ownerUpn, 'validation.ownerRequired');
};

// ---------------------------------------------------------------- mappers and payloads
const testMappers = (): void => {
  const original = matter({ matterId: 'M-9', description: 'd', notes: 'n', status: MatterStatus.WAITING, areaId: 'AREA-2', source: MatterSource.EMAIL, sourceRef: 'https://outlook.office.com/x',
    sender: 'x@y.com', receivedOn: '2026-11-01', dueDate: '2026-11-20', projectId: 'P-1', contractId: 'C-1', incidentId: 'I-1', vendorId: 'V-1' });
  const payload = buildMatterPayload(original);
  assert.equal(payload.Status, 'WAITING');
  assert.equal(payload.ReceivedOn, '2026-11-01T12:00:00Z');
  assert.equal(payload.ClosedOn, null, 'an empty date clears the column');
  const back = mapMatter({ ...payload, Id: 5, Editor: { Title: 'Ana' } });
  assert.deepEqual({ ...back, id: undefined, editor: undefined, created: undefined, modified: undefined, closedOn: undefined }, { ...original, id: undefined, editor: undefined, created: undefined, modified: undefined, closedOn: undefined });
  assert.equal(back.id, 5);
  assert.equal(back.editor, 'Ana');
  assert.equal(mapMatter({}).status, MatterStatus.INBOX, 'unknown status reads as inbox, so it is never lost');
  assert.equal(mapMatter({ Status: 'NONSENSE' }).status, MatterStatus.INBOX);

  assert.deepEqual({ ...mapArea({ ...buildAreaPayload(area()), Id: 1 }), id: undefined }, { ...area(), id: undefined, created: '', modified: '', editor: '' });
  const l = link({ pinned: true });
  assert.equal(buildLinkPayload(l).Pinned, 'YES');
  assert.equal(mapLink({ ...buildLinkPayload(l), Id: 2 }).pinned, true);
  assert.equal(mapLink({ ...buildLinkPayload(link()), Id: 2 }).pinned, false);
  assert.equal(buildLinkPayload(link({ url: '  https://a.com  ' })).Url, 'https://a.com');

  const en1 = entitlement({ endDate: '2027-03-01', vendorId: 'V-1', product: 'ThinkPad', quantity: 3 });
  const eb = mapEntitlement({ ...buildEntitlementPayload(en1), Id: 3 });
  assert.equal(eb.endDate, '2027-03-01');
  assert.equal(eb.type, EntitlementType.WARRANTY);
  assert.equal(eb.quantity, 3);
  assert.equal(mapEntitlement({}).noticeDays, 60, 'a missing notice reads as the default, not zero');
};

// ---------------------------------------------------------------- agenda
const emptyInput = (): IAgendaInput => ({
  matters: [], actions: [], contracts: [], entitlements: [], interactions: [], reviews: [], risks: [], trainings: [], skills: [], projects: [], articles: [], changes: [], incidents: [], stock: [], genius: [], objectives: []
});

const testAgenda = (): void => {
  assert.equal(agendaUrgency('2026-11-08', NOW), 'OVERDUE');
  assert.equal(agendaUrgency('2026-11-09', NOW), 'TODAY');
  assert.equal(agendaUrgency('2026-11-16', NOW), 'SOON');
  assert.equal(agendaUrgency('2026-11-17', NOW), 'LATER');
  assert.deepEqual(buildAgenda(emptyInput(), NOW), []);

  const input = emptyInput();
  input.matters = [
    matter({ matterId: 'M-1', title: 'Budget review', dueDate: '2026-11-12' }),
    matter({ matterId: 'M-2', title: 'Closed one', dueDate: '2026-11-12', status: MatterStatus.DONE }),
    matter({ matterId: 'M-3', title: 'No date' })
  ];
  input.actions = [
    { actionId: 'A-1', title: 'Late action', description: '', status: ActionStatus.OPEN, priority: 'HIGH' as never, ownerUpn: 'a@b.com', dueDate: '2026-11-01' },
    { actionId: 'A-2', title: 'Done action', description: '', status: ActionStatus.DONE, priority: 'HIGH' as never, ownerUpn: 'a@b.com', dueDate: '2026-11-01' }
  ];
  input.contracts = [
    { contractId: 'C-1', title: 'Helpdesk', description: '', status: ContractStatus.ACTIVE, endDate: '2026-12-31', noticeDays: 60, annualValue: 1, autoRenew: 'NO' as never, ownerUpn: 'a@b.com' },
    { contractId: 'C-2', title: 'Draft contract', description: '', status: ContractStatus.DRAFT, endDate: '2026-12-31', noticeDays: 60, annualValue: 1, autoRenew: 'NO' as never, ownerUpn: 'a@b.com' },
    { contractId: 'C-3', title: 'Lapsed contract', description: '', status: ContractStatus.ACTIVE, endDate: '2026-11-01', noticeDays: 60, annualValue: 1, autoRenew: 'NO' as never, ownerUpn: 'a@b.com' }
  ];
  input.entitlements = [entitlement({ entitlementId: 'E-1', title: 'Laptop warranty', endDate: '2027-02-01', noticeDays: 30 })];
  input.interactions = [{ interactionId: 'I-1', title: 'Call vendor', type: 'CALL' as never, status: InteractionStatus.FOLLOW_UP, followUpDate: '2026-11-10', contactName: '', contactEmail: '', organization: '', summary: '', nextSteps: '', ownerUpn: 'a@b.com' }];
  input.projects = [{ projectId: 'P-1', title: 'Telephony', description: '', status: ProjectStatus.ACTIVE, ownerUpn: 'a@b.com', endDate: '2027-01-15', budgetAmount: 0, forecastAmount: 0, riskLevel: 'LOW' as never }];

  const events = buildAgenda(input, NOW);
  const keys = events.map(e => e.key);
  assert.deepEqual(keys, [
    'ACTION:A-1', 'CONTRACT_RENEWAL:C-1', 'CONTRACT_END:C-3', 'FOLLOW_UP:I-1', 'MATTER:M-1', 'CONTRACT_END:C-1', 'ENTITLEMENT_RENEWAL:E-1', 'PROJECT_END:P-1', 'ENTITLEMENT_END:E-1'
  ], 'what is in the agenda, by date and then by kind');
  assert.equal(events[0].key, 'ACTION:A-1');
  assert.equal(events[0].urgency, 'OVERDUE');
  assert.deepEqual(events.map(e => e.date), events.map(e => e.date).slice().sort(), 'in date order');
  assert.equal(keys.indexOf('MATTER:M-2'), -1, 'closed matters are left out');
  assert.equal(keys.indexOf('MATTER:M-3'), -1, 'no date, no event');
  assert.equal(keys.indexOf('ACTION:A-2'), -1, 'done actions are left out');
  assert.equal(keys.indexOf('CONTRACT_END:C-2'), -1, 'only active contracts');
  assert.equal(keys.indexOf('CONTRACT_RENEWAL:C-3'), -1, 'a contract that already ended has no renewal decision left, only its overdue end');
  const renewal = events.filter(e => e.key === 'CONTRACT_RENEWAL:C-1')[0];
  assert.equal(renewal.date, '2026-11-01', 'the renewal decision is the end date minus the notice');
  assert.equal(renewal.urgency, 'OVERDUE', 'the decision date has passed');
  assert.equal(events.filter(e => e.key === 'ENTITLEMENT_RENEWAL:E-1')[0].date, '2027-01-02');
  assert.equal(new Set(keys).size, keys.length, 'keys are unique');

  const byDay = eventsByDay(events);
  assert.equal(byDay['2026-11-12'].length, 1);
  assert.equal(byDay['2026-11-12'][0].kind, 'MATTER');
  assert.ok(AGENDA_KINDS.length >= 15);
  AGENDA_KINDS.forEach(kind => {
    assert.ok(en[`agenda.kind.${kind}`] && es[`agenda.kind.${kind}`], `agenda.kind.${kind} is translated`);
  });
};

const testMonthGrid = (): void => {
  const weeks = monthGrid(2026, 10); // November 2026 starts on a Sunday
  assert.equal(weeks.length, 6);
  weeks.forEach(w => assert.equal(w.length, 7));
  assert.equal(weeks[0][0].date, '2026-10-26', 'weeks start on Monday');
  assert.equal(weeks[0][0].inMonth, false);
  assert.equal(weeks[0][6].date, '2026-11-01');
  assert.equal(weeks[0][6].inMonth, true);
  assert.equal(weeks[5][6].date, '2026-12-06');
  assert.equal(weeks.reduce((n, w) => n + w.filter(c => c.inMonth).length, 0), 30);

  const feb = monthGrid(2027, 1); // February 2027 starts on a Monday and has 28 days
  assert.equal(feb.length, 4);
  assert.equal(feb[0][0].date, '2027-02-01');
  assert.equal(feb[0][0].inMonth, true);
  assert.equal(feb[3][6].date, '2027-02-28');

  const leap = monthGrid(2028, 1);
  assert.equal(leap.reduce((n, w) => n + w.filter(c => c.inMonth).length, 0), 29, 'leap year');

  assert.deepEqual(shiftMonth(2026, 11, 1), { year: 2027, month: 0 });
  assert.deepEqual(shiftMonth(2026, 0, -1), { year: 2025, month: 11 });
};

// ---------------------------------------------------------------- project templates
const testTemplates = (): void => {
  assert.ok(PROJECT_TEMPLATES.length >= 3);
  const ids = PROJECT_TEMPLATES.map(t => t.id);
  assert.equal(new Set(ids).size, ids.length, 'template ids are unique');

  PROJECT_TEMPLATES.forEach(template => {
    ['name', 'description'].forEach(part => {
      assert.ok(en[`template.${template.id}.${part}`] && es[`template.${template.id}.${part}`], `template.${template.id}.${part} is translated`);
    });
    const keys = template.tasks.map(t => t.key);
    assert.equal(new Set(keys).size, keys.length, `${template.id}: task keys are unique`);
    template.tasks.forEach(task => {
      assert.ok(en[`template.${template.id}.task.${task.key}`] && es[`template.${template.id}.task.${task.key}`], `template.${template.id}.task.${task.key} is translated`);
      assert.ok(task.dayOffset >= 0 && task.dayOffset <= template.durationDays, `${template.id}.${task.key} falls inside the project`);
    });
  });

  const template = PROJECT_TEMPLATES.filter(t => t.id === 'renewal')[0];
  const plan = planFromTemplate(template, { title: '  Renew Oracle  ', ownerUpn: 'a@b.com', startDay: '2026-11-09', translate: key => `<${key}>`, now: NOW });
  assert.equal(plan.project.title, 'Renew Oracle');
  assert.equal(plan.project.status, ProjectStatus.PLANNING);
  assert.equal(plan.project.startDate, '2026-11-09');
  assert.equal(plan.project.endDate, '2027-02-07', '90 days later');
  assert.equal(plan.project.description, '<template.renewal.description>');
  assert.equal(plan.actions.length, template.tasks.length);
  assert.ok(plan.actions.every(a => a.projectId === plan.project.projectId), 'every action is linked to the project');
  assert.ok(plan.actions.every(a => a.status === ActionStatus.OPEN && a.ownerUpn === 'a@b.com'));
  assert.equal(plan.actions[0].dueDate, '2026-11-09');
  assert.equal(plan.actions[1].dueDate, '2026-11-16', 'the second task is a week in');
  assert.equal(plan.actions[0].title, '<template.renewal.task.usage>');
  assert.equal(new Set(plan.actions.map(a => a.actionId)).size, plan.actions.length, 'action ids are unique');
  assert.equal(planFromTemplate(template, { title: 'x', ownerUpn: 'a@b.com', startDay: 'not a day', translate: k => k, now: NOW }).project.startDate, '2026-11-09', 'an invalid start day falls back to today');
};

testMatterStates();
testMatterTransitions();
testOverdueAndStale();
testStatusForNew();
testMatterEffects();
testMatterValidation();
testAreas();
testUrls();
testLinkGroups();
testEntitlements();
testMappers();
testAgenda();
testMonthGrid();
testTemplates();
console.log('matters tests passed');
