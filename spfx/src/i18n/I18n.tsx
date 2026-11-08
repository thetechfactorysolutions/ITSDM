import * as React from 'react';
import { en } from './en';
import { es } from './es';

export type Language = 'en' | 'es';
export type LanguageSetting = 'auto' | Language;
export type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

const DICTIONARIES: Record<Language, Record<string, string>> = { en, es };

/**
 * Picks the display language. An explicit setting wins; otherwise the SharePoint UI language
 * of the user ("es-ES", "es-MX"...) decides, falling back to English.
 */
export const resolveLanguage = (setting: string | undefined, culture: string | undefined): Language => {
  if (setting === 'en' || setting === 'es') {
    return setting;
  }

  return (culture ?? '').toLowerCase().indexOf('es') === 0 ? 'es' : 'en';
};

/** Looks a key up, falling back to English and finally to the key itself; fills {name} placeholders. */
export const translate = (language: Language, key: string, params?: Record<string, string | number>): string => {
  const template = DICTIONARIES[language][key] ?? DICTIONARIES.en[key] ?? key;
  if (!params) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (match, name: string) => (params[name] !== undefined ? String(params[name]) : match));
};

interface II18nValue {
  language: Language;
  t: TranslateFn;
}

const I18nContext = React.createContext<II18nValue>({
  language: 'en',
  t: (key, params) => translate('en', key, params)
});

export interface II18nProviderProps {
  language: Language;
  children?: React.ReactNode;
}

export const I18nProvider: React.FC<II18nProviderProps> = ({ language, children }) => {
  const value = React.useMemo<II18nValue>(() => ({ language, t: (key, params) => translate(language, key, params) }), [language]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useT = (): TranslateFn => React.useContext(I18nContext).t;
export const useLanguage = (): Language => React.useContext(I18nContext).language;
