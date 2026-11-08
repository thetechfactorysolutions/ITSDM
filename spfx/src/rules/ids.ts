import { toDayKey } from './dates';

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const SUFFIX_LENGTH = 6;

/** Random number in [0, 1). Prefers the browser's cryptographic source when it exists. */
const defaultRandom = (): number => {
  const cryptoApi = (globalThis as { crypto?: { getRandomValues?: (array: Uint32Array) => Uint32Array } }).crypto;
  if (cryptoApi && cryptoApi.getRandomValues) {
    const buffer = new Uint32Array(1);
    cryptoApi.getRandomValues(buffer);
    return buffer[0] / 4294967296;
  }

  return Math.random();
};

/**
 * Readable business id such as IDEA-20261108-K3F9QZ: prefix, creation day and a random suffix.
 * Two items created in the same millisecond no longer collide the way a bare timestamp does,
 * and the day in the id makes records easy to place at a glance.
 */
export const generateBusinessId = (prefix: string, now: Date = new Date(), random: () => number = defaultRandom): string => {
  let suffix = '';
  for (let i = 0; i < SUFFIX_LENGTH; i++) {
    suffix += ALPHABET.charAt(Math.floor(random() * ALPHABET.length));
  }

  return `${prefix}-${toDayKey(now).split('-').join('')}-${suffix}`;
};
