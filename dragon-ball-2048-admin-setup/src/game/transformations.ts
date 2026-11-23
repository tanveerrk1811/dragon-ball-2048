import './transformations.css';
import { portraitFor } from './art';
import { characterFor } from './characters';

/**
 * Individual evolution / transformation animations.
 *
 * Every merge that creates a new fighter plays a cinematic specific to the character it evolves INTO:
 *   old portrait charges up -> white-out flash -> new portrait revealed with its own aura / effects.
 * Purely visual: nothing here touches the game engine, scoring, input or ads. All effects are plain DOM
 * nodes animated with CSS transforms/opacity (see transformations.css), removed automatically afterwards,
 * and skipped entirely when the user prefers reduced motion.
 */
interface FxSpec {
  kind: string; // css hook: .fx-<kind> / [data-fx="<kind>"]
  ms: number; // total length of the effect
  rings?: number; // expanding shock-wave rings
  particles?: number; // sparks / embers / dust
  up?: boolean; // particles rise (flame embers) instead of radiating
  streak?: boolean; // particles are speed-streaks
  flames?: number; // aura flame tongues
  bolts?: number; // lightning bolts
  beams?: boolean; // Tien's tri-beam
  slashes?: boolean; // Yamcha's wolf-fang claw slashes
  swirl?: boolean; // swirling energy ring
  orbit?: boolean; // orbiting embers + ritual ring
  ghosts?: boolean; // after-images (instinct)
  sweep?: boolean; // glint sweeping over the portrait
  shake?: 0 | 1 | 2 | 3; // board shake strength
  screen?: boolean; // board-wide colour flash
  banner?: boolean; // name call-out over the board
}

const SPECS: Record<number, FxSpec> = {
  4: { kind: 'spark', ms: 560, rings: 1, particles: 10 }, // Krillin — Destructo-disc sparkle pop
  8: { kind: 'fang', ms: 640, particles: 10, slashes: true }, // Yamcha — wolf-fang claw slashes + sand
  16: { kind: 'tri', ms: 740, rings: 1, particles: 8, beams: true }, // Tien — tri-beam
  32: { kind: 'regen', ms: 840, rings: 1, particles: 12, up: true, swirl: true }, // Piccolo — cape swirl
  64: { kind: 'royal', ms: 920, rings: 2, particles: 12, sweep: true, shake: 1 }, // Vegeta — royal shockwave + armour glint
  128: { kind: 'kaioken', ms: 960, rings: 3, particles: 12, flames: 5, shake: 1 }, // Goku — pulsing red-orange surge
  256: { kind: 'ssj', ms: 1080, rings: 1, particles: 14, up: true, streak: true, flames: 7, sweep: true, shake: 1, screen: true, banner: true },
  512: { kind: 'ssj2', ms: 1180, rings: 2, particles: 14, up: true, streak: true, flames: 7, bolts: 5, sweep: true, shake: 2, screen: true, banner: true },
  1024: { kind: 'ssj3', ms: 1380, rings: 3, particles: 18, up: true, streak: true, flames: 11, bolts: 8, sweep: true, shake: 3, screen: true, banner: true },
  2048: { kind: 'god', ms: 1380, rings: 2, particles: 14, flames: 6, orbit: true, sweep: true, shake: 2, screen: true, banner: true },
  4096: { kind: 'blue', ms: 1380, rings: 3, particles: 16, up: true, flames: 8, swirl: true, bolts: 3, sweep: true, shake: 2, screen: true, banner: true },
  8192: { kind: 'instinct', ms: 1480, rings: 2, particles: 14, streak: true, ghosts: true, sweep: true, shake: 1, screen: true, banner: true },
  16384: { kind: 'mastered', ms: 1680, rings: 3, particles: 20, streak: true, flames: 9, ghosts: true, sweep: true, shake: 3, screen: true, banner: true },
};

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const f1 = (n: number) => Math.round(n * 10) / 10;

function div(cls: string, vars?: Record<string, string>, tag = 'div'): HTMLElement {
  const e = document.createElement(tag);
  e.className = cls;
  if (vars) for (const k in vars) e.style.setProperty(k, vars[k]);
  return e;
}

