/**
 * Fluent UI loads its Segoe UI fonts from a Microsoft CDN unless told otherwise. This page must not
 * call out to the internet, so the font address is emptied: the page falls back to the fonts
 * installed on the computer (Segoe UI on Windows).
 *
 * This module has to be imported BEFORE anything from Fluent UI, because it reads this setting
 * when it is first loaded.
 */
(window as unknown as { FabricConfig: { fontBaseUrl: string } }).FabricConfig = { fontBaseUrl: '' };
