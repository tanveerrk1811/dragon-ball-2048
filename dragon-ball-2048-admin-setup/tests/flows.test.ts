// End-to-end tests of the REAL admin modules (authz.ts, configStore.ts, errors.ts) against the Firebase
// Auth + Firestore emulators, using the real Firebase client SDK (no mocks).
//
//   npx firebase emulators:exec --only auth,firestore --project demo-db2048 "npx tsx --test tests/flows.test.ts"
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword, signOut, type Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc } from 'firebase/firestore/lite';
import { authorizeAdmin } from '../src/admin/authz';
import { ConflictError, NotAuthorizedError, configToJson, loadSavedConfig, loadSiteConfig, saveConfig } from '../src/admin/configStore';
import { isNetworkError, isPermissionError, mapLoginError } from '../src/admin/errors';
import { defaultConfig, mergeConfig } from '../src/game/ads/ad-config';
import { errorsOf, goLiveRequested, validateDraft } from '../src/admin/validation';

const PROJECT = 'demo-db2048';
const AUTH = 'http://127.0.0.1:9099';
const FS = 'http://127.0.0.1:8080';
let n = 0;

async function createUser(email: string, password: string): Promise<string> {
  const r = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const j = (await r.json()) as { localId: string };
  return j.localId;
}
async function disableUser(uid: string) {
  await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:update`, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer owner' }, body: JSON.stringify({ localId: uid, disableUser: true }),
  });
}
/** Writes with the emulator's admin bypass — the equivalent of creating the document by hand in the Console. */
async function seedAdmin(uid: string, data: { role: string; active: boolean; email: string }) {
  const fields = { role: { stringValue: data.role }, active: { booleanValue: data.active }, email: { stringValue: data.email } };
  const r = await fetch(`${FS}/v1/projects/${PROJECT}/databases/(default)/documents/admins/${uid}`, {
    method: 'PATCH', headers: { 'content-type': 'application/json', authorization: 'Bearer owner' }, body: JSON.stringify({ fields }),
  });
  assert.equal(r.status, 200, 'seed admin');
}
async function clearFirestore() {
  await fetch(`${FS}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
}

