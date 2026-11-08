import { dayKeyFromValue } from '../rules/dates';

/**
 * Helpers to turn CSV text into typed values. They never throw: a value that cannot be read is
 * kept as it came (or becomes NaN) so the normal validation reports it on the preview.
 */

/** Accepts YYYY-MM-DD or a full timestamp; anything else is kept so validation can flag it. */
export const csvDate = (value: string | undefined): string => {
  const text = (value ?? '').trim();
  return dayKeyFromValue(text) ?? text;
};

export const csvNumber = (value: string | undefined): number => {
  const text = (value ?? '').trim().replace(',', '.');
  return text === '' ? 0 : Number(text);
};

export const csvEnum = <T extends string>(value: string | undefined, allowed: T[], fallback: T): T => {
  const text = (value ?? '').trim().toUpperCase().replace(/\s+/g, '_') as T;
  return allowed.indexOf(text) > -1 ? text : fallback;
};

export const enumValues = <T extends string>(e: Record<string, T>): T[] => Object.keys(e).map(key => e[key]);
