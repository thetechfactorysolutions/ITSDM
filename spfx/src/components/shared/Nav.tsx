import * as React from 'react';

export interface INav {
  /** Opens a main tab by its key (for example 'matters'). */
  goTo: (tabKey: string) => void;
}

/** Lets a screen send the user to another tab without knowing how the tabs are built. */
export const NavContext = React.createContext<INav>({ goTo: () => undefined });

export const useNav = (): INav => React.useContext(NavContext);
