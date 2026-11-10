import { ITableView } from './tableView';

/**
 * Named ways of looking at a list ("My late ones", "Open, by date"): the search, the status, whether
 * closed ones show, the order and the summary filter that was pressed. Pure; where they are kept
 * (the browser) is up to the screen.
 */

export interface ISavedView {
  id: string;
  name: string;
  search: string;
  status: string;
  showClosed: boolean;
  sortKey?: string;
  sortDescending: boolean;
  /** Key of the summary filter (a figure or a bar) that was pressed, if any. */
  chipKey?: string;
}

export const MAX_VIEWS = 20;

export const cleanName = (name: string): string => name.trim().replace(/\s+/g, ' ').slice(0, 40);

export interface ISaveOutcome {
  views: ISavedView[];
  error?: 'empty' | 'tooMany';
}

/** Adds a view; one with the same name (any case) is replaced, so saving again updates it. */
export const saveView = (views: ISavedView[], name: string, view: ITableView, chipKey: string | undefined, newId: string): ISaveOutcome => {
  const clean = cleanName(name);
  if (clean === '') {
    return { views, error: 'empty' };
  }
  const entry: ISavedView = { id: newId, name: clean, search: view.search, status: view.status, showClosed: view.showClosed, sortKey: view.sortKey, sortDescending: view.sortDescending, chipKey };
  const same = views.filter(v => v.name.toLowerCase() === clean.toLowerCase())[0];
  if (same) {
    return { views: views.map(v => (v.id === same.id ? { ...entry, id: same.id } : v)) };
  }
  if (views.length >= MAX_VIEWS) {
    return { views, error: 'tooMany' };
  }
  return { views: views.concat([entry]) };
};

export const removeView = (views: ISavedView[], id: string): ISavedView[] => views.filter(v => v.id !== id);

export const toTableView = (view: ISavedView): ITableView => ({ search: view.search, status: view.status, showClosed: view.showClosed, sortKey: view.sortKey, sortDescending: view.sortDescending });

/** Reads what was stored, ignoring anything that is not a view (the storage can hold anything). */
export const parseViews = (raw: unknown): ISavedView[] => {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .filter((v): v is Record<string, unknown> => !!v && typeof v === 'object' && typeof (v as Record<string, unknown>).id === 'string' && typeof (v as Record<string, unknown>).name === 'string')
    .map(v => ({
      id: String(v.id),
      name: cleanName(String(v.name)),
      search: typeof v.search === 'string' ? v.search : '',
      status: typeof v.status === 'string' ? v.status : '',
      showClosed: v.showClosed === true,
      sortKey: typeof v.sortKey === 'string' ? v.sortKey : undefined,
      sortDescending: v.sortDescending === true,
      chipKey: typeof v.chipKey === 'string' ? v.chipKey : undefined
    }))
    .filter(v => v.name !== '')
    .slice(0, MAX_VIEWS);
};
