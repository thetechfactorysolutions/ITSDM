import './helpers/globals';
import assert from 'node:assert/strict';
import * as React from 'react';
import Agenda from '../src/components/Agenda/Agenda';
import Links from '../src/components/Links/Links';
import MatterScreen, { MatterView } from '../src/components/Matters/Matters';
import QuickAdd from '../src/components/Matters/QuickAdd';
import TemplatePanel from '../src/components/Projects/TemplatePanel';
import AttachmentsSection from '../src/components/shared/AttachmentsSection';
import { HubDataContext, IHubData } from '../src/components/shared/HubData';
import Entitlements from '../src/components/Vendors/Entitlements';
import { IAttachment, IDataStore } from '../src/data/IDataStore';
import { IListHookState } from '../src/hooks/useListItems';
import { I18nProvider, Language } from '../src/i18n/I18n';
import {
  ActionItem, Area, AreaStatus, Entitlement, EntitlementStatus, EntitlementType, LinkItem, LinkStatus, Matter, MatterPriority, MatterSource, MatterStatus
} from '../src/models';
import { addDays, toDayKey } from '../src/rules/dates';
import { click, findButton, mount, settle, typeInto, unmount } from './helpers/dom';
import { jsdomWindow } from './helpers/globals';
import { act } from 'react-dom/test-utils';

const today = (): string => toDayKey(new Date());
const offset = (days: number): string => addDays(today(), days);

const matter = (id: number, title: string, status: MatterStatus, o: Partial<Matter> = {}): Matter => ({
  id, matterId: `ASU-${id}`, title, description: '', notes: '', status, priority: MatterPriority.MEDIUM, areaId: status === MatterStatus.INBOX ? '' : 'AREA-1', source: MatterSource.EMAIL,
  sourceRef: '', sender: 'sender@x.com', ownerUpn: 'me@x.com', receivedOn: offset(-1), ...o
});
const area = (id: number, title: string): Area => ({ id, areaId: `AREA-${id}`, title, description: '', status: AreaStatus.ACTIVE, sortOrder: id * 10 });
const link = (id: number, title: string, url: string, o: Partial<LinkItem> = {}): LinkItem => ({
  id, linkId: `LNK-${id}`, title, url, category: 'Vendors', description: '', pinned: false, status: LinkStatus.ACTIVE, ...o
});
const entitlement = (id: number, title: string, endOffset: number, o: Partial<Entitlement> = {}): Entitlement => ({
  id, entitlementId: `ENT-${id}`, title, type: EntitlementType.WARRANTY, status: EntitlementStatus.ACTIVE, product: '', reference: '', quantity: 1, endDate: offset(endOffset),
  noticeDays: 60, annualCost: 0, ownerUpn: 'me@x.com', notes: '', ...o
});

interface IRecorder { created: Array<Record<string, unknown>>; createdItems: Array<{ list: string; payload: Record<string, unknown> }> }
const newRec = (): IRecorder => ({ created: [], createdItems: [] });

const list = <T,>(rows: T[], rec?: IRecorder): IListHookState<T> => ({
  items: rows, loading: false, error: undefined, reload: async () => undefined,
  create: async payload => { if (rec) { rec.created.push(payload); } }, update: async () => undefined, remove: async () => undefined
});

interface IData {
  matters?: Matter[]; areas?: Area[]; links?: LinkItem[]; entitlements?: Entitlement[]; actions?: ActionItem[];
}

const hubFor = (data: IData, rec: IRecorder, service?: Partial<IDataStore>): IHubData => {
  const none = (): never => list([]) as never;
  return {
    service: { capabilities: { versioning: false, userSearch: 'known', attachments: false }, searchUsers: async () => [], createItem: async (listName: string, payload: Record<string, unknown>) => { rec.createdItems.push({ list: listName, payload }); return {}; }, ...service } as unknown as IDataStore,
    userEmail: 'me@x.com',
    matters: list(data.matters ?? [], rec), areas: list(data.areas ?? []), links: list(data.links ?? [], rec), entitlements: list(data.entitlements ?? [], rec), actions: list(data.actions ?? []),
    ideas: none(), initiatives: none(), projects: none(), meetings: none(), notes: none(), risks: none(), decisions: none(), lessons: none(), reviews: none(), budgets: none(), capex: none(),
    opex: none(), vendors: none(), contracts: none(), incidents: none(), changes: none(), interactions: none(), kpis: none(), skills: none(), trainings: none(), articles: none(),
    stock: none(), genius: none(), objectives: none()
  };
};

