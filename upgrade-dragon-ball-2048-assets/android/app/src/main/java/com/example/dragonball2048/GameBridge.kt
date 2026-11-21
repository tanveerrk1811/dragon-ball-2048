package com.example.dragonball2048

import android.app.Activity
import android.util.Log
import android.webkit.JavascriptInterface

/**
 * The ONLY object exposed to JavaScript (as window.AndroidBridge). It is available solely to pages served from
 * the app's own https://appassets.androidplatform.net origin (external URLs open in the system browser).
 * It accepts a tiny whitelist of string commands and exposes no files, credentials or ad unit ids.
 */
class GameBridge(private val activity: Activity, private val ads: NativeAds) {

    @JavascriptInterface
    fun getCapabilities(): String = ads.capabilitiesJson()

    @JavascriptInterface
    fun naturalBreak(kind: String) {
        if (kind == "gameOver" || kind == "victory") activity.runOnUiThread { ads.naturalBreak(kind) }
    }

    @JavascriptInterface
    fun requestRewarded(kind: String) {
        if (kind == "undo") activity.runOnUiThread { ads.showRewarded(kind) }
    }

    @JavascriptInterface
    fun openPrivacyOptions() {
        activity.runOnUiThread { if (ads.privacyOptionsRequired) ads.openPrivacyOptions() }
    }

    @JavascriptInterface
    fun trackEvent(name: String, json: String) {
        // Local logging only. Wire Firebase Analytics here if you add it (and disclose it in the privacy policy).
        Log.d("DB2048.Event", "${name.take(40)} ${json.take(200)}")
    }
}
