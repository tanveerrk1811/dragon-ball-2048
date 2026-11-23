import type { ReactNode } from 'react';
import { PAGES, site } from './config';

export function Email({ subject }: { subject?: string }) {
  if (!site.contactEmail) {
    return (
      <span className="placeholder" title="Owner: set contactEmail in src/site/config.ts">
        [CONTACT EMAIL NOT CONFIGURED]
      </span>
    );
  }
  const href = `mailto:${site.contactEmail}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`;
  return <a href={href}>{site.contactEmail}</a>;
}

export function Ext({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function Callout({ tone = 'info', title, children }: { tone?: 'info' | 'warn'; title?: string; children: ReactNode }) {
  return (
    <aside className={`callout ${tone}`}>
      {title && <strong>{title}</strong>}
      <div>{children}</div>
    </aside>
  );
}

const ORB = (
  <svg className="site-orb" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <defs>
      <radialGradient id="so" cx="38%" cy="32%" r="75%">
        <stop offset="0" stopColor="#ffe9a0" />
        <stop offset=".45" stopColor="#ff9a1f" />
        <stop offset="1" stopColor="#b34100" />
      </radialGradient>
    </defs>
    <circle cx="32" cy="32" r="29" fill="url(#so)" />
    <ellipse cx="22" cy="19" rx="10" ry="5" fill="#fff" opacity=".35" transform="rotate(-30 22 19)" />
    {[
      [32, 22],
      [24, 36],
      [40, 36],
      [32, 44],
    ].map(([x, y]) => (
      <path
        key={`${x}-${y}`}
        d={`M${x} ${y - 5} l1.6 3.4 3.7.5-2.7 2.6.7 3.7-3.3-1.8-3.3 1.8.7-3.7-2.7-2.6 3.7-.5z`}
        fill="#c1121f"
        opacity=".9"
      />
    ))}
  </svg>
);

export function SiteShell({ current, children }: { current?: string; children: ReactNode }) {
  return (
    <div className="site">
      <a className="skip" href="#content">
        Skip to content
      </a>
      <header className="site-head">
        <a className="site-brand" href="/" aria-label={`${site.name} — home`}>
          {ORB}
          <span>
            <b>
              Dragon Ball <i>2048</i>
            </b>
            <small>{site.tagline}</small>
          </span>
        </a>
        <a className="play-btn" href="/">
          ▶ Play the game
        </a>
      </header>

      <nav className="site-nav" aria-label="Site pages">
        {PAGES.map((p) => (
          <a key={p.key} href={p.path} aria-current={current === p.path ? 'page' : undefined}>
            {p.label}
          </a>
        ))}
      </nav>

      <main id="content" className="site-main" tabIndex={-1}>
        {children}
      </main>

      <footer className="site-foot">
        <nav aria-label="Footer">
          <a href="/">Play</a>
          {PAGES.map((p) => (
            <a key={p.key} href={p.path} aria-current={current === p.path ? 'page' : undefined}>
              {p.label}
            </a>
          ))}
        </nav>
        <p>
          <strong>Unofficial fan-made project.</strong> {site.name} is not affiliated with, endorsed by, sponsored
          by, or officially connected to Dragon Ball, its creators, publishers or rights holders. Dragon Ball and
          all related names and characters are the property of their respective owners.
        </p>
        <p className="muted">Created and operated by {site.owner}. Free to play in your browser.</p>
      </footer>
    </div>
  );
}

export function LegalPage({ title, intro, children, showUpdated = true }: { title: string; intro?: ReactNode; children: ReactNode; showUpdated?: boolean }) {
  return (
    <article className="prose">
      <h1>{title}</h1>
      {showUpdated && <p className="meta">Last updated: {site.lastUpdated}</p>}
      {intro && <p className="lead">{intro}</p>}
      {children}
    </article>
  );
}
