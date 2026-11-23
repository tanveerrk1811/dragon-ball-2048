/**
 * Centralized advertising configuration (single source of truth).
 * The same JSON file (public/ad-config.json) is read by the website AND bundled into the Android app.
 * SAFE DEFAULTS: everything is disabled until the owner supplies valid IDs and switches it on.
 * Only PUBLIC identifiers belong here (publisher IDs, slot IDs, placement keys). Never put secrets in this file.
 */
export type Network = 'adsense' | 'adsterra' | 'custom' | 'none';
export type Device = 'mobile' | 'tablet' | 'desktop';
export type PlacementName = 'topBanner' | 'bottomBanner' | 'gameOver' | 'interstitial';

export interface PlacementCfg {
  enabled: boolean;
  network: Network;
  devices: Device[];
  adsense: { slotId: string; format: string; minHeight: number };
  adsterra: {
    format: 'banner' | 'native';
    key: string;
    scriptSrc: string;
    containerId: string;
    width: number;
    height: number;
    allowSameOrigin: boolean;
  };
  custom: { imageUrl: string; href: string; alt: string };
}

export interface InterstitialCfg extends PlacementCfg {
  /** Minimum seconds between two web interstitials. */
  minIntervalSeconds: number;
  /** Show only after this many finished games since the last interstitial. */
  everyNGames: number;
  /** Never show before the page has been open this many seconds. */
  minSecondsAfterLoad: number;
}

export interface AdConfig {
  version: number;
  mode: 'test' | 'production';
  masterEnabled: boolean;
  web: { enabled: boolean; requireConsent: boolean; allowInAppWebAds: boolean };
  android: {
    enabled: boolean;
    network: 'admob' | 'none';
    tagForChildDirectedTreatment: 'unspecified' | 'true' | 'false';
    maxAdContentRating: 'G' | 'PG' | 'T' | 'MA';
  };
  networks: {
    adsense: { publisherId: string; testMode: boolean };
    adsterra: { notes: string };
    admob: {
      appId: string;
      useTestUnits: boolean;
      bannerUnitId: string;
      interstitialUnitId: string;
      rewardedUnitId: string;
    };
  };
  placements: {
    topBanner: PlacementCfg;
    bottomBanner: PlacementCfg;
    gameOver: PlacementCfg;
    interstitial: InterstitialCfg;
  };
  androidPlacements: {
    banner: { enabled: boolean };
    interstitial: { enabled: boolean; minIntervalSeconds: number; everyNGames: number; minSecondsAfterLaunch: number };
    rewarded: { enabled: boolean; reward: 'undo' };
  };
  analytics: { enabled: boolean; measurementId: string };
}

const placement = (devices: Device[] = ['mobile', 'tablet', 'desktop']): PlacementCfg => ({
  enabled: false,
  network: 'none',
  devices,
  adsense: { slotId: '', format: 'auto', minHeight: 60 },
  adsterra: { format: 'banner', key: '', scriptSrc: '', containerId: '', width: 320, height: 50, allowSameOrigin: false },
  custom: { imageUrl: '', href: '', alt: 'Sponsored' },
});

export function defaultConfig(): AdConfig {
  return {
    version: 1,
    mode: 'test',
    masterEnabled: false,
    web: { enabled: false, requireConsent: true, allowInAppWebAds: false },
    android: { enabled: false, network: 'admob', tagForChildDirectedTreatment: 'unspecified', maxAdContentRating: 'PG' },
    networks: {
      adsense: { publisherId: '', testMode: false },
      adsterra: { notes: 'Adsterra publishes no official Android SDK; use it for the website only.' },
      admob: {
        appId: '',
        useTestUnits: true,
        bannerUnitId: '',
        interstitialUnitId: '',
        rewardedUnitId: '',
      },
    },
    placements: {
      topBanner: placement(),
      bottomBanner: placement(),
      gameOver: placement(),
      interstitial: { ...placement(['mobile', 'tablet', 'desktop']), minIntervalSeconds: 180, everyNGames: 3, minSecondsAfterLoad: 60 },
    },
    androidPlacements: {
      banner: { enabled: false },
      interstitial: { enabled: false, minIntervalSeconds: 180, everyNGames: 3, minSecondsAfterLaunch: 60 },
      rewarded: { enabled: false, reward: 'undo' },
    },
    analytics: { enabled: false, measurementId: '' },
  };
}

type Dict = Record<string, unknown>;
const isObj = (v: unknown): v is Dict => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Deep-merges raw JSON onto defaults. Unknown keys are dropped; wrong-typed values are ignored. */
function mergeInto<T>(base: T, raw: unknown): T {
  if (!isObj(base) || !isObj(raw)) return base;
  const out: Dict = {};
  for (const key of Object.keys(base)) {
    const b = (base as Dict)[key];
    const r = raw[key];
    if (r === undefined) out[key] = b;
    else if (isObj(b)) out[key] = mergeInto(b, r);
    else if (Array.isArray(b)) out[key] = Array.isArray(r) ? r.filter((x) => typeof x === 'string') : b;
    else out[key] = typeof r === typeof b ? r : b;
  }
  return out as T;
}

export function mergeConfig(raw: unknown): AdConfig {
  return mergeInto(defaultConfig(), raw);
}

export interface Issue { level: 'error' | 'warn'; path: string; message: string }

