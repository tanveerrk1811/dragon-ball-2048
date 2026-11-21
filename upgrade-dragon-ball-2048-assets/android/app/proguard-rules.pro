# Keep the JavaScript bridge methods called from the web game.
-keepclassmembers class com.example.dragonball2048.GameBridge {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface
