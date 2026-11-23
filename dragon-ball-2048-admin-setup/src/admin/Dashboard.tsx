import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { defaultConfig, mergeConfig, type AdConfig } from '../game/ads/ad-config';
import type { FirebaseHandles } from './firebase';
import type { SessionApi, SessionState } from './session';
import { ConflictError, NotAuthorizedError, configToJson, loadSavedConfig, loadSiteConfig, sanitize, saveConfig, type SavedConfig } from './configStore';
import { describeError, isPermissionError, type Notice } from './errors';
import { OWNER, PREVIEW_STORAGE_KEY } from './constants';
import { sameConfig, setAt } from './cfgpath';
import { errorsOf, goLiveRequested, validateDraft } from './validation';
import { AdSensePage, AdsterraPage, ControlsPage, MorePage, PlacementsPage } from './pages';
import { Overview } from './Overview';
import { Review } from './Review';
import { Badge, Orb, type Ctx } from './ui';

type PageKey = 'overview' | 'controls' | 'adsense' | 'adsterra' | 'placements' | 'more' | 'review';
const NAV: { key: PageKey; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview', icon: '◉' },
  { key: 'controls', label: 'Master controls', icon: '●' },
  { key: 'adsense', label: 'AdSense', icon: 'A' },
  { key: 'adsterra', label: 'Adsterra', icon: 'S' },
  { key: 'placements', label: 'Placements', icon: '▤' },
  { key: 'more', label: 'Android & Analytics', icon: '✦' },
  { key: 'review', label: 'Review & Publish', icon: '✓' },
];

interface Toast { id: number; kind: 'success' | 'error' | 'info'; text: string; action?: { label: string; run: () => void } }

