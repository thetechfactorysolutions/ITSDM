import { IDataStore, IPagedResult, IQueryOptions, IStoreCapabilities, IUserSuggestion } from './IDataStore';

/**
 * A store that keeps the whole database as ONE JSON document.
 *
 * Where the document lives is a separate concern (IDocumentPersistence): a file in OneDrive, a
 * blob, memory. This class turns it into lists of records shaped like SharePoint items, so the
 * screens and mappers do not know the difference.
 *
 * Every write reads the latest document, applies the one operation, and saves it only if nobody
 * changed it in the meantime. If somebody did, it reads again and repeats, so a change made from
 * another window or device is never overwritten by an old copy.
 */

export interface IStoredList {
  /** The Id the next created item gets. Ids are never reused. */
  nextId: number;
  items: Array<Record<string, unknown>>;
}

export interface IDatabase {
  format: 1;
  lists: Record<string, IStoredList>;
}

export interface IPersistenceSnapshot {
  database: IDatabase;
  /** Opaque token that changes whenever the document changes (an ETag, a modified date + size...). */
  version: string;
}

export interface IDocumentPersistence {
  /** The current version token, without reading the whole document. */
  stat(): Promise<string>;
  load(): Promise<IPersistenceSnapshot>;
  /** Saves only if the document is still at `expectedVersion`; otherwise fails with a conflict error. Returns the new version. */
  save(database: IDatabase, expectedVersion: string): Promise<string>;
}

export const CONFLICT_CODE = 'CONFLICT';

/** The document changed between reading it and saving it. */
export const createConflictError = (message: string): Error => {
  const error = new Error(message);
  (error as Error & { code?: string }).code = CONFLICT_CODE;
  return error;
};

export const isConflictError = (error: unknown): boolean =>
  !!error && typeof error === 'object' && (error as { code?: string }).code === CONFLICT_CODE;

export const emptyDatabase = (): IDatabase => ({ format: 1, lists: {} });

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export interface IStoreUser {
  email: string;
  displayName: string;
}

export interface IDocumentStoreOptions {
  /** Who is using the app: stamped as Author and Editor on what they write. */
  user: IStoreUser;
  now?: () => Date;
  /** Tries before giving up when somebody keeps changing the document. Default 3. */
  maxAttempts?: number;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Columns that hold a person's email; the people search offers the ones already in the data.
const PERSON_COLUMNS = ['AssignedTo', 'ReportedBy', 'Approver', 'ApprovalDecidedBy', 'DecidedBy'];

const isPersonColumn = (key: string): boolean => /UPN$/.test(key) || PERSON_COLUMNS.indexOf(key) > -1;

export class DocumentStore implements IDataStore {
  public readonly capabilities: IStoreCapabilities = { versioning: false, userSearch: 'known' };

  private _cache: IPersistenceSnapshot | undefined;
  private _loading: Promise<IPersistenceSnapshot> | undefined;
  private readonly _now: () => Date;
  private readonly _maxAttempts: number;

  public constructor(private readonly _persistence: IDocumentPersistence, private readonly _options: IDocumentStoreOptions) {
    this._now = _options.now ?? ((): Date => new Date());
    this._maxAttempts = _options.maxAttempts ?? 3;
  }

  /** Forgets what was read, so the next read goes to the document again. */
  public invalidate(): void {
    this._cache = undefined;
  }

  public async getItems<T>(listName: string, options?: IQueryOptions): Promise<IPagedResult<T>> {
    if (options?.filter) {
      throw new Error('This store does not support filter queries. Load the list and filter it in memory.');
    }

    const snapshot = await this._current();
    const list = snapshot.database.lists[listName];
    let items = list ? clone(list.items) : [];

    if (options?.orderBy) {
      const { field, ascending } = options.orderBy;
      const direction = ascending === false ? -1 : 1;
      items.sort((a, b) => {
        const left = a[field] as string | number | undefined;
        const right = b[field] as string | number | undefined;
        return left === right ? 0 : (left ?? '') < (right ?? '') ? -direction : direction;
      });
    }

    const skip = options?.skip ?? 0;
    const top = options?.top;
    const total = items.length;
    items = items.slice(skip, top === undefined ? undefined : skip + top);
    return { items: items as unknown as T[], hasNext: top !== undefined && skip + top < total };
  }

  public async getItem<T>(listName: string, id: number): Promise<T> {
    const snapshot = await this._current();
    const list = snapshot.database.lists[listName];
    const found = list ? list.items.filter(item => item.Id === id)[0] : undefined;
    if (!found) {
      throw new Error(`Item ${id} was not found in ${listName}.`);
    }
    return clone(found) as unknown as T;
  }

