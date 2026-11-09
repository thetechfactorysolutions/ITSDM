import { createConflictError, emptyDatabase, IDatabase, IDocumentPersistence, IPersistenceSnapshot } from './DocumentStore';

/** In memory: the demo mode and the tests. Nothing is saved when the page closes. */
export class MemoryPersistence implements IDocumentPersistence {
  private _database: IDatabase;
  private _revision: number = 1;

  public constructor(initial?: IDatabase) {
    this._database = JSON.parse(JSON.stringify(initial ?? emptyDatabase())) as IDatabase;
  }

  public async stat(): Promise<string> {
    return String(this._revision);
  }

  public async load(): Promise<IPersistenceSnapshot> {
    return { database: JSON.parse(JSON.stringify(this._database)) as IDatabase, version: String(this._revision) };
  }

  public async save(database: IDatabase, expectedVersion: string): Promise<string> {
    if (expectedVersion !== String(this._revision)) {
      throw createConflictError('The data changed since it was read.');
    }
    this._database = JSON.parse(JSON.stringify(database)) as IDatabase;
    this._revision++;
    return String(this._revision);
  }

  /** Simulates somebody else saving a change (tests). */
  public writeExternally(database: IDatabase): void {
    this._database = JSON.parse(JSON.stringify(database)) as IDatabase;
    this._revision++;
  }
}

// ---------------------------------------------------------------- a file chosen by the user

/** The part of a browser FileSystemFileHandle that is used, so tests can stand in for it. */
export interface IFileLike {
  lastModified: number;
  size: number;
  text(): Promise<string>;
}

export interface IWritableLike {
  write(data: string): Promise<void>;
  close(): Promise<void>;
}

export interface IFileHandleLike {
  name: string;
  getFile(): Promise<IFileLike>;
  createWritable(): Promise<IWritableLike>;
}

const versionOf = (file: IFileLike): string => `${file.lastModified}:${file.size}`;

const parseDatabase = (text: string, fileName: string): IDatabase => {
  if (text.trim().length === 0) {
    return emptyDatabase();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`"${fileName}" is not a valid data file (it is not JSON).`);
  }

  const database = parsed as Partial<IDatabase> | null;
  if (!database || database.format !== 1 || !database.lists || typeof database.lists !== 'object') {
    throw new Error(`"${fileName}" is not an IT Management Hub data file.`);
  }
  return database as IDatabase;
};

/**
 * The document is a JSON file the user picked (for example in their OneDrive folder), read and
 * written through the browser's File System Access API. The version is the file's modified date
 * and size, so a change made by OneDrive sync or by another window is noticed before saving.
 * An empty file counts as an empty database, so a new file can be created and used right away.
 */
export class FileHandlePersistence implements IDocumentPersistence {
  public constructor(private readonly _handle: IFileHandleLike) {}

  public get fileName(): string {
    return this._handle.name;
  }

  public async stat(): Promise<string> {
    return versionOf(await this._handle.getFile());
  }

  public async load(): Promise<IPersistenceSnapshot> {
    const file = await this._handle.getFile();
    const text = await file.text();
    return { database: parseDatabase(text, this._handle.name), version: versionOf(file) };
  }

  public async save(database: IDatabase, expectedVersion: string): Promise<string> {
    if ((await this.stat()) !== expectedVersion) {
      throw createConflictError('The file changed since it was read.');
    }

    // The browser writes to a temporary copy and swaps it in on close, so a failure leaves the old file intact.
    const writable = await this._handle.createWritable();
    await writable.write(JSON.stringify(database, null, 1));
    await writable.close();
    return this.stat();
  }
}
