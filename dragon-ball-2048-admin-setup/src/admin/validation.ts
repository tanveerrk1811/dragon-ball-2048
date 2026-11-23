import { validateConfig, type AdConfig, type Issue, type PlacementName } from '../game/ads/ad-config';

export const PLACEMENT_NAMES: PlacementName[] = ['topBanner', 'bottomBanner', 'gameOver', 'interstitial'];

export const PLACEMENT_LABELS: Record<PlacementName, { title: string; where: string }> = {
  topBanner: { title: 'Top banner', where: 'Above the game, outside the board area' },
  bottomBanner: { title: 'Bottom banner', where: 'Below the game and controls' },
  gameOver: { title: 'Game-over panel', where: 'Inside the game-over panel, below the board' },
  interstitial: { title: 'Between sessions', where: 'Optional break dialog shown after finished games' },
};

const GA = /^G-[A-Z0-9]{4,}$/;
const SECRET_LIKE = /(-----BEGIN [A-Z ]*PRIVATE KEY-----|\bAIza[0-9A-Za-z_-]{20,}|\bsk_(live|test)_|\bsecret\b|\bpassword\b|\bprivate[_ -]?key\b)/i;

function collectStrings(v: unknown, path: string, out: { path: string; value: string }[]) {
  if (typeof v === 'string') out.push({ path, value: v });
  else if (Array.isArray(v)) v.forEach((x, i) => collectStrings(x, `${path}[${i}]`, out));
  else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => collectStrings(x, path ? `${path}.${k}` : k, out));
}

/** True when saving/exporting this configuration would switch real advertising on for visitors. */
export function goLiveRequested(cfg: AdConfig): boolean {
  const web = cfg.masterEnabled && cfg.web.enabled && PLACEMENT_NAMES.some((n) => cfg.placements[n].enabled && cfg.placements[n].network !== 'none');
  const android = cfg.masterEnabled && cfg.android.enabled && (cfg.androidPlacements.banner.enabled || cfg.androidPlacements.interstitial.enabled || cfg.androidPlacements.rewarded.enabled);
  return web || android;
}

/** Everything the game's own validator checks, plus dashboard-level safety checks. */
export function validateDraft(cfg: AdConfig): Issue[] {
  const issues: Issue[] = [...validateConfig(cfg)];
  const e = (path: string, message: string) => issues.push({ level: 'error', path, message });
  const w = (path: string, message: string) => issues.push({ level: 'warn', path, message });

  if (cfg.networks.adsense.publisherId && !/^ca-pub-\d{16}$/.test(cfg.networks.adsense.publisherId)) {
    e('networks.adsense.publisherId', 'AdSense publisher ID must look like ca-pub-0000000000000000.');
  }
  if (cfg.analytics.enabled && !GA.test(cfg.analytics.measurementId)) {
    e('analytics.measurementId', 'GA4 measurement ID must look like G-XXXXXXXXXX.');
  }
  if (cfg.analytics.measurementId && !GA.test(cfg.analytics.measurementId)) {
    e('analytics.measurementId', 'GA4 measurement ID must look like G-XXXXXXXXXX.');
  }

  const i = cfg.placements.interstitial;
  if (!(Number.isInteger(i.everyNGames) && i.everyNGames >= 1)) e('placements.interstitial.everyNGames', 'Must be a whole number of at least 1.');
  if (!(i.minIntervalSeconds >= 0)) e('placements.interstitial.minIntervalSeconds', 'Must be 0 or more seconds.');
  if (i.enabled && i.minIntervalSeconds < 120) w('placements.interstitial.minIntervalSeconds', 'Under 120 s between break dialogs is likely to annoy players and may breach ad-network policies.');
  if (i.enabled && i.minSecondsAfterLoad < 30) w('placements.interstitial.minSecondsAfterLoad', 'Showing a break dialog within 30 s of page load is not recommended.');

  PLACEMENT_NAMES.forEach((n) => {
    const p = cfg.placements[n];
    if (!(p.adsense.minHeight >= 0 && p.adsense.minHeight <= 600)) e(`placements.${n}.adsense.minHeight`, 'Minimum height must be between 0 and 600 px.');
    if (p.adsterra.allowSameOrigin) w(`placements.${n}.adsterra.allowSameOrigin`, 'allow-same-origin lets third-party ad code access this site\u2019s storage. Keep it off unless Adsterra requires it.');
    if (p.enabled && p.network === 'adsense' && cfg.networks.adsense.testMode) w(`placements.${n}`, 'AdSense test mode is on for this placement.');
  });

  if (cfg.masterEnabled && !PLACEMENT_NAMES.some((n) => cfg.placements[n].enabled)) {
    w('masterEnabled', 'Master advertising is ON but no placement is enabled, so nothing will show.');
  }
  if (cfg.mode === 'production' && !cfg.masterEnabled) {
    w('mode', 'Mode is "production" but master advertising is OFF: no ads will run.');
  }
  if (cfg.web.enabled && !cfg.web.requireConsent) {
    w('web.requireConsent', 'Consent is not required before web ads load. Check the privacy rules that apply to your visitors (GDPR/ePrivacy, etc.).');
  }

  // This document is publicly readable on the internet — block anything that looks like a credential.
  const strings: { path: string; value: string }[] = [];
  collectStrings(cfg, '', strings);
  strings.forEach(({ path, value }) => {
    if (SECRET_LIKE.test(value)) e(path, 'This value looks like a secret. Only PUBLIC identifiers may be stored here.');
  });

  // de-duplicate identical (path,message) pairs
  const seen = new Set<string>();
  return issues.filter((x) => {
    const k = `${x.level}|${x.path}|${x.message}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export const errorsOf = (issues: Issue[]) => issues.filter((x) => x.level === 'error');
export const warningsOf = (issues: Issue[]) => issues.filter((x) => x.level === 'warn');
