# Owner Console (`/admin`) — Firebase setup, testing and manual Netlify deployment

Owner: **Mohammad Kabir Shaikh** · intended login: **kabirshaikh1811@gmail.com**
Working repo: `tanveerrk1811/dragon-ball-2048` (the production repo `Kabir1811/2048dbz` is never touched by this work).

> **Nothing here deploys anything.** You build locally and upload manually to Netlify.

---

## 1. How the security works (and what it does NOT do)

| Layer | What it does |
|---|---|
| Firebase Authentication (e-mail + password) | Proves who you are. No sign-up UI exists. The account is created by hand in the Console. |
| Firestore `admins/{your-UID}` record | Proves you are *allowed*. Must be `role: "owner"`, `active: true`, `email` = your login e-mail. The dashboard only renders after this check passes. |
| Firestore Security Rules (`firestore.rules`) | **The real enforcement.** Every write to `publicConfig/adConfig` re-checks the admin record on the server. Nobody can create/edit/delete `admins/*` from a client. |

**Important limitation — be honest about static hosting.** The site is static files on Netlify. The `/admin` page's JavaScript (login screen + dashboard UI) is part of the public bundle and can be downloaded by anyone who requests it. The login screen does **not** hide that code. What protects your data is Firebase Auth + the Firestore rules: a stranger who opens `/admin` can see the login form and nothing else — they cannot sign in to an authorized account, read admin records, or write configuration. The bundle contains no passwords, private keys or service-account credentials (the Firebase *web* config is public by design).

Also note: Firebase's sign-up API is reachable with the public API key unless you turn it off (step 2.4). Even if someone creates a stray Auth user, that user has **no** `admins/{uid}` document, and clients cannot create one — so they get no access.

If you want the `/admin` route itself to be unreachable without a server-side gate, see section 9.

---

## 2. Firebase Console setup (one time)

1. **Create a project** at <https://console.firebase.google.com> (Spark/free plan is enough).
2. **Add a web app**: Project settings → General → *Your apps* → `</>` Web. Copy the config values.
3. **Authentication** → *Get started* → *Sign-in method* → enable **Email/Password** only (leave "Email link" off). Do not enable other providers.
4. **Authentication → Settings → User actions** → *untick* **Enable create (sign-up)** → Save. (Blocks public account creation through the client API. Users you create in the Console are unaffected.)
5. **Authentication → Users → Add user**: e-mail `kabirshaikh1811@gmail.com` and a **strong, unique password you choose** (use a password manager). Never share it with anyone, including developers or AI assistants. Never put it in code.
6. **Copy the new user's UID** (the "User UID" column).
7. **Firestore Database** → *Create database* → production mode → pick a region.
8. **Create the owner record** (Console documents bypass rules — this is the only way an admin record can be created):
   - Collection ID: `admins`
   - Document ID: **paste the UID from step 6** (not "auto-ID")
   - Fields:
     | Field | Type | Value |
     |---|---|---|
     | `role` | string | `owner` |
     | `active` | boolean | `true` |
     | `email` | string | `kabirshaikh1811@gmail.com` |
   - To suspend access at any time: set `active` to `false` (takes effect on the next save / re-check, within minutes).
9. **Publish the rules** (section 3).
10. *(Optional, recommended)* **App Check** and a restricted API key (Google Cloud Console → APIs & Services → Credentials → restrict the browser key to your Netlify domain via HTTP referrers). Not required for this to function.

## 3. Firestore Security Rules

The exact rules are in **`firestore.rules`** (repo root). To publish:

- **Console:** Firestore Database → *Rules* tab → paste the whole file → *Publish*.
- **CLI:** `npx firebase-tools login`, then `npx firebase-tools deploy --only firestore:rules --project <your-project-id>`.

Summary of what they enforce:

- `admins/{uid}`: a signed-in user can `get` **only their own** document; no list; **no client create/update/delete** for anyone.
- `publicConfig/adConfig`: anyone can `get` (public, non-secret ad configuration); no list; `create`/`update` only for a signed-in user whose `admins/{uid}` is `role=="owner"`, `active==true` and whose e-mail matches the token e-mail; schema-checked; `revision` must increase by exactly 1 (blocks stale overwrites); `updatedBy` must be the caller; `updatedAt` must be server time; **no delete**.
- Everything else: denied.

## 4. Local configuration

```bash
cp .env.example .env.local     # then fill in the 4 required values from step 2.2
npm install
npm run dev                    # open http://localhost:5173/admin
```

`.env.local` is git-ignored. Only the public web-app settings go there. **Never** put a service-account JSON, private key or password in any `VITE_*` variable.

Without these values `/admin` shows a "Firebase not configured" screen and the game is unaffected.

## 5. Using the dashboard

- **Overview** – owner identity, account status, advertising status, sync status.
- **Master controls** – mode, master/website advertising, consent requirement.
- **AdSense / Adsterra** – network IDs, per-placement ad units, per-network enable/disable.
- **Placements** – the four fixed placements (top banner, bottom banner, game-over panel, between-session dialog), network, devices, pacing, layout preview. Ads can never be placed inside or over the board; there is no free-form placement.
- **Android & Analytics** – existing AdMob / GA4 settings (unchanged semantics).
- **Review & Publish** – validation, before/after diff, JSON preview, "preview in game" (local to your browser via `?adpreview=1`), explicit live-ad approval, **Save to Firebase**, **Download ad-config.json**, reload / import.

