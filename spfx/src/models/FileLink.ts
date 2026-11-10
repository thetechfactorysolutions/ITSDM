/** A file linked to a record by its link (OneDrive, SharePoint...). One list serves every screen. */
export interface FileLink {
  id?: number;
  /** The name shown for the file. */
  title: string;
  listName: string;
  /** The id of the record in its list, as text. */
  itemKey: string;
  url: string;
  created?: string;
  modified?: string;
  editor?: string;
}
