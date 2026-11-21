# Policy, privacy and intellectual-property guide

*This is a practical checklist, not legal advice. Policies change — always read the current versions.*

## 1. Dragon Ball intellectual-property risk (read first)
Dragon Ball characters, names, logos, music and artwork are protected by copyright and trademarks (Toei Animation, Shueisha, Bird Studio and licensees). An **unofficial fan game that is monetized with ads** carries real risk:
* Takedown notices (DMCA/store/hosting), app removal from Google Play, domain/hosting suspension.
* Ad networks may reject or ban the site/app: Google's *Copyright* and *Counterfeit/ intellectual property* policies and Adsterra's publisher rules prohibit content you have no right to monetize.
* Commercial use is the aggravating factor; "fan-made" or "free" labels do not grant rights.

What this project does to lower (not remove) the risk: all portraits are **original stylised art generated in code**, no official art, logos, music or fonts are used, clear "unofficial / not affiliated" notices appear in the footer, About, Terms and Privacy. The title still contains the trademark "Dragon Ball".

**Options for a safe business**: obtain a licence; or rebrand with original characters and names (the character table is in `src/game/characters.ts` and `art.ts` — easy to replace); or keep the project non-commercial (ads off).

No approval or earnings are promised by anyone: AdSense, Adsterra, AdMob and Google Play decide independently.

## 2. Privacy
* Pages: `privacy.html`, `terms.html` (templates — fill placeholders and have them reviewed).
* Local data: best score, saved board, highest unlock, sound, consent (localStorage). Nothing is sent to a server by the game.
* Web consent: ads and analytics load only after the visitor accepts (`web.requireConsent: true`). "Privacy choices" in the footer reopens the choice. **EEA/UK/CH + AdSense need a Google-certified CMP**; the built-in banner is a gate, not a certified CMP. If you use a certified CMP, configure it and set `requireConsent` per its guidance.
* Android: UMP SDK shows the AdMob consent message when required; `openPrivacyOptions` appears when mandated.
* Disclose in the privacy policy: AdSense/AdMob (cookies, ad ID), Adsterra, GA4 if enabled. In Play Console complete **Data safety** (Advertising ID, approximate location from ad SDK, etc.) and the **Ads** declaration; declare the Advertising ID permission use (`play-services-ads` adds it).
* US states: provide opt-out/limited-data-processing mechanisms if you meet thresholds (AdMob Privacy & messaging supports this).

## 3. Children
The game may appeal to minors. Decide whether it is *child-directed* (COPPA, Google Families policy, GDPR-K). If yes: set `android.tagForChildDirectedTreatment: "true"`, limit ad content (`maxAdContentRating: "G"`), use only Families-certified ad sources, disable analytics, and for AdSense use child-directed treatment settings. Adsterra is not intended for child-directed content — do not enable it if the site is child-directed.

## 4. Ad-policy compliance built into the code
* Ads are labelled "Advertisement", sit in dedicated areas and never overlay tiles, controls, scores or buttons.
* No popunders, social bars or sticky overlays; no ad refresh; no auto-clicks or simulated impressions; no ad-click encouragement.
* Interstitial-like break appears only after game over, rate-limited, with an always-visible "Start new game" button.
* Rewarded ads are opt-in with an explanation; basic play never requires an ad.
* Ads failing to load never block the game; slots collapse.
* Do not click your own live ads; use test modes.

## 5. Approvals / verifications still required
AdSense site approval + `ads.txt` + certified CMP · Adsterra site approval · AdMob app + units + consent message · Google Play review (content, ads, data safety, target audience) · legal review of IP and policies.
