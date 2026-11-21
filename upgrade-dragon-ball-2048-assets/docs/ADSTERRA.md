# Adsterra (website only)

## Supported here
* **Banner** (iframe `atOptions` + `invoke.js`) and **Native Banner** (`invoke.js` + container div).
* Each ad runs in a **sandboxed iframe** (`sandbox="allow-scripts allow-popups …"`), so its scripts cannot read/cover the game page. Optional `allowSameOrigin` exists only if Adsterra needs it for a format.

## Intentionally NOT supported
* **Popunder**, **Social Bar**, push/redirect formats: they overlay or hijack the page and conflict with the "never over controls / never interrupt play / no accidental clicks" rules. They are not enabled and the adapter cannot enable them.
* **Android**: Adsterra publishes **no official Android SDK** for in-app inventory (their own documentation says in-app traffic is not part of their inventory). Nothing was invented. Use AdMob in the app.

## Setup
1. Create a publisher account and add your domain; wait for approval.
2. Create a placement in *Websites → Add Code*:
   * **Banner**: pick size (e.g. 320×50 mobile, 728×90 desktop). You get code like
     ```html
     <script>atOptions = {'key':'0123456789abcdef0123456789abcdef','format':'iframe','height':90,'width':728,'params':{}};</script>
     <script src="https://example-adsterra-domain.com/0123456789abcdef0123456789abcdef/invoke.js"></script>
     ```
   * **Native Banner**:
     ```html
     <script async data-cfasync="false" src="https://example-adsterra-domain.com/abcdef…/invoke.js"></script>
     <div id="container-abcdef…"></div>
     ```
3. Copy the values into the placement (dashboard or JSON). **Use the exact URL from your own code** — Adsterra domains vary.

```json
"bottomBanner": {
  "enabled": true, "network": "adsterra", "devices": ["desktop","tablet"],
  "adsterra": { "format": "banner", "key": "0123456789abcdef0123456789abcdef",
                "scriptSrc": "https://…/0123456789abcdef0123456789abcdef/invoke.js",
                "width": 728, "height": 90, "allowSameOrigin": false }
}
```
Native: `"format": "native"`, set `containerId` (`container-…`) and a height (e.g. 250). Use **device visibility** so a 728×90 unit never loads on a phone.

## Status & testing
The adapter can tell that the iframe loaded, **not** whether an ad was filled — check Adsterra statistics. A load error or 15 s timeout collapses the slot. Do not click live ads. Add the Adsterra lines to `ads.txt` if your dashboard provides them.
