import { consent } from './consent';
import { nativeBridge } from './ads/bridge';

/**
 * Optional analytics, fully separate from game logic. Disabled by default.
 * Website: GA4 (gtag.js) loads only when enabled in ad-config.json AND the visitor granted consent.
 * Android: events are forwarded to the native layer, which logs them (wire Firebase there if desired).
 * Ad revenue is NOT tracked here — use the official AdSense / Adsterra / AdMob dashboards.
 */
type Params = Record<string, string | number | boolean>;
type GtagFn = (...a: unknown[]) => void;

let enabled = false;
let measurementId = '';
let loaded = false;
const queue: { name: string; params: Params }[] = [];

function loadGa() {
  if (loaded || !enabled || !/^G-[A-Z0-9]{4,}$/.test(measurementId) || consent.get() !== 'granted') return;
  loaded = true;
  const w = window as unknown as { dataLayer?: unknown[]; gtag?: GtagFn };
  w.dataLayer = w.dataLayer || [];
  w.gtag = function () { (w.dataLayer as unknown[]).push(arguments); } as GtagFn;
  w.gtag('js', new Date());
  w.gtag('config', measurementId, { anonymize_ip: true });
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(s);
  queue.splice(0).forEach((q) => w.gtag!('event', q.name, q.params));
}

export const analytics = {
  init(cfg: { enabled: boolean; measurementId: string }) {
    enabled = cfg.enabled;
    measurementId = cfg.measurementId;
    consent.onChange(() => loadGa());
    loadGa();
  },
  track(name: string, params: Params = {}) {
    if (nativeBridge.available) nativeBridge.trackEvent(name, params);
    if (!enabled) return;
    const w = window as unknown as { gtag?: GtagFn };
    if (loaded && w.gtag) w.gtag('event', name, params);
    else if (consent.get() === 'granted') queue.push({ name, params });
  },
};