const render = (element: React.ReactElement, data: IData, rec: IRecorder = newRec(), language: Language = 'en', service?: Partial<IDataStore>): React.ReactElement =>
  React.createElement(I18nProvider, { language }, React.createElement(HubDataContext.Provider, { value: hubFor(data, rec, service) }, element));

const text = (): string => document.body.textContent ?? '';
const count = (needle: string): number => text().split(needle).length - 1;
const button = (label: string): HTMLButtonElement | undefined =>
  Array.from(document.body.querySelectorAll('button')).filter(b => (b.textContent ?? '').trim() === label)[0] as HTMLButtonElement | undefined;

const setField = async (label: string, value: string): Promise<void> => {
  const l = Array.from(document.body.querySelectorAll('label')).filter(x => (x.textContent ?? '').trim() === label)[0] as HTMLLabelElement;
  assert.ok(l, `field "${label}" exists`);
  await typeInto(document.getElementById(l.htmlFor) as HTMLInputElement, value);
};

// ---------------------------------------------------------------- the three views of the matters
const testMatterViews = async (): Promise<void> => {
  const data: IData = {
    areas: [area(1, 'Budget')],
    matters: [
      matter(1, 'Forecast from Europe', MatterStatus.INBOX),
      matter(2, 'Network incident in Paris', MatterStatus.INBOX, { receivedOn: offset(-6) }),
      matter(3, 'Renew the helpdesk', MatterStatus.OPEN, { dueDate: offset(15) }),
      matter(4, 'Delivery slots for Orange', MatterStatus.WAITING, { dueDate: offset(-2) }),
      matter(5, 'Locker app', MatterStatus.IN_PROGRESS),
      matter(6, 'Budget transfer approved', MatterStatus.DONE, { closedOn: offset(-4) }),
      matter(7, 'Duplicate request', MatterStatus.DISCARDED, { closedOn: offset(-7) })
    ]
  };
  const show = async (view: MatterView, language: Language = 'en'): Promise<void> => {
    await mount(render(React.createElement(MatterScreen, { view }), data, newRec(), language));
    await settle();
  };

  await show('inbox');
  assert.ok(text().indexOf('Forecast from Europe') > -1 && text().indexOf('Network incident in Paris') > -1, 'both waiting items are in the inbox');
  assert.equal(text().indexOf('Renew the helpdesk'), -1, 'classified matters are not in the inbox');
  assert.equal(text().indexOf('Budget transfer approved'), -1);
  assert.ok(text().indexOf('6 day(s)') > -1, 'how long an item has waited is shown');
  await unmount();

  await show('open');
  ['Renew the helpdesk', 'Delivery slots for Orange', 'Locker app'].forEach(title => assert.ok(text().indexOf(title) > -1, `${title} is open`));
  assert.equal(text().indexOf('Forecast from Europe'), -1, 'the inbox is not in the open view');
  assert.equal(text().indexOf('Duplicate request'), -1, 'closed ones are not in the open view');
  assert.equal(count('🔴'), 1, 'only the late matter is red');
  await unmount();

  await show('history');
  assert.ok(text().indexOf('Budget transfer approved') > -1 && text().indexOf('Duplicate request') > -1, 'the history shows what was closed without asking to show closed');
  assert.equal(text().indexOf('Renew the helpdesk'), -1, 'and nothing that is still open');
  await unmount();

  await show('inbox', 'es');
  assert.ok(text().indexOf('Añadir a la bandeja') > -1, 'the inbox in Spanish');
  await unmount();
};

