/**
 * Must be the FIRST import of a component test: Fluent UI reads `window` when it is first loaded,
 * so the fake browser has to exist before any component is imported.
 */
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<div id="root"></div>', { pretendToBeVisual: true, url: 'http://localhost/' });
const g = globalThis as unknown as Record<string, unknown>;
g.window = dom.window;
g.document = dom.window.document;
g.navigator = dom.window.navigator;
g.HTMLElement = dom.window.HTMLElement;
g.Node = dom.window.Node;
g.getComputedStyle = dom.window.getComputedStyle;
g.IS_REACT_ACT_ENVIRONMENT = true;
g.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
g.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);

// Fluent logs a warning for every icon it cannot find; the real icons are registered by SharePoint.
const originalWarn = console.warn;
console.warn = (...args: unknown[]): void => {
  if (typeof args[0] === 'string' && args[0].indexOf('was used but not registered') > -1) {
    return;
  }
  originalWarn(...args);
};

// Loaded after the globals on purpose. Without a layout engine Fluent cannot measure the screen,
// so it is told to behave as on a desktop.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fluent = require('@fluentui/react');
fluent.setResponsiveMode(fluent.ResponsiveMode.large);

export const jsdomWindow = dom.window;
