/**
 * Single source of truth for the owner / legal details used by every page in src/site.
 *
 * >>> ACTION REQUIRED BEFORE APPLYING FOR GOOGLE ADSENSE <<<
 * Set `contactEmail` below to a real, monitored email address (for example a free
 * Gmail / Proton address, or an alias on your own domain). Until you do, every page shows a clearly
 * marked "[CONTACT EMAIL NOT CONFIGURED]" placeholder instead of an address.
 * Nothing else needs to change: all pages read this value.
 */
export const site = {
  name: 'Dragon Ball 2048 — Power Evolution',
  shortName: 'Dragon Ball 2048',
  tagline: 'POWER EVOLUTION',
  owner: 'Mohammad Kabir Shaikh',
  /** <-- PUT YOUR REAL CONTACT EMAIL HERE, e.g. 'name@example.com'. Leave '' to show the placeholder. */
  contactEmail: 'kabirshaikh1811@gmail.com',
  repoUrl: 'https://github.com/Kabir1811/2048dbz.git',
  hosting: 'Netlify',
  /** Shown as "Last updated" on each legal page. Update when you change the wording. */
  lastUpdated: 'November 23, 2026',
};

export interface PageDef {
  key: 'about' | 'privacy' | 'terms' | 'disclaimer' | 'cookies' | 'dmca' | 'contact';
  path: string;
  label: string;
  title: string;
  description: string;
}

/** Footer / navigation order requested by the owner. */
export const PAGES: PageDef[] = [
  {
    key: 'about',
    path: '/about',
    label: 'About Us',
    title: 'About Us',
    description:
      'About Dragon Ball 2048 — Power Evolution, a free, unofficial fan-made browser merge puzzle by Mohammad Kabir Shaikh. Learn how to play and how the evolution chain works.',
  },
  {
    key: 'privacy',
    path: '/privacy-policy',
    label: 'Privacy Policy',
    title: 'Privacy Policy',
    description:
      'How Dragon Ball 2048 — Power Evolution handles data: local game storage, hosting logs, Google AdSense advertising, cookies, children’s privacy and your choices.',
  },
  {
    key: 'terms',
    path: '/terms-and-conditions',
    label: 'Terms & Conditions',
    title: 'Terms & Conditions',
    description:
      'Terms of Use for Dragon Ball 2048 — Power Evolution: acceptable use, availability, intellectual property, third-party ads and limitation of liability.',
  },
  {
    key: 'disclaimer',
    path: '/disclaimer',
    label: 'Disclaimer',
    title: 'Disclaimer',
    description:
      'Disclaimer for Dragon Ball 2048 — Power Evolution: entertainment purposes, Google AdSense and third-party advertising, external links and unofficial fan-project status.',
  },
  {
    key: 'cookies',
    path: '/cookie-policy',
    label: 'Cookie Policy',
    title: 'Cookie Policy',
    description:
      'Cookie Policy for Dragon Ball 2048 — Power Evolution: what is stored on your device, Google AdSense advertising cookies and how to manage them.',
  },
  {
    key: 'dmca',
    path: '/dmca',
    label: 'Copyright / DMCA',
    title: 'Copyright & DMCA Policy',
    description:
      'Copyright and DMCA policy for Dragon Ball 2048 — Power Evolution, an unofficial fan project. How rights holders can submit a takedown request.',
  },
  {
    key: 'contact',
    path: '/contact',
    label: 'Contact Us',
    title: 'Contact Us',
    description:
      'Contact Mohammad Kabir Shaikh, the owner of Dragon Ball 2048 — Power Evolution, for support, privacy requests or copyright notices.',
  },
];

export const HOME = {
  path: '/',
  title: 'Dragon Ball 2048 — Power Evolution',
  description:
    'Dragon Ball 2048 — Power Evolution: merge fighters to unlock every transformation. A free, unofficial fan-made 2048 puzzle game that runs in your browser.',
};

/** Normalise a pathname: strip trailing slash and /index.html. */
export function normalizePath(p: string): string {
  let out = p.replace(/\/index\.html$/i, '/');
  if (out.length > 1) out = out.replace(/\/+$/, '');
  return out || '/';
}

export function findPage(path: string): PageDef | undefined {
  const n = normalizePath(path);
  return PAGES.find((p) => p.path === n);
}