const testInboxCreateAndAreaRule = async (): Promise<void> => {
  const rec = newRec();
  await mount(render(React.createElement(MatterScreen, { view: 'inbox' }), {}, rec));
  await settle();
  assert.ok(text().indexOf('The inbox is empty') > -1);
  await click(button('Add to the inbox') as HTMLButtonElement);
  await settle();
  await setField('Title', 'Call the vendor');
  await click(button('Save') as HTMLButtonElement);
  await settle(80);
  assert.equal(rec.created.length, 1, 'an inbox item needs no area');
  assert.equal(rec.created[0].Status, 'INBOX');
  assert.equal(rec.created[0].AreaId, '');
  assert.equal(rec.created[0].Source, 'MANUAL');
  assert.equal(rec.created[0].OwnerUPN, 'me@x.com');
  assert.equal(rec.created[0].ClosedOn, null);
  assert.ok(String(rec.created[0].MatterId).indexOf('ASU-') === 0);
  await unmount();

  // a new matter in the open view starts classified, so it must have an area
  const rec2 = newRec();
  await mount(render(React.createElement(MatterScreen, { view: 'open' }), { areas: [area(1, 'Budget')] }, rec2));
  await settle();
  await click(button('New matter') as HTMLButtonElement);
  await settle();
  await setField('Title', 'Prepare the budget review');
  await click(button('Save') as HTMLButtonElement);
  await settle(80);
  assert.equal(rec2.created.length, 0, 'without an area it is not saved');
  assert.ok(text().indexOf('Choose an area to classify it.') > -1, 'and it says why');
  await unmount();
};

const testQuickAdd = async (): Promise<void> => {
  const rec = newRec();
  await mount(render(React.createElement(QuickAdd), { areas: [area(1, 'Budget')] }, rec));
  await click(findButton(document.body, 'Quick add') as HTMLButtonElement);
  await settle();
  await click(button('Add') as HTMLButtonElement);
  await settle();
  assert.equal(rec.created.length, 0, 'a title is required');
  assert.ok(text().indexOf('Title is required.') > -1);

  await setField('Title', 'Order cables for the new room');
  await click(button('Add') as HTMLButtonElement);
  await settle(80);
  assert.equal(rec.created.length, 1);
  assert.equal(rec.created[0].Status, 'INBOX', 'without an area it goes to the inbox');
  assert.equal(rec.created[0].Title, 'Order cables for the new room');
  assert.equal(rec.created[0].ReceivedOn, `${today()}T12:00:00Z`, 'it is stamped with today');
  assert.ok(text().indexOf('Added to the inbox.') > -1, 'the person is told where it went');
  await unmount();
};

// ---------------------------------------------------------------- links
const testLinks = async (): Promise<void> => {
  const data: IData = {
    links: [
      link(1, 'Lenovo support', 'https://support.lenovo.com', { pinned: true }),
      link(2, 'Sneaky', 'javascript:alert(1)'),
      link(3, 'Old page', 'https://old.example.com', { status: LinkStatus.ARCHIVED })
    ]
  };
  await mount(render(React.createElement(Links), data));
  await settle();
  const anchors = Array.from(document.body.querySelectorAll('a'));
  const lenovo = anchors.filter(a => (a.getAttribute('href') ?? '').indexOf('support.lenovo.com') > -1);
  assert.ok(lenovo.length >= 1, 'a safe address is a link');
  lenovo.forEach(a => {
    assert.equal(a.getAttribute('target'), '_blank');
    assert.ok((a.getAttribute('rel') ?? '').indexOf('noopener') > -1, 'opened without access to this page');
  });
  assert.equal(anchors.some(a => /^\s*javascript:/i.test(a.getAttribute('href') ?? '')), false, 'an address that would run code is never a link');
  assert.ok(text().indexOf('Sneaky') > -1, 'but it is still listed, as text');
  assert.equal(text().indexOf('Old page'), -1, 'archived links are hidden by default');
  await unmount();

  const rec = newRec();
  await mount(render(React.createElement(Links), {}, rec));
  await settle();
  assert.ok(text().indexOf('There are no links yet') > -1);
  await click(button('New link') as HTMLButtonElement);
  await settle();
  await setField('Title', 'Oracle support');
  await setField('Address', 'javascript:alert(1)');
  await click(button('Save') as HTMLButtonElement);
  await settle();
  assert.equal(rec.created.length, 0, 'a dangerous address is refused');
  assert.ok(text().indexOf('Enter an address that starts with http:// or https://.') > -1);
  await setField('Address', '  https://support.oracle.com  ');
  await click(button('Save') as HTMLButtonElement);
  await settle(80);
  assert.equal(rec.created.length, 1);
  assert.equal(rec.created[0].Url, 'https://support.oracle.com', 'the address is saved trimmed');
  assert.equal(rec.created[0].Pinned, 'NO');
  assert.equal(rec.created[0].Status, 'ACTIVE');
  assert.ok(String(rec.created[0].LinkId).indexOf('LNK-') === 0);
  await unmount();
};

