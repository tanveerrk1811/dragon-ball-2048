import type { AdAdapter } from './adapter-types';

/** Owner-controlled "house" / direct-sold banner: a plain image link. No third-party scripts. */
export const customAdapter: AdAdapter = {
  id: 'custom',
  mount(body, p, ctx) {
    ctx.report('loading');
    const a = document.createElement('a');
    a.href = p.custom.href;
    a.target = '_blank';
    a.rel = 'sponsored noopener noreferrer';
    const img = document.createElement('img');
    img.alt = p.custom.alt || 'Sponsored';
    img.decoding = 'async';
    img.loading = 'lazy';
    img.style.cssText = 'display:block;margin:0 auto;max-width:100%;height:auto;border-radius:8px';
    img.addEventListener('load', () => ctx.report('loaded'));
    img.addEventListener('error', () => ctx.report('error', 'House ad image failed to load'));
    img.src = p.custom.imageUrl;
    a.appendChild(img);
    body.appendChild(a);
    return () => body.replaceChildren();
  },
};
