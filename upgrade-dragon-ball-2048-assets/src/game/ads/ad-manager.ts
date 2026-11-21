import { consent } from '../consent';
import { safeGet, safeSet } from '../storage';
import {
  defaultConfig, deviceFor, loadConfig, validateConfig, validatePlacement,
  type AdConfig, type Device, type Network, type PlacementName,
} from './ad-config';
import type { AdAdapter, SlotStatus } from './adapter-types';
import { adsenseAdapter } from './adsense-adapter';
import { adsterraAdapter } from './adsterra-adapter';
import { customAdapter } from './custom-adapter';
import { nativeBridge } from './bridge';

/**
 * Website ad orchestrator. Independent of the game engine: the game only registers slot elements and
 * reports natural breaks. One network per placement; the other network is never loaded into it.
 * No ad refresh, no simulated impressions/clicks, no ads over game UI. Failures collapse the slot silently.
 */
export interface SlotInfo { status: SlotStatus; network: Network | 'native'; detail?: string; ts: number }

interface Entry {
  name: PlacementName;
  el: HTMLElement;
  body: HTMLElement;
  lazy: boolean;
  active: boolean;
  cleanup?: () => void;
  mountedKey?: string;
}

const ADAPTERS: Partial<Record<Network, AdAdapter>> = {
  adsense: adsenseAdapter,
  adsterra: adsterraAdapter,
  custom: customAdapter,
};

export class AdManager {
  cfg: AdConfig = defaultConfig();
  ready = false;
  readonly native = nativeBridge.available;
  private slots = new Map<PlacementName, Entry>();
  private statuses: Partial<Record<PlacementName, SlotInfo>> = {};
  private loadedAt = Date.now();
  private resizeTimer = 0;
  private gamesSince = 0;
  private lastInterstitial = Number(safeGet('lastInterstitial')) || 0;
  private onResize = () => {
    window.clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(() => this.refreshAll(), 250);
  };

  async init() {
    this.cfg = await loadConfig();
    validateConfig(this.cfg).filter((i) => i.level === 'error').forEach((i) => this.logError(`${i.path}: ${i.message}`));
    window.addEventListener('resize', this.onResize);
    consent.onChange(() => this.refreshAll());
    this.ready = true;
    this.refreshAll();
  }

  dispose() {
    window.removeEventListener('resize', this.onResize);
    window.clearTimeout(this.resizeTimer);
    this.slots.forEach((e) => this.unmount(e));
  }

  /** Does the visitor still need to make a consent choice before web ads may load? */
  get needsConsent(): boolean {
    return this.webAdsPossible() && this.cfg.web.requireConsent && consent.get() === 'unset';
  }

  /** Is any website ad placement actually switched on? (drives the consent banner) */
  webAdsPossible(): boolean {
    const c = this.cfg;
    if (!c.masterEnabled || !c.web.enabled) return false;
    return (Object.keys(c.placements) as PlacementName[]).some((n) => c.placements[n].enabled && c.placements[n].network !== 'none');
  }

  register(name: PlacementName, el: HTMLElement, lazy = false) {
    const body = el.querySelector<HTMLElement>('.ad-body');
    if (!body) return;
    el.hidden = true;
    const entry: Entry = { name, el, body, lazy, active: !lazy };
    this.slots.set(name, entry);
    if (this.ready) this.evaluate(entry);
  }

  activate(name: PlacementName) {
    const e = this.slots.get(name);
    if (!e) return;
    e.active = true;
    if (this.ready) this.evaluate(e);
  }

  deactivate(name: PlacementName) {
    const e = this.slots.get(name);
    if (!e) return;
    e.active = false;
    this.unmount(e);
    e.el.hidden = true;
  }

  private refreshAll() { this.slots.forEach((e) => this.evaluate(e)); }