export function Dashboard({ fb, session, auth }: { fb: FirebaseHandles; session: SessionApi; auth: Extract<SessionState, { status: 'authorized' }> }) {
  const { db } = fb;
  const [page, setPage] = useState<PageKey>('overview');
  const [draft, setDraft] = useState<AdConfig>(defaultConfig);
  const [saved, setSaved] = useState<SavedConfig | null>(null);
  const [site, setSite] = useState<AdConfig | null>(null);
  const [source, setSource] = useState<'firestore' | 'site' | 'defaults'>('defaults');
  const [load, setLoad] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState('');
  const [approved, setApproved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);
  const mainRef = useRef<HTMLElement>(null);

  const notify = useCallback((kind: Toast['kind'], text: string, action?: Toast['action']) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, kind, text, action }]);
    if (kind !== 'error') window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000);
  }, []);
  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));

  const reload = useCallback(async () => {
    setLoad('loading');
    try {
      const [s, f] = await Promise.all([loadSavedConfig(db), loadSiteConfig()]);
      setSaved(s);
      setSite(f);
      if (s) { setDraft(s.config); setSource('firestore'); }
      else if (f) { setDraft(f); setSource('site'); }
      else { setDraft(defaultConfig()); setSource('defaults'); }
      setApproved(false);
      setLoad('ready');
    } catch (e) {
      if (isPermissionError(e)) {
        // Rules rejected a read that should be allowed for an owner: the session/admin record is no longer valid.
        void session.revalidate();
      }
      setLoadError(describeError(e, 'Could not load the saved configuration.'));
      setLoad('error');
    }
  }, [db, session]);

  useEffect(() => { void reload(); }, [reload]);

  const baseline = useMemo<AdConfig>(() => saved?.config ?? site ?? defaultConfig(), [saved, site]);
  const baselineLabel = saved ? `saved Firebase config (revision ${saved.meta.revision})` : site ? 'website ad-config.json' : 'safe defaults';
  const dirty = useMemo(() => !sameConfig(draft, baseline), [draft, baseline]);
  const issues = useMemo(() => validateDraft(draft), [draft]);

  const ctx = useMemo<Ctx>(() => ({
    cfg: draft,
    issues,
    set: (path, value) => {
      setDraft((d) => setAt(d, path, value));
      setApproved(false); // any edit invalidates a previous approval
    },
  }), [draft, issues]);

  // Warn before closing the tab with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const go = (p: PageKey) => {
    setPage(p);
    mainRef.current?.scrollTo({ top: 0 });
  };

  const publishBlocked = () => errorsOf(issues).length > 0 || (goLiveRequested(draft) && !approved);

  async function onSave() {
    if (publishBlocked()) return;
    if (!(await session.revalidate())) return; // session ended or admin record deactivated: user is signed out
    setSaving(true);
    try {
      const meta = await saveConfig(db, auth.user, draft, saved?.meta.revision ?? 0);
      setSaved({ config: sanitize(draft), meta });
      setDraft(sanitize(draft));
      setApproved(false);
      notify('success', `Saved to Firebase (revision ${meta.revision}). Download ad-config.json to ship it with your next Netlify upload.`);
    } catch (e) {
      if (e instanceof NotAuthorizedError) {
        const n: Notice = { kind: 'error', code: 'authz-lost', message: e.message };
        await session.signOut(n);
      } else if (e instanceof ConflictError) {
        notify('error', 'Not saved: the configuration was changed elsewhere (another tab or device). Reload the saved config, re-apply your edits and save again.', { label: 'Reload saved', run: () => void reload() });
      } else {
        notify('error', `Not saved. ${describeError(e, 'Saving failed.')}`);
      }
    } finally {
      setSaving(false);
    }
  }

  function onExport() {
    if (publishBlocked()) return;
    try {
      const blob = new Blob([configToJson(draft)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ad-config.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify('success', 'ad-config.json downloaded. Replace public/ad-config.json, rebuild, and upload manually to Netlify.');
    } catch {
      notify('error', 'Could not create the download in this browser.');
    }
  }

  function onPreview() {
    if (publishBlocked()) return;
    try {
      window.localStorage.setItem(PREVIEW_STORAGE_KEY, configToJson(draft));
      window.open('/?adpreview=1', '_blank', 'noopener');
      notify('info', 'Opened the game with your draft. It is stored only in this browser and affects no visitor.');
    } catch {
      notify('error', 'Could not store the preview draft (browser storage unavailable).');
    }
  }

  function onImport(text: string): string | null {
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { return 'That is not valid JSON.'; }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return 'Expected a JSON object.';
    setDraft(mergeConfig(parsed));
    setApproved(false);
    return null;
  }

  function confirmDiscardThen(run: () => void) {
    if (!dirty || window.confirm('Discard your unsaved changes?')) run();
  }

  const pageEl = (() => {
    switch (page) {
      case 'overview':
        return <Overview admin={auth.admin} signedInAt={auth.signedInAt} projectId={fb.projectId} emulator={fb.emulator} cfg={draft} issues={issues} saved={saved} site={site} dirty={dirty} go={go} />;
      case 'controls': return <ControlsPage ctx={ctx} />;
      case 'adsense': return <AdSensePage ctx={ctx} />;
      case 'adsterra': return <AdsterraPage ctx={ctx} />;
      case 'placements': return <PlacementsPage ctx={ctx} />;
      case 'more': return <MorePage ctx={ctx} />;
      case 'review':
        return (
          <Review
            draft={draft} baseline={baseline} baselineLabel={baselineLabel} saved={saved} issues={issues}
            approved={approved} setApproved={setApproved} saving={saving} dirty={dirty}
            onSave={() => void onSave()} onExport={onExport} onPreview={onPreview}
            onReload={() => confirmDiscardThen(() => void reload())}
            onLoadSite={() => confirmDiscardThen(() => { if (site) { setDraft(site); setSource('site'); setApproved(false); notify('info', 'Loaded the website ad-config.json into the draft.'); } else notify('error', 'The website ad-config.json could not be loaded.'); })}
            onImport={onImport}
            onDiscard={() => confirmDiscardThen(() => { setDraft(baseline); setApproved(false); })}
          />
        );
    }
  })();

  const errCount = errorsOf(issues).length;

  return (
    <div className="shell">
      <aside className="side">
        <div className="side-brand">
          <Orb size={34} />
          <div><strong>Owner Console</strong><small>Dragon Ball 2048</small></div>
        </div>
        <nav aria-label="Dashboard sections">
          {NAV.map((n) => (
            <button key={n.key} className={`nav${page === n.key ? ' active' : ''}`} onClick={() => go(n.key)} aria-current={page === n.key ? 'page' : undefined}>
              <span className="nav-ic" aria-hidden="true">{n.icon}</span>
              <span>{n.label}</span>
              {n.key === 'review' && errCount > 0 && <span className="dot bad" title={`${errCount} validation error(s)`}>{errCount}</span>}
              {n.key === 'review' && errCount === 0 && dirty && <span className="dot warn" title="Unsaved changes" />}
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <a href="/" className="muted">← View game</a>
        </div>
      </aside>

      <div className="content">
        <header className="topbar">
          <div className="who">
            <span className="avatar" aria-hidden="true">{OWNER.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</span>
            <div>
              <strong>{OWNER.name}</strong>
              <small className="muted">{auth.admin.email}</small>
            </div>
            <Badge tone="ok">Owner · Active</Badge>
          </div>
          <div className="row gap">
            {fb.emulator && <Badge tone="info">Emulator</Badge>}
            {dirty ? <Badge tone="warn">Unsaved changes</Badge> : <Badge tone="ok">Saved</Badge>}
            <button className="ghost sm" onClick={() => confirmDiscardThen(() => void session.signOut({ kind: 'info', code: 'signed-out', message: 'You have been signed out.' }))}>
              Sign out
            </button>
          </div>
        </header>

        <main className="page" ref={mainRef} id="main">
          <div className="page-title">
            <h1>{NAV.find((n) => n.key === page)?.label}</h1>
            {source !== 'firestore' && load === 'ready' && (
              <small className="muted">Draft started from {source === 'site' ? 'the website’s ad-config.json (nothing saved in Firebase yet)' : 'safe defaults'}.</small>
            )}
          </div>

          {load === 'loading' && <p className="muted" role="status">Loading configuration…</p>}
          {load === 'error' && (
            <div className="banner banner-bad" role="alert">
              {loadError}{' '}
              <button className="ghost sm" onClick={() => void reload()}>Retry</button>
            </div>
          )}
          {load === 'ready' && pageEl}
        </main>
      </div>

      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`} role={t.kind === 'error' ? 'alert' : 'status'}>
            <span>{t.text}</span>
            {t.action && <button className="ghost sm" onClick={() => { t.action?.run(); dismiss(t.id); }}>{t.action.label}</button>}
            <button className="x" aria-label="Dismiss" onClick={() => dismiss(t.id)}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
}
