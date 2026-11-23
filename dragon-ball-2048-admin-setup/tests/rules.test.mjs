// Firestore Security Rules tests (run against the local Firestore emulator).
//
//   npm i --no-save @firebase/rules-unit-testing firebase-tools     (tools only; not part of the build)
//   npx firebase emulators:exec --only firestore --project demo-db2048 "node --test tests/rules.test.mjs"
//
// Env: RULES_PATH (default ./firestore.rules)
import { test, before, after, beforeEach } from 'node:test';
import fs from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, collection, serverTimestamp, Timestamp } from 'firebase/firestore';

const OWNER = 'ownerUID', OWNER_EMAIL = 'kabirshaikh1811@gmail.com';
const INACTIVE = 'inactiveUID', INACTIVE_EMAIL = 'inactive@example.com';
const EDITOR = 'editorUID', EDITOR_EMAIL = 'editor@example.com';
const STRANGER = 'strangerUID', STRANGER_EMAIL = 'stranger@example.com';

const placement = () => ({ enabled: false, network: 'none', devices: ['mobile'] });
const goodConfig = (over = {}) => ({
  version: 1, mode: 'test', masterEnabled: false,
  web: { enabled: false }, android: { enabled: false }, networks: { adsense: { publisherId: '' } },
  placements: { topBanner: placement(), bottomBanner: placement(), gameOver: placement(), interstitial: placement() },
  androidPlacements: {}, analytics: { enabled: false },
  ...over,
});
const goodDoc = (uid, revision = 1, over = {}) => ({ config: goodConfig(), revision, updatedAt: serverTimestamp(), updatedBy: uid, ...over });

let env;
before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-db2048', firestore: { rules: fs.readFileSync(process.env.RULES_PATH || 'firestore.rules', 'utf8') } });
});
after(async () => { await env?.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'admins', OWNER), { role: 'owner', active: true, email: OWNER_EMAIL });
    await setDoc(doc(db, 'admins', INACTIVE), { role: 'owner', active: false, email: INACTIVE_EMAIL });
    await setDoc(doc(db, 'admins', EDITOR), { role: 'editor', active: true, email: EDITOR_EMAIL });
    await setDoc(doc(db, 'secrets', 'x'), { v: 1 });
  });
});

const as = (uid, email) => env.authenticatedContext(uid, { email }).firestore();
const owner = () => as(OWNER, OWNER_EMAIL);
const anon = () => env.unauthenticatedContext().firestore();
const seedConfig = (revision = 1) => env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'publicConfig', 'adConfig'), { config: goodConfig(), revision, updatedAt: Timestamp.now(), updatedBy: OWNER }));

// ───────── admins collection ─────────
test('anonymous users cannot read any admin record', async () => {
  await assertFails(getDoc(doc(anon(), 'admins', OWNER)));
});
test('owner can read ONLY their own admin record', async () => {
  const snap = await assertSucceeds(getDoc(doc(owner(), 'admins', OWNER)));
  if (!snap.exists() || snap.data().role !== 'owner') throw new Error('owner record not readable');
  await assertFails(getDoc(doc(owner(), 'admins', INACTIVE)));
});
test('a stranger cannot read the owner record, and a missing own record simply does not exist', async () => {
  const db = as(STRANGER, STRANGER_EMAIL);
  await assertFails(getDoc(doc(db, 'admins', OWNER)));
  const own = await assertSucceeds(getDoc(doc(db, 'admins', STRANGER)));
  if (own.exists()) throw new Error('stranger must have no admin record');
});
test('admin records cannot be listed', async () => {
  await assertFails(getDocs(collection(owner(), 'admins')));
});
test('a user cannot create their own admin record (self-promotion)', async () => {
  await assertFails(setDoc(doc(as(STRANGER, STRANGER_EMAIL), 'admins', STRANGER), { role: 'owner', active: true, email: STRANGER_EMAIL }));
});
test('even the owner cannot create/update/delete admin records from a client', async () => {
  const db = owner();
  await assertFails(setDoc(doc(db, 'admins', 'someoneElse'), { role: 'owner', active: true, email: 'x@y.z' }));
  await assertFails(updateDoc(doc(db, 'admins', OWNER), { active: false }));
  await assertFails(updateDoc(doc(db, 'admins', OWNER), { role: 'superuser' }));
  await assertFails(deleteDoc(doc(db, 'admins', OWNER)));
});
test('an inactive admin cannot re-activate themselves', async () => {
  await assertFails(updateDoc(doc(as(INACTIVE, INACTIVE_EMAIL), 'admins', INACTIVE), { active: true }));
});

