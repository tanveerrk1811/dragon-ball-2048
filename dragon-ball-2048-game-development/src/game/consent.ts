import { safeGet, safeSet } from './storage';

/**
 * Lightweight consent store used by the website. IMPORTANT: for visitors in the EEA, UK and Switzerland,
 * Google AdSense requires a Google-certified CMP (e.g. Google's Privacy & messaging / Funding Choices).
 * This simple opt-in gate keeps ad and analytics scripts from loading before a choice is made, but it is
 * NOT a substitute for a certified CMP. See docs/COMPLIANCE.md.
 */
export type ConsentState = 'granted' | 'denied' | 'unset';
const listeners: ((s: ConsentState) => void)[] = [];

export const consent = {
  get(): ConsentState {
    const v = safeGet('consent');
    return v === 'granted' || v === 'denied' ? v : 'unset';
  },
  set(s: 'granted' | 'denied') {
    safeSet('consent', s);
    listeners.forEach((l) => l(s));
  },
  reset() {
    safeSet('consent', 'unset');
    listeners.forEach((l) => l('unset'));
  },
  onChange(l: (s: ConsentState) => void) {
    listeners.push(l);
  },
};
