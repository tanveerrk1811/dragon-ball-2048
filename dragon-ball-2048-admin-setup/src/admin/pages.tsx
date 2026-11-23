import type { AdConfig, Network, PlacementName } from '../game/ads/ad-config';
import { PLACEMENT_LABELS, PLACEMENT_NAMES, errorsOf, validateDraft } from './validation';
import { Badge, Card, DeviceField, IssueList, NumField, SelectField, Switch, TextField, type Ctx } from './ui';

export const networkLabel: Record<Network, string> = { none: 'None', adsense: 'Google AdSense', adsterra: 'Adsterra', custom: 'House ad (own banner)' };

const placementErrors = (cfg: AdConfig, n: PlacementName) => errorsOf(validateDraft(cfg)).filter((i) => i.path.startsWith(`placements.${n}`));

function statusBadge(cfg: AdConfig, n: PlacementName) {
  const p = cfg.placements[n];
  if (!p.enabled || p.network === 'none') return <Badge>Off</Badge>;
  if (placementErrors(cfg, n).length) return <Badge tone="bad">Incomplete</Badge>;
  if (!cfg.masterEnabled || !cfg.web.enabled) return <Badge tone="info">Ready · held back by master switch</Badge>;
  return <Badge tone="warn">Will serve live ads</Badge>;
}

/** Abstract layout preview. Ads only ever appear in the marked slots — never inside or over the board. */
export function Wireframe({ cfg }: { cfg: AdConfig }) {
  const slot = (n: PlacementName, label: string) => {
    const p = cfg.placements[n];
    const on = p.enabled && p.network !== 'none';
    return (
      <div className={`wf-slot${on ? ' on' : ''}`}>
        {label}
        <small>{on ? networkLabel[p.network] : 'off'}</small>
      </div>
    );
  };
  return (
    <div className="wire" aria-label="Ad position preview">
      {slot('topBanner', 'Top banner')}
      <div className="wf-game">Scores &amp; header</div>
      <div className="wf-game wf-board">GAME BOARD<small>no ads here, ever</small></div>
      <div className="wf-game">Controls</div>
      {slot('gameOver', 'Game-over panel (below board)')}
      {slot('bottomBanner', 'Bottom banner')}
      <div className={`wf-slot${cfg.placements.interstitial.enabled && cfg.placements.interstitial.network !== 'none' ? ' on' : ''}`}>
        Between-session dialog<small>{cfg.placements.interstitial.enabled && cfg.placements.interstitial.network !== 'none' ? networkLabel[cfg.placements.interstitial.network] : 'off'} · never during play</small>
      </div>
    </div>
  );
}

function SafetyNote() {
  return (
    <p className="banner banner-info">
      <strong>Live advertising stays OFF</strong> until you switch it on <em>and</em> tick the explicit approval box on the Review &amp; Publish page. Only public identifiers belong here — never passwords, API secrets or payment details.
    </p>
  );
}

/* ───────────────────────── Controls ───────────────────────── */
export function ControlsPage({ ctx }: { ctx: Ctx }) {
  return (
    <>
      <SafetyNote />
      <Card title="Master switches" subtitle="These gate every website placement. Defaults are all OFF.">
        <div className="stack">
          <Switch ctx={ctx} path="masterEnabled" label="Master advertising" hint="Kill switch. OFF = no ads anywhere (website and Android)." danger />
          <Switch ctx={ctx} path="web.enabled" label="Website advertising" hint="Applies to the web game only." danger />
          <Switch ctx={ctx} path="web.requireConsent" label="Require visitor consent before web ads load" hint="Recommended. Ads wait for the existing consent banner choice." />
          <Switch ctx={ctx} path="web.allowInAppWebAds" label="Allow AdSense inside the Android WebView (advanced)" hint="Needs the WebView API for Ads and an approved site. Native AdMob is recommended." />
        </div>
        <div className="grid" style={{ marginTop: 14 }}>
          <SelectField ctx={ctx} path="mode" label="Mode" hint="“Test” keeps ad networks in test behavior. Use “Production” only after approvals." options={[['test', 'Test'], ['production', 'Production']]} />
        </div>
      </Card>
    </>
  );
}

