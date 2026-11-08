/** Title of each item by its business id, to show names instead of ids in tables. */
export const titleMap = <T extends { title: string }>(items: T[], idOf: (item: T) => string): Record<string, string> => {
  const map: Record<string, string> = {};
  items.forEach(item => {
    map[idOf(item)] = item.title;
  });
  return map;
};

/** The title for an id, or the id itself when the item is gone, or empty when there is no id. */
export const titleFor = (map: Record<string, string>, id: string | undefined): string => (id ? (map[id] ?? id) : '');
