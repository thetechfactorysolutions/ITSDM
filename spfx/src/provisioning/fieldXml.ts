/**
 * Definition of the SharePoint lists the app needs. The columns come from
 * `listSchema.json`, which scripts/generate-assets.js writes from the same source as the sample
 * data and the install scripts, so there is only one definition.
 */

export type FieldType = 'Text' | 'Note' | 'Number' | 'Date' | 'Choice';

export interface IFieldDef {
  /** Internal and display name of the column. */
  name: string;
  type: FieldType;
  /** For a Choice column: the allowed values; the first one is the default. */
  choices?: string[];
  /** Extra attributes for the column, e.g. `Min="0" Max="100"` on a Number. */
  attrs?: string;
}

export interface IListDef {
  title: string;
  description: string;
  fields: IFieldDef[];
}

const escapeXml = (value: string): string => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** A random GUID in the braces form SharePoint expects, from the browser's secure source when it exists. */
export const newGuid = (): string => {
  const cryptoApi = (globalThis as { crypto?: { getRandomValues?: (array: Uint8Array) => Uint8Array } }).crypto;
  const bytes = new Uint8Array(16);
  if (cryptoApi && cryptoApi.getRandomValues) {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.prototype.map.call(bytes, (b: number) => (b < 16 ? '0' : '') + b.toString(16)).join('');
  return `{${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}}`;
};

/** The XML SharePoint needs to create one column. */
export const buildFieldXml = (field: IFieldDef, id: string = newGuid()): string => {
  const common = `ID="${id}" Name="${field.name}" StaticName="${field.name}" DisplayName="${field.name}"`;
  switch (field.type) {
    case 'Text': return `<Field Type="Text" ${common} MaxLength="255" />`;
    case 'Note': return `<Field Type="Note" ${common} NumLines="6" RichText="FALSE" Sortable="FALSE" />`;
    case 'Number': return `<Field Type="Number" ${common}${field.attrs ? ` ${field.attrs}` : ''} />`;
    case 'Date': return `<Field Type="DateTime" ${common} Format="DateOnly" />`;
    case 'Choice': {
      const choices = field.choices ?? [];
      return `<Field Type="Choice" ${common} Format="Dropdown"><Default>${escapeXml(choices[0] ?? '')}</Default><CHOICES>${choices.map(c => `<CHOICE>${escapeXml(c)}</CHOICE>`).join('')}</CHOICES></Field>`;
    }
    default: throw new Error(`Unknown field type ${String(field.type)}`);
  }
};
