import { useEffect, useRef, useState } from 'react';
import { mountGame } from './game/ui';
import { HOME, PAGES, findPage, normalizePath } from './site/config';
import { SiteShell } from './site/components';
import { useSeo } from './site/seo';
import { AboutPage, ContactPage, DisclaimerPage, NotFoundPage } from './site/pages';
import { CookiePage, DmcaPage, PrivacyPage, TermsPage } from './site/legal';
import './site/site.css';

/**
 * Thin host. "/" mounts the vanilla TypeScript game (src/game/*) exactly as before; the informational and legal
 * pages (src/site/*) are routed with the History API (no router dependency). Netlify serves index.html for these
 * paths via public/_redirects, so every page also works as a direct URL, and browser Back/Forward work.
 */
function Game() {
  const ref = useRef<HTMLDivElement>(null);
  useSeo({ title: HOME.title, description: HOME.description, path: HOME.path });
  useEffect(() => {
    if (!ref.current) return;
    return mountGame(ref.current);
  }, []);
  return <div ref={ref} />;
}

const COMPONENTS = {
  about: AboutPage,
  privacy: PrivacyPage,
  terms: TermsPage,
  disclaimer: DisclaimerPage,
  cookies: CookiePage,
  dmca: DmcaPage,
  contact: ContactPage,
} as const;

function InfoPage({ path }: { path: string }) {
  const def = findPage(path);
  useSeo({
    title: def ? `${def.title} — ${HOME.title}` : `Page not found — ${HOME.title}`,
    description: def ? def.description : 'The requested page could not be found.',
    path: def ? def.path : path,
    noindex: !def,
  });
  const Page = def ? COMPONENTS[def.key] : NotFoundPage;
  return (
    <SiteShell current={def?.path}>
      <Page />
    </SiteShell>
  );
}

const isKnownInternal = (p: string) => p === '/' || PAGES.some((x) => x.path === p);

export default function App() {
  const [path, setPath] = useState(() => normalizePath(window.location.pathname));

  useEffect(() => {
    const sync = () => {
      setPath(normalizePath(window.location.pathname));
      if (!window.location.hash) window.scrollTo(0, 0);
    };
    window.addEventListener('popstate', sync);

    // Client-side navigation for internal links (works for links rendered by the game, too).
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      const next = normalizePath(url.pathname);
      if (!isKnownInternal(next)) return;
      if (next === normalizePath(window.location.pathname) && url.hash) return; // in-page anchor
      e.preventDefault();
      window.history.pushState({}, '', next + url.search + url.hash);
      setPath(next);
      if (url.hash) {
        requestAnimationFrame(() => document.getElementById(url.hash.slice(1))?.scrollIntoView());
      } else {
        window.scrollTo(0, 0);
      }
    };
    document.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('popstate', sync);
      document.removeEventListener('click', onClick);
    };
  }, []);

  return path === '/' ? <Game /> : <InfoPage path={path} />;
}
