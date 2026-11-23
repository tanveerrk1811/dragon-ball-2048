import { doc, getDoc, type Firestore } from 'firebase/firestore/lite';
import { ADMINS_COLLECTION } from './constants';
import { isNetworkError, isPermissionError, type Notice } from './errors';

export interface AdminRecord {
  uid: string;
  role: 'owner';
  active: true;
  email: string;
}

export type AuthzResult =
  | { ok: true; admin: AdminRecord }
  | { ok: false; reason: 'no-record' | 'inactive' | 'bad-record' | 'email-mismatch' | 'network' | 'error'; notice: Notice };

const deny = (reason: Exclude<AuthzResult, { ok: true }>['reason'], message: string, kind: Notice['kind'] = 'error'): AuthzResult => ({
  ok: false,
  reason,
  notice: { kind, code: `authz-${reason}`, message },
});

/**
 * Verifies the signed-in Firebase user against  admins/{uid}  in Firestore.
 * The user can read ONLY their own document (rules); nobody can write it from the client.
 * This is a UX gate. The enforcement that matters is in firestore.rules (every write re-checks the same document).
 */
export async function authorizeAdmin(db: Firestore, user: { uid: string; email: string | null }): Promise<AuthzResult> {
  try {
    const snap = await getDoc(doc(db, ADMINS_COLLECTION, user.uid));
    if (!snap.exists()) {
      return deny('no-record', 'This account is not authorized to use the admin console.');
    }
    const d = snap.data() as Record<string, unknown>;
    if (d.role !== 'owner') {
      return deny('bad-record', 'This account is not authorized to use the admin console.');
    }
    if (d.active !== true) {
      return deny('inactive', 'This admin account is inactive. Ask the owner to re-activate it in Firestore.', 'warn');
    }
    const recordEmail = typeof d.email === 'string' ? d.email.trim().toLowerCase() : '';
    const userEmail = (user.email ?? '').trim().toLowerCase();
    if (!recordEmail || recordEmail !== userEmail) {
      // The Firestore rules enforce the same equality for writes, so a mismatch would fail on save anyway.
      return deny('email-mismatch', 'The admin record does not match this account\u2019s e-mail address.');
    }
    return { ok: true, admin: { uid: user.uid, role: 'owner', active: true, email: recordEmail } };
  } catch (e) {
    if (isNetworkError(e)) {
      return deny('network', 'Could not reach Firebase to verify your admin access. Check your connection and retry.', 'warn');
    }
    if (isPermissionError(e)) {
      return deny('no-record', 'This account is not authorized to use the admin console.');
    }
    return deny('error', 'Could not verify admin access. Please try again.');
  }
}