interface Client { app: FirebaseApp; auth: Auth; db: ReturnType<typeof getFirestore> }
function client(): Client {
  const app = initializeApp({ apiKey: 'demo-api-key', projectId: PROJECT, appId: 'x' }, `c${++n}`);
  const auth = getAuth(app);
  connectAuthEmulator(auth, AUTH, { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  return { app, auth, db };
}
async function login(email: string, password: string): Promise<Client> {
  const c = client();
  await signInWithEmailAndPassword(c.auth, email, password);
  return c;
}

const OWNER_EMAIL = 'kabirshaikh1811@gmail.com';
const PW = 'correct-horse-battery';
let ownerUid = '', strangerUid = '', inactiveUid = '', editorUid = '', mismatchUid = '', disabledUid = '';

before(async () => {
  await clearFirestore();
  ownerUid = await createUser(OWNER_EMAIL, PW);
  strangerUid = await createUser('stranger@example.com', PW);
  inactiveUid = await createUser('inactive@example.com', PW);
  editorUid = await createUser('editor@example.com', PW);
  mismatchUid = await createUser('mismatch@example.com', PW);
  disabledUid = await createUser('disabled@example.com', PW);
  await seedAdmin(ownerUid, { role: 'owner', active: true, email: OWNER_EMAIL });
  await seedAdmin(inactiveUid, { role: 'owner', active: false, email: 'inactive@example.com' });
  await seedAdmin(editorUid, { role: 'editor', active: true, email: 'editor@example.com' });
  await seedAdmin(mismatchUid, { role: 'owner', active: true, email: 'somebody-else@example.com' });
  await seedAdmin(disabledUid, { role: 'owner', active: true, email: 'disabled@example.com' });
  await disableUser(disabledUid);
});

// ───────── Authentication ─────────
test('successful owner login -> authorized as active owner', async () => {
  const c = await login(OWNER_EMAIL, PW);
  const res = await authorizeAdmin(c.db, c.auth.currentUser!);
  assert.equal(res.ok, true);
  if (res.ok) { assert.equal(res.admin.uid, ownerUid); assert.equal(res.admin.role, 'owner'); assert.equal(res.admin.email, OWNER_EMAIL); }
});

test('incorrect password -> generic "incorrect e-mail or password" (no account enumeration)', async () => {
  const c = client();
  const bad = await signInWithEmailAndPassword(c.auth, OWNER_EMAIL, 'wrong-password').then(() => null, (e) => mapLoginError(e));
  const unknown = await signInWithEmailAndPassword(c.auth, 'nobody@example.com', 'whatever1').then(() => null, (e) => mapLoginError(e));
  assert.equal(bad?.code, 'invalid-credentials');
  assert.equal(unknown?.code, 'invalid-credentials');
  assert.equal(bad?.message, unknown?.message);
  assert.equal(c.auth.currentUser, null);
});

test('malformed e-mail is reported as such', async () => {
  const c = client();
  const r = await signInWithEmailAndPassword(c.auth, 'not-an-email', 'x').then(() => null, (e) => mapLoginError(e));
  assert.equal(r?.code, 'invalid-email');
});

test('Firebase-disabled account is rejected with a clear message', async () => {
  const c = client();
  const r = await signInWithEmailAndPassword(c.auth, 'disabled@example.com', PW).then(() => null, (e) => mapLoginError(e));
  assert.equal(r?.code, 'user-disabled');
});

// ───────── Authorization (UID -> Firestore record) ─────────
test('unauthorized Firebase user (valid login, no admin record) is rejected', async () => {
  const c = await login('stranger@example.com', PW);
  const res = await authorizeAdmin(c.db, c.auth.currentUser!);
  assert.equal(res.ok, false);
  if (!res.ok) assert.equal(res.reason, 'no-record');
});

test('inactive admin account is rejected', async () => {
  const c = await login('inactive@example.com', PW);
  const res = await authorizeAdmin(c.db, c.auth.currentUser!);
  assert.equal(res.ok, false);
  if (!res.ok) { assert.equal(res.reason, 'inactive'); assert.match(res.notice.message, /inactive/i); }
});

test('non-owner role is rejected', async () => {
  const c = await login('editor@example.com', PW);
  const res = await authorizeAdmin(c.db, c.auth.currentUser!);
  assert.equal(res.ok, false);
  if (!res.ok) assert.equal(res.reason, 'bad-record');
});

test('admin record whose e-mail differs from the account e-mail is rejected', async () => {
  const c = await login('mismatch@example.com', PW);
  const res = await authorizeAdmin(c.db, c.auth.currentUser!);
  assert.equal(res.ok, false);
  if (!res.ok) assert.equal(res.reason, 'email-mismatch');
});

test('a user cannot read someone else\u2019s admin record, so UIDs cannot be probed', async () => {
  const c = await login('stranger@example.com', PW);
  const err = await getDoc(doc(c.db, 'admins', ownerUid)).then(() => null, (e) => e);
  assert.ok(err && isPermissionError(err));
});

test('network failure while verifying access is reported as network (session not destroyed)', async () => {
  const c = await login(OWNER_EMAIL, PW);
  const dead = getFirestore(initializeApp({ apiKey: 'k', projectId: 'dead', appId: 'x' }, `dead${++n}`));
  connectFirestoreEmulator(dead, '127.0.0.1', 1); // nothing listens here
  const res = await authorizeAdmin(dead, c.auth.currentUser!);
  assert.equal(res.ok, false);
  if (!res.ok) assert.ok(res.reason === 'network' || res.reason === 'error', `got ${res.reason}`);
  assert.equal(isNetworkError(Object.assign(new Error('x'), { code: 'unavailable' })), true);
});

// ───────── Config save / load ─────────
test('public (signed-out) visitors can read the config; nothing saved yet -> null', async () => {
  const anon = client();
  assert.equal(await loadSavedConfig(anon.db), null);
});

test('owner saves, config round-trips, revision increments, stale writer gets ConflictError', async () => {
  const o = await login(OWNER_EMAIL, PW);
  const cfg = defaultConfig();
  cfg.networks.adsense.publisherId = 'ca-pub-1234567890123456';
  cfg.placements.topBanner.adsense.slotId = '1234567890';
  cfg.placements.topBanner.network = 'adsense';

  const meta1 = await saveConfig(o.db, o.auth.currentUser!, cfg, 0);
  assert.equal(meta1.revision, 1);
  assert.equal(meta1.updatedBy, ownerUid);
  assert.ok(meta1.updatedAt instanceof Date);

  const anon = client();
  const loaded = await loadSavedConfig(anon.db); // public read
  assert.ok(loaded);
  assert.deepEqual(loaded!.config, mergeConfig(cfg));
  assert.equal(loaded!.config.masterEnabled, false);

  cfg.mode = 'production';
  const meta2 = await saveConfig(o.db, o.auth.currentUser!, cfg, 1);
  assert.equal(meta2.revision, 2);

  await assert.rejects(saveConfig(o.db, o.auth.currentUser!, cfg, 1), (e) => e instanceof ConflictError); // stale tab
});

test('stranger, inactive and mismatched users cannot save (NotAuthorizedError), config untouched', async () => {
  const before = await loadSavedConfig(client().db);
  for (const email of ['stranger@example.com', 'inactive@example.com', 'editor@example.com', 'mismatch@example.com']) {
    const c = await login(email, PW);
    await assert.rejects(saveConfig(c.db, c.auth.currentUser!, defaultConfig(), before!.meta.revision), (e) => e instanceof NotAuthorizedError, email);
  }
  const after = await loadSavedConfig(client().db);
  assert.equal(after!.meta.revision, before!.meta.revision);
});

test('owner deactivated mid-session: next save is refused', async () => {
  await seedAdmin(editorUid, { role: 'owner', active: true, email: 'editor@example.com' });
  const c = await login('editor@example.com', PW);
  const rev = (await loadSavedConfig(c.db))!.meta.revision;
  await saveConfig(c.db, c.auth.currentUser!, defaultConfig(), rev); // allowed while active
  await seedAdmin(editorUid, { role: 'owner', active: false, email: 'editor@example.com' });
  await assert.rejects(saveConfig(c.db, c.auth.currentUser!, defaultConfig(), rev + 1), (e) => e instanceof NotAuthorizedError);
});

test('logout: session ends and writes are refused', async () => {
  const o = await login(OWNER_EMAIL, PW);
  const user = o.auth.currentUser!;
  await signOut(o.auth);
  assert.equal(o.auth.currentUser, null);
  const rev = (await loadSavedConfig(o.db))!.meta.revision;
  const err = await setDoc(doc(o.db, 'publicConfig', 'adConfig'), { config: defaultConfig(), revision: rev + 1, updatedBy: user.uid }).then(() => null, (e) => e);
  assert.ok(err && isPermissionError(err));
  const adminRead = await getDoc(doc(o.db, 'admins', ownerUid)).then(() => null, (e) => e);
  assert.ok(adminRead && isPermissionError(adminRead));
});

test('direct client write to admins/ is refused even for the active owner', async () => {
  const o = await login(OWNER_EMAIL, PW);
  const err = await setDoc(doc(o.db, 'admins', strangerUid), { role: 'owner', active: true, email: 'stranger@example.com' }).then(() => null, (e) => e);
  assert.ok(err && isPermissionError(err));
});

// ───────── Export & validation ─────────
test('export: ad-config.json is valid JSON identical to the sanitised draft, with unknown keys removed', () => {
  const cfg = defaultConfig() as unknown as Record<string, unknown>;
  cfg.injected = { evil: true };
  const text = configToJson(cfg as never);
  assert.ok(text.endsWith('\n'));
  const parsed = JSON.parse(text);
  assert.equal(parsed.injected, undefined);
  assert.deepEqual(parsed, mergeConfig(defaultConfig()));
});

test('shipped public/ad-config.json is safe: all advertising OFF and passes validation', async () => {
  const fs = await import('node:fs');
  const raw = JSON.parse(fs.readFileSync(new URL('../public/ad-config.json', import.meta.url), 'utf8'));
  const cfg = mergeConfig(raw);
  assert.equal(cfg.masterEnabled, false);
  assert.equal(goLiveRequested(cfg), false);
  assert.equal(errorsOf(validateDraft(cfg)).length, 0);
  assert.equal(await loadSiteConfig('http://127.0.0.1:1/ad-config.json'), null); // unreachable -> null, not a crash
});

test('validation: go-live detection, bad IDs and secret-looking values are flagged', () => {
  const cfg = defaultConfig();
  cfg.masterEnabled = true; cfg.web.enabled = true;
  cfg.placements.bottomBanner.enabled = true; cfg.placements.bottomBanner.network = 'adsense';
  assert.equal(goLiveRequested(cfg), true);
  assert.ok(errorsOf(validateDraft(cfg)).some((i) => i.path === 'networks.adsense.publisherId'));
  cfg.networks.adsense.publisherId = 'ca-pub-1234567890123456';
  cfg.placements.bottomBanner.adsense.slotId = '12345678';
  assert.equal(errorsOf(validateDraft(cfg)).length, 0);
  cfg.placements.bottomBanner.custom.alt = 'my password is hunter2';
  assert.ok(errorsOf(validateDraft(cfg)).some((i) => /secret/i.test(i.message)));
  cfg.placements.bottomBanner.custom.alt = 'Sponsored';
  cfg.placements.topBanner.adsterra.scriptSrc = 'http://insecure.example/invoke.js';
  cfg.placements.topBanner.enabled = true; cfg.placements.topBanner.network = 'adsterra';
  assert.ok(errorsOf(validateDraft(cfg)).some((i) => i.path === 'placements.topBanner.adsterra.scriptSrc'));
});

test.after(async () => {
  // close all firebase apps so the process can exit
  const { getApps } = await import('firebase/app');
  await Promise.all(getApps().map((a) => deleteApp(a)));
});
