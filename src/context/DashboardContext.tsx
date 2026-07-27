import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { DashboardData } from '@/types';

type DashboardContextValue = {
  data: DashboardData | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  retry: () => Promise<void>;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

function useDashboardState(enabled: boolean): DashboardContextValue {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await api.getDashboard();
      if (res.status === 'success' && res.data) {
        setData(res.data);
        setError(null);
      } else {
        if (mode === 'initial') setData(null);
        setError(res.message || 'Could not load dashboard.');
      }
    } catch (err: any) {
      if (mode === 'initial') setData(null);
      setError(err?.message || 'Network error.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setData(null);
      setLoading(false);
      setRefreshing(false);
      setError(null);
      return;
    }
    load('initial');
  }, [enabled, load]);

  const refresh = useCallback(() => load('refresh'), [load]);
  const retry = useCallback(() => load('initial'), [load]);

  return { data, loading, refreshing, error, refresh, retry };
}

/**
 * Single shared dashboard fetch for tabs + permission-gated stack screens.
 * Loads only while authenticated so login stays lightweight.
 */
export function DashboardProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const value = useDashboardState(isAuthenticated);
  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error('useDashboard must be used within DashboardProvider');
  }
  return ctx;
}
