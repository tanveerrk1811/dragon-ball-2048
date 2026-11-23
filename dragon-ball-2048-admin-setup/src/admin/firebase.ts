import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  connectAuthEmulator,
  type Auth,
} from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore/lite';

/**
 * Firebase bootstrap. The web config below is NOT a secret (Firebase web API keys only identify the project;
 * access is enforced by Authentication + Firestore Security Rules). It still comes from build-time env vars
 * (see .env.example) so nothing project-specific is hard-coded. NEVER put a service-account key, an Admin SDK
 * credential or a password in any VITE_* variable — everything VITE_* is shipped to the browser.
 */
const env = import.meta.env;

const REQUIRED: Record<string, string | undefined> = {
  VITE_FIREBASE_API_KEY: env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN: env.VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_PROJECT_ID: env.VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_APP_ID: env.VITE_FIREBASE_APP_ID,
};

export interface FirebaseHandles {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  projectId: string;
  emulator: boolean;
}

export type FirebaseInit = { ok: true; handles: FirebaseHandles } | { ok: false; missing: string[] };

let cached: FirebaseInit | null = null;

export function initFirebase(): FirebaseInit {
  if (cached) return cached;
  const missing = Object.keys(REQUIRED).filter((k) => !REQUIRED[k]);
  if (missing.length) return (cached = { ok: false, missing });

  const config = {
    apiKey: env.VITE_FIREBASE_API_KEY as string,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string,
    projectId: env.VITE_FIREBASE_PROJECT_ID as string,
    appId: env.VITE_FIREBASE_APP_ID as string,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || undefined,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || undefined,
  };

  const app = getApps().length ? getApp() : initializeApp(config);
  // Same persistence stack Firebase's default getAuth() uses (IndexedDB -> localStorage -> sessionStorage), but
  // without loading the popup/redirect resolvers (and their third-party iframes) that e-mail/password never needs.
  const auth = initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence],
  });
  const db = getFirestore(app);

  // Emulators are compiled out of production builds (import.meta.env.DEV is false there).
  let emulator = false;
  if (import.meta.env.DEV && env.VITE_USE_FIREBASE_EMULATOR === 'true') {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    emulator = true;
  }

  return (cached = { ok: true, handles: { app, auth, db, projectId: config.projectId, emulator } });
}
