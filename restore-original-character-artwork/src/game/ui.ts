import './styles.css';
import { Actuator } from './actuator';
import { analytics } from './analytics';
import { AdManager } from './ads/ad-manager';
import { admobAdapter } from './ads/admob-adapter';
import { portraitFor } from './art';
import { CHARACTERS, characterFor, nextCharacter, tierIndex } from './characters';
import { consent } from './consent';
import { GameManager, type Meta } from './engine';
import { InputManager } from './input';
import { siteConfig } from './site-config';
import { Sound } from './sound';
import { Storage } from './storage';

const ICON = {
  soundOn: '<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
  soundOff: '<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="m16 9 5 6"/><path d="m21 9-5 6"/></svg>',
  restart: '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>',
  undo: '<svg viewBox="0 0 24 24"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>',
};

const ORB = `<svg class="orb" viewBox="0 0 64 64" aria-hidden="true"><defs><radialGradient id="ob" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#ffe9a0"/><stop offset=".45" stop-color="#ff9a1f"/><stop offset="1" stop-color="#b34100"/></radialGradient></defs><circle cx="32" cy="32" r="29" fill="url(#ob)"/><ellipse cx="22" cy="19" rx="10" ry="5" fill="#fff" opacity=".35" transform="rotate(-30 22 19)"/>${[
  [32, 22], [24, 36], [40, 36], [32, 44],
].map(([x, y]) => `<path d="M${x} ${y - 5} l1.6 3.4 3.7.5-2.7 2.6.7 3.7-3.3-1.8-3.3 1.8.7-3.7-2.7-2.6 3.7-.5z" fill="#c1121f" opacity=".9"/>`).join('')}</svg>`;

const TEMPLATE = `
<div class="app">
  <aside class="ad-slot" data-slot="topBanner" aria-label="Advertisement" hidden><span class="ad-label">Advertisement</span><div class="ad-body"></div></aside>

  <header class="head">
    <div class="brand">${ORB}<div><h1>Dragon Ball <span>2048</span></h1><p>POWER EVOLUTION</p></div></div>
    <div class="tools">
      <button class="icon-btn" id="btnSound" aria-label="Toggle sound"></button>
      <button class="icon-btn" id="btnUndo" aria-label="Undo last move (watch an optional ad)" hidden>${ICON.undo}<span class="tag">AD</span></button>
      <button class="icon-btn primary" id="btnRestart" aria-label="Restart game">${ICON.restart}</button>
    </div>
    <div class="scores">
      <div class="score-box" id="scoreBox"><span>SCORE</span><strong id="score">0</strong></div>
      <div class="score-box best"><span>BEST</span><strong id="best">0</strong></div>
    </div>
  </header>

  <section class="evo" aria-label="Evolution progress">
    <div class="evo-card cur"><img id="evoCurArt" alt=""><div><span class="k">CURRENT FORM</span><strong id="evoCurName"></strong><em id="evoCurTitle"></em></div></div>
    <div class="evo-card next"><img id="evoNextArt" alt=""><div><span class="k">NEXT EVOLUTION</span><strong id="evoNextName"></strong><em id="evoNextNeed"></em></div></div>
    <div class="evo-mid"><div class="bar" role="progressbar" aria-label="Evolution progress" aria-valuemin="0" aria-valuemax="100"><i id="evoBar"></i></div>
      <div class="evo-meta"><span id="evoStage"></span><span>Highest unlocked: <b id="evoEver"></b></span></div></div>
  </section>

  <main class="stage">
    <div class="board" id="board">
      <div class="cells" id="cells"></div>
      <div class="tiles" id="tiles"></div>
      <div class="overlay" id="overlay" aria-hidden="true">
        <h2 id="ovTitle"></h2><p id="ovSub"></p>
        <div class="btn-row"><button class="btn ghost" id="ovKeep" hidden>Keep going</button><button class="btn" id="ovNew">New game</button></div>
      </div>
    </div>
    <p class="hint">Swipe or use arrow keys / WASD. Merge identical fighters to evolve them.</p>
  </main>

  <section class="gameover-ad" id="gameoverAd" hidden>
    <aside class="ad-slot" data-slot="gameOver" aria-label="Advertisement" hidden><span class="ad-label">Advertisement</span><div class="ad-body"></div></aside>
  </section>

  <aside class="ad-slot" data-slot="bottomBanner" aria-label="Advertisement" hidden><span class="ad-label">Advertisement</span><div class="ad-body"></div></aside>

  <footer class="foot">
    <nav aria-label="Footer">
      <button data-modal="how">How to play</button>
      <button data-modal="guide">Evolution guide</button>
      <button data-modal="about">About</button>
      <a href="privacy.html">Privacy Policy</a>
      <a href="terms.html">Terms &amp; Conditions</a>
      <button data-modal="contact">Contact</button>
      <button data-modal="ads">Advertising</button>
      <button id="btnPrivacy" hidden>Privacy choices</button>
    </nav>
    <small>Unofficial fan-made game. Dragon Ball and all related names and characters are trademarks of their respective owners. This project is not affiliated with or endorsed by them. Portraits are original stylised illustrations.</small>
  </footer>
</div>

<dialog class="modal" id="modal"><div class="modal-card"><button class="modal-x" aria-label="Close" id="modalX">&times;</button><div id="modalBody"></div></div></dialog>

<dialog class="modal" id="adBreak" aria-label="Advertisement between games"><div class="modal-card">
  <h3>Take a breather</h3>
  <aside class="ad-slot" data-slot="interstitial" aria-label="Advertisement" hidden><span class="ad-label">Advertisement</span><div class="ad-body"></div></aside>
  <div class="btn-row"><button class="btn" id="adBreakClose">Start new game</button></div>
</div></dialog>

<dialog class="modal" id="rewardAsk"><div class="modal-card">
  <h3>Undo your last move?</h3>
  <p>Watch a short <b>optional</b> video ad to undo your last move. You can keep playing without it — the game is always free.</p>
  <div class="btn-row"><button class="btn" id="rewardYes">Watch ad</button><button class="btn ghost" id="rewardNo">No thanks</button></div>
</div></dialog>

<div class="toast" id="toast" role="status" aria-live="polite"></div>

<div class="consent" id="consent" role="region" aria-label="Privacy choices" hidden>
  <p>We use cookies and similar technologies for advertising and optional anonymous analytics. Choose whether to allow them. The game works either way. See our <a href="privacy.html">Privacy Policy</a>.</p>
  <div class="btn-row"><button class="btn" id="consentYes">Accept</button><button class="btn ghost" id="consentNo">Decline</button></div>
</div>
`;

