export interface ICsvColumn<T> {
  header: string;
  value: (item: T) => string | number | undefined;
}

const needsQuotes = /[",\r\n;]/;

const escapeCell = (value: string | number | undefined): string => {
  let text = value === undefined ? '' : String(value);

  // A cell that starts with = + - or @ is run as a formula by Excel; prefix it so it stays text.
  if (/^[=+\-@]/.test(text) && isNaN(Number(text))) {
    text = `'${text}`;
  }

  return needsQuotes.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** CSV text with a header row. Comma separated; cells with commas, quotes or line breaks are quoted. */
export const toCsv = <T>(items: T[], columns: Array<ICsvColumn<T>>): string => {
  const header = columns.map(column => escapeCell(column.header)).join(',');
  const rows = items.map(item => columns.map(column => escapeCell(column.value(item))).join(','));
  return [header].concat(rows).join('\r\n');
};

/**
 * Parses CSV text into rows of cells. Accepts quoted cells with commas, doubled quotes and line
 * breaks inside, and either "," or ";" as the separator (Excel in Spanish writes ";").
 */
export const parseCsv = (text: string): string[][] => {
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const firstLine = source.split(/\r?\n/)[0] ?? '';
  const separator = firstLine.indexOf(';') > -1 && firstLine.indexOf(',') === -1 ? ';' : ',';

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < source.length; i++) {
    const char = source.charAt(i);

    if (inQuotes) {
      if (char === '"') {
        if (source.charAt(i + 1) === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === separator) {
      row.push(cell);
      cell = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source.charAt(i + 1) === '\n') {
        i++;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  // Drop completely empty lines.
  return rows.filter(r => r.some(c => c.trim().length > 0));
};

/** Turns parsed CSV into objects keyed by the header names (trimmed). */
export const csvToObjects = (rows: string[][]): Array<Record<string, string>> => {
  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map(h => h.trim());
  return rows.slice(1).map(cells => {
    const result: Record<string, string> = {};
    headers.forEach((header, index) => {
      if (header) {
        result[header] = (cells[index] ?? '').trim();
      }
    });
    return result;
  });
};
