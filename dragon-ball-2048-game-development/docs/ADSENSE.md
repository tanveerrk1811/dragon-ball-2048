# Google AdSense (website)

## Prerequisites
1. A Google AdSense account and your **own domain** added under *Sites*. The site must be approved; AdSense does not serve (or pay for) ads on unapproved sites, `localhost`, or the Android app origin.
2. `ads.txt` at the site root: copy the line from AdSense (*Sites → ads.txt*) into `public/ads.txt`.
3. For visitors in the EEA, UK and Switzerland, a **Google-certified CMP** is required (AdSense → Privacy & messaging, or another certified CMP). The built-in consent banner is only a simple gate and is not certified.
4. Content must be policy-compliant. Copyrighted/unlicensed franchise content can lead to rejection or account action — see COMPLIANCE.md.

## Find your IDs
* **Publisher ID**: AdSense → Account → Account information → `pub-0000000000000000`. In the config it is `ca-pub-0000000000000000`.
* **Ad unit (slot) ID**: AdSense → Ads → By ad unit → *Display ads* → create a responsive unit → in the code snippet copy the `data-ad-slot="1234567890"` value.

## Configure
Open `/admin/` (or edit `public/ad-config.json`):

```json
{
  "mode": "production",
  "masterEnabled": true,
  "web": { "enabled": true, "requireConsent": true },
  "networks": { "adsense": { "publisherId": "ca-pub-0000000000000000", "testMode": false } },
  "placements": {
    "topBanner": {
      "enabled": true, "network": "adsense", "devices": ["mobile","tablet","desktop"],
      "adsense": { "slotId": "1234567890", "format": "auto", "minHeight": 60 }
    }
  }
}
```
Upload the changed `ad-config.json` to the site root. Invalid IDs are rejected by validation and the placement stays off.

## How it works
`src/game/ads/adsense-adapter.ts` loads `adsbygoogle.js?client=ca-pub-…` once (only after consent when required and only if a placement uses AdSense), inserts `<ins class="adsbygoogle" data-ad-client data-ad-slot data-ad-format="auto" data-full-width-responsive="true">` and calls `(adsbygoogle = window.adsbygoogle || []).push({})`. Status is read from `data-ad-status`; `unfilled`, errors and a 10 s no-response timeout collapse the slot and log to the error log. Ads are not refreshed.

## Testing
* Set `networks.adsense.testMode: true` to add `data-adtest="on"` (non-billable test requests).
* **Never click your own live ads** and never ask others to. Use Google's tools (e.g. the AdSense policy center, Publisher Console) to verify.
* Invalid code / blocked script / offline → the game keeps working and the slot disappears.

## Android WebView note
If you ever show AdSense inside the app's WebView (`web.allowInAppWebAds: true`), Google requires the **WebView API for Ads** (`MobileAds.registerWebView`) — the Android project does this when the flag is on. The recommended setup is native AdMob instead, because the in-app origin is not an approved AdSense site.
