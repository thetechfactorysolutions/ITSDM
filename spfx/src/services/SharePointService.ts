import { WebPartContext } from '@microsoft/sp-webpart-base';
import { PrincipalSource, PrincipalType, SPFI, spfi } from '@pnp/sp';
import { SPFx } from '@pnp/sp/behaviors/spfx';
import '@pnp/sp/profiles';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/items/get-all';

import { IDataStore, IPagedResult, IQueryOptions, IStoreCapabilities, IUserSuggestion } from '../data/IDataStore';

// Kept here so existing imports keep working.
export type { IPagedResult, IQueryOptions, IUserSuggestion };

export class SharePointService implements IDataStore {
  public readonly capabilities: IStoreCapabilities = { versioning: true, userSearch: 'directory' };

  private readonly _sp: SPFI;

  public constructor(context: WebPartContext) {
    this._sp = spfi().using(SPFx(context));
  }

  public async getItems<T>(listName: string, options?: IQueryOptions): Promise<IPagedResult<T>> {
    try {
      let query = this._sp.web.lists.getByTitle(listName).items;

      if (options?.select && options.select.length > 0) {
        query = query.select(...options.select);
      }

      if (options?.expand && options.expand.length > 0) {
        query = query.expand(...options.expand);
      }

      if (options?.filter) {
        query = query.filter(options.filter);
      }

      // Without an explicit `top` the caller wants every item. A single REST call returns
      // only 100 by default, so page through the whole list. getAll() orders by ID and
      // cannot be combined with orderBy/top/skip.
      if (!options?.top) {
        const allItems = await query.getAll();
        return { items: allItems as T[], hasNext: false };
      }

      if (options.orderBy) {
        query = query.orderBy(options.orderBy.field, options.orderBy.ascending ?? true);
      }

      query = query.top(options.top);

      if (options.skip) {
        query = query.skip(options.skip);
      }

      const items = await query();
      return {
        items: items as T[],
        hasNext: items.length === options.top
      };
    } catch (error) {
      throw this._toServiceError('Failed to retrieve items', listName, error);
    }
  }

  public async getItem<T>(listName: string, id: number, select?: string[]): Promise<T> {
    try {
      const item = select && select.length > 0
        ? await this._sp.web.lists.getByTitle(listName).items.getById(id).select(...select)()
        : await this._sp.web.lists.getByTitle(listName).items.getById(id)();

      return item as T;
    } catch (error) {
      throw this._toServiceError('Failed to retrieve item', listName, error);
    }
  }

  public async createItem<T>(listName: string, payload: Record<string, unknown>): Promise<T> {
    try {
      const result = await this._sp.web.lists.getByTitle(listName).items.add(payload);
      return result.data as T;
    } catch (error) {
      throw this._toServiceError('Failed to create item', listName, error);
    }
  }

  public async updateItem(listName: string, id: number, payload: Record<string, unknown>): Promise<void> {
    try {
      await this._sp.web.lists.getByTitle(listName).items.getById(id).update(payload);
    } catch (error) {
      throw this._toServiceError('Failed to update item', listName, error);
    }
  }

  public async deleteItem(listName: string, id: number): Promise<void> {
    try {
      await this._sp.web.lists.getByTitle(listName).items.getById(id).delete();
    } catch (error) {
      throw this._toServiceError('Failed to delete item', listName, error);
    }
  }

  /** Turns on version history for a list so changes can be traced. Needs permission to manage the list. */
  public async enableVersioning(listName: string): Promise<void> {
    try {
      await this._sp.web.lists.getByTitle(listName).update({ EnableVersioning: true });
    } catch (error) {
      throw this._toServiceError('Failed to enable version history', listName, error);
    }
  }

  /** Searches tenant users by name or email, the same lookup the SharePoint people picker uses. */
  public async searchUsers(query: string, maxResults: number = 10): Promise<IUserSuggestion[]> {
    const text = query.trim();
    if (text.length === 0) {
      return [];
    }

    try {
      const entities = await this._sp.profiles.clientPeoplePickerSearchUser({
        AllowEmailAddresses: true,
        AllowMultipleEntities: false,
        MaximumEntitySuggestions: maxResults,
        PrincipalSource: PrincipalSource.All,
        PrincipalType: PrincipalType.User,
        QueryString: text
      });

      return entities
        .filter(entity => !!entity.EntityData && !!entity.EntityData.Email)
        .map(entity => ({ displayName: entity.DisplayText, email: entity.EntityData.Email as string }));
    } catch (error) {
      throw this._toServiceError('Failed to search users', 'people picker', error);
    }
  }

  private _toServiceError(message: string, listName: string, error: unknown): Error {
    const reason = error instanceof Error ? error.message : 'Unknown error';

    // A missing list is the most common setup problem; say how to fix it instead of showing raw OData.
    if (/does not exist|\[404\]/i.test(reason) && /^IT_\d+_/.test(listName)) {
      return new Error(`The list "${listName}" does not exist on this site. The lists are created when the app is added to the site: remove the app from this site and add it again (see the Help tab).`);
    }

    return new Error(`${message} from ${listName}. ${reason}`);
  }
}
