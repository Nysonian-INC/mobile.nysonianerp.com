import { usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAuth } from '@/context/AuthContext';

const AUTH_SKIP = new Set(['/', '/login']);
/** Keep auth_sessions.last_activity fresh while the user stays on a screen. */
const HEARTBEAT_MS = 30_000;

/**
 * On every screen change: re-validate the mobile session (remote logout) and
 * refresh last_activity. While the app stays foregrounded on a page, send a
 * lightweight heartbeat so public.auth_sessions.last_activity keeps moving.
 */
export default function SessionWatcher() {
  const pathname = usePathname();
  const { isAuthenticated, loading, validateSession, touchSession } = useAuth();
  const lastPath = useRef<string | null>(null);
  const checking = useRef(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  const runCheck = (mode: 'validate' | 'touch') => {
    if (loading || !isAuthenticated) return;
    if (!pathname || AUTH_SKIP.has(pathname)) return;
    if (checking.current) return;
    checking.current = true;
    const fn = mode === 'validate' ? validateSession : touchSession;
    void fn().finally(() => {
      checking.current = false;
    });
  };

  // New page / route → full session check (also updates last_activity).
  useEffect(() => {
    if (loading || !isAuthenticated) return;
    if (!pathname || AUTH_SKIP.has(pathname)) return;
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    runCheck('validate');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional on pathname only
  }, [pathname, isAuthenticated, loading, validateSession]);

  // Foreground return → re-validate (admin may have revoked while idle).
  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      const wasBackground = appState.current.match(/inactive|background/);
      appState.current = state;
      if (state === 'active' && wasBackground) {
        runCheck('validate');
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, isAuthenticated, loading, validateSession]);

  // While staying on a page, periodically bump last_activity.
  useEffect(() => {
    if (loading || !isAuthenticated) return;
    if (!pathname || AUTH_SKIP.has(pathname)) return;

    const id = setInterval(() => {
      if (appState.current !== 'active') return;
      runCheck('touch');
    }, HEARTBEAT_MS);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, isAuthenticated, loading, touchSession]);

  return null;
}
