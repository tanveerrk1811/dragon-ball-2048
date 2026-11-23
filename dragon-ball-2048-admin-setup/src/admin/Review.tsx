import { useState } from 'react';
import type { Issue } from '../game/ads/ad-config';
import type { SavedConfig } from './configStore';
import { configToJson } from './configStore';
import { diffConfig } from './cfgpath';
import { errorsOf, goLiveRequested, warningsOf } from './validation';
import { Badge, Card, IssueList } from './ui';
import { Wireframe } from './pages';
import type { AdConfig } from '../game/ads/ad-config';

interface Props {
  draft: AdConfig;
  baseline: AdConfig;
  baselineLabel: string;
  saved: SavedConfig | null;
  issues: Issue[];
  approved: boolean;
  setApproved: (v: boolean) => void;
  saving: boolean;
  dirty: boolean;
  onSave: () => void;
  onExport: () => void;
  onPreview: () => void;
  onReload: () => void;
  onLoadSite: () => void;
  onImport: (text: string) => string | null;
  onDiscard: () => void;
}

export function Review(p: Props) {
  const [raw, setRaw] = useState('');
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);
  const changes = diffConfig(p.baseline, p.draft);
  const errors = errorsOf(p.issues);
  const warns = warningsOf(p.issues);
  const live = goLiveRequested(p.draft);
  const blocked = errors.length > 0 ? 'Fix the validation errors first.' : live && !p.approved ? 'Tick the live-advertising approval box.' : null;

  return (
    <>
      <Card title="1 · Validation" tone={errors.length ? 'bad' : 'ok'}>
        <IssueList issues={[...errors, ...warns]} empty="Configuration is valid. No warnings." />
      </Card>

      <Card title="2 · Preview your changes" subtitle={`Compared with: ${p.baselineLabel}`}>
        <div className="split">
          <div>
            {changes.length === 0 ? (
              <p className="muted">No changes — the draft is identical to {p.baselineLabel.toLowerCase()}.</p>
            ) : (
              <div className="table-wrap">
                <table className="diff">
                  <thead>
                    <tr><th>Setting</th><th>Before</th><th>After</th></tr>
                  </thead>
                  <tbody>
                    {changes.map((c) => (
                      <tr key={c.path}>
                        <td className="mono">{c.path}</td>
                        <td className="mono del">{c.before}</td>
                        <td className="mono add">{c.after}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="row gap wrap" style={{ marginTop: 12 }}>
              <button className="ghost sm" onClick={() => setShowJson((s) => !s)}>{showJson ? 'Hide' : 'Show'} ad-config.json preview</button>
              <button className="ghost sm" onClick={p.onPreview} disabled={!!blocked} title={blocked ?? 'Opens the game in a new tab using this draft (stored only in this browser)'}>
                Preview in game (this browser only)
              </button>
            </div>
            {showJson && <pre className="json" tabIndex={0}>{configToJson(p.draft)}</pre>}
          </div>
          <div>
            <Wireframe cfg={p.draft} />
          </div>
        </div>
      </Card>

      <Card title="3 · Approve &amp; publish" tone={live ? 'warn' : undefined}>
        {live ? (
          <div className="banner banner-warn">
            <strong>This draft switches REAL advertising on.</strong>
            <label className="chip chip-plain" style={{ marginTop: 8 }}>
              <input type="checkbox" checked={p.approved} onChange={(e) => p.setApproved(e.target.checked)} />
              <span>I, the owner, approve enabling live advertising. The relevant AdSense/ad-network approval and ad-unit details are in place.</span>
            </label>
          </div>
        ) : (
          <p className="banner banner-ok">This draft keeps live advertising <strong>OFF</strong>. No approval needed.</p>
        )}
        {blocked && <p className="msg-bad" role="alert" style={{ margin: '10px 0 0' }}>{blocked}</p>}

        <div className="row gap wrap" style={{ marginTop: 14 }}>
          <button className="primary" onClick={p.onSave} disabled={!!blocked || p.saving || !p.dirty} title={!p.dirty ? 'Nothing to save' : undefined}>
            {p.saving ? 'Saving…' : 'Save to Firebase'}
          </button>
          <button className="ghost" onClick={p.onExport} disabled={!!blocked}>Download ad-config.json</button>
          <button className="ghost" onClick={p.onDiscard} disabled={!p.dirty}>Discard changes</button>
        </div>
        <p className="muted hint-line">
          Saving stores the configuration in Firestore (<code>publicConfig/adConfig</code>). The live game keeps reading the <code>ad-config.json</code> that ships with the site, so nothing changes for visitors until you download this file and include it in your next manual Netlify upload.
        </p>
        <p className="muted hint-line">
          Saved: {p.saved ? <>revision <Badge tone="ok">{p.saved.meta.revision}</Badge> {p.saved.meta.updatedAt ? `· ${p.saved.meta.updatedAt.toLocaleString()}` : ''}</> : 'never'}
        </p>
      </Card>

      <Card title="Load &amp; import">
        <div className="row gap wrap">
          <button className="ghost sm" onClick={p.onReload}>Reload saved config from Firebase</button>
          <button className="ghost sm" onClick={p.onLoadSite}>Load website ad-config.json</button>
        </div>
        <div className="field" style={{ marginTop: 12 }}>
          <label htmlFor="adm-import">Import JSON (replaces the draft; unknown fields are dropped)</label>
          <textarea id="adm-import" rows={6} className="mono" value={raw} onChange={(e) => { setRaw(e.target.value); setImportMsg(null); }} placeholder='{ "version": 1, … }' spellCheck={false} />
        </div>
        <div className="row gap">
          <button
            className="ghost sm"
            disabled={!raw.trim()}
            onClick={() => {
              const err = p.onImport(raw);
              setImportMsg(err ?? 'Imported into the draft. Review it above, then save.');
              if (!err) setRaw('');
            }}
          >
            Import into draft
          </button>
          {importMsg && <small className={importMsg.startsWith('Imported') ? 'msg-ok' : 'msg-bad'} role="status">{importMsg}</small>}
        </div>
      </Card>
    </>
  );
}
