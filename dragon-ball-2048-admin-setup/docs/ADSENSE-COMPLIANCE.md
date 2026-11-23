# Dragon Ball 2048 — AdSense compliance notes (owner: Mohammad Kabir Shaikh)

## Pages / routes (rendered by the app, served by `public/_redirects` on Netlify)
| Route | Page |
|---|---|
| `/about` | About Us |
| `/privacy-policy` | Privacy Policy |
| `/terms-and-conditions` | Terms & Conditions |
| `/disclaimer` | Disclaimer |
| `/cookie-policy` | Cookie Policy (with consent controls) |
| `/dmca` | Copyright / DMCA |
| `/contact` | Contact Us |
| anything else | "Page not found" screen with a real HTTP 404 |

Old `/privacy.html` and `/terms.html` URLs 301-redirect to the new pages.

## 1. Set your contact email (required)
Edit `src/site/config.ts` -> `contactEmail: 'you@example.com'`. Every page updates automatically and the
"owner setup" notice on /contact disappears. Also review `lastUpdated` when you change wording.

## 2. Turning ads on (all in `public/ad-config.json`, nothing is enabled by default)
* `masterEnabled: true`, `web.enabled: true`
* `networks.adsense.publisherId`: your real `ca-pub-XXXXXXXXXXXXXXXX`
* per placement: `enabled: true`, `network: "adsense"`, `adsense.slotId`: your real ad unit ID
* The AdSense script is injected **once**, lazily, by `src/game/ads/adsense-adapter.ts` (guarded by a single
  shared promise). **Do not also paste the AdSense `<script>` snippet into `index.html`** — that would load
  `adsbygoogle.js` twice, which Google warns against.

## 3. AdSense site verification
AdSense lets you verify ownership with the **ads.txt** file or the **meta tag** method. Use one of those
(put the meta tag in `<head>` of `index.html`) instead of the script snippet, to avoid a duplicate script.
Your publisher ID is deliberately not in this repo: it must be yours.

## 4. ads.txt
`public/ads.txt` is served at `/ads.txt`. After approval replace the commented template with the exact line
AdSense shows you (`google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0`).

## 5. Consent (EEA / UK / Switzerland)
The built-in banner (`src/game/consent.ts`) only holds ad scripts until a choice is made. It is **not** a
Google-certified CMP. Before serving ads to EEA/UK/CH visitors, create a message in AdSense ->
Privacy & messaging (Google's free certified CMP, GDPR + US state messages) and publish it. When you do,
set `web.requireConsent` to `false` in `ad-config.json` so visitors are not asked twice.

## 6. Policy risks to resolve before applying (see final report)
* Character portraits in `src/game/portraits/*.jpg` look like Dragon Ball characters in the official anime
  style. AdSense "copyrighted content" policy and the DMCA page both assume you have rights to them.
  Replace with original or properly licensed artwork before applying.
* Do not enable Adsterra pop-under/social-bar style formats alongside AdSense; the "between games" dialog
  (`interstitial`) puts an ad inside a pop-up dialog, which AdSense policies do not allow — leave it disabled.
* AdSense wants substantial original content: the About page helps; consider adding more guide text.
