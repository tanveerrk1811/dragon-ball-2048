import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  setPersistence,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  type User,
} from 'firebase/auth';
import type { FirebaseHandles } from './firebase';
import { authorizeAdmin, type AdminRecord } from './authz';
import { IDLE_TIMEOUT_MS, REVALIDATE_INTERVAL_MS } from './constants';
import { isNetworkError, isSessionExpired, mapLoginError, type Notice } from './errors';

export type SessionState =
  | { status: 'booting' }
  | { status: 'signed-out'; notice?: Notice }
  | { status: 'checking' }
  | { status: 'check-failed'; notice: Notice }
  | { status: 'authorized'; admin: AdminRecord; user: User; remembered: boolean; signedInAt: string | null };

export interface SessionApi {
  state: SessionState;
  signIn: (email: string, password: string, remember: boolean) => Promise<Notice | null>;
  signOut: (notice?: Notice) => Promise<void>;
  /** Re-checks the Firebase session AND the admin record. Resolves true only while still authorized. */
  revalidate: () => Promise<boolean>;
  retry: () => void;
}

const EXPIRED: Notice = { kind: 'warn', code: 'session-expired', message: 'Your session expired. Please sign in again.' };

/**
 * Single source of truth for "who is signed in and are they the owner".
 * Flow: Firebase restores/creates the session -> we read admins/{uid} -> only then is the dashboard rendered.
 * Anything else is signed out immediately (unauthorized, inactive, mismatched record…) with a clear notice.
 */
export function useAdminSession({ auth, db }: FirebaseHandles): SessionApi {
  const [state, setState] = useState<SessionState>({ status: 'booting' });
  const pendingNotice = useRef<Notice | undefined>(undefined);
  const runId = useRef(0);
  const rememberRef = useRef(true);
  const [nonce, setNonce] = useState(0);

  const signOut = useCallback(
    async (notice?: Notice) => {
      const hadUser = !!auth.currentUser;
      pendingNotice.current = notice;
      try {
        await fbSignOut(auth);
      } finally {
        // With a user, onAuthStateChanged performs the transition (and consumes the notice).
        // Without one it never fires, so transition here.
        if (!hadUser) {
          setState({ status: 'signed-out', notice });
          pendingNotice.current = undefined;
        }
      }
    },
    [auth],
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      const id = ++runId.current;
      if (!user) {
        setState({ status: 'signed-out', notice: pendingNotice.current });
        pendingNotice.current = undefined;
        return;
      }
      setState({ status: 'checking' });
      void authorizeAdmin(db, user).then((res) => {
        if (id !== runId.current) return; // a newer auth event superseded this check
        if (res.ok) {
          setState({
            status: 'authorized',
            admin: res.admin,
            user,
            remembered: rememberRef.current,
            signedInAt: user.metadata.lastSignInTime ?? null,
          });
        } else if (res.reason === 'network' || res.reason === 'error') {
          setState({ status: 'check-failed', notice: res.notice });
        } else {
          void signOut(res.notice); // unauthorized / inactive: never keep a session for them
        }
      });
    });
    return unsub;
  }, [auth, db, signOut, nonce]);

  const signIn = useCallback<SessionApi['signIn']>(
    async (email, password, remember) => {
      try {
        rememberRef.current = remember;
        await setPersistence(auth, remember ? indexedDBLocalPersistence : browserSessionPersistence).catch(() =>
          setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence),
        );
        await signInWithEmailAndPassword(auth, email.trim(), password);
        return null; // success: the auth listener takes over
      } catch (e) {
        return mapLoginError(e);
      }
    },
    [auth],
  );

  const revalidate = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return false;
    try {
      await user.getIdToken(true); // fails when the user was disabled/deleted or the refresh token is revoked
    } catch (e) {
      if (isNetworkError(e)) return true; // offline is not an expiry; the next write will surface the error
      await signOut(isSessionExpired(e) ? EXPIRED : { ...EXPIRED, message: 'Your session could not be refreshed. Please sign in again.' });
      return false;
    }
    const res = await authorizeAdmin(db, user);
    if (res.ok) return true;
    if (res.reason === 'network' || res.reason === 'error') return true;
    await signOut(res.notice);
    return false;
  }, [auth, db, signOut]);

  const authorized = state.status === 'authorized';

  // Idle sign-out + periodic re-validation while the dashboard is open.
  useEffect(() => {
    if (!authorized) return;
    let last = Date.now();
    const bump = () => { last = Date.now(); };
    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const;
    events.forEach((ev) => window.addEventListener(ev, bump, { passive: true }));
    const tick = window.setInterval(() => {
      if (Date.now() - last > IDLE_TIMEOUT_MS) {
        void signOut({ kind: 'info', code: 'idle', message: 'You were signed out after 30 minutes of inactivity.' });
      }
    }, 15_000);
    const poll = window.setInterval(() => void revalidate(), REVALIDATE_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - last > IDLE_TIMEOUT_MS) void signOut({ kind: 'info', code: 'idle', message: 'You were signed out after 30 minutes of inactivity.' });
      else void revalidate();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, bump));
      window.clearInterval(tick);
      window.clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [authorized, revalidate, signOut]);

  const retry = useCallback(() => {
    setState({ status: 'checking' });
    setNonce((n) => n + 1);
  }, []);

  return useMemo(() => ({ state, signIn, signOut, revalidate, retry }), [state, signIn, signOut, revalidate, retry]);
}
