import { IListDef } from '../provisioning/fieldXml';
import { ensureLists } from '../provisioning/provision';
import { buildBackup, IBackup, IdMap, IRestoreRow, payloadFor, planRestore, restoreOrder } from '../rules/backup';
import { IDataStore } from './IDataStore';

/** Reading every list into a backup and writing a backup into a site. The decisions are in rules/backup.ts. */

export interface IProgress {
  done: number;
  total: number;
  list: string;
}

const message = (err: unknown): string => (err instanceof Error ? err.message : String(err));

export interface IReadResult {
  backup: IBackup;
  /** Lists that could not be read (usually: they do not exist yet in this site). */
  unreadable: Array<{ list: string; error: string }>;
}

export const readEverything = async (store: IDataStore, defs: IListDef[], source: string, onProgress?: (p: IProgress) => void): Promise<IReadResult> => {
  const data: Record<string, Array<Record<string, unknown>>> = {};
  const unreadable: Array<{ list: string; error: string }> = [];
  for (let i = 0; i < defs.length; i++) {
    const def = defs[i];
    if (onProgress) {
      onProgress({ done: i, total: defs.length, list: def.title });
    }
    try {
      data[def.title] = (await store.getItems<Record<string, unknown>>(def.title)).items;
    } catch (err) {
      data[def.title] = [];
      unreadable.push({ list: def.title, error: message(err) });
    }
  }
  return { backup: buildBackup(defs, data, source), unreadable };
};

/** How many records each list has right now (0 for a list that does not exist). */
export const countRecords = async (store: IDataStore, defs: IListDef[]): Promise<Record<string, number>> => {
  const counts: Record<string, number> = {};
  for (const def of defs) {
    try {
      counts[def.title] = (await store.getItems<Record<string, unknown>>(def.title, { select: ['Id'] })).items.length;
    } catch {
      counts[def.title] = 0;
    }
  }
  return counts;
};

export const planFor = async (store: IDataStore, backup: IBackup, defs: IListDef[]): Promise<IRestoreRow[]> =>
  planRestore(backup, defs, await countRecords(store, defs));

export interface IRestoreResult {
  created: Record<string, number>;
  /** Pointers (favourites, file links) dropped because the record they pointed at was not restored. */
  dropped: number;
  failed: Array<{ list: string; error: string }>;
}

/**
 * Creates the lists that are missing, then copies every list that is still empty. A list that already
 * has records is left alone, so restoring twice never duplicates anything.
 */
export const restoreBackup = async (store: IDataStore, backup: IBackup, defs: IListDef[], onProgress?: (p: IProgress) => void): Promise<IRestoreResult> => {
  const result: IRestoreResult = { created: {}, dropped: 0, failed: [] };
  if (store.provisioner) {
    const ensured = await ensureLists(store.provisioner, defs);
    ensured.failed.forEach(f => result.failed.push(f));
  }
  const rows = await planFor(store, backup, defs);
  const byTitle: Record<string, IRestoreRow> = {};
  rows.forEach(r => { byTitle[r.title] = r; });
  const defOf: Record<string, IListDef> = {};
  defs.forEach(d => { defOf[d.title] = d; });
  const ids: IdMap = {};
  const order = restoreOrder(rows.filter(r => r.action === 'restore').map(r => r.title));

  for (let i = 0; i < order.length; i++) {
    const title = order[i];
    const def = defOf[title];
    ids[title] = {};
    result.created[title] = 0;
    if (onProgress) {
      onProgress({ done: i, total: order.length, list: title });
    }
    const source = backup.lists[title].items.slice().sort((a, b) => Number(a.Id ?? a.ID) - Number(b.Id ?? b.ID));
    try {
      for (const item of source) {
        const payload = payloadFor(def, item, ids);
        if (!payload) {
          result.dropped += 1;
          continue;
        }
        const created = await store.createItem<{ Id?: number; ID?: number }>(title, payload);
        const newId = created.Id ?? created.ID;
        const oldId = item.Id ?? item.ID;
        if (newId !== undefined && oldId !== undefined) {
          ids[title][String(oldId)] = newId;
        }
        result.created[title] += 1;
      }
    } catch (err) {
      result.failed.push({ list: title, error: message(err) });
    }
  }
  return result;
};