// ───────── publicConfig/adConfig ─────────
test('anyone (even signed out) can read the public config document', async () => {
  await seedConfig();
  await assertSucceeds(getDoc(doc(anon(), 'publicConfig', 'adConfig')));
});
test('the publicConfig collection cannot be listed', async () => {
  await assertFails(getDocs(collection(anon(), 'publicConfig')));
});
test('unauthenticated and stranger writes are denied', async () => {
  await assertFails(setDoc(doc(anon(), 'publicConfig', 'adConfig'), goodDoc('x')));
  await assertFails(setDoc(doc(as(STRANGER, STRANGER_EMAIL), 'publicConfig', 'adConfig'), goodDoc(STRANGER)));
});
test('inactive owner cannot write config', async () => {
  await assertFails(setDoc(doc(as(INACTIVE, INACTIVE_EMAIL), 'publicConfig', 'adConfig'), goodDoc(INACTIVE)));
});
test('non-owner role cannot write config', async () => {
  await assertFails(setDoc(doc(as(EDITOR, EDITOR_EMAIL), 'publicConfig', 'adConfig'), goodDoc(EDITOR)));
});
test('owner whose token e-mail does not match the admin record cannot write', async () => {
  await assertFails(setDoc(doc(as(OWNER, 'someone-else@example.com'), 'publicConfig', 'adConfig'), goodDoc(OWNER)));
});
test('active owner can create revision 1', async () => {
  await assertSucceeds(setDoc(doc(owner(), 'publicConfig', 'adConfig'), goodDoc(OWNER, 1)));
});
test('first save must be revision 1', async () => {
  await assertFails(setDoc(doc(owner(), 'publicConfig', 'adConfig'), goodDoc(OWNER, 5)));
});
test('active owner can update with revision + 1 and stale revisions are rejected', async () => {
  await seedConfig(1);
  await assertSucceeds(setDoc(doc(owner(), 'publicConfig', 'adConfig'), goodDoc(OWNER, 2)));
  await assertFails(setDoc(doc(owner(), 'publicConfig', 'adConfig'), goodDoc(OWNER, 2))); // stale (current is now 2)
  await assertFails(setDoc(doc(owner(), 'publicConfig', 'adConfig'), goodDoc(OWNER, 9))); // skipping
});
test('updatedBy must be the caller and updatedAt must be server time', async () => {
  await assertFails(setDoc(doc(owner(), 'publicConfig', 'adConfig'), goodDoc(OWNER, 1, { updatedBy: 'someoneElse' })));
  await assertFails(setDoc(doc(owner(), 'publicConfig', 'adConfig'), goodDoc(OWNER, 1, { updatedAt: Timestamp.fromDate(new Date('2001-01-01')) })));
});
test('schema: extra top-level fields, bad mode, unknown config keys and unknown placements are rejected', async () => {
  const ref = () => doc(owner(), 'publicConfig', 'adConfig');
  await assertFails(setDoc(ref(), goodDoc(OWNER, 1, { apiSecret: 'nope' })));
  await assertFails(setDoc(ref(), goodDoc(OWNER, 1, { config: goodConfig({ mode: 'yolo' }) })));
  await assertFails(setDoc(ref(), goodDoc(OWNER, 1, { config: goodConfig({ privateKey: 'abc' }) })));
  await assertFails(setDoc(ref(), goodDoc(OWNER, 1, { config: goodConfig({ masterEnabled: 'yes' }) })));
  await assertFails(setDoc(ref(), goodDoc(OWNER, 1, { config: goodConfig({ placements: { overBoard: placement() } }) })));
  await assertFails(setDoc(ref(), goodDoc(OWNER, 1, { config: 'not a map' })));
});
test('config document can never be deleted', async () => {
  await seedConfig();
  await assertFails(deleteDoc(doc(owner(), 'publicConfig', 'adConfig')));
});
test('other documents in publicConfig are denied, even for the owner', async () => {
  await assertFails(setDoc(doc(owner(), 'publicConfig', 'other'), { a: 1 }));
  await assertFails(getDoc(doc(anon(), 'publicConfig', 'other')));
});

// ───────── default deny ─────────
test('unknown collections are denied for everyone, including the owner', async () => {
  await assertFails(getDoc(doc(anon(), 'secrets', 'x')));
  await assertFails(getDoc(doc(owner(), 'secrets', 'x')));
  await assertFails(setDoc(doc(owner(), 'secrets', 'y'), { a: 1 }));
});
