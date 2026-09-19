import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

// Keeps filters in the URL (?week=4&theme=lab-instructions), so filtered views
// can be bookmarked, shared, and survive a page refresh.
export function useQueryFilters(keys) {
  const [params, setParams] = useSearchParams();

  const filters = useMemo(
    () => Object.fromEntries(keys.map((key) => [key, params.get(key) || ''])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [params, keys.join(',')],
  );

  const setFilter = useCallback((key, value) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== 'page') next.delete('page');
      return next;
    }, { replace: true });
  }, [setParams]);

  const clearFilters = useCallback(() => setParams({}, { replace: true }), [setParams]);

  const activeCount = keys.filter((k) => k !== 'page' && filters[k]).length;

  return { filters, setFilter, clearFilters, activeCount };
}
