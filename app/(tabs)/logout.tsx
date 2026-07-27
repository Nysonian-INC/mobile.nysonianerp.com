import { Redirect, router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { confirmAction } from '@/lib/confirm';
import { palette } from '@/theme';

/**
 * Fallback for the Logout tab. The press is normally intercepted in `_layout.tsx`;
 * if navigation still lands here (e.g. web), prompt and sign out instead of
 * bouncing back to the dashboard (which looked like logout was broken).
 */
export default function LogoutScreen() {
  const { isAuthenticated, logout } = useAuth();
  const started = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || started.current) return;
    started.current = true;

    void (async () => {
      const ok = await confirmAction('Log out', 'Are you sure you want to sign out?', 'Log out');
      if (ok) {
        await logout();
        router.replace('/login');
        return;
      }
      if (router.canGoBack()) router.back();
      else router.replace('/dashboard');
    })();
  }, [isAuthenticated, logout]);

  if (!isAuthenticated) return <Redirect href="/login" />;

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.background }}>
      <ActivityIndicator color={palette.primary} />
    </View>
  );
}
