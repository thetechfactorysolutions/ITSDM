import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  type IPropertyPaneConfiguration,
  PropertyPaneDropdown,
  PropertyPaneTextField
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { IReadonlyTheme } from '@microsoft/sp-component-base';

import * as strings from 'ItManagementHubWebPartStrings';
import ItManagementHub from './components/ItManagementHub';
import { IItManagementHubProps } from './components/IItManagementHubProps';

export interface IItManagementHubWebPartProps {
  description: string;
  language: string;
}

export default class ItManagementHubWebPart extends BaseClientSideWebPart<IItManagementHubWebPartProps> {

  private _isDarkTheme: boolean = false;

  public render(): void {
    const element: React.ReactElement<IItManagementHubProps> = React.createElement(
      ItManagementHub,
      {
        description: this.properties.description,
        language: this.properties.language || 'auto',
        isDarkTheme: this._isDarkTheme,
        context: this.context
      }
    );

    ReactDom.render(element, this.domElement);
  }

  protected onInit(): Promise<void> {
    return Promise.resolve();
  }

  protected onThemeChanged(currentTheme: IReadonlyTheme | undefined): void {
    if (!currentTheme) {
      return;
    }

    this._isDarkTheme = !!currentTheme.isInverted;
    const {
      semanticColors
    } = currentTheme;

    if (semanticColors) {
      this.domElement.style.setProperty('--bodyText', semanticColors.bodyText || null);
      this.domElement.style.setProperty('--link', semanticColors.link || null);
      this.domElement.style.setProperty('--linkHovered', semanticColors.linkHovered || null);
    }

  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: {
            description: strings.PropertyPaneDescription
          },
          groups: [
            {
              groupName: strings.BasicGroupName,
              groupFields: [
                PropertyPaneTextField('description', {
                  label: strings.DescriptionFieldLabel
                }),
                PropertyPaneDropdown('language', {
                  label: 'Language / Idioma',
                  selectedKey: this.properties.language || 'auto',
                  options: [
                    { key: 'auto', text: 'Auto (SharePoint language)' },
                    { key: 'es', text: 'Español' },
                    { key: 'en', text: 'English' }
                  ]
                })
              ]
            }
          ]
        }
      ]
    };
  }
}
