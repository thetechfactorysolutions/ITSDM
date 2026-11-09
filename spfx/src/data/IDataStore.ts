/**
 * The contract between the screens and wherever the data lives.
 *
 * Screens and hooks depend only on this interface. Today it is implemented by SharePoint lists
 * (services/SharePointService.ts) and by a JSON document in a file (data/DocumentStore.ts). A
 * future store (Azure Blob, an HTTP API in front of SQL...) only has to implement these methods.
 *
 * Records have the shape SharePoint returns: `Id`, `Title`, ISO dates, choice and text columns as
 * plain values, and `Editor: { Title }` when it is expanded. The mappers read exactly that.
 */

import { IListProvisioner } from '../provisioning/provision';

export interface IQueryOptions {
  filter?: string;
  select?: string[];
  expand?: string[];
  orderBy?: { field: string; ascending?: boolean };
  top?: number;
  skip?: number;
}

export interface IUserSuggestion {
  displayName: string;
  email: string;
}

export interface IPagedResult<T> {
  items: T[];
  hasNext: boolean;
}

/** A file attached to an item. */
export interface IAttachment {
  fileName: string;
  /** Where to open it. */
  url: string;
}

export interface IStoreCapabilities {
  /** The store can turn on a change history for a list (SharePoint version history). */
  versioning: boolean;
  /** Where people suggestions come from: the organisation's directory, or only names already in the data. */
  userSearch: 'directory' | 'known';
  /** Items can carry attached files (SharePoint list attachments). */
  attachments: boolean;
}

export interface IDataStore {
  readonly capabilities: IStoreCapabilities;
  /** Only on stores that can create their own lists (SharePoint). */
  readonly provisioner?: IListProvisioner;
  getItems<T>(listName: string, options?: IQueryOptions): Promise<IPagedResult<T>>;
  getItem<T>(listName: string, id: number, select?: string[]): Promise<T>;
  createItem<T>(listName: string, payload: Record<string, unknown>): Promise<T>;
  updateItem(listName: string, id: number, payload: Record<string, unknown>): Promise<void>;
  deleteItem(listName: string, id: number): Promise<void>;
  searchUsers(query: string, maxResults?: number): Promise<IUserSuggestion[]>;
  /** Only when `capabilities.versioning` is true. */
  enableVersioning?(listName: string): Promise<void>;
  /** The next four only when `capabilities.attachments` is true. */
  listAttachments?(listName: string, id: number): Promise<IAttachment[]>;
  addAttachment?(listName: string, id: number, fileName: string, content: ArrayBuffer): Promise<void>;
  deleteAttachment?(listName: string, id: number, fileName: string): Promise<void>;
  enableAttachments?(listName: string): Promise<void>;
}
