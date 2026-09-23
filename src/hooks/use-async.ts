import { useCallback, useEffect, useRef, useState } from 'react';

import { getErrorMessage } from '@/lib/format';

export interface AsyncState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
  refresh: () => Promise<void>;
  setData: (data: T | null) => void;
}

interface InternalState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
}

/**
 * Minimal data-fetching helper: runs `task` on mount and whenever `deps`
 * change, exposing loading/error/refresh state. Errors are normalised to
 * strings. `task` is read through a ref so inline arrow functions are safe.
 */
export function useAsync<T>(task: () => Promise<T>, deps: readonly unknown[] = []): AsyncState<T> {
  const [state, setState] = useState<InternalState<T>>({
    data: null,
    error: null,
    loading: true,
    refreshing: false,
  });
  const [nonce, setNonce] = useState(0);
  const taskRef = useRef(task);

  useEffect(() => {
    taskRef.current = task;
  }, [task]);

  const depsKey = JSON.stringify(deps);

  useEffect(() => {
    let cancelled = false;

    setState((prev) => ({
      ...prev,
      loading: prev.data === null,
      refreshing: prev.data !== null,
      error: null,
    }));

    void (async () => {
      try {
        const result = await taskRef.current();
        if (!cancelled) {
          setState({ data: result, error: null, loading: false, refreshing: false });
        }
      } catch (err) {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            error: getErrorMessage(err),
            loading: false,
            refreshing: false,
          }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [depsKey, nonce]);

  const refresh = useCallback(async () => {
    setNonce((value) => value + 1);
  }, []);

  const setData = useCallback((data: T | null) => {
    setState((prev) => ({ ...prev, data }));
  }, []);

  return { ...state, refresh, setData };
}
