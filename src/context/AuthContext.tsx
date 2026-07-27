import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { api, setApiSessionToken, setOnUnauthorized } from '@/api/client';

type SessionUser = { id: number; email: string; name: string };
type Step = 'credentials' | 'otp';
type StoredSession = { token: string; user: SessionUser };

const SESSION_STORAGE_KEY = 'nysonian.mobile.session.v1';

async function readStoredSession(): Promise<StoredSession | null> {
  try {
    const raw = Platform.OS === 'web'
      ? globalThis.localStorage?.getItem(SESSION_STORAGE_KEY)
      : await SecureStore.getItemAsync(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed?.token || !parsed?.user?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function saveStoredSession(session: StoredSession) {
  const raw = JSON.stringify(session);
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(SESSION_STORAGE_KEY, raw);
  } else {
    await SecureStore.setItemAsync(SESSION_STORAGE_KEY, raw);
  }
}

async function clearStoredSession() {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.removeItem(SESSION_STORAGE_KEY);
  } else {
    await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
  }
}

type AuthState = {
  user: SessionUser | null;
  token: string | null;
  isAuthenticated: boolean;
  step: Step;
  pendingEmail: string | null;
  otpChannel: string | null;
  loading: boolean;
  error: string | null;
  /** Step 1: validate password and trigger OTP. Returns true when OTP was sent. */
  startLogin: (email: string, password: string) => Promise<boolean>;
  /** Step 2: verify the 6-digit code. Returns true when authenticated. */
  verifyOtp: (otp: string) => Promise<boolean>;
  resendOtp: () => Promise<void>;
  cancelOtp: () => void;
  logout: () => Promise<void>;
  /**
   * Ask the server whether this bearer token is still in auth_sessions.
   * Returns false when revoked (and clears local session); true when active;
   * null when the network failed (keeps local session).
   */
  validateSession: () => Promise<boolean | null>;
  /**
   * Refresh auth_sessions.last_activity (and detect remote logout).
   * Lighter than validateSession — used while staying on a page.
   */
  touchSession: () => Promise<boolean | null>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

/** "ayesha.khan@nysonian.com" -> "Ayesha Khan" */
function nameFromEmail(email: string) {
  const local = email.split('@')[0] ?? email;
  return (
    local
      .split(/[._-]+/)
      .filter(Boolean)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ') || email
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('credentials');
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [otpChannel, setOtpChannel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const clearingRef = useRef(false);

  const clearLocalSession = useCallback(async (redirectToLogin: boolean) => {
    if (clearingRef.current) return;
    clearingRef.current = true;
    try {
      await clearStoredSession();
      setApiSessionToken(null);
      setToken(null);
      setUser(null);
      setStep('credentials');
      setPendingEmail(null);
      setOtpChannel(null);
      setError(null);
      if (redirectToLogin) {
        try {
          router.replace('/login');
        } catch {
          /* navigation may not be ready yet during boot */
        }
      }
    } finally {
      clearingRef.current = false;
    }
  }, []);

  // Restore + server-validate the durable token before route guards decide.
  useEffect(() => {
    let mounted = true;
    (async () => {
      const stored = await readStoredSession();
      if (!mounted) return;
      if (stored) {
        setApiSessionToken(stored.token);
        const alive = await api.checkSession();
        if (!mounted) return;
        if (alive === false) {
          await clearStoredSession();
          setApiSessionToken(null);
        } else {
          // alive === true, or null (offline) — keep the local session
          setToken(stored.token);
          setUser(stored.user);
        }
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Any API 401 (admin deleted the mobile session) → force local sign-out.
  useEffect(() => {
    setOnUnauthorized(() => {
      void clearLocalSession(true);
    });
    return () => setOnUnauthorized(null);
  }, [clearLocalSession]);

  const startLogin = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const login = await api.login(email, password);
      if (login.status !== 'success') {
        setError(login.message);
        return false;
      }
      const otp = await api.sendOtp(email);
      if (otp.status !== 'success') {
        setError(otp.message || 'Logged in, but the verification code could not be sent.');
        return false;
      }
      setPendingEmail(email.trim());
      setOtpChannel(otp.data?.channel ?? null);
      setStep('otp');
      return true;
    } catch {
      setError('Network error. Check your connection and try again.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyOtp = useCallback(
    async (otp: string) => {
      if (!pendingEmail) return false;
      setLoading(true);
      setError(null);
      try {
        const res = await api.verifyOtp(pendingEmail, otp);
        if (res.status !== 'success') {
          setError(res.message);
          return false;
        }
        const sessionToken = res.data?.token;
        if (!sessionToken) {
          setError('The server did not create a mobile session. Please try again.');
          return false;
        }
        const sessionUser: SessionUser = {
          id: Number(res.data?.user?.id ?? res.data?.user_id ?? 0),
          email: res.data?.user?.email || pendingEmail,
          name: res.data?.user?.name || nameFromEmail(pendingEmail),
        };
        await saveStoredSession({ token: sessionToken, user: sessionUser });
        setApiSessionToken(sessionToken);
        setToken(sessionToken);
        setUser(sessionUser);
        return true;
      } catch {
        setError('Network error. Please try again.');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [pendingEmail],
  );

  const resendOtp = useCallback(async () => {
    if (!pendingEmail) return;
    setError(null);
    const res = await api.sendOtp(pendingEmail);
    if (res.status !== 'success') setError(res.message);
    else setOtpChannel(res.data?.channel ?? otpChannel);
  }, [pendingEmail, otpChannel]);

  const cancelOtp = useCallback(() => {
    setStep('credentials');
    setPendingEmail(null);
    setOtpChannel(null);
    setError(null);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      await clearLocalSession(false);
    }
  }, [clearLocalSession]);

  const validateSession = useCallback(async () => {
    if (!token) return false;
    const alive = await api.checkSession();
    if (alive === false) {
      await clearLocalSession(true);
      return false;
    }
    return alive;
  }, [token, clearLocalSession]);

  const touchSession = useCallback(async () => {
    if (!token) return false;
    const alive = await api.touchSession();
    if (alive === false) {
      await clearLocalSession(true);
      return false;
    }
    return alive;
  }, [token, clearLocalSession]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      token,
      isAuthenticated: !!user,
      step,
      pendingEmail,
      otpChannel,
      loading,
      error,
      startLogin,
      verifyOtp,
      resendOtp,
      cancelOtp,
      logout,
      validateSession,
      touchSession,
    }),
    [user, token, step, pendingEmail, otpChannel, loading, error, startLogin, verifyOtp, resendOtp, cancelOtp, logout, validateSession, touchSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
