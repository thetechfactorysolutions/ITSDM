import * as React from 'react';

/** Where to land in a tab: the list that has the record and the text to search for there. */
export interface INavSeed {
  listName: string;
  search: string;
}

export interface INav {
  /** Opens a main tab by its key (for example 'matters'), optionally with a search already typed in one of its lists. */
  goTo: (tabKey: string, seed?: INavSeed) => void;
  /** A search waiting for the list that has it to appear. */
  seed?: INavSeed;
  clearSeed: () => void;
}

/** Lets a screen send the user to another tab without knowing how the tabs are built. */
export const NavContext = React.createContext<INav>({ goTo: () => undefined, clearSeed: () => undefined });

export const useNav = (): INav => React.useContext(NavContext);
