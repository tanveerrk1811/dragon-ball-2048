import type { AdConfig } from '../game/ads/ad-config';
import type { AdminRecord } from './authz';
import { OWNER, IDLE_TIMEOUT_MS } from './constants';
import type { SavedConfig } from './configStore';
import { sameConfig } from './cfgpath';
import { PLACEMENT_LABELS, PLACEMENT_NAMES, errorsOf, goLiveRequested, warningsOf } from './validation';
import { Badge, Card, IssueList, Stat } from './ui';
import { networkLabel } from './pages';
import type { Issue } from '../game/ads/ad-config';

interface Props {
  admin: AdminRecord;
  signedInAt: string | null;
  projectId: string;
  emulator: boolean;
  cfg: AdConfig;
  issues: Issue[];
  saved: SavedConfig | null;
  site: AdConfig | null;
  dirty: boolean;
  go: (page: 'review' | 'placements' | 'controls') => void;
}

export function Overview({ admin, signedInAt, projectId, emulator, cfg, issues, saved, site, dirty, go }: Props) {
  const errors = errorsOf(issues);
  const warns = warningsOf(issues);
  const live = goLiveRequested(cfg);
  const enabledPlacements = PLACEMENT_NAMES.filter((n) => cfg.placements[n].enabled && cfg.placements[n].network !== 'none');
  const siteState = site === null ? 'unknown' : !saved ? 'nosaved' : sameConfig(site, saved.config) ? 'match' : 'differs';

  return (
    <>
      <Card title={`Welcome, ${OWNER.name.split(' ')[0]}`} subtitle="Owner console for Dragon Ball 2048 — Power Evolution">
        <div className="stats">
          <Stat label="Owner" value={OWNER.name} sub={admin.email} />
          <Stat label="Account status" value={<Badge tone="ok">Active · {admin.role}</Badge>} sub="Verified against Firestore admin record" />
          <Stat label="Firebase project" value={<span className="mono">{projectId}</span>} sub={emulator ? 'Local emulator' : 'Production Firebase'} />
          <Stat label="Last sign-in" value={signedInAt ? new Date(signedInAt).toLocaleString() : '—'} sub={`Auto sign-out after ${IDLE_TIMEOUT_MS / 60000} min idle`} />
        </div>
        <p className="muted uid">Admin UID: <code>{admin.uid}</code></p>
      </Card>

      <Card tone={live ? 'warn' : 'ok'} title="Advertising status">
        <div className="stats">
          <Stat label="Live advertising" value={live ? <Badge tone="warn">Requested ON</Badge> : <Badge tone="ok">OFF</Badge>} sub={live ? 'Needs explicit approval to save/export' : 'No ads will run with this draft'} />
          <Stat label="Mode" value={cfg.mode === 'production' ? 'Production' : 'Test'} />
          <Stat label="Enabled placements" value={`${enabledPlacements.length} / ${PLACEMENT_NAMES.length}`} />
          <Stat label="Validation" value={errors.length ? <Badge tone="bad">{errors.length} error{errors.length > 1 ? 's' : ''}</Badge> : <Badge tone="ok">Valid</Badge>} sub={warns.length ? `${warns.length} warning${warns.length > 1 ? 's' : ''}` : 'No warnings'} />
        </div>
      </Card>

      <Card title="Configuration sync" actions={<button className="primary sm" onClick={() => go('review')}>Review &amp; publish</button>}>
        <div className="stats">
          <Stat label="Saved in Firestore" value={saved ? `Revision ${saved.meta.revision}` : 'Nothing saved yet'} sub={saved?.meta.updatedAt ? saved.meta.updatedAt.toLocaleString() : undefined} tone={saved ? 'ok' : 'warn'} />
          <Stat label="Unsaved changes" value={dirty ? <Badge tone="warn">Yes</Badge> : <Badge tone="ok">None</Badge>} />
          <Stat
            label="Website ad-config.json"
            value={siteState === 'match' ? <Badge tone="ok">Matches saved</Badge> : siteState === 'differs' ? <Badge tone="warn">Differs from saved</Badge> : siteState === 'nosaved' ? <Badge>Nothing saved to compare</Badge> : <Badge>Unavailable</Badge>}
            sub="Live ads change only when you upload a new build (or ad-config.json) to Netlify."
          />
        </div>
      </Card>

      <Card title="Placements" actions={<button className="ghost sm" onClick={() => go('placements')}>Manage</button>}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Placement</th><th>Network</th><th>State</th><th>Devices</th></tr>
            </thead>
            <tbody>
              {PLACEMENT_NAMES.map((n) => {
                const p = cfg.placements[n];
                const on = p.enabled && p.network !== 'none';
                return (
                  <tr key={n}>
                    <td>{PLACEMENT_LABELS[n].title}</td>
                    <td>{networkLabel[p.network]}</td>
                    <td>{on ? <Badge tone="info">Enabled</Badge> : <Badge>Off</Badge>}</td>
                    <td>{p.devices.join(', ') || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {(errors.length > 0 || warns.length > 0) && (
        <Card title="Validation findings" actions={<button className="ghost sm" onClick={() => go('controls')}>Fix</button>}>
          <IssueList issues={issues} />
        </Card>
      )}
    </>
  );
}
