import { useCallback, useEffect, useRef, useState } from 'react';
import { IDataStore, IQueryOptions } from '../data/IDataStore';

export interface IListHookState<T> {
  items: T[];
  loading: boolean;
  error?: string;
  reload: () => Promise<void>;
  create: (payload: Record<string, unknown>) => Promise<void>;
  update: (id: number, payload: Record<string, unknown>) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

const toErrorMessage = (err: unknown, fallback: string): string => {
  return err instanceof Error ? err.message : fallback;
};

export const useListItems = <T>(
  service: IDataStore,
  listName: string,
  mapItem: (input: Record<string, unknown>) => T,
  options?: IQueryOptions
): IListHookState<T> => {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>();

  // Callers usually pass an inline object literal, which has a new identity on every render.
  // Depending on it directly would recreate `load` each render and refetch forever, so the
  // latest value is read through a ref and only its serialized content drives the dependencies.
  const optionsRef = useRef<IQueryOptions | undefined>(options);
  optionsRef.current = options;
  const optionsKey = JSON.stringify(options ?? null);

  const isMountedRef = useRef<boolean>(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);

    try {
      const result = await service.getItems<Record<string, unknown>>(listName, optionsRef.current);
      if (isMountedRef.current) {
        setItems(result.items.map(mapItem));
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(toErrorMessage(err, 'Unexpected error while loading data'));
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [listName, mapItem, optionsKey, service]);

  // Runs a write operation. A failure is exposed through `error` and rethrown so the caller
  // can keep its form open instead of closing it as if the save had worked.
  const mutate = useCallback(async (operation: () => Promise<unknown>): Promise<void> => {
    try {
      await operation();
    } catch (err) {
      if (isMountedRef.current) {
        setError(toErrorMessage(err, 'Unexpected error while saving data'));
      }
      throw err;
    }

    await load();
  }, [load]);

  const create = useCallback(
    (payload: Record<string, unknown>) => mutate(() => service.createItem(listName, payload)),
    [listName, mutate, service]
  );

  const update = useCallback(
    (id: number, payload: Record<string, unknown>) => mutate(() => service.updateItem(listName, id, payload)),
    [listName, mutate, service]
  );

  const remove = useCallback(
    (id: number) => mutate(() => service.deleteItem(listName, id)),
    [listName, mutate, service]
  );

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  return {
    items,
    loading,
    error,
    reload: load,
    create,
    update,
    remove
  };
};
