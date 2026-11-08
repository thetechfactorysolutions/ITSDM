import { isClosedStatus } from './transitions';

export interface ITableView {
  search: string;
  /** Empty string means every status. */
  status: string;
  showClosed: boolean;
  sortKey?: string;
  sortDescending: boolean;
}

export const DEFAULT_VIEW: ITableView = { search: '', status: '', showClosed: false, sortKey: undefined, sortDescending: false };

type Accessor<T> = (item: T) => string | number | undefined;

const normalise = (value: string): string => value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const compare = (a: string | number | undefined, b: string | number | undefined): number => {
  // Empty values go last in ascending order.
  const aEmpty = a === undefined || a === '';
  const bEmpty = b === undefined || b === '';
  if (aEmpty && bEmpty) {
    return 0;
  }
  if (aEmpty) {
    return 1;
  }
  if (bEmpty) {
    return -1;
  }

  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }

  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
};

/**
 * Filters and sorts rows for a table. Search ignores case and accents and must match every word
 * in at least one of the searchable fields. Closed items are hidden unless asked for, or unless
 * the user filtered on a specific status (choosing "Completed" must show the completed ones).
 */
export const applyView = <T>(
  items: T[],
  view: ITableView,
  statusOf: (item: T) => string,
  searchFields: Array<Accessor<T>>,
  sortAccessors: Record<string, Accessor<T>>
): T[] => {
  const words = normalise(view.search.trim()).split(/\s+/).filter(Boolean);

  const filtered = items.filter(item => {
    const status = statusOf(item);

    if (view.status && status !== view.status) {
      return false;
    }

    if (!view.status && !view.showClosed && isClosedStatus(status)) {
      return false;
    }

    if (words.length === 0) {
      return true;
    }

    const haystack = normalise(searchFields.map(field => String(field(item) ?? '')).join(' '));
    return words.every(word => haystack.indexOf(word) > -1);
  });

  if (!view.sortKey || !sortAccessors[view.sortKey]) {
    return filtered;
  }

  const accessor = sortAccessors[view.sortKey];
  const direction = view.sortDescending ? -1 : 1;
  // Stable sort: ties keep their original order.
  return filtered
    .map((item, index) => ({ item, index }))
    .sort((x, y) => {
      const a = accessor(x.item);
      const b = accessor(y.item);
      const aEmpty = a === undefined || a === '';
      const bEmpty = b === undefined || b === '';

      // Empty values stay last whichever way the column is sorted.
      if (aEmpty !== bEmpty) {
        return aEmpty ? 1 : -1;
      }

      return compare(a, b) * direction || x.index - y.index;
    })
    .map(entry => entry.item);
};
