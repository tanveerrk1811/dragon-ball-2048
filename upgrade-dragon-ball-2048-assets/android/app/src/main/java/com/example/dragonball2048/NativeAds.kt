package com.example.dragonball2048

import android.app.Activity
import android.os.SystemClock
import android.util.Log
import android.view.View
import android.widget.FrameLayout
import com.google.android.gms.ads.AdError
import com.google.android.gms.ads.AdListener
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.AdSize
import com.google.android.gms.ads.AdView
import com.google.android.gms.ads.FullScreenContentCallback
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.MobileAds
import com.google.android.gms.ads.RequestConfiguration
import com.google.android.gms.ads.interstitial.InterstitialAd
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback
import com.google.android.gms.ads.rewarded.RewardedAd
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback
import com.google.android.ump.ConsentInformation
import com.google.android.ump.ConsentRequestParameters
import com.google.android.ump.UserMessagingPlatform
import org.json.JSONObject
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Native Google AdMob integration (official Google Mobile Ads SDK + UMP consent SDK).
 *
 * Rules enforced here:
 *  - Nothing loads unless ad-config.json enables it (master + android + admob).
 *  - SDK initialises only after UMP says ads may be requested.
 *  - Official TEST unit ids are used unless production mode AND useTestUnits=false with valid ids.
 *  - Interstitials only at natural breaks (game over -> new game), with launch delay, interval and every-N-games caps.
 *  - Rewarded ads only when the player explicitly accepts the disclosed prompt in the web UI.
 *  - Every failure is logged and swallowed; the game never depends on an ad.
 *
 * Adsterra: there is NO official Adsterra Android SDK, so no Adsterra code exists here by design.
 */
