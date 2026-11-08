/**
 * Date handling for SharePoint date columns.
 *
 * The app works with "day keys": plain YYYY-MM-DD strings in the user's local calendar.
 * They compare correctly as strings and never shift days when the timezone changes.
 */

const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const pad2 = (value: number): string => (value < 10 ? `0${value}` : String(value));

/** Local calendar day of a Date as YYYY-MM-DD. */
export const toDayKey = (date: Date): string => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

/** True only for a real calendar day (rejects 2025-02-30, which Date would silently roll over). */
export const isValidDayKey = (value: string | undefined): boolean => {
  if (!value || !DAY_KEY_PATTERN.test(value)) {
    return false;
  }

  const parts = value.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};

/** Local-midnight Date for a day key, or undefined when it is empty or invalid. */
export const fromDayKey = (value: string | undefined): Date | undefined => {
  if (!isValidDayKey(value)) {
    return undefined;
  }

  const parts = (value as string).split('-');
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
};

/**
 * Calendar day of a value read from SharePoint or typed by a user.
 * - "2025-01-02" is already a day key and is kept as is.
 * - A full timestamp ("2025-01-02T08:00:00Z") is an instant, so it is shown as the local day
 *   it falls on. Reading the first 10 characters instead would be a day off for sites whose
 *   midnight is the previous day in UTC.
 * Returns undefined when the value is empty or cannot be read.
 */
export const dayKeyFromValue = (value: string | undefined): string | undefined => {
  if (!value) {
    return undefined;
  }

  if (DAY_KEY_PATTERN.test(value)) {
    return isValidDayKey(value) ? value : undefined;
  }

  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? undefined : toDayKey(parsed);
};

/**
 * Value to write to a SharePoint date column. Noon UTC keeps the same calendar day for every
 * timezone from UTC-12 to UTC+12, whereas midnight would land on the previous or next day.
 * Returns null (not undefined) because a literal null is how the REST API clears a date.
 */
// eslint-disable-next-line @rushstack/no-new-null -- the SharePoint REST API clears a column only with a literal null
export const dayKeyToSharePoint = (value: string | undefined): string | null => {
  return isValidDayKey(value) ? `${value}T12:00:00Z` : null;
};

/** The day key n days after (or before, if negative) the given one. Returns the input when it is not a valid day. */
export const addDays = (value: string, days: number): string => {
  const start = fromDayKey(value);
  if (!start) {
    return value;
  }
  return toDayKey(new Date(start.getFullYear(), start.getMonth(), start.getDate() + days));
};
