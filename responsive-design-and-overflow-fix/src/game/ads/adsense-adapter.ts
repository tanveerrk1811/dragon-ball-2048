import type { AdAdapter } from './adapter-types';

/**
 * Official Google AdSense display integration (adsbygoogle.js + <ins class="adsbygoogle">).
 * Requires an approved AdSense account/site. The script is loaded once, lazily, only when a placement
 * using AdSense is actually mounted (and consent is available when required).
 */
let scriptPromise: Promise<void> | null = null;

function ensureScript(publisherId: string): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(publisherId)}`;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null; // allow retry on next mount
      reject(new Error('adsbygoogle.js failed to load'));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export const adsenseAdapter: AdAdapter = {
  id: 'adsense',
  mount(body, p, ctx) {
    let disposed = false;
    let timer: number | undefined;
    let observer: MutationObserver | undefined;
    ctx.report('loading');

    ensureScript(ctx.cfg.networks.adsense.publisherId)
      .then(() => {
        if (disposed) return;
        const ins = document.createElement('ins');
        ins.className = 'adsbygoogle';
        ins.style.display = 'block';
        ins.style.minHeight = `${p.adsense.minHeight}px`;
        ins.setAttribute('data-ad-client', ctx.cfg.networks.adsense.publisherId);
        ins.setAttribute('data-ad-slot', p.adsense.slotId);
        ins.setAttribute('data-ad-format', p.adsense.format || 'auto');
        ins.setAttribute('data-full-width-responsive', 'true');
        if (ctx.testMode) ins.setAttribute('data-adtest', 'on');
        body.appendChild(ins);

        observer = new MutationObserver(() => {
          const status = ins.getAttribute('data-ad-status');
          if (status === 'filled') { window.clearTimeout(timer); ctx.report('loaded'); }
          else if (status === 'unfilled') { window.clearTimeout(timer); ctx.report('unfilled', 'AdSense returned no ad for this slot'); }
        });
        observer.observe(ins, { attributes: true, attributeFilter: ['data-ad-status'] });

        try {
          const w = window as unknown as { adsbygoogle?: unknown[] };
          (w.adsbygoogle = w.adsbygoogle || []).push({});
        } catch (e) {
          ctx.report('error', `adsbygoogle.push failed: ${(e as Error).message}`);
          return;
        }
        timer = window.setTimeout(() => {
          if (!disposed) ctx.report('unfilled', 'No response from AdSense (site not approved, blocked, or offline)');
        }, 10000);
      })
      .catch((e: Error) => {
        if (!disposed) ctx.report('error', e.message);
      });

    return () => {
      disposed = true;
      window.clearTimeout(timer);
      observer?.disconnect();
      body.replaceChildren();
    };
  },
};
