/**
 * Files that live in OneDrive (or anywhere else) and are linked to a record by pasting their link. No
 * permissions are needed: the app only stores the link and a name. Pure, so it is tested without a screen.
 */

export interface IFileKind {
  emoji: string;
  label: string;
}

const KINDS: Array<{ exts: string[]; kind: IFileKind }> = [
  { exts: ['pdf'], kind: { emoji: '📕', label: 'PDF' } },
  { exts: ['doc', 'docx', 'dot', 'dotx', 'rtf', 'odt'], kind: { emoji: '📘', label: 'Word' } },
  { exts: ['xls', 'xlsx', 'xlsm', 'csv', 'ods'], kind: { emoji: '📗', label: 'Excel' } },
  { exts: ['ppt', 'pptx', 'potx', 'odp'], kind: { emoji: '📙', label: 'PowerPoint' } },
  { exts: ['msg', 'eml'], kind: { emoji: '✉️', label: 'Email' } },
  { exts: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'webp', 'heic'], kind: { emoji: '🖼️', label: 'Image' } },
  { exts: ['zip', 'rar', '7z', 'gz'], kind: { emoji: '🗜️', label: 'ZIP' } },
  { exts: ['txt', 'md', 'log'], kind: { emoji: '📄', label: 'Text' } },
  { exts: ['mp4', 'mov', 'avi', 'mkv'], kind: { emoji: '🎞️', label: 'Video' } },
  { exts: ['one', 'onetoc2'], kind: { emoji: '📓', label: 'OneNote' } },
  { exts: ['vsd', 'vsdx'], kind: { emoji: '🧩', label: 'Visio' } }
];

/** Extensions of pages, not of files: the name of a OneDrive page (onedrive.aspx) is not the name of the file. */
const PAGE_EXTENSIONS = ['aspx', 'html', 'htm', 'php'];

const OTHER: IFileKind = { emoji: '📎', label: 'File' };

export const extensionOf = (name: string): string => {
  const match = /\.([A-Za-z0-9]{1,8})$/.exec(name.trim());
  return match ? match[1].toLowerCase() : '';
};

export const fileKind = (name: string): IFileKind => {
  const ext = extensionOf(name);
  const found = KINDS.filter(k => k.exts.indexOf(ext) > -1)[0];
  return found ? found.kind : OTHER;
};

/** Only web links are accepted: nothing that runs code (javascript:, data:) and nothing that is not a link. */
export const isSafeUrl = (value: string): boolean => {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};

/**
 * A name for the file from its link: the last part of the path when it looks like a file, else the one
 * in the `id` parameter OneDrive puts in its links, else a generic one.
 */
export const fileNameFromUrl = (value: string, fallback: string = 'OneDrive'): string => {
  try {
    const url = new URL(value.trim());
    const candidates = [url.searchParams.get('id') ?? '', url.pathname];
    for (const candidate of candidates) {
      const last = decodeURIComponent(candidate.split('/').filter(p => p !== '').pop() ?? '');
      if (extensionOf(last) && PAGE_EXTENSIONS.indexOf(extensionOf(last)) === -1) {
        return last;
      }
    }
    return fallback;
  } catch {
    return fallback;
  }
};

export const isOneDriveUrl = (value: string): boolean => {
  try {
    const host = new URL(value.trim()).hostname.toLowerCase();
    return host.endsWith('sharepoint.com') || host.endsWith('onedrive.live.com') || host === '1drv.ms' || host.endsWith('onedrive.com');
  } catch {
    return false;
  }
};

export interface IFileLinkLike {
  listName: string;
  itemKey: string;
}

/** The links that belong to one record. */
export const linksFor = <T extends IFileLinkLike>(all: T[], listName: string, id: number | undefined): T[] =>
  id === undefined ? [] : all.filter(l => l.listName === listName && l.itemKey === String(id));

export interface IFileLinkProblem {
  key: 'fileLinks.errUrl' | 'fileLinks.errDuplicate';
}

export const checkNewLink = (url: string, existing: Array<{ url: string }>): IFileLinkProblem | undefined => {
  if (!isSafeUrl(url)) {
    return { key: 'fileLinks.errUrl' };
  }
  const same = (a: string, b: string): boolean => a.trim().replace(/\/$/, '') === b.trim().replace(/\/$/, '');
  return existing.some(e => same(e.url, url)) ? { key: 'fileLinks.errDuplicate' } : undefined;
};