const RE = {
  pub: /^ca-pub-\d{16}$/,
  slot: /^\d{6,15}$/,
  adsterraKey: /^[a-f0-9]{32}$/i,
  id: /^[\w-]{3,80}$/,
  admobApp: /^ca-app-pub-\d{16}~\d{10}$/,
  admobUnit: /^ca-app-pub-\d{16}\/\d{10}$/,
};

export function isHttps(u: string): boolean {
  try {
    const url = new URL(u.startsWith('//') ? 'https:' + u : u);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validatePlacement(cfg: AdConfig, name: PlacementName): Issue[] {
  const p = cfg.placements[name];
  const issues: Issue[] = [];
  const path = `placements.${name}`;
  if (!p.enabled) return issues;
  if (p.network === 'none') issues.push({ level: 'error', path, message: 'Placement is enabled but no network is selected.' });
  if (p.network === 'adsense') {
    if (!RE.pub.test(cfg.networks.adsense.publisherId)) issues.push({ level: 'error', path: 'networks.adsense.publisherId', message: 'AdSense publisher ID must look like ca-pub-0000000000000000.' });
    if (!RE.slot.test(p.adsense.slotId)) issues.push({ level: 'error', path: `${path}.adsense.slotId`, message: 'AdSense ad unit (slot) ID must be 6–15 digits.' });
  }
  if (p.network === 'adsterra') {
    const a = p.adsterra;
    if (!isHttps(a.scriptSrc)) issues.push({ level: 'error', path: `${path}.adsterra.scriptSrc`, message: 'Adsterra script URL must be a valid https:// URL copied from your Adsterra ad code.' });
    if (a.format === 'banner') {
      if (!RE.adsterraKey.test(a.key)) issues.push({ level: 'error', path: `${path}.adsterra.key`, message: 'Adsterra banner key must be the 32-character hex key from your ad code.' });
      if (!(a.width > 0 && a.height > 0)) issues.push({ level: 'error', path: `${path}.adsterra.width`, message: 'Banner width/height must be positive numbers.' });
    } else if (!RE.id.test(a.containerId)) {
      issues.push({ level: 'error', path: `${path}.adsterra.containerId`, message: 'Native banner needs the container element id from your ad code (e.g. container-xxxxxxxx).' });
    }
  }
  if (p.network === 'custom') {
    if (!isHttps(p.custom.imageUrl)) issues.push({ level: 'error', path: `${path}.custom.imageUrl`, message: 'House ad image must be an https:// URL.' });
    if (!isHttps(p.custom.href)) issues.push({ level: 'error', path: `${path}.custom.href`, message: 'House ad link must be an https:// URL.' });
  }
  if (p.devices.length === 0) issues.push({ level: 'warn', path: `${path}.devices`, message: 'No devices selected: placement will never show.' });
  return issues;
}

export function validateConfig(cfg: AdConfig): Issue[] {
  const issues: Issue[] = [];
  (['topBanner', 'bottomBanner', 'gameOver', 'interstitial'] as PlacementName[]).forEach((n) => issues.push(...validatePlacement(cfg, n)));
  const m = cfg.networks.admob;
  if (cfg.android.enabled && cfg.android.network === 'admob') {
    if (cfg.mode === 'production' && !m.useTestUnits) {
      if (!RE.admobApp.test(m.appId)) issues.push({ level: 'error', path: 'networks.admob.appId', message: 'AdMob app ID must look like ca-app-pub-0000000000000000~0000000000.' });
      (['bannerUnitId', 'interstitialUnitId', 'rewardedUnitId'] as const).forEach((k) => {
        const enabled = (k === 'bannerUnitId' && cfg.androidPlacements.banner.enabled) || (k === 'interstitialUnitId' && cfg.androidPlacements.interstitial.enabled) || (k === 'rewardedUnitId' && cfg.androidPlacements.rewarded.enabled);
        if (enabled && !RE.admobUnit.test(m[k])) issues.push({ level: 'error', path: `networks.admob.${k}`, message: 'AdMob ad unit ID must look like ca-app-pub-0000000000000000/0000000000.' });
      });
    }
    if (m.useTestUnits) issues.push({ level: 'warn', path: 'networks.admob.useTestUnits', message: 'Android is using official Google TEST ad units (no revenue).' });
  }
  if (cfg.mode === 'test' && cfg.masterEnabled) issues.push({ level: 'warn', path: 'mode', message: 'Mode is "test": switch to "production" only after approvals and valid IDs.' });
  if (cfg.networks.adsense.testMode) issues.push({ level: 'warn', path: 'networks.adsense.testMode', message: 'AdSense data-adtest is ON: ads are not billed and may not render for unapproved sites.' });
  return issues;
}

export function deviceFor(width: number): Device {
  return width < 768 ? 'mobile' : width < 1100 ? 'tablet' : 'desktop';
}

/** Load config: bundled ad-config.json (fresh), optionally overridden by a dashboard preview when ?adpreview=1. */
export async function loadConfig(url = 'ad-config.json'): Promise<AdConfig> {
  let raw: unknown = null;
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (res.ok) raw = await res.json();
  } catch {
    /* offline or missing: stay on safe defaults */
  }
  try {
    if (new URLSearchParams(location.search).get('adpreview') === '1') {
      const p = window.localStorage.getItem('db2048.adconfig.preview');
      if (p) raw = JSON.parse(p);
    }
  } catch { /* ignore */ }
  return mergeConfig(raw);
}
