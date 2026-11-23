import { doc, getDoc, setDoc, serverTimestamp, type Firestore } from 'firebase/firestore/lite';
import { mergeConfig, type AdConfig } from '../game/ads/ad-config';
import { AD_CONFIG_DOC, CONFIG_COLLECTION } from './constants';
import { isPermissionError } from './errors';
import { authorizeAdmin } from './authz';

/**
 * Firestore document  publicConfig/adConfig :
 *   { config: <AdConfig map>, revision: <int>, updatedAt: <server time>, updatedBy: <uid> }
 * It is publicly READABLE (the game may read it) and therefore holds PUBLIC identifiers only
 * (publisher ID, ad-unit IDs…). It is writable only by an active owner (see firestore.rules).
 */
export interface SavedMeta {
  revision: number;
  updatedAt: Date | null;
  updatedBy: string;
}
export interface SavedConfig {
  config: AdConfig;
  meta: SavedMeta;
}

export class ConflictError extends Error {
  constructor() {
    super('The saved configuration was changed elsewhere since you loaded it.');
    this.name = 'ConflictError';
  }
}
export class NotAuthorizedError extends Error {
  constructor(message = 'You are no longer authorized to change the configuration.') {
    super(message);
    this.name = 'NotAuthorizedError';
  }
}

const ref = (db: Firestore) => doc(db, CONFIG_COLLECTION, AD_CONFIG_DOC);

function toMeta(d: Record<string, unknown>): SavedMeta {
  const ts = d.updatedAt as { toDate?: () => Date } | undefined;
  return {
    revision: typeof d.revision === 'number' ? d.revision : 0,
    updatedAt: ts && typeof ts.toDate === 'function' ? ts.toDate() : null,
    updatedBy: typeof d.updatedBy === 'string' ? d.updatedBy : '',
  };
}

/** Returns null when nothing has been saved yet. Unknown/invalid fields are dropped by mergeConfig. */
export async function loadSavedConfig(db: Firestore): Promise<SavedConfig | null> {
  const snap = await getDoc(ref(db));
  if (!snap.exists()) return null;
  const d = snap.data() as Record<string, unknown>;
  return { config: mergeConfig(d.config), meta: toMeta(d) };
}

/** Sanitised copy: only known keys, correct types. This exact object is what gets saved / exported. */
export function sanitize(cfg: AdConfig): AdConfig {
  return mergeConfig(JSON.parse(JSON.stringify(cfg)));
}

/**
 * Saves with optimistic concurrency: the rules require revision == previous revision + 1, so a stale tab cannot
 * silently overwrite newer data. On rejection we work out WHY, so the owner gets an accurate message.
 */
export async function saveConfig(
  db: Firestore,
  user: { uid: string; email: string | null },
  cfg: AdConfig,
  expectedRevision: number,
): Promise<SavedMeta> {
  const clean = sanitize(cfg);
  try {
    await setDoc(ref(db), {
      config: clean,
      revision: expectedRevision + 1,
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
    });
  } catch (e) {
    if (!isPermissionError(e)) throw e;
    const authz = await authorizeAdmin(db, user);
    if (!authz.ok) throw new NotAuthorizedError(authz.notice.message);
    const current = await loadSavedConfig(db);
    if ((current?.meta.revision ?? 0) !== expectedRevision) throw new ConflictError();
    throw e;
  }
  const fresh = await loadSavedConfig(db);
  return fresh?.meta ?? { revision: expectedRevision + 1, updatedAt: null, updatedBy: user.uid };
}

/** The ad-config.json currently bundled with the site (what the game actually reads today). */
export async function loadSiteConfig(url = '/ad-config.json'): Promise<AdConfig | null> {
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) return null;
    const raw: unknown = await res.json();
    return mergeConfig(raw);
  } catch {
    return null;
  }
}

export function configToJson(cfg: AdConfig): string {
  return JSON.stringify(sanitize(cfg), null, 2) + '\n';
}
