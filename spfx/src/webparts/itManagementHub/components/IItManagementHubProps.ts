import { WebPartContext } from '@microsoft/sp-webpart-base';

export interface IItManagementHubProps {
  description: string;
  /** "auto" follows the SharePoint language of each user; "en" or "es" forces one. */
  language: string;
  isDarkTheme: boolean;
  context: WebPartContext;
}