// ---------------------------------------------------------------- warranties and licences
const testEntitlements = async (): Promise<void> => {
  const data: IData = {
    entitlements: [
      entitlement(1, 'Laptop warranty', 20),                                              // renewal, inside the notice
      entitlement(2, 'Database support', 200),                                            // far away
      entitlement(3, 'Ticketing licences', -3),                                           // ended, never closed
      entitlement(4, 'Old subscription', -30, { status: EntitlementStatus.RENEWED })      // closed: hidden
    ]
  };
  await mount(render(React.createElement(Entitlements), data));
  await settle();
  assert.ok(text().indexOf('Laptop warranty') > -1 && text().indexOf('Database support') > -1 && text().indexOf('Ticketing licences') > -1);
  assert.equal(text().indexOf('Old subscription'), -1, 'renewed ones are history');
  assert.equal(count('🟠'), 1, 'one is about to need a decision');
  assert.equal(count('🔴'), 1, 'one ended and is still marked active');
  await unmount();

  const rec = newRec();
  await mount(render(React.createElement(Entitlements), {}, rec));
  await settle();
  assert.ok(text().indexOf('There are no warranties or licences yet') > -1);
  await click(button('New warranty or licence') as HTMLButtonElement);
  await settle();
  assert.ok(text().indexOf('Do not type licence keys here') > -1, 'the form warns about licence keys');
  await setField('Title', 'Switch warranty');
  await click(button('Save') as HTMLButtonElement);
  await settle(80);
  assert.equal(rec.created.length, 1);
  assert.equal(rec.created[0].Status, 'ACTIVE');
  assert.equal(rec.created[0].EntitlementType, 'WARRANTY');
  assert.equal(rec.created[0].NoticeDays, 60);
  assert.equal(rec.created[0].Quantity, 1);
  assert.ok(String(rec.created[0].EntitlementId).indexOf('ENT-') === 0);
  await unmount();
};

// ---------------------------------------------------------------- agenda
const testAgenda = async (): Promise<void> => {
  const data: IData = {
    matters: [
      matter(1, 'Late matter', MatterStatus.OPEN, { dueDate: offset(-3) }),
      matter(2, 'Matter next week', MatterStatus.OPEN, { dueDate: offset(3) }),
      matter(3, 'Closed matter', MatterStatus.DONE, { dueDate: offset(-3) })
    ],
    actions: [{ id: 1, actionId: 'ACT-1', title: 'Due-today action', description: '', status: 'OPEN' as never, priority: 'HIGH' as never, ownerUpn: 'me@x.com', dueDate: today() }]
  };
  await mount(render(React.createElement(Agenda), data));
  await settle();
  assert.ok(text().indexOf('Overdue (1)') > -1, 'one overdue date');
  assert.ok(text().indexOf('Today (1)') > -1, 'one date today');
  assert.ok(text().indexOf('Next 7 days (1)') > -1, 'one date in the coming days');
  assert.ok(text().indexOf('Late matter') > -1 && text().indexOf('Due-today action') > -1 && text().indexOf('Matter next week') > -1);
  assert.equal(count('Closed matter'), 0, 'closed work is not on the agenda');
  ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(day => assert.ok(text().indexOf(day) > -1, `${day} heads a column`));
  const dayCells = Array.from(document.body.querySelectorAll('button[aria-pressed]'));
  assert.ok(dayCells.length >= 28 && dayCells.length % 7 === 0, 'the month is drawn in whole weeks');
  assert.equal(dayCells.filter(c => c.getAttribute('aria-pressed') === 'true').length, 1, 'one day is selected');
  await unmount();

  await mount(render(React.createElement(Agenda), data, newRec(), 'es'));
  await settle();
  assert.ok(text().indexOf('Atrasado (1)') > -1 && text().indexOf('Hoy (1)') > -1, 'the agenda in Spanish');
  await unmount();

  await mount(render(React.createElement(Agenda), {}));
  await settle();
  assert.ok(text().indexOf('Nothing is pending with a date.') > -1);
  await unmount();
};

