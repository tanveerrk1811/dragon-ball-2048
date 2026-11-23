import { useEffect } from 'react';
import './admin.css';
import { initFirebase, type FirebaseHandles } from './firebase';
import { useAdminSession } from './session';
import { Login } from './Login';
import { Dashboard } from './Dashboard';
import { Orb } from './ui';

/** Route component for /admin. Never imported by the game route (lazy-loaded from App.tsx). */
export default function AdminApp() {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'Owner Console — Dragon Ball 2048';
    let meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const prevRobots = meta?.content ?? null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'robots';
      document.head.appendChild(meta);
    }
    meta.content = 'noindex,nofollow,noarchive';
    return () => {
      document.title = prevTitle;
      if (meta) meta.content = prevRobots ?? 'index,follow';
    };
  }, []);

  const init = initFirebase();
  return <div className="adm">{init.ok ? <Gate fb={init.handles} /> : <NotConfigured missing={init.missing} />}</div>;
}

function Gate({ fb }: { fb: FirebaseHandles }) {
  const session = useAdminSession(fb);
  const s = session.state;

  if (s.status === 'booting' || s.status === 'checking') {
    return (
      <main className="center-screen" aria-busy="true">
        <Orb size={56} />
        <p className="muted" role="status">{s.status === 'booting' ? 'Restoring session…' : 'Verifying admin access…'}</p>
      </main>
    );
  }
  if (s.status === 'check-failed') {
    return (
      <main className="center-screen">
        <div className="login-card">
          <h1>Could not verify access</h1>
          <p className="banner banner-warn" role="alert">{s.notice.message}</p>
          <div className="row gap">
            <button className="primary" onClick={session.retry}>Retry</button>
            <button className="ghost" onClick={() => void session.signOut()}>Sign out</button>
          </div>
        </div>
      </main>
    );
  }
  if (s.status === 'signed-out') {
    return <Login onSignIn={session.signIn} notice={s.notice} emulator={fb.emulator} />;
  }
  return <Dashboard fb={fb} session={session} auth={s} />;
}

function NotConfigured({ missing }: { missing: string[] }) {
  return (
    <main className="center-screen">
      <div className="login-card">
        <div className="login-brand">
          <Orb size={48} />
          <div>
            <h1>Firebase not configured</h1>
            <p>The admin console needs your Firebase web-app settings.</p>
          </div>
        </div>
        <p className="banner banner-warn">Missing build-time variables:</p>
        <ul className="issues">
          {missing.map((m) => (
            <li key={m} className="issue warn"><code>{m}</code></li>
          ))}
        </ul>
        <p className="muted">
          Copy <code>.env.example</code> to <code>.env.local</code>, fill in the values from Firebase Console → Project settings → Your apps, then restart <code>npm run dev</code> or re-run <code>npm run build</code>. See <code>docs/ADMIN-SETUP.md</code>.
        </p>
        <p className="login-foot"><a href="/">← Back to the game</a></p>
      </div>
    </main>
  );
}
