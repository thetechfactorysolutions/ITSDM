import * as React from 'react';
import { useHubData } from './HubData';

export interface IFavorites {
  /** The ids (as text) of the items this person starred in the list. */
  ids: Set<string>;
  isFavorite: (id: number | undefined) => boolean;
  toggle: (item: { id?: number }, title: string) => Promise<void>;
}

const NONE: never[] = [];
const same = (a: string, b: string): boolean => a.trim().toLowerCase() === b.trim().toLowerCase();

/** The stars of the person using the app, for one list. They live in one list for every screen. */
export const useFavorites = (listName: string): IFavorites => {
  const { favorites, userEmail } = useHubData();
  // a screen can be shown without every list around it (a test, an embed): no list means no stars
  const all = favorites ? favorites.items : NONE;
  const mine = React.useMemo(
    () => all.filter(f => f.listName === listName && same(f.userUpn, userEmail)),
    [all, listName, userEmail]
  );
  const ids = React.useMemo(() => new Set(mine.map(f => f.itemKey)), [mine]);

  const toggle = async (item: { id?: number }, title: string): Promise<void> => {
    if (item.id === undefined) {
      return;
    }
    const key = String(item.id);
    const existing = mine.filter(f => f.itemKey === key)[0];
    if (existing && existing.id !== undefined) {
      await favorites.remove(existing.id);
      return;
    }
    await favorites.create({ Title: title.trim().slice(0, 255) || key, ListName: listName, ItemKey: key, UserUPN: userEmail });
  };

  return { ids, isFavorite: id => id !== undefined && ids.has(String(id)), toggle };
};
