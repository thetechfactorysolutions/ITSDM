import { IFileHandleLike } from '../data/persistence';

/**
 * Opening and creating the data file with the browser's File System Access API (Edge and Chrome).
 * Behind an interface so the app and its tests do not depend on the real browser.
 */
export interface IFileAccess {
  /** False when the browser cannot open files directly (Firefox, Safari). */
  supported: boolean;
  openFile(): Promise<IFileHandleLike | undefined>;
  createFile(suggestedName: string): Promise<IFileHandleLike | undefined>;
  /** The file used last time, if the browser kept it. */
  lastFile(): Promise<IFileHandleLike | undefined>;
  rememberFile(handle: IFileHandleLike): Promise<void>;
  /** Asks for read and write permission again; must be called from a click. */
  ensurePermission(handle: IFileHandleLike): Promise<boolean>;
}

interface IPermissionHandle extends IFileHandleLike {
  queryPermission?(descriptor: { mode: 'readwrite' }): Promise<string>;
  requestPermission?(descriptor: { mode: 'readwrite' }): Promise<string>;
}

interface IPickerWindow {
  showOpenFilePicker?(options: unknown): Promise<IPermissionHandle[]>;
  showSaveFilePicker?(options: unknown): Promise<IPermissionHandle>;
}

const JSON_TYPES = [{ description: 'IT Management Hub data', accept: { 'application/json': ['.json'] } }];
const DB_NAME = 'itsdm-local';
const STORE_NAME = 'handles';
const KEY = 'lastFile';

const pickerWindow = (): IPickerWindow => (typeof window === 'undefined' ? {} : (window as unknown as IPickerWindow));

/** Closing the picker is not an error. */
const isCancel = (error: unknown): boolean => !!error && typeof error === 'object' && (error as { name?: string }).name === 'AbortError';

const openDb = (): Promise<IDBDatabase | undefined> => new Promise(resolve => {
  if (typeof indexedDB === 'undefined') {
    resolve(undefined);
    return;
  }
  const request = indexedDB.open(DB_NAME, 1);
  request.onupgradeneeded = (): void => { request.result.createObjectStore(STORE_NAME); };
  request.onsuccess = (): void => resolve(request.result);
  request.onerror = (): void => resolve(undefined);
});

export const browserFileAccess: IFileAccess = {
  get supported(): boolean {
    const w = pickerWindow();
    return typeof w.showOpenFilePicker === 'function' && typeof w.showSaveFilePicker === 'function';
  },

  async openFile(): Promise<IFileHandleLike | undefined> {
    try {
      const handles = await (pickerWindow().showOpenFilePicker as (o: unknown) => Promise<IPermissionHandle[]>)({ types: JSON_TYPES, multiple: false });
      return handles[0];
    } catch (error) {
      if (isCancel(error)) {
        return undefined;
      }
      throw error;
    }
  },

  async createFile(suggestedName: string): Promise<IFileHandleLike | undefined> {
    try {
      return await (pickerWindow().showSaveFilePicker as (o: unknown) => Promise<IPermissionHandle>)({ suggestedName, types: JSON_TYPES });
    } catch (error) {
      if (isCancel(error)) {
        return undefined;
      }
      throw error;
    }
  },

  async lastFile(): Promise<IFileHandleLike | undefined> {
    const db = await openDb();
    if (!db) {
      return undefined;
    }
    return new Promise(resolve => {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(KEY);
      request.onsuccess = (): void => resolve(request.result as IFileHandleLike | undefined);
      request.onerror = (): void => resolve(undefined);
    });
  },

  async rememberFile(handle: IFileHandleLike): Promise<void> {
    const db = await openDb();
    if (!db) {
      return;
    }
    await new Promise<void>(resolve => {
      const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(handle, KEY);
      request.onsuccess = (): void => resolve();
      request.onerror = (): void => resolve();
    });
  },

  async ensurePermission(handle: IFileHandleLike): Promise<boolean> {
    const h = handle as IPermissionHandle;
    if (!h.queryPermission || !h.requestPermission) {
      return true;
    }
    if ((await h.queryPermission({ mode: 'readwrite' })) === 'granted') {
      return true;
    }
    return (await h.requestPermission({ mode: 'readwrite' })) === 'granted';
  }
};

/** Saves text as a file download (the backup copy). */
export const downloadText = (fileName: string, text: string): void => {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