// ---------------------------------------------------------------- attachments
const fileWith = (name: string, size?: number): File => {
  const file = new jsdomWindow.File(['hello'], name, { type: 'text/plain' }) as unknown as File;
  if (size !== undefined) {
    Object.defineProperty(file, 'size', { value: size });
  }
  return file;
};

const pick = async (file: File): Promise<void> => {
  const input = document.querySelector('[data-testid="attachment-input"]') as HTMLInputElement;
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  await act(async () => { input.dispatchEvent(new jsdomWindow.Event('change', { bubbles: true })); });
};

const testAttachments = async (): Promise<void> => {
  (globalThis as unknown as Record<string, unknown>).FileReader = jsdomWindow.FileReader;
  const files: IAttachment[] = [{ fileName: 'quote.pdf', url: '/sites/it/Lists/IT_10/Attachments/1/quote.pdf' }];
  const calls: string[] = [];
  const store = {
    capabilities: { versioning: false, userSearch: 'known', attachments: true },
    listAttachments: async () => files.slice(),
    addAttachment: async (_l: string, id: number, name: string, content: ArrayBuffer) => { calls.push(`add:${id}:${name}:${content.byteLength}`); files.push({ fileName: name, url: `/x/${name}` }); },
    deleteAttachment: async (_l: string, id: number, name: string) => { calls.push(`delete:${id}:${name}`); files.splice(0, files.length, ...files.filter(f => f.fileName !== name)); },
    enableAttachments: async () => { calls.push('enable'); }
  } as unknown as IDataStore;
  const section = (itemId: number | undefined, service: IDataStore = store): React.ReactElement =>
    React.createElement(I18nProvider, { language: 'en' }, React.createElement(AttachmentsSection, { service, listName: 'IT_10_Contracts', itemId }));

  await mount(section(undefined));
  assert.ok(text().indexOf('Save the item first') > -1, 'a new item has nothing to attach to yet');
  assert.equal(document.querySelector('[data-testid="attachment-input"]'), null);
  await unmount();

  await mount(section(7));
  await settle();
  const link = Array.from(document.body.querySelectorAll('a')).filter(a => (a.textContent ?? '') === 'quote.pdf')[0];
  assert.ok(link, 'the attached file is listed');
  assert.equal(link.getAttribute('href'), '/sites/it/Lists/IT_10/Attachments/1/quote.pdf');
  assert.equal(link.getAttribute('target'), '_blank');

  await pick(fileWith('minutes.txt'));
  await settle(100);
  assert.deepEqual(calls, ['add:7:minutes.txt:5'], 'the file is sent with its name and content');
  assert.ok(text().indexOf('minutes.txt') > -1, 'and the list is refreshed');

  await click(document.querySelector('button[aria-label="Remove: quote.pdf"]') as Element);
  await settle(100);
  assert.equal(calls[1], 'delete:7:quote.pdf');
  assert.equal(text().indexOf('quote.pdf'), -1, 'a removed file disappears');

  await pick(fileWith('huge.bin', 30 * 1024 * 1024));
  await settle();
  assert.ok(text().indexOf('The file is larger than 25 MB.') > -1, 'a file over the limit is refused');
  assert.equal(calls.filter(c => c.indexOf('huge.bin') > -1).length, 0, 'and not sent');
  await unmount();

  // a list without attachments: say so and offer the fix
  const off = {
    ...store,
    capabilities: { versioning: false, userSearch: 'known', attachments: true },
    addAttachment: async () => { throw new Error('Failed to attach the file. Attachments are not enabled for this list.'); }
  } as unknown as IDataStore;
  await mount(section(7, off));
  await settle();
  await pick(fileWith('a.txt'));
  await settle(100);
  assert.ok(text().indexOf('Attachments are not turned on for this list.') > -1);
  await click(button('Turn on attachments') as HTMLButtonElement);
  await settle(100);
  assert.ok(calls.indexOf('enable') > -1, 'the fix is offered and works');
  await unmount();
};

