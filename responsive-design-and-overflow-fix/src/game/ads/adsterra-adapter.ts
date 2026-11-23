import type { AdAdapter } from './adapter-types';

/**
 * Adsterra website integration for BANNER (iframe "atOptions" invoke.js) and NATIVE BANNER formats.
 * The owner pastes the values from their own approved Adsterra ad code into ad-config.json.
 * Each ad runs inside a sandboxed iframe so third-party scripts cannot read or cover the game.
 *
 * Deliberately NOT supported: Popunder, Social Bar and other overlay/redirect formats — they can cover game
 * controls or interrupt play, which this project's placement rules forbid.
 * Adsterra has no Android SDK, so this adapter is website-only.
 */
function normalize(src: string): string {
  const url = new URL(src.startsWith('//') ? 'https:' + src : src);
  return url.href; // URL.href percent-encodes quotes, so it is safe inside an attribute
}

const jsonForScript = (v: unknown) => JSON.stringify(v).replace(/</g, '\\u003c');
const CLOSE = '<' + '/script>';

export const adsterraAdapter: AdAdapter = {
  id: 'adsterra',
  mount(body, p, ctx) {
    const a = p.adsterra;
    let timer: number | undefined;
    let src: string;
    try {
      src = normalize(a.scriptSrc);
    } catch {
      ctx.report('invalid-config', 'Adsterra script URL is invalid');
      return () => undefined;
    }
    ctx.report('loading');

    const iframe = document.createElement('iframe');
    iframe.title = 'Advertisement';
    iframe.setAttribute(
      'sandbox',
      'allow-scripts allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation' +
        (a.allowSameOrigin ? ' allow-same-origin' : ''),
    );
    iframe.setAttribute('scrolling', 'no');
    iframe.loading = 'lazy';
    iframe.style.cssText = `border:0;display:block;margin:0 auto;max-width:100%;width:${a.width}px;height:${a.height}px;background:transparent`;

    const inner =
      a.format === 'banner'
        ? `<script>atOptions=${jsonForScript({ key: a.key, format: 'iframe', height: a.height, width: a.width, params: {} })};${CLOSE}<script src="${src}">${CLOSE}`
        : `<script async data-cfasync="false" src="${src}">${CLOSE}<div id="${a.containerId.replace(/[^\w-]/g, '')}"></div>`;

    iframe.srcdoc =
      '<!doctype html><html><head><meta charset="utf-8"><base target="_blank">' +
      '<style>html,body{margin:0;padding:0;background:transparent;overflow:hidden;display:flex;justify-content:center}</style>' +
      `</head><body>${inner}</body></html>`;

    iframe.addEventListener('load', () => {
      window.clearTimeout(timer);
      // The iframe document loaded; Adsterra fill cannot be verified from outside the sandbox.
      ctx.report('loaded', 'Iframe loaded (fill not verifiable from the page — check Adsterra statistics)');
    });
    iframe.addEventListener('error', () => ctx.report('error', 'Adsterra iframe failed to load'));
    timer = window.setTimeout(() => ctx.report('error', 'Adsterra iframe timed out'), 15000);
    body.appendChild(iframe);

    return () => {
      window.clearTimeout(timer);
      body.replaceChildren();
    };
  },
};
