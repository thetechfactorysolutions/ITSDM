import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import * as React from 'react';
import * as ReactDom from 'react-dom';
import { act } from 'react-dom/test-utils';
import { useListItems } from '../src/hooks/useListItems';
import type { IListHookState } from '../src/hooks/useListItems';

const dom = new JSDOM('<div id="root"></div>', { pretendToBeVisual: true });
const g = globalThis as unknown as Record<string, unknown>;
g.window = dom.window;
g.document = dom.window.document;
g.IS_REACT_ACT_ENVIRONMENT = true;

const CAP = 50;
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));
const mapItem = (input: Record<string, unknown>): Record<string, unknown> => input;

interface IFakeService {
  getItems: (listName: string) => Promise<{ items: unknown[]; hasNext: boolean }>;
  createItem: (listName: string, payload: Record<string, unknown>) => Promise<unknown>;
  updateItem: (listName: string, id: number, payload: Record<string, unknown>) => Promise<void>;
  deleteItem: (listName: string, id: number) => Promise<void>;
}

const createService = (state: { loads: number; failWrites: boolean }): IFakeService => ({
  getItems: async () => {
    state.loads++;
    if (state.loads > CAP) {
      // Safety valve so a regression ends the test instead of hanging it.
      return new Promise<never>(() => undefined);
    }
    return { items: [{ Id: 1 }], hasNext: false };
  },
  createItem: async () => {
    if (state.failWrites) {
      throw new Error('create failed');
    }
    return {};
  },
  updateItem: async () => undefined,
  deleteItem: async () => undefined
});

const mount = async (element: React.ReactElement): Promise<void> => {
  const root = dom.window.document.getElementById('root');
  await act(async () => {
    ReactDom.render(element, root);
  });
};

const unmount = async (): Promise<void> => {
  const root = dom.window.document.getElementById('root');
  await act(async () => {
    ReactDom.unmountComponentAtNode(root as Element);
  });
};

const testInlineOptionsDoNotRefetchForever = async (): Promise<void> => {
  const state = { loads: 0, failWrites: false };
  const service = createService(state);

  // Same call shape as the screens: a new options object literal on every render.
  const Probe: React.FC = () => {
    useListItems(service as never, 'IT_01_Ideas', mapItem, { top: 50 });
    return null;
  };

  await mount(React.createElement(Probe));
  await act(async () => {
    await sleep(300);
  });
  await unmount();

  assert.equal(state.loads, 1, `Expected a single load, got ${state.loads}`);
};

const testChangedOptionsContentReloads = async (): Promise<void> => {
  const state = { loads: 0, failWrites: false };
  const service = createService(state);

  const Probe: React.FC<{ top: number }> = ({ top }) => {
    useListItems(service as never, 'IT_01_Ideas', mapItem, { top });
    return null;
  };

  await mount(React.createElement(Probe, { top: 10 }));
  await mount(React.createElement(Probe, { top: 20 }));
  await act(async () => {
    await sleep(100);
  });
  await unmount();

  assert.equal(state.loads, 2, `Expected a reload when the options change, got ${state.loads} loads`);
};

const testWriteFailureIsExposedAndRethrown = async (): Promise<void> => {
  const state = { loads: 0, failWrites: true };
  const service = createService(state);
  let latest: IListHookState<Record<string, unknown>> | undefined;

  const Probe: React.FC = () => {
    latest = useListItems(service as never, 'IT_01_Ideas', mapItem);
    return null;
  };

  await mount(React.createElement(Probe));
  await act(async () => {
    await sleep(50);
  });

  let rejected = false;
  await act(async () => {
    try {
      await (latest as IListHookState<Record<string, unknown>>).create({ Title: 'x' });
    } catch {
      rejected = true;
    }
  });

  assert.equal(rejected, true, 'create() must reject so the form stays open');
  assert.match((latest as IListHookState<Record<string, unknown>>).error ?? '', /create failed/);
  assert.equal(state.loads, 1, 'A failed write must not trigger a reload');
  await unmount();
};

const run = async (): Promise<void> => {
  await testInlineOptionsDoNotRefetchForever();
  await testChangedOptionsContentReloads();
  await testWriteFailureIsExposedAndRethrown();
  console.log('useListItems tests passed');
  process.exit(0);
};

run().catch(error => {
  console.error(error);
  process.exit(1);
});
