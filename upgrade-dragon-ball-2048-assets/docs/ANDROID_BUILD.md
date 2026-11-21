# Building the Android app

Requirements: Android Studio (Ladybug or newer), JDK 17, Android SDK 35. Project: `android/` (open that folder).

1. **Sync the game** into the app: from the repo root run `./android/sync-web.sh` (runs `npm run build`, copies `dist/` into `android/app/src/main/assets/www`, removes `/admin`, `robots.txt`, `ads.txt`). The ZIP already contains a synced copy.
2. **Gradle wrapper**: this delivery contains `gradle-wrapper.properties` but not the binary `gradle-wrapper.jar`. Opening the project in Android Studio creates it, or run `gradle wrapper --gradle-version 8.9` with a local Gradle install.
3. **Package name**: change `applicationId` in `app/build.gradle.kts` (Google Play rejects `com.example.*`). Optionally refactor the Kotlin package.
4. **Debug run**: select a device/emulator → Run. Debug builds always use the Google test AdMob app ID.
5. **Release APK/AAB**
   * Create a keystore and `android/keystore.properties` (not committed): `storeFile=…`, `storePassword=…`, `keyAlias=…`, `keyPassword=…`.
   * Put your AdMob App ID in `android/gradle.properties` (`ADMOB_APP_ID`).
   * `cd android && ./gradlew assembleRelease` (APK) or `./gradlew bundleRelease` (AAB, required for Play).
   * Outputs: `app/build/outputs/apk/release/`, `app/build/outputs/bundle/release/`.
6. Release builds enable R8 shrinking; the JavaScript bridge is kept by `proguard-rules.pro`.

## Behavior notes
* The game is served from app assets over `https://appassets.androidplatform.net/assets/www/` (WebViewAssetLoader) → **works fully offline**. Links to other sites open in the system browser; only our origin gets the JS bridge.
* Back button: closes an open game dialog, otherwise exits. Rotation is handled without reloading (`configChanges`). `onPause/onResume` pause the WebView and the banner.
* Offline: ads are skipped (no loads when there is no network) and retried when the network returns.

> **Not verified here:** this workspace has no Android SDK, so the project was **not compiled or run**. Kotlin APIs were written against the official documentation (Mobile Ads SDK 23.x, UMP 3.x, androidx.webkit 1.12). Expect to resolve minor version issues on first sync, then follow docs/QA.md's Android checklist.
