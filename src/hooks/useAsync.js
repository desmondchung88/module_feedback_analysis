import { useCallback, useEffect, useRef, useState } from 'react';

// Runs an async loader and tracks loading/error state, with a retry().
// While reloading (e.g. after a filter change) the previous data is kept, so
// the page shows an "updating" state instead of flashing back to skeletons.
export function useAsync(loader, deps) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null });
  const [attempt, setAttempt] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, status: 'loading', error: null }));
    loaderRef.current()
      .then((data) => {
        if (!cancelled) setState({ status: 'success', data, error: null });
      })
      .catch((error) => {
        if (!cancelled) setState({ status: 'error', data: null, error });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return {
    ...state,
    isInitialLoading: state.status === 'loading' && state.data == null,
    isRefreshing: state.status === 'loading' && state.data != null,
    retry,
  };
}
