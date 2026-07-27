import { useCallback, useEffect, useState } from 'react';
import { ApiResponse } from '@/types';

type Loader<T> = () => Promise<ApiResponse<T>>;

/**
 * Generic read-only fetch hook used by profile destination screens.
 * Keeps last-good data on refresh failure and exposes retry + pull-to-refresh.
 */
export function useReadOnlyResource<T>(loader: Loader<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await loader();
      if (res.status === 'success' && res.data) setData(res.data);
      else setError(res.message || 'Could not load data.');
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load('initial');
  }, [load]);

  const refresh = useCallback(() => load('refresh'), [load]);
  const retry = useCallback(() => load('initial'), [load]);

  return {
    data,
    setData,
    loading,
    refreshing,
    error,
    refresh,
    retry,
  };
}
