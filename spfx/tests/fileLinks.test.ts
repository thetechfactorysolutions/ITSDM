import assert from 'node:assert/strict';
import { checkNewLink, extensionOf, fileKind, fileNameFromUrl, isOneDriveUrl, isSafeUrl, linksFor } from '../src/rules/fileLinks';

assert.equal(extensionOf('Report.FINAL.PDF'), 'pdf');
assert.equal(extensionOf('noext'), '');
assert.equal(fileKind('a.xlsx').label, 'Excel');
assert.equal(fileKind('a.msg').emoji, '✉️');
assert.equal(fileKind('a.unknown').label, 'File');

assert.ok(isSafeUrl('https://x-my.sharepoint.com/:b:/g/personal/ana/Eabc?e=1'));
assert.ok(isSafeUrl('http://intranet/file.pdf'));
assert.ok(!isSafeUrl('javascript:alert(1)'), 'nothing that runs code');
assert.ok(!isSafeUrl('data:text/html,<b>x</b>'));
assert.ok(!isSafeUrl('file:///C:/secret.txt'));
assert.ok(!isSafeUrl('not a link'));
assert.ok(!isSafeUrl(''));

assert.equal(fileNameFromUrl('https://x-my.sharepoint.com/personal/ana/Documents/Offer%20Lyreco.pdf'), 'Offer Lyreco.pdf');
assert.equal(fileNameFromUrl('https://x-my.sharepoint.com/personal/ana/_layouts/15/onedrive.aspx?id=%2Fpersonal%2Fana%2FDocuments%2Fquote.xlsx&parent=x'), 'quote.xlsx');
assert.equal(fileNameFromUrl('https://x-my.sharepoint.com/:b:/g/personal/ana/Eabc123?e=xyz'), 'OneDrive', 'a sharing link has no name');
assert.equal(fileNameFromUrl('nonsense', 'Fichero'), 'Fichero');

assert.ok(isOneDriveUrl('https://eviterno-my.sharepoint.com/:b:/g/personal/x'));
assert.ok(isOneDriveUrl('https://1drv.ms/b/s!abc'));
assert.ok(!isOneDriveUrl('https://example.com/a.pdf'));

const all = [{ listName: 'L1', itemKey: '5', url: 'https://a/x' }, { listName: 'L1', itemKey: '6', url: 'https://a/y' }, { listName: 'L2', itemKey: '5', url: 'https://a/z' }];
assert.deepEqual(linksFor(all, 'L1', 5).map(l => l.url), ['https://a/x']);
assert.deepEqual(linksFor(all, 'L1', undefined), []);

assert.equal(checkNewLink('nonsense', all)?.key, 'fileLinks.errUrl');
assert.equal(checkNewLink('https://a/x/', all)?.key, 'fileLinks.errDuplicate', 'a trailing slash is the same link');
assert.equal(checkNewLink('https://a/new', all), undefined);

console.log('file links tests passed');
