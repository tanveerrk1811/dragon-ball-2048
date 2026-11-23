import { useEffect, useId, useState, type ReactNode } from 'react';
import type { AdConfig, Device, Issue } from '../game/ads/ad-config';
import { getAt } from './cfgpath';

/** Shared editing context handed to every page: the draft, a path-based setter and the live validation result. */
export interface Ctx {
  cfg: AdConfig;
  set: (path: string, value: unknown) => void;
  issues: Issue[];
}

const issuesAt = (ctx: Ctx, path: string) => ctx.issues.filter((i) => i.path === path);

export function Card({ title, subtitle, children, tone, actions }: { title?: string; subtitle?: ReactNode; children: ReactNode; tone?: 'warn' | 'ok' | 'bad'; actions?: ReactNode }) {
  return (
    <section className={`card${tone ? ` card-${tone}` : ''}`}>
      {(title || actions) && (
        <header className="card-head">
          <div>
            {title && <h2>{title}</h2>}
            {subtitle && <p className="muted">{subtitle}</p>}
          </div>
          {actions && <div className="row gap">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function Badge({ tone = 'neutral', children }: { tone?: 'ok' | 'warn' | 'bad' | 'info' | 'neutral'; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function FieldShell({ label, hint, issues, htmlFor, children }: { label: string; hint?: ReactNode; issues: Issue[]; htmlFor: string; children: ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <small className="muted">{hint}</small>}
      {issues.map((i, n) => (
        <small key={n} className={i.level === 'error' ? 'msg-bad' : 'msg-warn'} role={i.level === 'error' ? 'alert' : undefined}>
          {i.message}
        </small>
      ))}
    </div>
  );
}

export function TextField({ ctx, path, label, hint, placeholder, mono = true, disabled }: { ctx: Ctx; path: string; label: string; hint?: ReactNode; placeholder?: string; mono?: boolean; disabled?: boolean }) {
  const id = useId();
  const issues = issuesAt(ctx, path);
  return (
    <FieldShell label={label} hint={hint} issues={issues} htmlFor={id}>
      <input
        id={id}
        type="text"
        className={`${mono ? 'mono ' : ''}${issues.some((i) => i.level === 'error') ? 'invalid' : ''}`}
        value={String(getAt(ctx.cfg, path) ?? '')}
        placeholder={placeholder}
        disabled={disabled}
        spellCheck={false}
        autoComplete="off"
        aria-invalid={issues.some((i) => i.level === 'error') || undefined}
        onChange={(e) => ctx.set(path, e.target.value)}
        onBlur={(e) => {
          if (e.target.value !== e.target.value.trim()) ctx.set(path, e.target.value.trim());
        }}
      />
    </FieldShell>
  );
}

export function NumField({ ctx, path, label, hint, min, max, step = 1 }: { ctx: Ctx; path: string; label: string; hint?: ReactNode; min?: number; max?: number; step?: number }) {
  const id = useId();
  const value = Number(getAt(ctx.cfg, path) ?? 0);
  const [txt, setTxt] = useState(String(value));
  useEffect(() => {
    if (Number(txt) !== value) setTxt(String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const issues = issuesAt(ctx, path);
  return (
    <FieldShell label={label} hint={hint} issues={issues} htmlFor={id}>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={step}
        value={txt}
        className={issues.some((i) => i.level === 'error') ? 'invalid' : ''}
        aria-invalid={issues.some((i) => i.level === 'error') || undefined}
        onChange={(e) => {
          setTxt(e.target.value);
          const n = Number(e.target.value);
          if (e.target.value !== '' && Number.isFinite(n)) ctx.set(path, n);
        }}
        onBlur={() => setTxt(String(value))}
      />
    </FieldShell>
  );
}

export function SelectField({ ctx, path, label, hint, options }: { ctx: Ctx; path: string; label: string; hint?: ReactNode; options: [string, string][] }) {
  const id = useId();
  return (
    <FieldShell label={label} hint={hint} issues={issuesAt(ctx, path)} htmlFor={id}>
      <select id={id} value={String(getAt(ctx.cfg, path) ?? '')} onChange={(e) => ctx.set(path, e.target.value)}>
        {options.map(([v, t]) => (
          <option key={v} value={v}>
            {t}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function Switch({ ctx, path, label, hint, danger }: { ctx: Ctx; path: string; label: string; hint?: ReactNode; danger?: boolean }) {
  const id = useId();
  const on = Boolean(getAt(ctx.cfg, path));
  const issues = issuesAt(ctx, path);
  return (
    <div className={`switch-row${danger && on ? ' switch-danger' : ''}`}>
      <div>
        <label htmlFor={id}>{label}</label>
        {hint && <small className="muted">{hint}</small>}
        {issues.map((i, n) => (
          <small key={n} className={i.level === 'error' ? 'msg-bad' : 'msg-warn'}>
            {i.message}
          </small>
        ))}
      </div>
      <button id={id} type="button" role="switch" aria-checked={on} className={`switch${on ? ' on' : ''}`} onClick={() => ctx.set(path, !on)}>
        <span />
        <em className="sr">{on ? 'On' : 'Off'}</em>
      </button>
    </div>
  );
}

const DEVICES: Device[] = ['mobile', 'tablet', 'desktop'];
export function DeviceField({ ctx, path }: { ctx: Ctx; path: string }) {
  const list = (getAt(ctx.cfg, path) as Device[]) ?? [];
  const issues = issuesAt(ctx, path);
  return (
    <div className="field">
      <span className="label">Show on devices</span>
      <div className="row gap wrap">
        {DEVICES.map((d) => (
          <label key={d} className="chip">
            <input
              type="checkbox"
              checked={list.includes(d)}
              onChange={(e) => ctx.set(path, e.target.checked ? [...list.filter((x) => x !== d), d] : list.filter((x) => x !== d))}
            />
            <span>{d}</span>
          </label>
        ))}
      </div>
      {issues.map((i, n) => (
        <small key={n} className="msg-warn">
          {i.message}
        </small>
      ))}
    </div>
  );
}

export function IssueList({ issues, empty }: { issues: Issue[]; empty?: string }) {
  if (!issues.length) return empty ? <p className="issue ok">{empty}</p> : null;
  return (
    <ul className="issues">
      {issues.map((i, n) => (
        <li key={n} className={`issue ${i.level}`}>
          <strong>{i.level === 'error' ? 'Error' : 'Warning'}</strong> <code>{i.path}</code> — {i.message}
        </li>
      ))}
    </ul>
  );
}

export function Stat({ label, value, tone, sub }: { label: string; value: ReactNode; tone?: 'ok' | 'warn' | 'bad'; sub?: ReactNode }) {
  return (
    <div className={`stat${tone ? ` stat-${tone}` : ''}`}>
      <span className="muted">{label}</span>
      <strong>{value}</strong>
      {sub && <small className="muted">{sub}</small>}
    </div>
  );
}

export function Orb({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="orb">
      <defs>
        <radialGradient id="orbg" cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor="#ffd36b" />
          <stop offset="0.6" stopColor="#ff8a1f" />
          <stop offset="1" stopColor="#c1470a" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="29" fill="url(#orbg)" />
      <circle cx="32" cy="32" r="6" fill="#c1121f" />
      <circle cx="19" cy="22" r="5" fill="#fff" opacity="0.25" />
    </svg>
  );
}
