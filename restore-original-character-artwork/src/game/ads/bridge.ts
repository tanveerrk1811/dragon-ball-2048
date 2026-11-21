/**
 * Web side of the Android JavaScript bridge. Native ad SDKs (AdMob) live in the Android project;
 * browser JS can only ask the native layer to do things at natural breaks. No secrets cross this bridge.
 */
export interface NativeCaps {
  banner: boolean;
  interstitial: boolean;
  rewarded: boolean;
  rewardedReady: boolean;
  privacyOptions: boolean;
}

interface AndroidBridgeApi {
  getCapabilities(): string;
  naturalBreak(kind: string): void;
  requestRewarded(kind: string): void;
  openPrivacyOptions(): void;
  trackEvent(name: string, json: string): void;
}

declare global {
  interface Window {
    AndroidBridge?: AndroidBridgeApi;
    __onNativeAd?: (msg: Record<string, unknown>) => void;
    __nativeBack?: () => boolean;
  }
}

type Listener = (msg: Record<string, unknown>) => void;
const listeners: Listener[] = [];

if (typeof window !== 'undefined') {
  window.__onNativeAd = (msg) => listeners.forEach((l) => l(msg));
}

export const nativeBridge = {
  get available(): boolean {
    return typeof window !== 'undefined' && !!window.AndroidBridge;
  },
  capabilities(): NativeCaps {
    const none: NativeCaps = { banner: false, interstitial: false, rewarded: false, rewardedReady: false, privacyOptions: false };
    try {
      if (!window.AndroidBridge) return none;
      return { ...none, ...(JSON.parse(window.AndroidBridge.getCapabilities()) as Partial<NativeCaps>) };
    } catch {
      return none;
    }
  },
  naturalBreak(kind: string) {
    try { window.AndroidBridge?.naturalBreak(kind); } catch { /* never break the game */ }
  },
  requestRewarded(kind: string) {
    try { window.AndroidBridge?.requestRewarded(kind); } catch { /* ignore */ }
  },
  openPrivacyOptions() {
    try { window.AndroidBridge?.openPrivacyOptions(); } catch { /* ignore */ }
  },
  trackEvent(name: string, params: Record<string, unknown>) {
    try { window.AndroidBridge?.trackEvent(name, JSON.stringify(params)); } catch { /* ignore */ }
  },
  onMessage(l: Listener) {
    listeners.push(l);
    return () => { const i = listeners.indexOf(l); if (i >= 0) listeners.splice(i, 1); };
  },
};
