// Browser (Chromium) end-to-end test of the owner console against the local Firebase emulators.
// Start the app with:  npx vite --mode emulator --port 5173 --host 127.0.0.1
// Run inside emulators:  firebase emulators:exec --only auth,firestore --project demo-db2048 "node tests/ui.e2e.mjs"
// Needs `playwright` (+ `npx playwright install chromium`) available to node. Not part of the production build.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const BASE = process.env.BASE || 'http://127.0.0.1:5173';
const SHOTS = process.env.SHOTS || '';
const PROJECT = 'demo-db2048', AUTH = 'http://127.0.0.1:9099', FS = 'http://127.0.0.1:8080';
const OWNER_EMAIL = 'kabirshaikh1811@gmail.com', PW = 'correct-horse-battery';

const j = { 'content-type': 'application/json' };
async function createUser(email) {
  const r = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo`, { method: 'POST', headers: j, body: JSON.stringify({ email, password: PW, returnSecureToken: true }) });
  return (await r.json()).localId;
}
async function seedAdmin(uid, d) {
  const fields = { role: { stringValue: d.role }, active: { booleanValue: d.active }, email: { stringValue: d.email } };
  const r = await fetch(`${FS}/v1/projects/${PROJECT}/databases/(default)/documents/admins/${uid}`, { method: 'PATCH', headers: { ...j, authorization: 'Bearer owner' }, body: JSON.stringify({ fields }) });
  assert.equal(r.status, 200);
}
async function readConfigDoc() {
  const r = await fetch(`${FS}/v1/projects/${PROJECT}/databases/(default)/documents/publicConfig/adConfig`);
  return r.status === 200 ? r.json() : null;
}

const results = [];
const step = async (name, fn) => {
  try { await fn(); results.push(['PASS', name]); console.log('PASS', name); }
  catch (e) { results.push(['FAIL', name, e.message]); console.log('FAIL', name, '\n   ', e.message.split('\n')[0]); }
};

await fetch(`${FS}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
const ownerUid = await createUser(OWNER_EMAIL);
const strangerUid = await createUser('stranger@example.com');
const inactiveUid = await createUser('inactive@example.com');
await seedAdmin(ownerUid, { role: 'owner', active: true, email: OWNER_EMAIL });
await seedAdmin(inactiveUid, { role: 'owner', active: false, email: 'inactive@example.com' });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
const shot = async (n) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${n}.png` }); };

const signIn = async (email, pw, remember = true) => {
  await page.fill('#adm-email', email);
  await page.fill('#adm-pass', pw);
  const box = page.getByLabel('Keep me signed in on this device');
  if ((await box.isChecked()) !== remember) await box.click();
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
};
const goto = async (p = '/admin') => { await page.goto(BASE + p); };
const nav = (name) => page.getByRole('navigation').getByRole('button', { name }).click();
const loginVisible = () => page.getByRole('heading', { name: 'Owner Console' }).waitFor();
const dashVisible = () => page.getByRole('heading', { name: 'Overview' }).waitFor({ timeout: 15000 });

await step('game route "/" loads and never contacts Firebase', async () => {
  const reqs = [];
  const p2 = await ctx.newPage();
  p2.on('request', (r) => reqs.push(r.url()));
  await p2.goto(BASE + '/');
  await p2.waitForSelector('.app', { timeout: 15000 });
  await p2.waitForTimeout(1500);
  const fb = reqs.filter((u) => /googleapis|gstatic|127\.0\.0\.1:(9099|8080)|firebaseio|identitytoolkit/.test(u));
  assert.deepEqual(fb, []);
  await p2.close();
});

await step('login screen: owner e-mail prefilled, no signup/register/reset UI', async () => {
  await goto(); await loginVisible();
  assert.equal(await page.inputValue('#adm-email'), OWNER_EMAIL);
  const text = (await page.locator('.adm').innerText()).toLowerCase();
  for (const w of ['register', 'sign up', 'signup', 'create account', 'forgot']) assert.ok(!text.includes(w), `found "${w}"`);
  await shot('01-login');
});

await step('incorrect password -> generic error, still on login', async () => {
  await signIn(OWNER_EMAIL, 'wrong-password');
  await page.getByRole('alert').filter({ hasText: 'Incorrect e-mail or password' }).waitFor();
  assert.equal(await page.getByRole('heading', { name: 'Overview' }).count(), 0);
  await shot('02-wrong-password');
});

await step('unauthorized Firebase user (valid password, no admin record) is rejected and signed out', async () => {
  await goto(); await loginVisible();
  await signIn('stranger@example.com', PW);
  await page.getByText('This account is not authorized to use the admin console.').waitFor();
  assert.equal(await page.getByRole('heading', { name: 'Overview' }).count(), 0);
  await page.reload(); await loginVisible(); // no lingering session
  assert.equal(await page.getByRole('heading', { name: 'Overview' }).count(), 0);
  await shot('03-unauthorized');
});

await step('inactive admin account is rejected with an "inactive" message', async () => {
  await goto(); await loginVisible();
  await signIn('inactive@example.com', PW);
  await page.getByText(/admin account is inactive/i).waitFor();
  assert.equal(await page.getByRole('heading', { name: 'Overview' }).count(), 0);
});

await step('unauthorized deep link /admin/anything shows login, not the dashboard', async () => {
  await goto('/admin/settings'); await loginVisible();
});

await step('successful owner login shows identity, active status and UID', async () => {
  await goto(); await loginVisible();
  await signIn(OWNER_EMAIL, PW);
  await dashVisible();
  await page.getByText('Mohammad Kabir Shaikh').first().waitFor();
  await page.getByText('Owner · Active').waitFor();
  await page.getByText(ownerUid).waitFor();
  assert.ok((await page.locator('.adm').innerText()).includes('OFF'));
  await shot('04-overview');
});

await step('session persists across reload (Firebase local persistence)', async () => {
  await page.reload(); await dashVisible();
});

await step('safe edit: save to Firebase -> revision 1 stored, success toast', async () => {
  await nav('Placements');
  await page.getByRole('heading', { name: 'Placements', exact: true }).waitFor();
  await shot('05-placements');
  await nav('AdSense');
  await page.getByLabel('Publisher ID').fill('ca-pub-1234567890123456');
  await nav('Review & Publish');
  await page.getByText('Compared with:').waitFor();
  assert.ok((await page.locator('table.diff').innerText()).includes('networks.adsense.publisherId'));
  await shot('06-review');
  await page.getByRole('button', { name: 'Save to Firebase' }).click();
  await page.getByText(/Saved to Firebase \(revision 1\)/).waitFor();
  const doc = await readConfigDoc();
  assert.equal(doc.fields.revision.integerValue, '1');
  assert.equal(doc.fields.updatedBy.stringValue, ownerUid);
  assert.equal(doc.fields.config.mapValue.fields.networks.mapValue.fields.adsense.mapValue.fields.publisherId.stringValue, 'ca-pub-1234567890123456');
  assert.equal(doc.fields.config.mapValue.fields.masterEnabled.booleanValue, false);
});

await step('saved config loads back after a reload', async () => {
  await page.reload(); await dashVisible();
  await nav('AdSense');
  assert.equal(await page.getByLabel('Publisher ID').inputValue(), 'ca-pub-1234567890123456');
});

await step('validation blocks save/export for incomplete enabled placement', async () => {
  await nav('Placements');
  const card = page.locator('section.card', { hasText: 'Bottom banner' }).first();
  await card.getByRole('switch').first().click();
  await card.getByLabel('Ad network').selectOption('adsense');
  await nav('Review & Publish');
  await page.getByText('AdSense ad unit (slot) ID must be 6–15 digits.').first().waitFor();
  assert.equal(await page.getByRole('button', { name: 'Save to Firebase' }).isDisabled(), true);
  assert.equal(await page.getByRole('button', { name: 'Download ad-config.json' }).isDisabled(), true);
});

await step('go-live gate: master ON needs explicit approval before save/export; export file is valid', async () => {
  await nav('AdSense');
  await page.locator('section.card', { hasText: 'Ad units per placement' }).locator('.subcard', { hasText: 'Bottom banner' }).getByLabel('Ad unit (slot) ID').fill('1234567890');
  await nav('Master controls');
  await page.locator('.switch-row', { hasText: 'Master advertising' }).getByRole('switch').click();
  await page.locator('.switch-row', { hasText: 'Website advertising' }).getByRole('switch').click();
  await nav('Review & Publish');
  await page.getByText('This draft switches REAL advertising on.').waitFor();
  assert.equal(await page.getByRole('button', { name: 'Save to Firebase' }).isDisabled(), true);
  assert.equal(await page.getByRole('button', { name: 'Download ad-config.json' }).isDisabled(), true);
  assert.equal(await page.getByRole('button', { name: 'Preview in game (this browser only)' }).isDisabled(), true);
  await shot('07-golive-gate');
  await page.getByLabel(/I, the owner, approve enabling live advertising/).check();
  assert.equal(await page.getByRole('button', { name: 'Download ad-config.json' }).isDisabled(), false);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download ad-config.json' }).click()]);
  assert.equal(dl.suggestedFilename(), 'ad-config.json');
  const text = fs.readFileSync(await dl.path(), 'utf8');
  const cfg = JSON.parse(text);
  assert.equal(cfg.masterEnabled, true);
  assert.equal(cfg.web.enabled, true);
  assert.equal(cfg.placements.bottomBanner.adsense.slotId, '1234567890');
  assert.equal(cfg.placements.bottomBanner.network, 'adsense');
  assert.equal(cfg.networks.adsense.publisherId, 'ca-pub-1234567890123456');
  assert.equal(cfg.placements.topBanner.enabled, false);
});

await step('further edit after approval resets the approval box (approval is per-draft)', async () => {
  await nav('Master controls');
  await page.locator('.switch-row', { hasText: 'Require visitor consent' }).getByRole('switch').click();
  await nav('Review & Publish');
  assert.equal(await page.getByLabel(/I, the owner, approve enabling live advertising/).isChecked(), false);
  // restore consent requirement then approve and save revision 2
  await nav('Master controls');
  await page.locator('.switch-row', { hasText: 'Require visitor consent' }).getByRole('switch').click();
  await nav('Review & Publish');
  await page.getByLabel(/I, the owner, approve enabling live advertising/).check();
  await page.getByRole('button', { name: 'Save to Firebase' }).click();
  await page.getByText(/Saved to Firebase \(revision 2\)/).waitFor();
  assert.equal((await readConfigDoc()).fields.revision.integerValue, '2');
});

await step('stale save from a second tab is refused with a clear conflict message', async () => {
  const tab2 = await ctx.newPage();
  await tab2.goto(BASE + '/admin');
  await tab2.getByRole('heading', { name: 'Overview' }).waitFor({ timeout: 15000 });
  // tab 1 saves revision 3
  await nav('Master controls');
  await page.locator('.switch-row', { hasText: 'Allow AdSense inside' }).getByRole('switch').click();
  await nav('Review & Publish');
  await page.getByLabel(/I, the owner, approve enabling live advertising/).check();
  await page.getByRole('button', { name: 'Save to Firebase' }).click();
  await page.getByText(/Saved to Firebase \(revision 3\)/).waitFor();
  // tab 2 (still on revision 2) tries to save
  await tab2.getByRole('navigation').getByRole('button', { name: 'Master controls' }).click();
  await tab2.locator('.switch-row', { hasText: 'Require visitor consent' }).getByRole('switch').click();
  await tab2.getByRole('navigation').getByRole('button', { name: 'Review & Publish' }).click();
  await tab2.getByLabel(/I, the owner, approve enabling live advertising/).check();
  await tab2.getByRole('button', { name: 'Save to Firebase' }).click();
  await tab2.getByText(/changed elsewhere/).waitFor();
  assert.equal((await readConfigDoc()).fields.revision.integerValue, '3');
  await tab2.close();
});

await step('unsaved-changes badge, discard, and sign out', async () => {
  await nav('Master controls');
  await page.locator('.switch-row', { hasText: 'Allow AdSense inside' }).getByRole('switch').click();
  await page.getByText('Unsaved changes').first().waitFor();
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Sign out' }).click();
  await loginVisible();
  await page.getByText('You have been signed out.').waitFor();
  await page.reload(); await loginVisible(); // session really gone
  await shot('08-signed-out');
});

await step('session removed on another device/tab: dashboard is not shown after reload', async () => {
  await signIn(OWNER_EMAIL, PW, false); // "do not keep me signed in" -> session persistence
  await dashVisible();
  await page.reload(); await dashVisible(); // sessionStorage survives reload in the same tab
  const p3 = await ctx.newPage(); // new tab = new sessionStorage => must sign in again
  await p3.goto(BASE + '/admin');
  await p3.getByRole('heading', { name: 'Owner Console' }).waitFor({ timeout: 15000 });
  await p3.close();
});

await step('admin deactivated mid-session: next save signs the user out with "inactive" notice', async () => {
  await nav('Master controls');
  await page.locator('.switch-row', { hasText: 'Allow AdSense inside' }).getByRole('switch').click();
  await nav('Review & Publish');
  await page.getByLabel(/I, the owner, approve enabling live advertising/).check();
  await seedAdmin(ownerUid, { role: 'owner', active: false, email: OWNER_EMAIL });
  await page.getByRole('button', { name: 'Save to Firebase' }).click();
  await page.getByText(/admin account is inactive/i).waitFor({ timeout: 15000 });
  await loginVisible();
  assert.equal((await readConfigDoc()).fields.revision.integerValue, '3'); // nothing written
  await seedAdmin(ownerUid, { role: 'owner', active: true, email: OWNER_EMAIL });
});

await step('offline sign-in attempt shows a network error', async () => {
  await goto(); await loginVisible();
  await ctx.setOffline(true);
  await signIn(OWNER_EMAIL, PW);
  await page.getByText(/Network error/).waitFor({ timeout: 15000 });
  await ctx.setOffline(false);
});

await step('mobile viewport renders without horizontal overflow', async () => {
  await page.setViewportSize({ width: 390, height: 800 });
  await goto(); await loginVisible();
  await signIn(OWNER_EMAIL, PW);
  await dashVisible();
  const overflow = await page.evaluate(() => { const a = document.querySelector('.adm'); return a.scrollWidth - a.clientWidth; });
  assert.ok(overflow <= 1, `overflow ${overflow}px`);
  await shot('09-mobile');
});

await step('no uncaught page errors', async () => { assert.deepEqual(pageErrors, []); });

await browser.close();
const failed = results.filter((r) => r[0] === 'FAIL');
console.log(`\n${results.length - failed.length}/${results.length} UI checks passed`);
process.exit(failed.length ? 1 : 0);