/* ───────────────────────── Network panels ───────────────────────── */
function NetworkPlacements({ ctx, network }: { ctx: Ctx; network: Network }) {
  const using = PLACEMENT_NAMES.filter((n) => ctx.cfg.placements[n].network === network);
  const active = using.filter((n) => ctx.cfg.placements[n].enabled);
  return (
    <Card
      title="Network status"
      subtitle={`${networkLabel[network]} is assigned to ${using.length} placement${using.length === 1 ? '' : 's'} (${active.length} enabled).`}
      actions={
        <button
          className="ghost sm"
          disabled={!active.length}
          onClick={() => active.forEach((n) => ctx.set(`placements.${n}.enabled`, false))}
        >
          Disable all {networkLabel[network]} placements
        </button>
      }
    >
      {using.length === 0 ? (
        <p className="muted">No placement uses this network yet. Choose it per placement under “Placements”.</p>
      ) : (
        <div className="stack">
          {using.map((n) => (
            <Switch key={n} ctx={ctx} path={`placements.${n}.enabled`} label={PLACEMENT_LABELS[n].title} hint={PLACEMENT_LABELS[n].where} />
          ))}
        </div>
      )}
    </Card>
  );
}

export function AdSensePage({ ctx }: { ctx: Ctx }) {
  const metaPub = typeof document !== 'undefined' ? document.querySelector<HTMLMetaElement>('meta[name="google-adsense-account"]')?.content : '';
  return (
    <>
      <SafetyNote />
      <Card title="Google AdSense (website)" subtitle="Requires an approved AdSense account and site. Do not enable until AdSense has approved the site and you have created ad units.">
        <div className="grid">
          <TextField ctx={ctx} path="networks.adsense.publisherId" label="Publisher ID" placeholder="ca-pub-0000000000000000" hint={metaPub ? <>The site’s verification tag references <code>{metaPub}</code>. Enter it here only once approval is confirmed.</> : 'Format: ca-pub- followed by 16 digits.'} />
        </div>
        <div className="stack" style={{ marginTop: 12 }}>
          <Switch ctx={ctx} path="networks.adsense.testMode" label="AdSense test mode (data-adtest)" hint="Test requests are not billed. Turn off for real revenue." />
        </div>
      </Card>
      <NetworkPlacements ctx={ctx} network="adsense" />
      <Card title="Ad units per placement" subtitle="Create a Display ad unit for each placement in AdSense, then paste its numeric ad-unit (slot) ID.">
        <div className="stack gap-lg">
          {PLACEMENT_NAMES.map((n) => (
            <div key={n} className="subcard">
              <div className="row between">
                <strong>{PLACEMENT_LABELS[n].title}</strong>
                {ctx.cfg.placements[n].network === 'adsense' ? <Badge tone="info">Uses AdSense</Badge> : <Badge>Uses {networkLabel[ctx.cfg.placements[n].network]}</Badge>}
              </div>
              <div className="grid">
                <TextField ctx={ctx} path={`placements.${n}.adsense.slotId`} label="Ad unit (slot) ID" placeholder="1234567890" />
                <SelectField ctx={ctx} path={`placements.${n}.adsense.format`} label="Format" options={[['auto', 'Auto (responsive)'], ['horizontal', 'Horizontal'], ['rectangle', 'Rectangle'], ['vertical', 'Vertical']]} />
                <NumField ctx={ctx} path={`placements.${n}.adsense.minHeight`} label="Reserved height (px)" min={0} max={600} hint="Prevents layout shift." />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

export function AdsterraPage({ ctx }: { ctx: Ctx }) {
  return (
    <>
      <SafetyNote />
      <Card title="Adsterra (website only)" subtitle="Banner and Native Banner formats. Paste the values from your own Adsterra ad code. Popunder and Social Bar are deliberately unsupported. Adsterra has no official Android SDK.">
        <p className="muted">Adsterra needs no account-wide ID here — each placement has its own script URL and key. Add the ads.txt line from your Adsterra dashboard to <code>public/ads.txt</code> before going live.</p>
      </Card>
      <NetworkPlacements ctx={ctx} network="adsterra" />
      {PLACEMENT_NAMES.map((n) => {
        const a = ctx.cfg.placements[n].adsterra;
        return (
          <Card key={n} title={PLACEMENT_LABELS[n].title} subtitle={PLACEMENT_LABELS[n].where} actions={ctx.cfg.placements[n].network === 'adsterra' ? <Badge tone="info">Uses Adsterra</Badge> : <Badge>Uses {networkLabel[ctx.cfg.placements[n].network]}</Badge>}>
            <div className="grid">
              <SelectField ctx={ctx} path={`placements.${n}.adsterra.format`} label="Format" options={[['banner', 'Banner (iframe, fixed size)'], ['native', 'Native Banner (container)']]} />
              <TextField ctx={ctx} path={`placements.${n}.adsterra.scriptSrc`} label="Script URL" placeholder="https://…/invoke.js" hint="Copied from your Adsterra ad code. Must be https." />
              {a.format === 'banner' ? (
                <>
                  <TextField ctx={ctx} path={`placements.${n}.adsterra.key`} label="Banner key" placeholder="32 hex characters" />
                  <NumField ctx={ctx} path={`placements.${n}.adsterra.width`} label="Width (px)" min={1} />
                  <NumField ctx={ctx} path={`placements.${n}.adsterra.height`} label="Height (px)" min={1} />
                </>
              ) : (
                <TextField ctx={ctx} path={`placements.${n}.adsterra.containerId`} label="Container element ID" placeholder="container-xxxxxxxx" />
              )}
            </div>
            <div className="stack" style={{ marginTop: 12 }}>
              <Switch ctx={ctx} path={`placements.${n}.adsterra.allowSameOrigin`} label="Allow same-origin in the ad sandbox" hint="Keep OFF unless Adsterra requires it — it lets ad code access this site’s storage." />
            </div>
          </Card>
        );
      })}
    </>
  );
}

/* ───────────────────────── Placements ───────────────────────── */
export function PlacementsPage({ ctx }: { ctx: Ctx }) {
  return (
    <>
      <SafetyNote />
      <div className="split">
        <div className="stack gap-lg">
          {PLACEMENT_NAMES.map((n) => {
            const p = ctx.cfg.placements[n];
            return (
              <Card key={n} title={PLACEMENT_LABELS[n].title} subtitle={PLACEMENT_LABELS[n].where} actions={statusBadge(ctx.cfg, n)}>
                <div className="stack">
                  <Switch ctx={ctx} path={`placements.${n}.enabled`} label="Placement enabled" />
                </div>
                <div className="grid" style={{ marginTop: 12 }}>
                  <SelectField ctx={ctx} path={`placements.${n}.network`} label="Ad network" hint="One network per placement." options={(['none', 'adsense', 'adsterra', 'custom'] as Network[]).map((k) => [k, networkLabel[k]] as [string, string])} />
                  <DeviceField ctx={ctx} path={`placements.${n}.devices`} />
                </div>
                {p.network === 'custom' && (
                  <div className="grid" style={{ marginTop: 12 }}>
                    <TextField ctx={ctx} path={`placements.${n}.custom.imageUrl`} label="House ad image URL" placeholder="https://…" />
                    <TextField ctx={ctx} path={`placements.${n}.custom.href`} label="Link URL" placeholder="https://…" />
                    <TextField ctx={ctx} path={`placements.${n}.custom.alt`} label="Alt text" mono={false} />
                  </div>
                )}
                {p.network === 'adsense' && <p className="muted hint-line">Ad unit ID is set on the AdSense page.</p>}
                {p.network === 'adsterra' && <p className="muted hint-line">Script URL and key are set on the Adsterra page.</p>}
                {n === 'interstitial' && (
                  <div className="grid" style={{ marginTop: 12 }}>
                    <NumField ctx={ctx} path="placements.interstitial.everyNGames" label="Every N finished games" min={1} />
                    <NumField ctx={ctx} path="placements.interstitial.minIntervalSeconds" label="Minimum seconds between dialogs" min={0} />
                    <NumField ctx={ctx} path="placements.interstitial.minSecondsAfterLoad" label="Minimum seconds after page load" min={0} />
                  </div>
                )}
                <IssueList issues={placementErrors(ctx.cfg, n)} />
              </Card>
            );
          })}
        </div>
        <div className="sticky">
          <Card title="Position preview" subtitle="Ads never overlay the board, controls or scores.">
            <Wireframe cfg={ctx.cfg} />
          </Card>
        </div>
      </div>
    </>
  );
}

/* ───────────────────────── Android & analytics ───────────────────────── */
export function MorePage({ ctx }: { ctx: Ctx }) {
  return (
    <>
      <Card title="Android app (AdMob)" subtitle="Used only when this configuration is bundled into the Android build. The website ignores these values.">
        <div className="stack">
          <Switch ctx={ctx} path="android.enabled" label="Android advertising" danger />
          <Switch ctx={ctx} path="networks.admob.useTestUnits" label="Use official Google TEST ad units" hint="Keep ON until the app is approved and real unit IDs exist." />
        </div>
        <div className="grid" style={{ marginTop: 12 }}>
          <SelectField ctx={ctx} path="android.network" label="Network" options={[['admob', 'Google AdMob'], ['none', 'None']]} />
          <SelectField ctx={ctx} path="android.maxAdContentRating" label="Max ad content rating" options={[['G', 'G'], ['PG', 'PG'], ['T', 'T'], ['MA', 'MA']]} />
          <SelectField ctx={ctx} path="android.tagForChildDirectedTreatment" label="Child-directed treatment" options={[['unspecified', 'Unspecified'], ['true', 'Yes (child-directed)'], ['false', 'No']]} />
          <TextField ctx={ctx} path="networks.admob.appId" label="AdMob app ID" placeholder="ca-app-pub-0000000000000000~0000000000" />
          <TextField ctx={ctx} path="networks.admob.bannerUnitId" label="Banner unit ID" placeholder="ca-app-pub-…/…" />
          <TextField ctx={ctx} path="networks.admob.interstitialUnitId" label="Interstitial unit ID" placeholder="ca-app-pub-…/…" />
          <TextField ctx={ctx} path="networks.admob.rewardedUnitId" label="Rewarded unit ID" placeholder="ca-app-pub-…/…" />
        </div>
        <div className="stack" style={{ marginTop: 12 }}>
          <Switch ctx={ctx} path="androidPlacements.banner.enabled" label="Android banner" />
          <Switch ctx={ctx} path="androidPlacements.interstitial.enabled" label="Android interstitial" />
          <Switch ctx={ctx} path="androidPlacements.rewarded.enabled" label="Android rewarded (undo)" />
        </div>
        <div className="grid" style={{ marginTop: 12 }}>
          <NumField ctx={ctx} path="androidPlacements.interstitial.everyNGames" label="Interstitial: every N games" min={1} />
          <NumField ctx={ctx} path="androidPlacements.interstitial.minIntervalSeconds" label="Interstitial: min seconds apart" min={0} />
          <NumField ctx={ctx} path="androidPlacements.interstitial.minSecondsAfterLaunch" label="Interstitial: min seconds after launch" min={0} />
        </div>
      </Card>
      <Card title="Analytics (optional)">
        <div className="stack">
          <Switch ctx={ctx} path="analytics.enabled" label="Analytics enabled" />
        </div>
        <div className="grid" style={{ marginTop: 12 }}>
          <TextField ctx={ctx} path="analytics.measurementId" label="GA4 measurement ID" placeholder="G-XXXXXXXXXX" />
        </div>
      </Card>
    </>
  );
}