function reducedMotion(): boolean {
  try {
    return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function boltSvg(count: number): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 200 200');
  svg.setAttribute('class', 'fx-bolts');
  for (let i = 0; i < count; i++) {
    const base = (i / count) * 360 + rnd(-14, 14);
    let a = base;
    let r = 24;
    const pts: string[] = [];
    for (let s = 0; s < 6; s++) {
      const rad = (a * Math.PI) / 180;
      pts.push(`${f1(100 + r * Math.cos(rad))},${f1(100 + r * Math.sin(rad))}`);
      r += rnd(9, 15);
      a += rnd(-16, 16);
    }
    const g = document.createElementNS(ns, 'g');
    g.setAttribute('class', 'fx-bolt');
    g.style.setProperty('--dl', `${Math.round(rnd(0, 260))}ms`);
    for (const [cls, w] of [['halo', 5], ['core', 1.8]] as const) {
      const p = document.createElementNS(ns, 'polyline');
      p.setAttribute('points', pts.join(' '));
      p.setAttribute('class', cls);
      p.setAttribute('stroke-width', String(w));
      g.appendChild(p);
    }
    svg.appendChild(g);
  }
  return svg;
}

let shakeTimer = 0;

/**
 * Plays the transformation for `tile` (the freshly merged tile). `inner` is its .tile-inner.
 * `board` is the board element, used for the board-wide effects (shake / flash / banner).
 */
export function playTransformation(tile: HTMLElement, inner: HTMLElement, fromValue: number, toValue: number, board: HTMLElement | null) {
  if (reducedMotion()) return;
  const to = characterFor(toValue);
  const spec = SPECS[to.value] ?? SPECS[16384];
  const delay = 150;

  tile.dataset.fx = spec.kind;
  tile.style.setProperty('--fxd', `${spec.ms}ms`);
  tile.style.setProperty('--fxdl', `${delay}ms`);

  // ---- portrait morph: previous form charges up, white-out, new form revealed ----
  const newImg = inner.querySelector('img');
  if (newImg && characterFor(fromValue).value !== to.value) {
    const old = document.createElement('img');
    old.className = 'evo-from';
    old.alt = '';
    old.draggable = false;
    old.src = portraitFor(fromValue);
    newImg.classList.add('evo-to');
    inner.insertBefore(old, newImg.nextSibling);
    window.setTimeout(() => old.remove(), spec.ms + delay + 200);
  }

  // ---- effect layer (sits on the tile, outside the clipped .tile-inner) ----
  const fx = div(`fx fx-${spec.kind}${spec.streak ? ' fx-streak' : ''}`);
  fx.setAttribute('aria-hidden', 'true');
  fx.appendChild(div('fx-glow'));

  for (let i = 0; i < (spec.rings ?? 0); i++) fx.appendChild(div('fx-ring', { '--rd': `${i * 150}ms` }));

  if (spec.flames) {
    const wrap = div('fx-flames');
    const n = spec.flames;
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      const edge = 1 - Math.abs(t - 0.5) * 1.3;
      wrap.appendChild(
        div('', {
          '--x': `${f1(8 + t * 84)}%`,
          '--w': `${f1(rnd(20, 30))}%`,
          '--h': `${f1((52 + 62 * edge) * rnd(0.85, 1.1))}%`,
          '--dl': `${Math.round(rnd(0, 180))}ms`,
        }, 'i'),
      );
    }
    fx.appendChild(wrap);
  }

  if (spec.swirl) fx.appendChild(div('fx-swirl'));

  if (spec.orbit) {
    const o = div('fx-orbit');
    for (let i = 0; i < 6; i++) o.appendChild(div('', { '--a': `${i * 60}deg` }, 'i'));
    fx.appendChild(o);
  }

  if (spec.ghosts) {
    for (const sx of [-1, 1]) {
      const g = div('fx-ghost', { '--sx': String(sx), '--dl': sx === 1 ? '0ms' : '90ms' });
      const gi = document.createElement('img');
      gi.alt = '';
      gi.src = portraitFor(toValue);
      g.appendChild(gi);
      fx.appendChild(g);
    }
  }

  if (spec.beams) for (const r of [-38, 0, 38]) fx.appendChild(div('fx-beam', { '--r': `${r}deg` }));
  if (spec.slashes) [18, 42, 66].forEach((y, i) => fx.appendChild(div('fx-slash', { '--y': `${y}%`, '--dl': `${i * 90}ms` })));
  if (spec.bolts) fx.appendChild(boltSvg(spec.bolts));

  const n = spec.particles ?? 0;
  for (let i = 0; i < n; i++) {
    const ang = spec.up ? -90 + rnd(-52, 52) : (i / n) * 360 + rnd(-12, 12);
    fx.appendChild(
      div('fx-p', {
        '--a': `${f1(ang)}deg`,
        '--d': `${f1(rnd(13, 25))}cqw`,
        '--ps': `${f1(rnd(1.3, 2.6))}cqw`,
        '--dl': `${Math.round(rnd(0, 240))}ms`,
      }, 'span'),
    );
  }
  tile.appendChild(fx);

  if (spec.sweep) inner.appendChild(div('fx-sweep'));
  window.setTimeout(() => {
    fx.remove();
    inner.querySelector('.fx-sweep')?.remove();
  }, spec.ms + delay + 500);

  // ---- board-wide effects ----
  if (!board) return;
  const burstAt = delay + Math.round(spec.ms * 0.28);

  if (spec.shake) {
    window.clearTimeout(shakeTimer);
    board.classList.remove('shake-1', 'shake-2', 'shake-3');
    void board.offsetWidth;
    board.style.setProperty('--shd', `${burstAt}ms`);
    board.classList.add(`shake-${spec.shake}`);
    shakeTimer = window.setTimeout(() => board.classList.remove('shake-1', 'shake-2', 'shake-3'), burstAt + 700);
  }
  if (spec.screen) {
    board.querySelector('.fx-screen')?.remove();
    const s = div('fx-screen', {
      '--sc': spec.kind === 'mastered' ? '#ffffff' : to.aura,
      '--fxd': `${Math.round(spec.ms * 0.8)}ms`,
      '--sd': `${burstAt - 60}ms`,
    });
    board.appendChild(s);
    window.setTimeout(() => s.remove(), spec.ms + delay + 300);
  }
  if (spec.banner) {
    board.querySelector('.fx-banner')?.remove();
    const b = div('fx-banner', { '--aura': to.aura, '--aura2': to.aura2, '--bd': `${burstAt}ms` });
    b.setAttribute('aria-hidden', 'true');
    b.textContent = to.short;
    board.appendChild(b);
    window.setTimeout(() => b.remove(), burstAt + 1500);
  }
}