const MODALS: Record<string, () => string> = {
  how: () => `<h3>How to play</h3>
    <ol><li>Swipe (touch) or press the <b>arrow keys</b> / <b>WASD</b> to slide every fighter on the 4×4 board.</li>
    <li>When two identical fighters collide they <b>merge into the next evolution</b>.</li>
    <li>A new Kid Goku (or Krillin) appears after every valid move.</li>
    <li>Reach <b>Super Saiyan God Goku (2048)</b> to win — then keep going to unlock Blue, Ultra Instinct and Mastered Ultra Instinct.</li>
    <li>The game ends when the board is full and no merges remain.</li></ol>
    <p>Press <b>R</b> to restart. Your best score and highest unlocked evolution are saved on this device.</p>`,
  guide: () => {
    const ever = new Storage().getHighest();
    return `<h3>Character evolution guide</h3><p>Merge identical fighters to climb the chain. Highest unlocked on this device: <b>${characterFor(ever || 2).name}</b>.</p>
    <div class="guide">${CHARACTERS.map((c) => `<figure class="${c.value <= ever ? '' : 'locked'}" style="--aura:${c.aura}"><img alt="${c.name}" loading="lazy" src="${portraitFor(c.value)}"><figcaption><b>${c.value}</b>${c.name}<br><span>${c.title}</span></figcaption></figure>`).join('')}</div>`;
  },
  about: () => `<h3>About</h3><p><b>${siteConfig.siteName}</b> is an unofficial fan-made take on the classic 2048 puzzle, where tiles are fighters that evolve as you merge them.</p>
    <p>All portraits are original stylised illustrations generated in code. Dragon Ball and related names are trademarks and copyrights of their respective owners; this project is not affiliated with, sponsored or endorsed by them.</p>
    <p>Based on the mechanics of the open-source game <i>2048</i> by Gabriele Cirulli (MIT licence).</p>`,
  contact: () => `<h3>Contact</h3><p>Questions, bug reports, copyright or privacy requests:</p><p><a href="mailto:${siteConfig.contactEmail}">${siteConfig.contactEmail}</a></p><p class="ad-note">${siteConfig.ownerName}</p>`,
  ads: () => `<h3>Advertising disclosure</h3>
    <p>This game may display ads from <b>Google AdSense</b> and <b>Adsterra</b> on the website and <b>Google AdMob</b> in the Android app. Ads are always labelled <i>Advertisement</i>, are kept in dedicated areas, and never cover the board, the controls or the scores.</p>
    <ul><li>No ads appear while you are mid-game.</li><li>Between-game ads are infrequent and can be dismissed immediately.</li><li>Rewarded videos (Android only) are always optional and clearly described first.</li></ul>
    <p>Ad partners may use cookies or device identifiers according to your choices. See the <a href="privacy.html">Privacy Policy</a>.</p>`,
};

