/** Offers text as a file download. A BOM is added to CSV so Excel reads accents correctly. */
export const downloadTextFile = (fileName: string, text: string, mimeType: string = 'text/csv;charset=utf-8'): void => {
  const BOM = String.fromCharCode(0xfeff);
  const withBom = mimeType.indexOf('csv') > -1 ? BOM + text : text;
  const blob = new Blob([withBom], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
