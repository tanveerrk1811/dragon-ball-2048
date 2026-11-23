import { nativeBridge, type NativeCaps } from './bridge';

/**
 * "AdMob adapter" for the browser game. Google Mobile Ads is a NATIVE SDK: it cannot run in browser JS.
 * Inside the Android app this adapter only (a) tells the native layer about natural breaks and
 * (b) requests the optional rewarded ad. The native code (android/.../NativeAds.kt) owns SDK init,
 * consent (UMP), frequency capping, loading and showing. On the plain website this adapter is inert.
 */
export const admobAdapter = {
  get available() { return nativeBridge.available; },
  capabilities(): NativeCaps { return nativeBridge.capabilities(); },
  /** Call only at natural breaks (game over -> new game). Native decides whether an interstitial is shown. */
  naturalBreak(kind: 'gameOver' | 'victory') { nativeBridge.naturalBreak(kind); },
  /** Explicit, player-initiated rewarded request. Result arrives via onResult. */
  requestRewarded(kind: 'undo') { nativeBridge.requestRewarded(kind); },
  openPrivacyOptions() { nativeBridge.openPrivacyOptions(); },
  onResult(cb: (r: { status: string; kind?: string }) => void) {
    return nativeBridge.onMessage((m) => {
      if (m.type === 'rewarded') cb({ status: String(m.status), kind: m.kind as string | undefined });
    });
  },
  onCapabilities(cb: (c: NativeCaps) => void) {
    return nativeBridge.onMessage((m) => {
      if (m.type === 'capabilities') cb({ ...nativeBridge.capabilities(), ...(m as Partial<NativeCaps>) });
    });
  },
};