export function mountGame(root: HTMLElement): () => void {
  root.innerHTML = TEMPLATE;
  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const disposers: (() => void)[] = [];
  const on = <T extends EventTarget>(t: T, ev: string, fn: EventListener) => {
    t.addEventListener(ev, fn);
    disposers.push(() => t.removeEventListener(ev, fn));
  };

  const storage = new Storage();
  const sound = new Sound();
  const ads = new AdManager();

  // ---- static bits ----
  const cellsEl = $('#cells');
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    const c = document.createElement('div');
    c.className = 'cell';
    c.style.setProperty('--x', String(x));
    c.style.setProperty('--y', String(y));
    cellsEl.appendChild(c);
  }
  const btnSound = $('#btnSound');
  const renderSound = () => { btnSound.innerHTML = sound.muted ? ICON.soundOff : ICON.soundOn; };
  renderSound();
  on(btnSound, 'click', () => { sound.toggle(); renderSound(); sound.move(); });

  // ---- toast ----
  const toastEl = $('#toast');
  let toastTimer = 0;
  const toast = (msg: string, ms = 2600) => {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), ms);
  };

  // ---- evolution panel + game-over ad region ----
  const gameoverAd = $('#gameoverAd');
  let lastMeta: Meta | null = null;
  let shownForm = 0;
  const renderState = (_g: unknown, meta: Meta) => {
    lastMeta = meta;
    const cur = characterFor(meta.highest || 2);
    const next = nextCharacter(cur.value);
    const idx = tierIndex(cur.value);
    const pct = Math.round((idx / (CHARACTERS.length - 1)) * 100);
    const curArt = $<HTMLImageElement>('#evoCurArt');
    if (shownForm && shownForm !== cur.value) {
      // new form unlocked: flare the panel portrait (CSS only, skipped for reduced motion)
      curArt.classList.remove('evo-up');
      void curArt.offsetWidth;
      curArt.classList.add('evo-up');
    }
    shownForm = cur.value;
    curArt.src = portraitFor(cur.value);
    curArt.style.setProperty('--aura', cur.aura);
    $('#evoCurName').textContent = cur.name;
    $('#evoCurTitle').textContent = cur.title;
    const nextArt = $<HTMLImageElement>('#evoNextArt');
    if (next) {
      nextArt.hidden = false;
      nextArt.src = portraitFor(next.value);
      $('#evoNextName').textContent = next.name;
      $('#evoNextNeed').textContent = `Merge two ${cur.short} (${cur.value})`;
    } else {
      nextArt.hidden = true;
      $('#evoNextName').textContent = 'Beyond all limits';
      $('#evoNextNeed').textContent = 'Final form reached';
    }
    $('#evoBar').style.width = `${pct}%`;
    root.querySelector('.bar')!.setAttribute('aria-valuenow', String(pct));
    $('#evoStage').textContent = `Stage ${idx + 1} / ${CHARACTERS.length}`;
    $('#evoEver').textContent = characterFor(meta.highestEver || 2).short;
    updateUndo();

    if (meta.over) {
      gameoverAd.hidden = false;
      ads.activate('gameOver');
    } else {
      ads.deactivate('gameOver');
      gameoverAd.hidden = true;
    }
  };

  // ---- game ----
  const board = $('#board');
  const input = new InputManager(board, () => requestNewGame());
  const actuator = new Actuator(
    {
      tiles: $('#tiles'), score: $('#score'), scoreBox: $('#scoreBox'), best: $('#best'),
      overlay: $('#overlay'), ovTitle: $('#ovTitle'), ovSub: $('#ovSub'), ovKeep: $('#ovKeep'),
    },
    renderState,
  );

  const game = new GameManager(4, input, storage, actuator, {
    onStart: () => analytics.track('game_start'),
    onMove: ({ merged }) => {
      if (merged.length) sound.merge(Math.max(...merged)); else sound.move();
    },
    onWin: () => {
      sound.victory();
      analytics.track('reached_2048');
    },
    onGameOver: (score) => {
      sound.over();
      ads.noteGameFinished();
      analytics.track('game_over', { score });
    },
    onUnlock: (value) => {
      const c = characterFor(value);
      toast(`Evolution unlocked: ${c.name}!`);
      if (value !== 2048) sound.evolve();
      analytics.track('evolution_unlocked', { value, name: c.name });
    },
  });

  // ---- new game flow (interstitial only at this natural break) ----
  const adBreak = $<HTMLDialogElement>('#adBreak');
  let breakPoll = 0;
  let breakActive = false;
  const finishBreak = () => {
    if (!breakActive) return;
    breakActive = false;
    window.clearInterval(breakPoll);
    ads.deactivate('interstitial');
    analytics.track('game_restart');
    game.restart();
  };
  on(adBreak, 'close', finishBreak);
  on($('#adBreakClose'), 'click', () => adBreak.close());

  function requestNewGame() {
    if (game.over) {
      if (ads.native) {
        admobAdapter.naturalBreak('gameOver'); // native layer applies its own frequency caps
      } else if (ads.shouldShowInterstitial()) {
        breakActive = true;
        ads.markInterstitialShown();
        adBreak.showModal();
        ads.activate('interstitial');
        window.clearInterval(breakPoll);
        breakPoll = window.setInterval(() => {
          const s = ads.slotStatus('interstitial');
          if (s && (s.status === 'unfilled' || s.status === 'error' || s.status === 'invalid-config')) adBreak.close();
        }, 600);
        return;
      }
    }
    analytics.track('game_restart');
    game.restart();
  }
  on($('#btnRestart'), 'click', requestNewGame);
  on($('#ovNew'), 'click', requestNewGame);
  on($('#ovKeep'), 'click', () => game.continuePlaying());

  // ---- modals ----
  const modal = $<HTMLDialogElement>('#modal');
  const openModal = (key: string) => {
    $('#modalBody').innerHTML = MODALS[key]();
    if (!modal.open) modal.showModal();
  };
  on($('#modalX'), 'click', () => modal.close());
  on(modal, 'click', (e) => { if (e.target === modal) modal.close(); });
  root.querySelectorAll<HTMLElement>('[data-modal]').forEach((b) => on(b, 'click', () => openModal(b.dataset.modal!)));

  // ---- native (Android) rewarded Undo — always optional and disclosed ----
  const btnUndo = $<HTMLButtonElement>('#btnUndo');
  const rewardAsk = $<HTMLDialogElement>('#rewardAsk');
  let rewardReady = false;
  let rewardPending = false;
  function updateUndo() {
    btnUndo.hidden = !(ads.native && rewardReady);
    btnUndo.disabled = !lastMeta?.canUndo || rewardPending;
  }
  if (ads.native) {
    const apply = (caps: { rewarded: boolean; rewardedReady: boolean; privacyOptions: boolean }) => {
      rewardReady = caps.rewarded && caps.rewardedReady;
      $('#btnPrivacy').hidden = !caps.privacyOptions;
      updateUndo();
    };
    apply(admobAdapter.capabilities());
    disposers.push(admobAdapter.onCapabilities(apply));
    disposers.push(admobAdapter.onResult((r) => {
      rewardPending = false;
      if (r.status === 'rewarded') {
        if (game.undo()) { toast('Last move undone'); analytics.track('rewarded_undo'); }
      } else if (r.status !== 'dismissed') {
        toast('Ad not available right now — no reward given.');
      }
      updateUndo();
    }));
  }
  on(btnUndo, 'click', () => { if (!btnUndo.disabled) rewardAsk.showModal(); });
  on($('#rewardNo'), 'click', () => rewardAsk.close());
  on($('#rewardYes'), 'click', () => {
    rewardAsk.close();
    rewardPending = true;
    updateUndo();
    admobAdapter.requestRewarded('undo');
  });

  // Android hardware back: close dialogs first.
  window.__nativeBack = () => {
    const open = root.querySelector<HTMLDialogElement>('dialog[open]');
    if (open) { open.close(); return true; }
    return false;
  };

  // ---- ads, consent, analytics (all optional; the game never waits for them) ----
  const consentEl = $('#consent');
  const btnPrivacy = $('#btnPrivacy');
  ads.register('topBanner', root.querySelector<HTMLElement>('[data-slot="topBanner"]')!);
  ads.register('bottomBanner', root.querySelector<HTMLElement>('[data-slot="bottomBanner"]')!);
  ads.register('gameOver', root.querySelector<HTMLElement>('[data-slot="gameOver"]')!, true);
  ads.register('interstitial', root.querySelector<HTMLElement>('[data-slot="interstitial"]')!, true);

  let cancelled = false;
  ads.init().then(() => {
    if (cancelled) return;
    analytics.init(ads.cfg.analytics);
    if (ads.native) return;
    const wantsConsent = ads.webAdsPossible() || ads.cfg.analytics.enabled;
    btnPrivacy.hidden = !wantsConsent;
    consentEl.hidden = !(wantsConsent && consent.get() === 'unset');
  }).catch(() => { /* ads must never break the game */ });

  on($('#consentYes'), 'click', () => { consent.set('granted'); consentEl.hidden = true; });
  on($('#consentNo'), 'click', () => { consent.set('denied'); consentEl.hidden = true; });
  on(btnPrivacy, 'click', () => {
    if (ads.native) admobAdapter.openPrivacyOptions();
    else consentEl.hidden = false;
  });

  return () => {
    cancelled = true;
    window.clearInterval(breakPoll);
    window.clearTimeout(toastTimer);
    disposers.forEach((d) => d());
    input.dispose();
    ads.dispose();
    delete window.__nativeBack;
    root.innerHTML = '';
  };
}