  private decide(name: PlacementName): { ok: boolean; status: SlotStatus; detail?: string } {
    const c = this.cfg;
    const p = c.placements[name];
    if (!c.masterEnabled) return { ok: false, status: 'disabled', detail: 'Master advertising switch is off' };
    if (!c.web.enabled) return { ok: false, status: 'disabled', detail: 'Website advertising is off' };
    if (this.native && !(c.web.allowInAppWebAds && p.network === 'adsense')) {
      return { ok: false, status: 'disabled', detail: 'Running inside the Android app: native ads are used instead' };
    }
    if (!p.enabled || p.network === 'none') return { ok: false, status: 'disabled', detail: 'Placement disabled' };
    const device: Device = deviceFor(window.innerWidth);
    if (!p.devices.includes(device)) return { ok: false, status: 'skipped-device', detail: `Not shown on ${device}` };
    const issues = validatePlacement(c, name).filter((i) => i.level === 'error');
    if (issues.length) return { ok: false, status: 'invalid-config', detail: issues[0].message };
    if (c.web.requireConsent && consent.get() !== 'granted') return { ok: false, status: 'waiting-consent', detail: 'Waiting for visitor consent' };
    return { ok: true, status: 'loading' };
  }

  private evaluate(e: Entry) {
    if (e.lazy && !e.active) return;
    const d = this.decide(e.name);
    if (!d.ok) {
      this.unmount(e);
      e.el.hidden = true;
      this.setStatus(e.name, d.status, this.cfg.placements[e.name].network, d.detail);
      return;
    }
    const p = this.cfg.placements[e.name];
    const key = `${p.network}|${deviceFor(window.innerWidth)}`;
    if (e.mountedKey === key) return; // already showing: never refresh
    this.unmount(e);
    const adapter = ADAPTERS[p.network];
    if (!adapter) return;
    e.el.hidden = false;
    e.mountedKey = key;
    const testMode = this.cfg.mode === 'test' || this.cfg.networks.adsense.testMode;
    try {
      e.cleanup = adapter.mount(e.body, p, {
        cfg: this.cfg,
        testMode: p.network === 'adsense' ? this.cfg.networks.adsense.testMode : testMode,
        report: (status, detail) => {
          this.setStatus(e.name, status, p.network, detail);
          if (status === 'unfilled' || status === 'error' || status === 'invalid-config') {
            if (detail) this.logError(`${e.name} (${p.network}): ${detail}`);
            e.el.hidden = true; // collapse: the game layout stays clean when no ad fills
          }
        },
      });
    } catch (err) {
      this.logError(`${e.name}: ${(err as Error).message}`);
      this.setStatus(e.name, 'error', p.network, (err as Error).message);
      e.el.hidden = true;
    }
  }

  private unmount(e: Entry) {
    try { e.cleanup?.(); } catch { /* ignore */ }
    e.cleanup = undefined;
    e.mountedKey = undefined;
    e.body.replaceChildren();
  }

  private setStatus(name: PlacementName, status: SlotStatus, network: Network | 'native', detail?: string) {
    this.statuses[name] = { status, network, detail, ts: Date.now() };
    safeSet('adstatus', JSON.stringify(this.statuses));
  }

  logError(message: string) {
    try {
      const list = JSON.parse(safeGet('adlog') || '[]') as { t: number; m: string }[];
      list.push({ t: Date.now(), m: message });
      safeSet('adlog', JSON.stringify(list.slice(-50)));
    } catch { /* ignore */ }
  }

  // ---- Between-session (interstitial) logic: web only; Android handles its own natively ----
  noteGameFinished() { this.gamesSince += 1; }

  shouldShowInterstitial(): boolean {
    if (!this.ready || this.native || !this.slots.has('interstitial')) return false;
    const p = this.cfg.placements.interstitial;
    if (!this.decide('interstitial').ok) return false;
    const now = Date.now();
    if (now - this.loadedAt < p.minSecondsAfterLoad * 1000) return false;
    if (now - this.lastInterstitial < p.minIntervalSeconds * 1000) return false;
    return this.gamesSince >= p.everyNGames;
  }

  markInterstitialShown() {
    this.lastInterstitial = Date.now();
    this.gamesSince = 0;
    safeSet('lastInterstitial', String(this.lastInterstitial));
  }

  slotStatus(name: PlacementName) { return this.statuses[name]; }
}
