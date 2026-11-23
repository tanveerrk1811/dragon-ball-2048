/**
 * Admin console constants. Nothing in here is a secret: names, collection ids and timings only.
 * Authorization NEVER depends on OWNER.email — it is used only to pre-fill the login form.
 * The real authority is the Firestore document  admins/{firebase-uid}  (see firestore.rules).
 */
export const OWNER = {
  name: 'Mohammad Kabir Shaikh',
  email: 'kabirshaikh1811@gmail.com',
} as const;

export const ADMINS_COLLECTION = 'admins';
export const CONFIG_COLLECTION = 'publicConfig';
export const AD_CONFIG_DOC = 'adConfig';

/** Automatic sign-out after this much inactivity (client-side hardening; Firebase tokens are the real session). */
export const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
/** How often the signed-in session re-checks the token and the admin record. */
export const REVALIDATE_INTERVAL_MS = 5 * 60 * 1000;

/** Local-only draft used by the game when opened with ?adpreview=1 (existing mechanism in ad-config.ts). */
export const PREVIEW_STORAGE_KEY = 'db2048.adconfig.preview';