// ---------------------------------------------------------------- project templates
const testTemplatePanel = async (): Promise<void> => {
  const rec = newRec();
  let closed = 0;
  await mount(render(React.createElement(TemplatePanel, { isOpen: true, onDismiss: () => { closed++; } }), {}, rec));
  await settle();
  assert.ok(text().indexOf('Create a project from a template') > -1);
  assert.ok(text().indexOf('12 actions are created') > -1, 'the first template creates twelve actions');
  assert.ok(text().indexOf('Visit the reference service') > -1, 'the actions are listed before creating');

  await click(button('Create project and actions') as HTMLButtonElement);
  await settle();
  assert.equal(rec.createdItems.length, 0, 'a project name is required');
  assert.ok(text().indexOf('Title is required.') > -1);

  await setField('Project name', 'New help desk');
  await click(button('Create project and actions') as HTMLButtonElement);
  await settle(200);
  assert.equal(rec.createdItems.length, 13, 'the project and its twelve actions');
  const project = rec.createdItems[0];
  assert.equal(project.list, 'IT_03_Projects');
  assert.equal(project.payload.Title, 'New help desk');
  assert.equal(project.payload.Status, 'PLANNING');
  assert.equal(project.payload.OwnerUPN, 'me@x.com');
  assert.equal(project.payload.StartDate, `${today()}T12:00:00Z`);
  const actions = rec.createdItems.slice(1);
  assert.ok(actions.every(a => a.list === 'IT_04_Actions' && a.payload.ProjectId === project.payload.ProjectId), 'every action points to the new project');
  assert.ok(actions.every(a => a.payload.Status === 'OPEN' && a.payload.OwnerUPN === 'me@x.com'));
  assert.equal(actions[0].payload.DueDate, `${today()}T12:00:00Z`, 'the first action is due on the start date');
  assert.ok(text().indexOf('Created "New help desk" with 12 actions.') > -1);
  assert.equal(closed, 0);
  await unmount();

  // a failure half way says how far it got
  const rec2 = newRec();
  let calls = 0;
  await mount(render(React.createElement(TemplatePanel, { isOpen: true, onDismiss: () => undefined }), {}, rec2, 'en', {
    createItem: (async () => { calls++; if (calls === 4) { throw new Error('SharePoint is unavailable'); } return {}; }) as unknown as IDataStore['createItem']
  }));
  await settle();
  await setField('Project name', 'Half way');
  await click(button('Create project and actions') as HTMLButtonElement);
  await settle(200);
  assert.ok(text().indexOf('The project was created, but only 2 of 12 actions were saved: SharePoint is unavailable') > -1, 'it reports how many actions were saved');
  await unmount();
};

const run = async (): Promise<void> => {
  await testMatterViews();
  await testInboxCreateAndAreaRule();
  await testQuickAdd();
  await testLinks();
  await testEntitlements();
  await testAgenda();
  await testAttachments();
  await testTemplatePanel();
  console.log('matters screen tests passed');
  process.exit(0);
};

run().catch(error => {
  console.error(error);
  process.exit(1);
});
