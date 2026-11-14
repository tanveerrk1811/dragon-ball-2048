# DRAGON BALL 2048 — POWER EVOLUTION

A premium dark-themed 2048 variant where tiles are fighters that evolve as you merge them, plus an
Android app that wraps the same game engine, and a configurable, policy-conscious advertising layer.

> **Unofficial fan project.** "Dragon Ball" and its characters, names and logos are owned by their respective
> rights holders. Read [docs/COMPLIANCE.md](docs/COMPLIANCE.md) **before** monetizing or publishing.

## What is in this repository

| Path | What it is |
|---|---|
| `src/game/` | The browser game (vanilla TypeScript, no UI framework): engine, renderer, input, sound, art, ads, consent, analytics |
| `src/App.tsx`, `src/main.tsx` | Thin host required by this workspace's Vite+React scaffold. It only calls `mountGame()`; the game has **no React code** |
| `public/ad-config.json` | **Centralized ad configuration** (all ads OFF by default) — read by the website and bundled into the Android app |
| `public/admin/index.html` | Owner-only ad dashboard (static; must be protected on the server — see docs/DEPLOY.md) |
| `public/privacy.html`, `terms.html`, `ads.txt`, `robots.txt` | Legal pages and templates |
| `android/` | Separate Android Studio project (Kotlin, WebView + AdMob + UMP) |
| `tests/` | Engine / art / ad-config unit tests |
| `docs/` | AdSense, Adsterra, AdMob, Android build, deployment, compliance, QA report |

## Honest status of the original ZIP

The task referred to a ZIP with the original 2048 source. **No archive was available in this workspace** (only an empty
React/Vite starter), so nothing could be extracted or inspected. The 2048 engine was therefore **re-implemented** following
the original mechanics (4×4, single merge per move per tile, 90 % 2 / 10 % 4 spawns, win at 2048 with "keep playing",
game-over detection, localStorage best score, saved game, keyboard + swipe input). If you still have the ZIP, the engine in
`src/game/engine.ts` is deliberately isolated (it only depends on a storage and a renderer interface) so it is easy to compare.

## Quick start

```bash
npm install
npm run dev          # develop
npm run build        # -> dist/ (single-file index.html + static pages), deployable on any static host
npx esbuild tests/engine.test.ts --bundle --platform=node --format=esm --outfile=/tmp/engine.mjs && node /tmp/engine.mjs   # unit tests
./android/sync-web.sh   # rebuild + copy the game into the Android project
```

## Evolution chain

2 Kid Goku · 4 Krillin · 8 Yamcha · 16 Tien Shinhan · 32 Piccolo · 64 Vegeta · 128 Goku · 256 Super Saiyan Goku ·
512 Super Saiyan 2 · 1024 Super Saiyan 3 · **2048 Super Saiyan God (first victory)** · 4096 Super Saiyan Blue ·
8192 Ultra Instinct · 16384 Mastered Ultra Instinct. After 2048 you can keep playing.

Portraits are **original stylised vector illustrations generated in code** (`src/game/art.ts`) — not official artwork.
They are still depictions of copyrighted characters; see the compliance guide.

## Advertising at a glance

* Everything is **disabled by default**. Edit `public/ad-config.json` (or use the dashboard, then upload the JSON).
* Website placements: top banner, bottom banner, game-over panel (below the board), between-session break dialog.
  Each placement has exactly **one** network (AdSense, Adsterra, or your own house ad); the other is never loaded into it.
* Ads never overlay tiles, controls, scores or buttons, never appear mid-move, never auto-refresh, and collapse silently if they fail.
* Adsterra: Banner and Native Banner only, in sandboxed iframes. Popunder and Social Bar are intentionally not supported.
* Android: **AdMob** (banner, interstitial at game over, optional rewarded "Undo") + UMP consent. **Adsterra has no official
  Android SDK**, so it is not integrated in the app (do not trust third-party "Adsterra SDKs").
* No revenue figures are promised or estimated. Approvals are required (see below).

## Still required from you (cannot be done in code)

1. Rights clearance / legal advice for the Dragon Ball theme (see COMPLIANCE.md). AdSense, AdMob, Adsterra and Google Play may reject unlicensed franchise content.
2. AdSense approval of your domain, `ads.txt`, a Google-certified CMP for EEA/UK/CH traffic.
3. Adsterra publisher approval of your domain.
4. AdMob account, app registration, ad units, real app ID in `android/gradle.properties`.
5. Replace placeholders: contact e-mail (`src/game/site-config.ts`, `public/privacy.html`, `public/terms.html`), owner name, dates, `applicationId`.
6. Protect `/admin/` on your server.
7. Test on real devices (see docs/QA.md for what was and was **not** verified).

Documents: [AdSense](docs/ADSENSE.md) · [Adsterra](docs/ADSTERRA.md) · [AdMob](docs/ADMOB.md) · [Android build](docs/ANDROID_BUILD.md) ·
[Deploy](docs/DEPLOY.md) · [Compliance](docs/COMPLIANCE.md) · [QA report](docs/QA.md)
