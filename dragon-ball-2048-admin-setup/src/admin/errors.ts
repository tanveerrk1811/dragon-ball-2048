/** Friendly, non-leaking messages for Firebase errors. Login errors never reveal whether an e-mail exists. */
export type NoticeKind = 'error' | 'warn' | 'info' | 'success';
export interface Notice {
  kind: NoticeKind;
  code: string;
  message: string;
}

const code = (e: unknown): string => {
  const c = (e as { code?: unknown } | null)?.code;
  return typeof c === 'string' ? c : '';
};

export function isNetworkError(e: unknown): boolean {
  const c = code(e);
  return (
    c === 'auth/network-request-failed' ||
    c === 'unavailable' ||
    c === 'deadline-exceeded' ||
    c === 'firestore/unavailable' ||
    (e instanceof TypeError && /fetch|network/i.test(e.message))
  );
}

export function isPermissionError(e: unknown): boolean {
  const c = code(e);
  return c === 'permission-denied' || c === 'firestore/permission-denied' || c === 'unauthenticated' || c === 'firestore/unauthenticated';
}

export function isSessionExpired(e: unknown): boolean {
  const c = code(e);
  return (
    c === 'auth/user-token-expired' ||
    c === 'auth/requires-recent-login' ||
    c === 'auth/id-token-expired' ||
    c === 'auth/user-disabled' ||
    c === 'auth/user-not-found' ||
    c === 'auth/invalid-user-token'
  );
}

export function mapLoginError(e: unknown): Notice {
  switch (code(e)) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-login-credentials':
      return { kind: 'error', code: 'invalid-credentials', message: 'Incorrect e-mail or password.' };
    case 'auth/invalid-email':
      return { kind: 'error', code: 'invalid-email', message: 'Enter a valid e-mail address.' };
    case 'auth/missing-password':
      return { kind: 'error', code: 'missing-password', message: 'Enter your password.' };
    case 'auth/user-disabled':
      return { kind: 'error', code: 'user-disabled', message: 'This account has been disabled in Firebase Authentication.' };
    case 'auth/too-many-requests':
      return { kind: 'error', code: 'rate-limited', message: 'Too many failed attempts. Wait a few minutes before trying again.' };
    case 'auth/network-request-failed':
      return { kind: 'error', code: 'network', message: 'Network error. Check your connection and try again.' };
    case 'auth/operation-not-allowed':
      return { kind: 'error', code: 'provider-disabled', message: 'E-mail/password sign-in is not enabled for this Firebase project.' };
    case 'auth/invalid-api-key':
    case 'auth/api-key-not-valid.-please-pass-a-valid-api-key.':
    case 'auth/app-not-authorized':
      return { kind: 'error', code: 'bad-config', message: 'The Firebase web configuration is invalid for this site. Check your .env values.' };
    default:
      return { kind: 'error', code: 'unknown', message: 'Sign-in failed. Please try again.' };
  }
}

export function describeError(e: unknown, fallback: string): string {
  if (isNetworkError(e)) return 'Network error — nothing was changed. Check your connection and retry.';
  if (isPermissionError(e)) return 'Firestore refused this request (permission denied).';
  const msg = (e as { message?: unknown } | null)?.message;
  return typeof msg === 'string' && msg ? `${fallback} (${msg})` : fallback;
}
