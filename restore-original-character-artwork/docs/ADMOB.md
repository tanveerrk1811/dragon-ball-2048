# Google AdMob (Android app)

## Architecture
`android/app/src/main/java/com/example/dragonball2048/`
* `NativeAds.kt` — official **Google Mobile Ads SDK** (`play-services-ads:23.6.0`) + **UMP** consent SDK: init, banner (adaptive, below the game), interstitial, rewarded, lifecycle, error handling.
* `AdConfig.kt` — reads the same `ad-config.json` (bundled in `assets/www/`). Safe defaults: disabled.
* `GameBridge.kt` — the only JS bridge: `getCapabilities`, `naturalBreak("gameOver")`, `requestRewarded("undo")`, `openPrivacyOptions`, `trackEvent`. No IDs or secrets cross it.
* `MainActivity.kt` — WebView host (assets served via `WebViewAssetLoader`, no `file://`), back button, network callback, immersive mode.

Browser JavaScript cannot run native SDKs; the web game only reports natural breaks and asks for the explicit rewarded ad.

## Placements
| Placement | Behavior |
|---|---|
| Banner | Native adaptive banner in its own area **below** the WebView; hidden until it loads |
| Interstitial | Only when the player starts a new game after **game over**; not in the first `minSecondsAfterLaunch`, not more often than `minIntervalSeconds`, and only every `everyNGames` finished games |
| Rewarded | Optional **Undo** button (tagged "AD"). A dialog explains it first; the reward is granted only after the ad closes and only if earned |

Never shown mid-game; never after every move; the game is fully usable without ads.

## Test ads (default)
Until you switch to production, the app uses Google's official test units:
* App ID `ca-app-pub-3940256099942544~3347511713`
* Banner `…/9214589741` · Interstitial `…/1033173712` · Rewarded `…/5224354917`

To try them: in `public/ad-config.json` set `masterEnabled: true`, `android.enabled: true`, `androidPlacements.banner/interstitial/rewarded.enabled: true`, optionally lower `minSecondsAfterLaunch` / `everyNGames` for testing, then `./android/sync-web.sh` and run a debug build. Use a real device or an emulator with Google Play. Add your device as a test device in AdMob for live units.

## Go to production
1. AdMob → Apps → *Add app* (Android). Copy the **App ID** (`ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY`).
2. Create ad units: *Banner*, *Interstitial*, *Rewarded*. Copy each **Ad unit ID** (`ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ`).
3. `android/gradle.properties` → `ADMOB_APP_ID=<your app id>` (release builds). Debug builds always use the test app id.
4. `ad-config.json`:
   ```json
   "mode": "production",
   "networks": { "admob": { "useTestUnits": false, "appId": "ca-app-pub-…~…",
      "bannerUnitId": "ca-app-pub-…/…", "interstitialUnitId": "ca-app-pub-…/…", "rewardedUnitId": "ca-app-pub-…/…" } }
   ```
   Units that fail the ID format check are not used (that format stays off).
5. Create the **privacy & consent message** in AdMob → Privacy & messaging (GDPR + US states) and publish it. The app shows it through UMP and exposes a "Privacy choices" link when Google says it is required.
6. Publish the app on Google Play with a matching Data safety form, and link your hosted privacy policy.
7. Never click your own live ads.

## Children
Set `android.tagForChildDirectedTreatment` (`true` if the app is directed to children — this disables personalised ads and is required for the Families program) and `maxAdContentRating`. A Dragon Ball game may attract children; decide and declare your audience honestly in Play Console.

## WebView API for Ads
Only relevant if `web.allowInAppWebAds` is `true`; then `MainActivity.onSdkReady()` calls `MobileAds.registerWebView(webView)`, and cookies/DOM storage are enabled as Google requires. Default is `false` (native ads only). AdSense itself still requires an approved site.

## Adsterra on Android
Not available — no official Android SDK. See ADSTERRA.md.