class NativeAds(
    private val activity: Activity,
    private val bannerHost: FrameLayout,
    private val config: AdConfig,
    private val listener: Listener,
) {
    interface Listener {
        fun onCapabilitiesChanged()
        fun onRewardResult(status: String, kind: String)
        fun onSdkReady()
    }

    private val initStarted = AtomicBoolean(false)
    @Volatile private var sdkReady = false
    @Volatile private var rewarded: RewardedAd? = null
    private var interstitial: InterstitialAd? = null
    private var banner: AdView? = null
    private var consentInfo: ConsentInformation? = null
    private var online = true
    private val launchedAt = SystemClock.elapsedRealtime()
    private var lastInterstitialAt: Long? = null
    private var gamesSince = 0
    private var interstitialShowing = false
    private var rewardedShowing = false

    // ------------------------------------------------------------------ start / consent
    fun start() {
        if (!config.active) {
            Log.i(TAG, "Native ads disabled by ad-config.json")
            return
        }
        val params = ConsentRequestParameters.Builder()
            .setTagForUnderAgeOfConsent(config.childDirected == "true")
            .build()
        val info = UserMessagingPlatform.getConsentInformation(activity)
        consentInfo = info
        info.requestConsentInfoUpdate(
            activity,
            params,
            {
                UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity) { err ->
                    if (err != null) Log.w(TAG, "Consent form: ${err.message}")
                    if (info.canRequestAds()) initializeSdk()
                    listener.onCapabilitiesChanged()
                }
            },
            { err ->
                Log.w(TAG, "Consent info update failed: ${err.message}")
                if (info.canRequestAds()) initializeSdk()
            },
        )
        // Consent gathered in a previous session already allows requesting ads.
        if (info.canRequestAds()) initializeSdk()
    }

    val privacyOptionsRequired: Boolean
        get() = consentInfo?.privacyOptionsRequirementStatus ==
            ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED

    fun openPrivacyOptions() {
        UserMessagingPlatform.showPrivacyOptionsForm(activity) { err ->
            if (err != null) Log.w(TAG, "Privacy options: ${err.message}")
        }
    }

    private fun initializeSdk() {
        if (!initStarted.compareAndSet(false, true)) return
        val rc = RequestConfiguration.Builder()
            .setTagForChildDirectedTreatment(
                when (config.childDirected) {
                    "true" -> RequestConfiguration.TAG_FOR_CHILD_DIRECTED_TREATMENT_TRUE
                    "false" -> RequestConfiguration.TAG_FOR_CHILD_DIRECTED_TREATMENT_FALSE
                    else -> RequestConfiguration.TAG_FOR_CHILD_DIRECTED_TREATMENT_UNSPECIFIED
                },
            )
            .setMaxAdContentRating(
                when (config.maxRating) {
                    "G" -> RequestConfiguration.MAX_AD_CONTENT_RATING_G
                    "T" -> RequestConfiguration.MAX_AD_CONTENT_RATING_T
                    "MA" -> RequestConfiguration.MAX_AD_CONTENT_RATING_MA
                    else -> RequestConfiguration.MAX_AD_CONTENT_RATING_PG
                },
            )
            .build()
        MobileAds.setRequestConfiguration(rc)
        // Google recommends initialising off the main thread.
        Thread {
            try {
                MobileAds.initialize(activity) { status ->
                    Log.i(TAG, "Mobile Ads SDK initialised: ${status.adapterStatusMap.keys}")
                    activity.runOnUiThread { onSdkInitialised() }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Mobile Ads init failed: ${e.message}")
            }
        }.start()
    }

    private fun onSdkInitialised() {
        sdkReady = true
        listener.onSdkReady()
        loadBanner()
        loadInterstitial()
        loadRewarded()
        listener.onCapabilitiesChanged()
    }

    // ------------------------------------------------------------------ banner
    fun loadBanner() {
        if (!sdkReady || !config.bannerEnabled || !online) return
        val unit = config.bannerUnitId ?: return Unit.also { Log.w(TAG, "No valid banner unit id") }
        banner?.let { bannerHost.removeView(it); it.destroy() }
        val dm = activity.resources.displayMetrics
        val widthDp = (dm.widthPixels / dm.density).toInt()
        val view = AdView(activity).apply {
            adUnitId = unit
            setAdSize(AdSize.getCurrentOrientationAnchoredAdaptiveBannerAdSize(activity, widthDp))
            adListener = object : AdListener() {
                override fun onAdLoaded() { bannerHost.visibility = View.VISIBLE }
                override fun onAdFailedToLoad(error: LoadAdError) {
                    Log.w(TAG, "Banner failed: ${error.code} ${error.message}")
                    bannerHost.visibility = View.GONE
                }
            }
        }
        banner = view
        bannerHost.addView(view)
        view.loadAd(AdRequest.Builder().build())
    }

    // ------------------------------------------------------------------ interstitial
    private fun loadInterstitial() {
        if (!sdkReady || !config.interstitialEnabled || !online || interstitial != null) return
        val unit = config.interstitialUnitId ?: return Unit.also { Log.w(TAG, "No valid interstitial unit id") }
        InterstitialAd.load(activity, unit, AdRequest.Builder().build(), object : InterstitialAdLoadCallback() {
            override fun onAdLoaded(ad: InterstitialAd) { interstitial = ad }
            override fun onAdFailedToLoad(error: LoadAdError) {
                Log.w(TAG, "Interstitial failed: ${error.code} ${error.message}")
                interstitial = null
            }
        })
    }

    /** Called by the web game ONLY at natural breaks. Frequency caps are enforced here. */
    fun naturalBreak(kind: String) {
        if (kind != "gameOver" && kind != "victory") return
        gamesSince += 1
        if (!sdkReady || !config.interstitialEnabled || interstitialShowing || rewardedShowing) return
        val now = SystemClock.elapsedRealtime()
        if (now - launchedAt < config.interstitialMinAfterLaunchSec * 1000) return
        lastInterstitialAt?.let { if (now - it < config.interstitialMinIntervalSec * 1000) return }
        if (gamesSince < config.interstitialEveryNGames) return
        val ad = interstitial
        if (ad == null) { loadInterstitial(); return }
        ad.fullScreenContentCallback = object : FullScreenContentCallback() {
            override fun onAdDismissedFullScreenContent() {
                interstitialShowing = false
                interstitial = null
                loadInterstitial()
            }
            override fun onAdFailedToShowFullScreenContent(error: AdError) {
                Log.w(TAG, "Interstitial show failed: ${error.message}")
                interstitialShowing = false
                interstitial = null
                loadInterstitial()
            }
        }
        interstitialShowing = true
        lastInterstitialAt = now
        gamesSince = 0
        ad.show(activity)
    }

    // ------------------------------------------------------------------ rewarded (explicit player choice)
    private fun loadRewarded() {
        if (!sdkReady || !config.rewardedEnabled || !online || rewarded != null) return
        val unit = config.rewardedUnitId ?: return Unit.also { Log.w(TAG, "No valid rewarded unit id") }
        RewardedAd.load(activity, unit, AdRequest.Builder().build(), object : RewardedAdLoadCallback() {
            override fun onAdLoaded(ad: RewardedAd) { rewarded = ad; listener.onCapabilitiesChanged() }
            override fun onAdFailedToLoad(error: LoadAdError) {
                Log.w(TAG, "Rewarded failed: ${error.code} ${error.message}")
                rewarded = null
                listener.onCapabilitiesChanged()
            }
        })
    }

    fun showRewarded(kind: String) {
        val ad = rewarded
        if (kind != "undo" || ad == null || rewardedShowing || interstitialShowing) {
            listener.onRewardResult("unavailable", kind)
            loadRewarded()
            return
        }
        var earned = false
        ad.fullScreenContentCallback = object : FullScreenContentCallback() {
            override fun onAdDismissedFullScreenContent() {
                rewardedShowing = false
                rewarded = null
                // Grant the reward only after the ad closed, and only if the player actually earned it.
                listener.onRewardResult(if (earned) "rewarded" else "dismissed", kind)
                loadRewarded()
                listener.onCapabilitiesChanged()
            }
            override fun onAdFailedToShowFullScreenContent(error: AdError) {
                Log.w(TAG, "Rewarded show failed: ${error.message}")
                rewardedShowing = false
                rewarded = null
                listener.onRewardResult("failed", kind)
                loadRewarded()
            }
        }
        rewardedShowing = true
        ad.show(activity) { earned = true }
    }

    // ------------------------------------------------------------------ lifecycle / network
    fun pause() { banner?.pause() }
    fun resume() { banner?.resume() }
    fun destroy() {
        banner?.destroy()
        banner = null
        interstitial = null
        rewarded = null
    }

    fun setOnline(value: Boolean) {
        val regained = value && !online
        online = value
        if (regained) activity.runOnUiThread {
            if (banner == null) loadBanner()
            loadInterstitial()
            loadRewarded()
        }
    }

    fun onConfigurationChanged() { if (banner != null) loadBanner() } // re-size adaptive banner

    fun capabilitiesJson(): String = JSONObject()
        .put("banner", sdkReady && config.bannerEnabled)
        .put("interstitial", sdkReady && config.interstitialEnabled)
        .put("rewarded", sdkReady && config.rewardedEnabled)
        .put("rewardedReady", rewarded != null)
        .put("privacyOptions", privacyOptionsRequired)
        .toString()

    companion object { private const val TAG = "DB2048.Ads" }
}