  public createItem<T>(listName: string, payload: Record<string, unknown>): Promise<T> {
    return this._write(database => {
      const list = this._ensureList(database, listName);
      const id = list.nextId;
      list.nextId = id + 1;
      const stamp = this._now().toISOString();
      const person = { Title: this._options.user.displayName };
      const item: Record<string, unknown> = {
        ...this._clean(payload), Id: id, ID: id, Created: stamp, Modified: stamp, Author: person, Editor: { ...person }
      };
      list.items.push(item);
      return clone(item) as unknown as T;
    });
  }

  public updateItem(listName: string, id: number, payload: Record<string, unknown>): Promise<void> {
    return this._write(database => {
      const list = this._ensureList(database, listName);
      const index = this._indexOf(list, id, listName);
      list.items[index] = {
        ...list.items[index], ...this._clean(payload), Id: id, ID: id,
        Modified: this._now().toISOString(), Editor: { Title: this._options.user.displayName }
      };
    });
  }

  public deleteItem(listName: string, id: number): Promise<void> {
    return this._write(database => {
      const list = this._ensureList(database, listName);
      list.items.splice(this._indexOf(list, id, listName), 1);
    });
  }

  /** Suggests the people who already appear in the data, plus the email typed if it looks like one. */
  public async searchUsers(query: string, maxResults: number = 10): Promise<IUserSuggestion[]> {
    const text = query.trim().toLowerCase();
    if (text.length === 0) {
      return [];
    }

    const snapshot = await this._current();
    const known: Record<string, boolean> = {};
    known[this._options.user.email.toLowerCase()] = true;
    const lists = snapshot.database.lists;
    Object.keys(lists).forEach(name => lists[name].items.forEach(item => {
      Object.keys(item).forEach(key => {
        const value = item[key];
        if (isPersonColumn(key) && typeof value === 'string' && EMAIL_PATTERN.test(value.trim())) {
          known[value.trim().toLowerCase()] = true;
        }
      });
    }));

    const matches = Object.keys(known).filter(email => email.indexOf(text) > -1).sort();
    if (EMAIL_PATTERN.test(text) && matches.indexOf(text) === -1) {
      matches.unshift(text);
    }
    return matches.slice(0, maxResults).map(email => ({ displayName: email, email }));
  }

  // ---------------------------------------------------------------- internals

  /** The latest document, read again only when its version changed. Concurrent callers share one read. */
  private _current(): Promise<IPersistenceSnapshot> {
    if (this._loading) {
      return this._loading;
    }

    const run = async (): Promise<IPersistenceSnapshot> => {
      try {
        if (this._cache && (await this._persistence.stat()) === this._cache.version) {
          return this._cache;
        }
        this._cache = await this._persistence.load();
        return this._cache;
      } finally {
        this._loading = undefined;
      }
    };
    this._loading = run();
    return this._loading;
  }

  private async _write<T>(operation: (database: IDatabase) => T): Promise<T> {
    for (let attempt = 1; ; attempt++) {
      // Always the latest copy, never the cache: the operation must apply on top of what is saved now.
      const snapshot = await this._persistence.load();
      const database = clone(snapshot.database);
      const result = operation(database);

      try {
        const version = await this._persistence.save(database, snapshot.version);
        this._cache = { database, version };
        return result;
      } catch (error) {
        this._cache = undefined;
        if (!isConflictError(error)) {
          throw error;
        }
        if (attempt >= this._maxAttempts) {
          throw new Error('The data file keeps changing from somewhere else, so the change was not saved. Close the other windows or devices using it and try again.');
        }
      }
    }
  }

  private _ensureList(database: IDatabase, listName: string): IStoredList {
    if (!database.lists[listName]) {
      database.lists[listName] = { nextId: 1, items: [] };
    }
    return database.lists[listName];
  }

  private _indexOf(list: IStoredList, id: number, listName: string): number {
    for (let i = 0; i < list.items.length; i++) {
      if (list.items[i].Id === id) {
        return i;
      }
    }
    throw new Error(`Item ${id} was not found in ${listName}.`);
  }

  /** A payload without undefined values (JSON would drop them silently anyway). */
  private _clean(payload: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    Object.keys(payload).forEach(key => {
      if (payload[key] !== undefined) {
        out[key] = payload[key];
      }
    });
    return out;
  }
}
