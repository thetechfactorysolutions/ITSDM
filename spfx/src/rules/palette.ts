/** Quick search: finds tabs and records by what the person types. Pure, so it is tested without a screen. */

export interface IPaletteEntry {
  /** Unique within the list. */
  key: string;
  label: string;
  /** What it is, shown next to it: "Vendor", "Project", "Tab". */
  kind: string;
  /** The main tab to open. */
  tab: string;
  /** For a record: the list it is in and the text to search for there, so the screen opens already filtered. */
  listName?: string;
  search?: string;
}

const normalise = (value: string): string => value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

/**
 * Every word the person typed has to appear in the label or in the kind. A label that starts with the
 * text goes first, then one that has a word starting with it, then the rest; tabs go before records
 * when they score the same. Without text, the tabs are shown.
 */
export const searchEntries = (entries: IPaletteEntry[], query: string, limit: number = 12): IPaletteEntry[] => {
  const words = normalise(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return entries.filter(e => e.listName === undefined).slice(0, limit);
  }
  const scored: Array<{ entry: IPaletteEntry; score: number; index: number }> = [];
  entries.forEach((entry, index) => {
    const label = normalise(entry.label);
    const haystack = `${label} ${normalise(entry.kind)}`;
    if (!words.every(w => haystack.indexOf(w) > -1)) {
      return;
    }
    let score = 0;
    if (label.indexOf(words[0]) === 0) {
      score += 3;
    } else if (label.split(/[\s\-_/]+/).some(part => part.indexOf(words[0]) === 0)) {
      score += 2;
    }
    if (entry.listName === undefined) {
      score += 1;
    }
    scored.push({ entry, score, index });
  });
  return scored.sort((a, b) => b.score - a.score || a.index - b.index).slice(0, limit).map(s => s.entry);
};