Safety rules built in: all switches default **OFF**; saving/exporting/previewing a draft that turns real ads ON is blocked until you tick an explicit owner-approval box (reset by any further edit) and validation passes (publisher ID format, slot IDs, https URLs, etc.). Values that look like secrets are rejected.

**What "Save" does:** stores the configuration in Firestore (`publicConfig/adConfig`). **The live game still reads the `ad-config.json` that ships with the site** (existing architecture, deliberately unchanged), so visitors see changes only after you do this:

1. Review & Publish → **Download ad-config.json**
2. Replace `public/ad-config.json` with it
3. Rebuild and upload manually (sections 6–7)

Making the game read the Firestore document at runtime is possible later (the rules already allow public read) but is intentionally **not** done — it would change game code and add Firebase to the game page.

## 6. Production build

```bash
# .env.local must contain your real Firebase web config (not the emulator file)
npm run build
```

Output: **`dist/`**. The game remains a single optimized `dist/index.html` (vite-plugin-singlefile, unchanged `vite.config.ts`). The owner console is inside that same file but code-split and only executed on `/admin`.

## 7. Manual Netlify deployment (you do this; nothing is automated)

Upload the **contents of the `dist` folder** (drag the `dist` folder itself onto Netlify → *Deploys* → "drag and drop", or use *Deploy manually*). It must contain:

```
dist/
  index.html        (game + legal pages + /admin, single file)
  ad-config.json
  ads.txt
  robots.txt
  _redirects        (adds /admin rewrite)
  _headers          (noindex / no-store / anti-framing for /admin)
```

Do **not** connect GitHub for auto-deploys. After the first upload with `/admin` working, add your Netlify domain under Firebase Console → Authentication → Settings → *Authorized domains* (good hygiene; required if you ever add redirect/popup sign-in).

⚠ Netlify serves a real file before applying a rewrite. The old static `public/admin/index.html` was **removed** in this branch; if an old `admin/` folder is still in a previous deploy, it is replaced when you upload this `dist`.

## 8. Testing

Automated tests live in `tests/` and run against the **local Firebase emulators** (no real project, no real accounts). They are not part of the build.

```bash
# one-off tooling (Java 21+ is required by the Firestore emulator)
npm i --no-save firebase-tools @firebase/rules-unit-testing tsx playwright
npx playwright install chromium

# Firestore rules
npx firebase emulators:exec --only firestore --project demo-db2048 "node --test tests/rules.test.mjs"

# Real admin modules (auth, authorization, save/load/export) against Auth + Firestore emulators
npx firebase emulators:exec --only auth,firestore --project demo-db2048 "npx tsx --test tests/flows.test.ts"

# Browser UI test (start the app with the emulator env in another terminal first)
npx vite --mode emulator --port 5173 --host 127.0.0.1
npx firebase emulators:exec --only auth,firestore --project demo-db2048 "node tests/ui.e2e.mjs"
```

`.env.emulator` is only read with `--mode emulator` and the emulator hook is compiled out of production builds.

**Manual test with your real project (recommended before relying on it):** sign in as the owner; change a value and save; check the document in Firestore; sign out; confirm the dashboard disappears; create a throw-away second Auth user without an `admins` record and confirm it is rejected.

## 9. Optional server-side protection of the `/admin` route

Static hosting can't hide a file from someone who requests it. If you want the route itself gated *before* any bundle is served, pick one (none is enabled; nothing here costs money unless you choose a paid tier):

- **Cloudflare Access** (free tier up to 50 users): put the site behind Cloudflare and add an Access policy for `/admin*` allowing only your e-mail. Strongest and simplest.
- **Netlify Edge Function** that checks a Firebase session cookie / ID token (verify with Google's public JWKS) for `/admin*` and returns 401/redirect otherwise. Needs code and a cookie-setting flow; Edge Functions have a free allowance on Netlify but usage beyond it is billed.
- **Netlify password protection** is a paid-plan feature.

Because the real data protection is Firebase Auth + rules, this is defence in depth, not a requirement.

## 10. Remaining limitations / owner actions

- You must create the Firebase project, the Auth user, the `admins/{UID}` document, publish the rules, and provide `.env.local` — I could not and did not do these.
- Tests ran against emulators, **not** your real Firebase project or the live Netlify site.
- The client-side idle sign-out (30 min) and periodic re-check are hardening, not a security boundary; revoke access by setting `active:false` or disabling the Auth user.
- Live ads remain OFF. Enabling them needs AdSense approval, real ad-unit IDs, your explicit approval in the dashboard, then a manual upload of the exported `ad-config.json`.
- The game does not read the Firestore copy of the config (by design, see section 5).
- The production repo `Kabir1811/2048dbz` currently contains only a README (no source), so nothing could be compared against it.
