/** An item a person starred. One list serves every screen: it says which list, which item and whose star it is. */
export interface Favorite {
  id?: number;
  /** The title of the item when it was starred, to show it without loading its list. */
  title: string;
  listName: string;
  /** The id of the item in its list, as text. */
  itemKey: string;
  userUpn: string;
  created?: string;
  modified?: string;
  editor?: string;
}
