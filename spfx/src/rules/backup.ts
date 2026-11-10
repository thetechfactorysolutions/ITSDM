import { IFieldDef, IListDef } from '../provisioning/fieldXml';

/**
 * A complete copy of the data (every list) in one JSON file, and the rules to put it back in another
 * site without losing anything. The shape is the same as the local mode's database file, so a copy made
 * in SharePoint opens in the local mode and the other way round. Pure, so it is tested without a site.
 */

export interface IBackupList {
  nextId: number;
  items: Array<Record<string, unknown>>;
}

export interface IBackup {
  format: 1;
  exportedAt?: string;
  source?: string;
  lists: Record<string, IBackupList>;
}

/** Lists whose rows point at records of other lists by their id; ids change on restore, so these are restored last and re-pointed. */
export const POINTER_LISTS = ['IT_38_Favorites', 'IT_39_FileLinks'];

const SYSTEM_KEPT = ['Created', 'Modified'];

const isEmpty = (value: unknown): boolean => value === undefined || value === null;

const idOf = (item: Record<string, unknown>): number | undefined => {
  const raw = item.Id ?? item.ID;
  const id = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(id) && id > 0 ? id : undefined;
};

/** Only what the app knows about: the id, the title, the columns of the list and the dates. Everything else SharePoint adds is left out. */
const keepForBackup = (def: IListDef, item: Record<string, unknown>): Record<string, unknown> => {
  const kept: Record<string, unknown> = {};
  const id = idOf(item);
  if (id !== undefined) {
    kept.Id = id;
  }
  ['Title'].concat(def.fields.map(f => f.name), SYSTEM_KEPT).forEach(name => {
    if (!isEmpty(item[name])) {
      kept[name] = item[name];
    }
  });
  return kept;
};

export const buildBackup = (defs: IListDef[], data: Record<string, Array<Record<string, unknown>>>, source: string, now: Date = new Date()): IBackup => {
  const lists: Record<string, IBackupList> = {};
  defs.forEach(def => {
    const items = (data[def.title] ?? []).map(item => keepForBackup(def, item)).filter(item => item.Id !== undefined);
    const top = items.reduce((max, item) => Math.max(max, item.Id as number), 0);
    lists[def.title] = { nextId: top + 1, items };
  });
  return { format: 1, exportedAt: now.toISOString(), source, lists };
};

export interface IParsedBackup {
  backup?: IBackup;
  /** Translation key of what is wrong with the file. */
  errorKey?: 'backup.errNotJson' | 'backup.errShape';
}

export const parseBackup = (text: string): IParsedBackup => {
  let raw: unknown;
  try {
    raw = JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
  } catch {
    return { errorKey: 'backup.errNotJson' };
  }
  const doc = raw as { lists?: unknown };
  if (!doc || typeof doc !== 'object' || !doc.lists || typeof doc.lists !== 'object' || Array.isArray(doc.lists)) {
    return { errorKey: 'backup.errShape' };
  }
  const lists: Record<string, IBackupList> = {};
  const found = doc.lists as Record<string, { items?: unknown; nextId?: unknown }>;
  for (const title of Object.keys(found)) {
    const list = found[title];
    if (!list || !Array.isArray(list.items)) {
      return { errorKey: 'backup.errShape' };
    }
    lists[title] = { nextId: typeof list.nextId === 'number' ? list.nextId : list.items.length + 1, items: list.items as Array<Record<string, unknown>> };
  }
  const meta = raw as { exportedAt?: unknown; source?: unknown };
  return { backup: { format: 1, exportedAt: typeof meta.exportedAt === 'string' ? meta.exportedAt : undefined, source: typeof meta.source === 'string' ? meta.source : undefined, lists } };
};

export type RestoreAction = 'restore' | 'skipFilled' | 'nothing';

export interface IRestoreRow {
  title: string;
  incoming: number;
  existing: number;
  action: RestoreAction;
}

/** What would happen to each list: copied, left alone because it already has data (nothing is duplicated), or nothing to copy. */
export const planRestore = (backup: IBackup, defs: IListDef[], existing: Record<string, number>): IRestoreRow[] =>
  defs.map(def => {
    const incoming = backup.lists[def.title] ? backup.lists[def.title].items.length : 0;
    const have = existing[def.title] ?? 0;
    return { title: def.title, incoming, existing: have, action: incoming === 0 ? 'nothing' : have > 0 ? 'skipFilled' : 'restore' };
  });

/** The lists in the order they are restored: the ones that point at other lists last. */
export const restoreOrder = (titles: string[]): string[] =>
  titles.filter(t => POINTER_LISTS.indexOf(t) === -1).concat(titles.filter(t => POINTER_LISTS.indexOf(t) > -1));

export type IdMap = Record<string, Record<string, number>>;

const hasValue = (field: IFieldDef, value: unknown): boolean => !(isEmpty(value) || ((field.type === 'Number' || field.type === 'Date') && value === ''));

/**
 * The columns to write for one record in the new site. A pointer list (favourites, file links) is
 * re-pointed to the new id of the record; if that record was not restored the pointer is dropped
 * (undefined).
 */
export const payloadFor = (def: IListDef, item: Record<string, unknown>, ids: IdMap): Record<string, unknown> | undefined => {
  const payload: Record<string, unknown> = {};
  if (!isEmpty(item.Title)) {
    payload.Title = item.Title;
  }
  def.fields.forEach(field => {
    if (hasValue(field, item[field.name])) {
      payload[field.name] = item[field.name];
    }
  });
  if (POINTER_LISTS.indexOf(def.title) > -1) {
    const listName = String(item.ListName ?? '');
    const target = (ids[listName] ?? {})[String(item.ItemKey ?? '')];
    if (target === undefined) {
      return undefined;
    }
    payload.ItemKey = String(target);
  }
  return payload;
};
