package com.example.dragonball2048

import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.res.Configuration
import android.net.ConnectivityManager
import android.net.Network
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.webkit.CookieManager
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.FrameLayout
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.webkit.WebViewAssetLoader
import com.google.android.gms.ads.MobileAds
import org.json.JSONObject

/**
 * Hosts the bundled HTML/CSS/JS game (assets/www) in a locked-down WebView, plus native AdMob placements.
 * The game is fully offline: it is served from app assets via WebViewAssetLoader (no file:// access).
 */
class MainActivity : AppCompatActivity(), NativeAds.Listener {

    private lateinit var webView: WebView
    private lateinit var errorView: View
    private lateinit var ads: NativeAds
    private lateinit var config: AdConfig
    private var connectivity: ConnectivityManager? = null
    private var networkCallback: ConnectivityManager.NetworkCallback? = null

    private val assetLoader by lazy {
        WebViewAssetLoader.Builder()
            .setDomain(HOST)
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        webView = findViewById(R.id.webView)
        errorView = findViewById(R.id.errorView)
        val bannerHost = findViewById<FrameLayout>(R.id.bannerHost)

        config = AdConfig.load(this)
        ads = NativeAds(this, bannerHost, config, this)

        webView.settings.apply {
            javaScriptEnabled = true            // required by the game
            domStorageEnabled = true            // localStorage: best score, saved board
            allowFileAccess = false
            allowContentAccess = false
            setSupportMultipleWindows(false)
            mediaPlaybackRequiresUserGesture = true
            mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW
        }
        webView.setBackgroundColor(0xFF07070B.toInt())
        // Exposed only to our own origin (see shouldOverrideUrlLoading).
        webView.addJavascriptInterface(GameBridge(this, ads), "AndroidBridge")
        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                assetLoader.shouldInterceptRequest(request.url)

            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val uri = request.url
                if (uri.host == HOST) return false
                openExternally(uri)
                return true
            }

            override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                if (request.isForMainFrame) errorView.visibility = View.VISIBLE
            }

            override fun onPageFinished(view: WebView, url: String) {
                errorView.visibility = View.GONE
                pushCapabilities()
            }
        }

        // WebView API for Ads — only relevant if the owner explicitly allows AdSense inside the WebView.
        // The recommended setup (allowInAppWebAds=false) uses native AdMob only; see docs/ADMOB.md.
        findViewById<Button>(R.id.retryButton).setOnClickListener { webView.loadUrl(START_URL) }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (errorView.visibility == View.VISIBLE) return finishBack()
                // Let the game close an open dialog first; otherwise leave the app.
                webView.evaluateJavascript("(window.__nativeBack&&window.__nativeBack())===true") { r ->
                    if (r != "true") finishBack()
                }
            }
            private fun finishBack() { isEnabled = false; onBackPressedDispatcher.onBackPressed() }
        })

        registerNetworkCallback()
        hideSystemBars()
        if (savedInstanceState == null) webView.loadUrl(START_URL) else webView.restoreState(savedInstanceState)
        ads.start()
    }

    // ---- NativeAds.Listener -------------------------------------------------------------
    override fun onSdkReady() {
        if (config.allowInAppWebAds) MobileAds.registerWebView(webView)
    }

    override fun onCapabilitiesChanged() = pushCapabilities()

    override fun onRewardResult(status: String, kind: String) {
        val msg = JSONObject().put("type", "rewarded").put("status", status).put("kind", kind)
        postToWeb(msg)
    }

    private fun pushCapabilities() {
        val caps = JSONObject(ads.capabilitiesJson()).put("type", "capabilities")
        postToWeb(caps)
    }

    private fun postToWeb(msg: JSONObject) {
        // JSON is a valid JS object literal; the content is generated natively, never from web input.
        runOnUiThread { webView.evaluateJavascript("window.__onNativeAd&&window.__onNativeAd($msg)", null) }
    }

    // ---- helpers ------------------------------------------------------------------------
    private fun openExternally(uri: Uri) {
        if (uri.scheme != "https" && uri.scheme != "http" && uri.scheme != "mailto") return
        try { startActivity(Intent(Intent.ACTION_VIEW, uri)) } catch (_: ActivityNotFoundException) { /* no handler */ }
    }

    private fun hideSystemBars() {
        WindowCompat.setDecorFitsSystemWindows(window, true)
        WindowInsetsControllerCompat(window, window.decorView).apply {
            systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            hide(WindowInsetsCompat.Type.systemBars())
        }
    }

    private fun registerNetworkCallback() {
        val cm = getSystemService(CONNECTIVITY_SERVICE) as? ConnectivityManager ?: return
        connectivity = cm
        val cb = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) = ads.setOnline(true)
            override fun onLost(network: Network) = ads.setOnline(false)
        }
        networkCallback = cb
        try { cm.registerDefaultNetworkCallback(cb) } catch (_: Exception) { /* optional */ }
    }

    // ---- lifecycle ----------------------------------------------------------------------
    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) hideSystemBars()
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        ads.onConfigurationChanged()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    override fun onPause() {
        webView.onPause()
        ads.pause()
        CookieManager.getInstance().flush()
        super.onPause()
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
        ads.resume()
    }

    override fun onDestroy() {
        networkCallback?.let { try { connectivity?.unregisterNetworkCallback(it) } catch (_: Exception) {} }
        ads.destroy()
        webView.removeJavascriptInterface("AndroidBridge")
        (webView.parent as? android.view.ViewGroup)?.removeView(webView)
        webView.destroy()
        super.onDestroy()
    }

    companion object {
        const val HOST = "appassets.androidplatform.net"
        const val START_URL = "https://$HOST/assets/www/index.html"
    }
}
