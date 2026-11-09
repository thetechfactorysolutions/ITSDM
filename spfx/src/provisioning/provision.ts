import { IFieldDef, IListDef } from './fieldXml';

/**
 * Creating the lists from the app itself, instead of when the app is added to the site. Adding
 * the app used to fail on a site that already had some of the lists; this only creates what is
 * missing, adds missing columns and never deletes or changes data.
 */

/** What the store must be able to do on the site (SharePoint implements it; the local mode does not). */
export interface IListProvisioner {
  getListTitles(): Promise<string[]>;
  createList(list: IListDef): Promise<void>;
  getFieldNames(listTitle: string): Promise<string[]>;
  addField(listTitle: string, field: IFieldDef): Promise<void>;
}

export const findMissingLists = (defs: IListDef[], existingTitles: string[]): IListDef[] =>
  defs.filter(def => existingTitles.indexOf(def.title) === -1);

export interface IEnsureProgress {
  done: number;
  total: number;
  list: string;
}

export interface IEnsureResult {
  created: string[];
  fieldsAdded: Array<{ list: string; fields: string[] }>;
  failed: Array<{ list: string; error: string }>;
}

export interface IEnsureOptions {
  /** Only create the lists that do not exist; leave the existing ones alone. Default false (also add missing columns). */
  onlyMissing?: boolean;
  onProgress?: (progress: IEnsureProgress) => void;
}

const message = (err: unknown): string => (err instanceof Error ? err.message : String(err));

/**
 * Makes sure every list exists with every column. A failure on one list does not stop the others;
 * it is reported in `failed`.
 */
export const ensureLists = async (provisioner: IListProvisioner, defs: IListDef[], options: IEnsureOptions = {}): Promise<IEnsureResult> => {
  const result: IEnsureResult = { created: [], fieldsAdded: [], failed: [] };
  const titles = await provisioner.getListTitles();
  const targets = options.onlyMissing ? findMissingLists(defs, titles) : defs;

  for (let i = 0; i < targets.length; i++) {
    const def = targets[i];
    try {
      let have: string[];
      if (titles.indexOf(def.title) === -1) {
        await provisioner.createList(def);
        result.created.push(def.title);
        have = [];
      } else {
        have = await provisioner.getFieldNames(def.title);
      }

      const added: string[] = [];
      for (const field of def.fields) {
        if (have.indexOf(field.name) === -1) {
          await provisioner.addField(def.title, field);
          added.push(field.name);
        }
      }
      if (added.length > 0 && result.created.indexOf(def.title) === -1) {
        result.fieldsAdded.push({ list: def.title, fields: added });
      }
    } catch (err) {
      result.failed.push({ list: def.title, error: message(err) });
    }
    if (options.onProgress) {
      options.onProgress({ done: i + 1, total: targets.length, list: def.title });
    }
  }
  return result;
};
