package com.example.dragonball2048

import android.content.Context
import android.util.Log
import org.json.JSONObject

/**
 * Reads the SAME centralized ad-config.json the website uses (bundled in assets/www/ad-config.json).
 * Safe defaults: everything is disabled unless the owner explicitly enables it with valid IDs.
 * Contains only public identifiers; no secrets.
 */
data class AdConfig(
    val master: Boolean = false,
    val androidEnabled: Boolean = false,
    val network: String = "none",
    val production: Boolean = false,
    val useTestUnits: Boolean = true,
    val childDirected: String = "unspecified",
    val maxRating: String = "PG",
    val allowInAppWebAds: Boolean = false,
    val bannerEnabled: Boolean = false,
    val interstitialEnabled: Boolean = false,
    val interstitialMinIntervalSec: Long = 180,
    val interstitialEveryNGames: Int = 3,
    val interstitialMinAfterLaunchSec: Long = 60,
    val rewardedEnabled: Boolean = false,
    private val bannerUnit: String = "",
    private val interstitialUnit: String = "",
    private val rewardedUnit: String = "",
) {
    /** Native ads run only when master + android switches are on and AdMob is the selected network. */
    val active: Boolean get() = master && androidEnabled && network == "admob"

    /** Test units are used unless the owner is in production mode AND turned test units off. */
    private val testing: Boolean get() = !production || useTestUnits

    val bannerUnitId: String? get() = pick(TEST_BANNER, bannerUnit)
    val interstitialUnitId: String? get() = pick(TEST_INTERSTITIAL, interstitialUnit)
    val rewardedUnitId: String? get() = pick(TEST_REWARDED, rewardedUnit)

    private fun pick(test: String, real: String): String? =
        if (testing) test else real.takeIf { UNIT_REGEX.matches(it) }

    companion object {
        private const val TAG = "DB2048.AdConfig"

        // Official Google sample/test ad units: https://developers.google.com/admob/android/test-ads
        const val TEST_BANNER = "ca-app-pub-3940256099942544/9214589741"
        const val TEST_INTERSTITIAL = "ca-app-pub-3940256099942544/1033173712"
        const val TEST_REWARDED = "ca-app-pub-3940256099942544/5224354917"
        private val UNIT_REGEX = Regex("^ca-app-pub-\\d{16}/\\d{10}$")

        fun load(context: Context): AdConfig = try {
            val text = context.assets.open("www/ad-config.json").bufferedReader().use { it.readText() }
            parse(JSONObject(text))
        } catch (e: Exception) {
            Log.w(TAG, "No usable ad-config.json; ads stay disabled: ${e.message}")
            AdConfig()
        }

        internal fun parse(j: JSONObject): AdConfig {
            val web = j.optJSONObject("web")
            val android = j.optJSONObject("android")
            val admob = j.optJSONObject("networks")?.optJSONObject("admob")
            val pl = j.optJSONObject("androidPlacements")
            val inter = pl?.optJSONObject("interstitial")
            return AdConfig(
                master = j.optBoolean("masterEnabled", false),
                androidEnabled = android?.optBoolean("enabled", false) ?: false,
                network = android?.optString("network", "none") ?: "none",
                production = j.optString("mode", "test") == "production",
                useTestUnits = admob?.optBoolean("useTestUnits", true) ?: true,
                childDirected = android?.optString("tagForChildDirectedTreatment", "unspecified") ?: "unspecified",
                maxRating = android?.optString("maxAdContentRating", "PG") ?: "PG",
                allowInAppWebAds = web?.optBoolean("allowInAppWebAds", false) ?: false,
                bannerEnabled = pl?.optJSONObject("banner")?.optBoolean("enabled", false) ?: false,
                interstitialEnabled = inter?.optBoolean("enabled", false) ?: false,
                interstitialMinIntervalSec = inter?.optLong("minIntervalSeconds", 180) ?: 180,
                interstitialEveryNGames = inter?.optInt("everyNGames", 3) ?: 3,
                interstitialMinAfterLaunchSec = inter?.optLong("minSecondsAfterLaunch", 60) ?: 60,
                rewardedEnabled = pl?.optJSONObject("rewarded")?.optBoolean("enabled", false) ?: false,
                bannerUnit = admob?.optString("bannerUnitId", "") ?: "",
                interstitialUnit = admob?.optString("interstitialUnitId", "") ?: "",
                rewardedUnit = admob?.optString("rewardedUnitId", "") ?: "",
            )
        }
    }
}
