import { Language } from '../i18n/I18n';

/** What the person typed on the start screen, remembered in this browser only. */
export interface IStandaloneSettings {
  name: string;
  email: string;
  language: Language;
}

const KEY = 'itsdm.settings';

export const defaultLanguage = (): Language => {
  const culture = typeof navigator !== 'undefined' ? navigator.language : 'en';
  return /^es/i.test(culture) ? 'es' : 'en';
};

export const loadSettings = (): IStandaloneSettings => {
  const fallback: IStandaloneSettings = { name: '', email: '', language: defaultLanguage() };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) {
      return fallback;
    }
    const parsed = JSON.parse(raw) as Partial<IStandaloneSettings>;
    return {
      name: typeof parsed.name === 'string' ? parsed.name : '',
      email: typeof parsed.email === 'string' ? parsed.email : '',
      language: parsed.language === 'es' || parsed.language === 'en' ? parsed.language : fallback.language
    };
  } catch {
    // Storage can be blocked (private window, policy): the app works without remembering.
    return fallback;
  }
};

export const saveSettings = (settings: IStandaloneSettings): void => {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Not remembered; nothing else depends on it.
  }
};
