/** Small things a person likes to find as they left them (a folded panel, a filter). Never required: it can be unavailable. */

export const readMemory = <T,>(key: string): T | undefined => {
  try {
    const raw = window.localStorage.getItem(`itsdm.${key}`);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
};

export const writeMemory = (key: string, value: unknown): void => {
  try {
    window.localStorage.setItem(`itsdm.${key}`, JSON.stringify(value));
  } catch {
    // private window, blocked storage: the screen works the same, it just forgets
  }
};
