import './globals';
import * as ReactDom from 'react-dom';
import { act } from 'react-dom/test-utils';
import * as React from 'react';

/** Kept so tests read naturally; the fake browser is created by ./globals, which each test imports first. */
export const setupDom = (): void => undefined;

export const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

export const mount = async (element: React.ReactElement): Promise<HTMLElement> => {
  const root = document.getElementById('root') as HTMLElement;
  await act(async () => {
    ReactDom.render(element, root);
  });
  return root;
};

export const unmount = async (): Promise<void> => {
  await act(async () => {
    ReactDom.unmountComponentAtNode(document.getElementById('root') as Element);
  });
};

/** Lets pending promises and timers finish, inside act so React applies the resulting updates. */
export const settle = async (ms: number = 50): Promise<void> => {
  await act(async () => {
    await sleep(ms);
  });
};

/** Types into an input or textarea the way a user does, so React sees the change. */
export const typeInto = async (element: HTMLInputElement | HTMLTextAreaElement, value: string): Promise<void> => {
  const proto = element.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set as (v: string) => void;
  await act(async () => {
    setter.call(element, value);
    element.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
};

export const click = async (element: Element): Promise<void> => {
  await act(async () => {
    (element as HTMLElement).click();
  });
};

export const findButton = (root: ParentNode, text: string): HTMLButtonElement | undefined =>
  Array.from(root.querySelectorAll('button')).filter(b => (b.textContent ?? '').trim().indexOf(text) > -1)[0] as HTMLButtonElement | undefined;
