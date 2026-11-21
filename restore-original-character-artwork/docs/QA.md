# QA report — what was verified and what was not

## Verified in this workspace (automated)
| Check | Result |
|---|---|
| `tests/engine.test.ts` — 21 unit tests: slide/merge rules, no double merge, spawn only after valid move, game-over detection, win at 2048 + keep playing, evolution to 4096/16384, best/highest persistence, restart, undo, saved-state restore, 14-tier table, 14 distinct portraits, ad-config defaults/validation (AdSense, Adsterra banner/native, https checks, hostile JSON), device breakpoints | **Pass** |
| `tests/ui-smoke.ts` — real UI mounted in **jsdom** (not a real browser), 80 simulated key presses: tiles/score/evolution panel render; ads off ⇒ no slots and no consent banner; house ad hidden until consent then shown; invalid AdSense config stays hidden; Adsterra banner creates a sandboxed iframe with the normalised https script URL; no page errors. Run: `npm i -D jsdom`, bundle with esbuild (`--loader:.css=empty --external:jsdom`) to `/tmp/ui-smoke.cjs`, then `node tests/ui-smoke-runner.cjs` | **Pass** |
| `tsc --noEmit` type-check | **Pass** |
| `npm run build` | **Pass** (single-file `dist/index.html`) |
| Portrait rendering (all 14 SVGs rasterised and inspected visually) | Distinct, consistent style |

## NOT verified here (no browser automation, no ad accounts, no Android SDK)
Be explicit: the following were **not** run, so no claim is made that they work.
* Live AdSense / Adsterra rendering (needs approved domain and real IDs).
* Browser/device layout on real Chrome, Safari/iPhone, Android Chrome, tablets (CSS was written mobile-first with percent/`cqw` units; verify on devices).
* Android: compile, install, WebView, AdMob test ads, UMP form, rotation, pause/resume, back navigation, offline start, release/R8 build.
* Sound output, swipe feel, animation smoothness.

## Manual test plan
**Website**
1. Ads disabled (default): no ad slots, no consent banner, no network calls except `ad-config.json`.
2. AdSense: `testMode: true`, valid IDs on an approved domain → slot appears after consent; decline consent → no script loaded.
3. Adsterra: banner/native values → iframe loads; device visibility respected on resize.
4. Invalid ad code (bad key/URL) → placement stays hidden, entry appears in dashboard validation/error log, game unaffected.
5. Network unavailable / ad blocker → game works, slots collapse.
6. Desktop (arrows, WASD, R), mobile (swipe, no page scroll/bounce), no horizontal scroll at 320 px width.
7. Restart, game over (overlay + game-over slot below the board), victory at 2048 → "Keep going" → 4096/8192/16384.
8. Between-session dialog: only after game over, respects min interval/every-N; can be dismissed immediately.
9. Dashboard: edit → validation → download → upload → `?adpreview=1` preview.

**Android** (use test ads only)
1. Fresh install: game starts, consent form (if in a UMP region), banner appears after init.
2. Airplane mode: game loads and plays; no crash; ads return when online.
3. Game over → New game ×N → interstitial obeys limits; never mid-game.
4. Undo (rewarded): prompt → ad → undo only after earned.
5. Pause/resume (home, app switch), rotation, back button (dialog → exit).
6. `assembleRelease` with R8: bridge methods still work.
7. Never click live ads.
