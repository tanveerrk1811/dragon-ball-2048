import { characterFor, type ArtSpec } from './characters';

/**
 * Procedural, original vector portraits (v2 — shaded anime-style illustration).
 * Each tile value is rendered once and cached as an SVG data URI, so the DOM only contains
 * lightweight <img> elements (no duplicate gradient ids). Public API is unchanged: portraitFor(value).
 *
 * v2 adds: shaded skin / hair / outfit gradients, faceted hair highlights, fringe bangs, anime eyes
 * (lids, iris gradient, double catch-lights), per-character outfits, speed-ray backgrounds,
 * flame auras for the Super Saiyan family and a soft vignette frame.
 */
const n1 = (n: number) => Math.round(n * 10) / 10;

// ---------- colour helpers (specs use 6-digit hex) ----------
function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function mix(a: string, b: string, t: number): string {
  const x = rgb(a);
  const y = rgb(b);
  const c = x.map((v, i) => Math.round(v + (y[i] - v) * t));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}
const lighten = (c: string, t: number) => mix(c, '#ffffff', t);
const darken = (c: string, t: number) => mix(c, '#000000', t);

// ---------- per-form flavour (kept out of characters.ts so the evolution table is untouched) ----------
interface Form {
  flames: number; // flame tongues behind the fighter (0 = none)
  flameH: number; // flame height multiplier
  rays: number; // speed-ray opacity (0 = none)
  armor?: boolean;
  cape?: boolean;
  glints: number; // sparkle glints around the frame
  eyeGlow?: boolean;
}
const FORMS: Record<number, Form> = {
  2: { flames: 0, flameH: 1, rays: 0.06, glints: 0 },
  4: { flames: 0, flameH: 1, rays: 0.06, glints: 0 },
  8: { flames: 0, flameH: 1, rays: 0.07, glints: 0 },
  16: { flames: 0, flameH: 1, rays: 0.07, glints: 0 },
  32: { flames: 0, flameH: 1, rays: 0.08, cape: true, glints: 0 },
  64: { flames: 0, flameH: 1, rays: 0.1, armor: true, glints: 0 },
  128: { flames: 0, flameH: 1, rays: 0.12, glints: 0 },
  256: { flames: 7, flameH: 1, rays: 0.16, glints: 2 },
  512: { flames: 9, flameH: 1.1, rays: 0.18, glints: 3 },
  1024: { flames: 11, flameH: 1.3, rays: 0.2, glints: 3 },
  2048: { flames: 7, flameH: 1, rays: 0.18, glints: 4, eyeGlow: true },
  4096: { flames: 8, flameH: 1.05, rays: 0.2, glints: 4, eyeGlow: true },
  8192: { flames: 9, flameH: 1.1, rays: 0.22, glints: 5, eyeGlow: true },
  16384: { flames: 11, flameH: 1.25, rays: 0.26, glints: 6, eyeGlow: true },
};

function crown(spec: ArtSpec, cx = 50, cy = 52): [number, number][] {
  const total = spec.spikes * 2 + 1;
  const lift = spec.lift ?? 0;
  const pts: [number, number][] = [];
  for (let i = 0; i < total; i++) {
    const t = i / (total - 1);
    let a = 194 - t * 208;
    const tip = i % 2 === 1;
    if (tip) a = a + (90 - a) * lift;
    const rad = (a * Math.PI) / 180;
    const boost = 1 + 0.35 * (1 - Math.abs(t - 0.5) * 2);
    const jitter = 0.82 + 0.36 * (((i * 53) % 7) / 7);
    const len = tip ? 24.5 + spec.spikeH * boost * jitter : 24.2;
    pts.push([cx + len * 0.93 * Math.cos(rad), cy - len * Math.sin(rad)]);
  }
  return pts;
}

const P = (p: [number, number]) => `${n1(p[0])},${n1(p[1])}`;

function hairPath(spec: ArtSpec, pts = crown(spec)): string {
  const first = pts[0];
  let d = 'M' + pts.map(P).join(' L');
  d += spec.peak ? ` L64,45 L50,53 L36,45 L${P(first)} Z` : ` Q50,31 ${P(first)} Z`;
  return d;
}

/** Faceted highlight / shadow planes inside each spike (clipped to the hair silhouette). */
function hairFacets(spec: ArtSpec, pts: [number, number][]): string {
  const c: [number, number] = [50, 50];
  const hi = lighten(spec.hair, 0.55);
  const lo = darken(spec.shade, 0.25);
  let out = '';
  for (let i = 1; i < pts.length - 1; i += 2) {
    const tip = pts[i];
    const l = pts[i - 1];
    const r = pts[i + 1];
    const base: [number, number] = [c[0] + (tip[0] - c[0]) * 0.5, c[1] + (tip[1] - c[1]) * 0.5];
    const midL: [number, number] = [(l[0] + tip[0]) / 2, (l[1] + tip[1]) / 2];
    const midR: [number, number] = [(r[0] + tip[0]) / 2, (r[1] + tip[1]) / 2];
    // light plane on the left of each spike, shadow plane on the right
    out += `<polygon points="${P(l)} ${P(tip)} ${P(base)}" fill="${hi}" opacity=".32"/>`;
    out += `<polygon points="${P(tip)} ${P(r)} ${P(base)}" fill="${lo}" opacity=".38"/>`;
    out += `<polyline points="${P(midL)} ${P(base)} ${P(midR)}" fill="none" stroke="${lo}" stroke-width=".6" opacity=".45" stroke-linejoin="round"/>`;
  }
  return out;
}

function fringe(spec: ArtSpec): string {
  if (spec.peak) return '';
  const d =
    'M33.5 45 L36.5 50.5 L40 45.5 L44.5 51 L48 44.5 L50 49 L52 44.5 L55.5 51 L60 45.5 L63.5 50.5 L66.5 45 L67 40 L33 40 Z';
  return (
    `<path d="${d}" fill="url(#hg)"/>` +
    `<path d="M33.5 45 L36.5 50.5 L40 45.5 L44.5 51 L48 44.5 L50 49 L52 44.5 L55.5 51 L60 45.5 L63.5 50.5 L66.5 45" fill="none" stroke="${spec.shade}" stroke-width=".9" stroke-linejoin="round"/>` +
    `<path d="M36.5 50.5 L40 45.5 L41 49" fill="${lighten(spec.hair, 0.5)}" opacity=".35"/>` +
    `<path d="M55.5 51 L60 45.5 L61 49" fill="${lighten(spec.hair, 0.5)}" opacity=".3"/>`
  );
}

function mouth(spec: ArtSpec): string {
  const ink = '#3a1d17';
  switch (spec.mouth) {
    case 'grin':
      return (
        `<path d="M43 68.6 Q50 78 57 68.6 Z" fill="#7a1f1c" stroke="${ink}" stroke-width="1.1" stroke-linejoin="round"/>` +
        `<path d="M44.6 69.4 L55.4 69.4 L54.4 71 Q50 72.3 45.6 71 Z" fill="#fff"/>` +
        `<path d="M46.5 74.6 Q50 72.8 53.5 74.6 Q50 77 46.5 74.6 Z" fill="#e0675f"/>`
      );
    case 'smile':
      return `<path d="M44 69 Q50 74 56 69" fill="none" stroke="${ink}" stroke-width="1.4" stroke-linecap="round"/><path d="M43.2 68.3 L44.2 69.4 M56.8 68.3 L55.8 69.4" stroke="${ink}" stroke-width="1" stroke-linecap="round"/>`;
    case 'smirk':
      return `<path d="M44.5 70.5 Q51 72.2 57.5 67.2" fill="none" stroke="${ink}" stroke-width="1.5" stroke-linecap="round"/><path d="M57.5 67.2 L58.7 66.4" stroke="${ink}" stroke-width="1" stroke-linecap="round"/>`;
    default:
      return `<path d="M45 70 L55 70" fill="none" stroke="${ink}" stroke-width="1.5" stroke-linecap="round"/><path d="M47 72.2 Q50 73 53 72.2" fill="none" stroke="#000" opacity=".12" stroke-width="1" stroke-linecap="round"/>`;
  }
}

function eyes(spec: ArtSpec, glow: boolean): string {
  const ry = spec.eyeH ?? 5.6;
  const slant = Math.max(0.5, Math.min(3.6, (5.6 - ry) * 2.2 + 0.6));
  const ink = '#1a1210';
  const iris = spec.eye;
  const one = (x: number, side: 1 | -1) => {
    const ix = x;
    const lidTop = 57.4 - ry;
    // slanted upper lid: inner corner lower than the outer one (serious / fierce look)
    const innerX = x - side * -5.6; // toward the nose
    const outerX = x + side * -5.6;
    void outerX;
    const nose = side === 1 ? x + 6 : x - 6; // inner side x
    const far = side === 1 ? x - 6.4 : x + 6.4;
    const lid =
      `<polygon points="${n1(far)},${n1(lidTop - 3)} ${n1(nose)},${n1(lidTop - 3)} ${n1(nose)},${n1(lidTop + slant + 0.6)} ${n1(far)},${n1(lidTop + 0.2)}" fill="url(#sk)"/>` +
      `<path d="M${n1(far)} ${n1(lidTop + 0.2)} L${n1(nose)} ${n1(lidTop + slant + 0.6)}" stroke="${ink}" stroke-width="1.9" stroke-linecap="round"/>`;
    void innerX;
    return (
      (glow ? `<ellipse cx="${ix}" cy="57.4" rx="8" ry="7" fill="${iris}" opacity=".28"/>` : '') +
      `<ellipse cx="${ix}" cy="57" rx="5.4" ry="${ry}" fill="#fff"/>` +
      `<ellipse cx="${ix}" cy="57.4" rx="3.7" ry="${n1(ry - 0.8)}" fill="url(#ir)"/>` +
      `<ellipse cx="${ix}" cy="57.5" rx="1.8" ry="${n1(ry - 2.4)}" fill="#0b0b10"/>` +
      `<ellipse cx="${n1(ix + 1.2)}" cy="${n1(57.4 - ry / 2.6)}" rx="1.25" ry="1.15" fill="#fff"/>` +
      `<circle cx="${n1(ix - 1.3)}" cy="${n1(57.4 + ry / 2.4)}" r=".6" fill="#fff" opacity=".85"/>` +
      `<path d="M${n1(ix - 5.4)} 57.4 Q${ix} ${n1(57 + ry + 1.2)} ${n1(ix + 5.4)} 57.4" fill="none" stroke="#000" opacity=".1" stroke-width="1"/>` +
      lid
    );
  };
  let out = one(40.5, 1) + one(59.5, -1);
  if (spec.brows) {
    const c = spec.browColor ?? spec.hair;
    const col = c === spec.skin ? '#2a2118' : darken(c, 0.12);
    out += `<path d="M32.5 49.2 L46.2 52.4" stroke="${col}" stroke-width="2.9" stroke-linecap="round"/>`;
    out += `<path d="M67.5 49.2 L53.8 52.4" stroke="${col}" stroke-width="2.9" stroke-linecap="round"/>`;
  } else if (spec.hairStyle === 'long') {
    // bare, heavy brow ridge (Super Saiyan 3)
    const col = darken(spec.skin, 0.35);
    out += `<path d="M32 50.6 Q39 46.4 46.6 52" fill="none" stroke="${col}" stroke-width="1.7" stroke-linecap="round" opacity=".85"/>`;
    out += `<path d="M68 50.6 Q61 46.4 53.4 52" fill="none" stroke="${col}" stroke-width="1.7" stroke-linecap="round" opacity=".85"/>`;
  }
  return out;
}

function extras(spec: ArtSpec, aura: string): string {
  switch (spec.extra) {
    case 'krillin': {
      const dots = [37.5, 42].flatMap((y) => [44.5, 50, 55.5].map((x) => `<circle cx="${x}" cy="${y}" r="1.25" fill="#a85f3b"/><circle cx="${x - 0.3}" cy="${y - 0.35}" r=".45" fill="#e9a77e"/>`));
      return dots.join('') + `<path d="M31 62 Q30 64 31.5 65.5 M69 62 Q70 64 68.5 65.5" stroke="#b9805a" stroke-width=".8" fill="none" opacity=".6"/>`;
    }
    case 'tien':
      return (
        `<ellipse cx="50" cy="44.2" rx="3.6" ry="2.6" fill="#fff" stroke="#6f5532" stroke-width=".8"/>` +
        `<circle cx="50" cy="44.2" r="1.7" fill="url(#ir)"/><circle cx="50" cy="44.2" r=".8" fill="#0b0b10"/><circle cx="50.6" cy="43.6" r=".5" fill="#fff"/>`
      );
    case 'piccolo':
      return (
        `<path d="M43 44 L39.6 33" stroke="#4a8a2b" stroke-width="2.2" stroke-linecap="round"/><circle cx="39.4" cy="32.4" r="1.4" fill="#b7f08a"/>` +
        `<path d="M57 44 L60.4 33" stroke="#4a8a2b" stroke-width="2.2" stroke-linecap="round"/><circle cx="60.6" cy="32.4" r="1.4" fill="#b7f08a"/>` +
        `<path d="M44 66 L46 67.6 M56 66 L54 67.6" stroke="#3f7a26" stroke-width=".9" stroke-linecap="round"/>`
      );
    case 'scar':
      return `<path d="M32.5 61.5 L38.2 69.5" stroke="#8d3f30" stroke-width="1.5" stroke-linecap="round"/><path d="M32.2 64 L34.4 63.2 M34.2 66.6 L36.4 65.6" stroke="#8d3f30" stroke-width=".8" stroke-linecap="round"/>`;
    case 'lightning': {
      const bolt = (m: number) => {
        const x = (v: number) => (m === 1 ? v : 100 - v);
        const pts = `${x(13)},24 ${x(22)},37 ${x(16.5)},39.5 ${x(26)},54 ${x(20.5)},56 ${x(28.5)},69`;
        return `<polyline points="${pts}" fill="none" stroke="#38e8ff" stroke-width="3.4" stroke-linejoin="round" stroke-linecap="round" opacity=".28"/>` +
          `<polyline points="${pts}" fill="none" stroke="#c9ffff" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>`;
      };
      return bolt(1) + bolt(-1);
    }
    case 'sparkle':
    default:
      return '';
  }
  void aura;
}

function sparkle(x: number, y: number, s: number, color = '#fff', op = 0.92): string {
  return `<path d="M${x} ${y - s} L${n1(x + s * 0.26)} ${n1(y - s * 0.26)} L${x + s} ${y} L${n1(x + s * 0.26)} ${n1(y + s * 0.26)} L${x} ${y + s} L${n1(x - s * 0.26)} ${n1(y + s * 0.26)} L${x - s} ${y} L${n1(x - s * 0.26)} ${n1(y - s * 0.26)} Z" fill="${color}" opacity="${op}"/>`;
}

const GLINTS: [number, number, number][] = [
  [14, 30, 6], [87, 36, 4.5], [80, 14, 3.6], [18, 60, 3], [88, 62, 3.2], [24, 12, 3],
];

function ears(spec: ArtSpec): string {
  if (spec.extra === 'piccolo') {
    return (
      `<polygon points="29,51 15.5,56 29,65" fill="url(#sk)"/><polygon points="71,51 84.5,56 71,65" fill="url(#sk)"/>` +
      `<polygon points="27.5,55 20,56.2 27.5,60" fill="#000" opacity=".12"/><polygon points="72.5,55 80,56.2 72.5,60" fill="#000" opacity=".12"/>`
    );
  }
  return (
    `<ellipse cx="28.3" cy="58" rx="3.3" ry="4.8" fill="url(#sk)"/><ellipse cx="71.7" cy="58" rx="3.3" ry="4.8" fill="url(#sk)"/>` +
    `<path d="M27.6 56 Q29.6 58 27.8 60.6 M72.4 56 Q70.4 58 72.2 60.6" stroke="#000" opacity=".2" stroke-width=".9" fill="none" stroke-linecap="round"/>`
  );
}

function flames(spec: ArtSpec, form: Form, aura: string, aura2: string): string {
  if (!form.flames) return '';
  const n = form.flames;
  let outer = '';
  let inner = '';
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const x = 6 + t * 88;
    const edge = 1 - Math.abs(t - 0.5) * 1.2;
    const h = (34 + 40 * edge * (0.7 + 0.3 * (((i * 37) % 5) / 5))) * form.flameH;
    const top = Math.max(-6, 92 - h);
    const w = 10 + 2 * edge;
    const lean = (t - 0.5) * -6 + (i % 2 ? 2 : -2);
    outer += `<path d="M${n1(x - w)},104 Q${n1(x - w * 0.5)},${n1((top + 104) / 2)} ${n1(x + lean)},${n1(top)} Q${n1(x + w * 0.5)},${n1((top + 104) / 2 + 6)} ${n1(x + w)},104 Z"/>`;
    inner += `<path d="M${n1(x - w * 0.5)},104 Q${n1(x - w * 0.2)},${n1((top + 104) / 2 + 8)} ${n1(x + lean * 0.8)},${n1(top + 14)} Q${n1(x + w * 0.25)},${n1((top + 104) / 2 + 10)} ${n1(x + w * 0.5)},104 Z"/>`;
  }
  void spec;
  return (
    `<g fill="${aura2}" opacity=".5" filter="url(#bl)">${outer}</g>` +
    `<g fill="url(#fl)" opacity=".8">${outer}</g>` +
    `<g fill="${lighten(aura, 0.6)}" opacity=".45">${inner}</g>`
  );
}

function rays(aura: string, op: number): string {
  if (!op) return '';
  let out = '';
  const n = 16;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = a0 + (Math.PI * 2) / n / 2;
    out += `<polygon points="50,50 ${n1(50 + 90 * Math.cos(a0))},${n1(50 + 90 * Math.sin(a0))} ${n1(50 + 90 * Math.cos(a1))},${n1(50 + 90 * Math.sin(a1))}"/>`;
  }
  return `<g fill="${lighten(aura, 0.35)}" opacity="${op}">${out}</g>`;
}

function outfit(spec: ArtSpec, form: Form): string {
  const base = `<path d="M8 102 Q12 75 50 74 Q88 75 92 102 Z" fill="url(#of)"/>`;
  const rim = `<path d="M9.5 98 Q13 77.5 38 75.4" fill="none" stroke="${lighten(spec.outfit, 0.45)}" stroke-width="1.1" opacity=".5" stroke-linecap="round"/>`;
  let detail = '';
  if (form.armor) {
    // royal blue bodysuit with white battle armour plates and gold trim
    detail =
      `<path d="M22 102 L25 84 Q34 77.5 43.5 79 L45 102 Z" fill="#f4f4f4"/><path d="M78 102 L75 84 Q66 77.5 56.5 79 L55 102 Z" fill="#e4e8f2"/>` +
      `<path d="M25 84 Q34 77.5 43.5 79" fill="none" stroke="#e2b13c" stroke-width="1.6" stroke-linecap="round"/><path d="M75 84 Q66 77.5 56.5 79" fill="none" stroke="#e2b13c" stroke-width="1.6" stroke-linecap="round"/>` +
      `<path d="M45 102 L43.5 79 M55 102 L56.5 79" stroke="#aeb7cf" stroke-width="1"/>` +
      `<path d="M37 77 L50 92 L63 77 Z" fill="${spec.outfit}" opacity=".0"/>`;
  } else if (form.cape) {
    detail = `<path d="M37 77 L50 94 L63 77 Z" fill="${spec.outfit2}" opacity=".95"/><path d="M50 94 L50 102" stroke="#000" opacity=".2"/>`;
  } else {
    detail =
      `<path d="M36 76.5 L50 95 L64 76.5 Z" fill="${spec.outfit2}"/>` +
      `<path d="M36 76.5 L50 95 L64 76.5" fill="none" stroke="${darken(spec.outfit2, 0.35)}" stroke-width=".9" stroke-linejoin="round"/>` +
      `<path d="M31 80 Q40 92 47 102 M69 80 Q60 92 53 102" fill="none" stroke="${darken(spec.outfit, 0.3)}" stroke-width="1" opacity=".55" stroke-linecap="round"/>`;
  }
  const pads = spec.pads
    ? `<ellipse cx="20" cy="87" rx="12" ry="8" fill="${spec.pads}" transform="rotate(-18 20 87)"/><ellipse cx="80" cy="87" rx="12" ry="8" fill="${spec.pads}" transform="rotate(18 80 87)"/>` +
      `<ellipse cx="18" cy="85" rx="7.5" ry="3.4" fill="#fff" opacity=".55" transform="rotate(-18 18 85)"/><ellipse cx="82" cy="85" rx="7.5" ry="3.4" fill="#fff" opacity=".4" transform="rotate(18 82 85)"/>` +
      (form.armor
        ? `<path d="M9.5 90 Q18 96 29 90" fill="none" stroke="#e2b13c" stroke-width="1.6"/><path d="M90.5 90 Q82 96 71 90" fill="none" stroke="#e2b13c" stroke-width="1.6"/>`
        : `<path d="M9.5 90 Q18 96 29 90 M90.5 90 Q82 96 71 90" fill="none" stroke="#bbb" stroke-width="1"/>`)
    : '';
  return base + rim + detail + pads;
}

function buildSvg(spec: ArtSpec, aura: string, aura2: string, value: number): string {
  const form = FORMS[value] ?? FORMS[16384];
  const pts = crown(spec);
  const skinHi = lighten(spec.skin, 0.28);
  const skinLo = darken(spec.skin, 0.16);
  const hairHi = lighten(spec.hair, 0.3);

  const longLocks =
    spec.hairStyle === 'long'
      ? `<path d="M27 42 Q12 70 9 106 L28 82 L37 56 Z" fill="url(#hg)" stroke="${spec.shade}" stroke-width="1" stroke-linejoin="round"/><path d="M73 42 Q88 70 91 106 L72 82 L63 56 Z" fill="url(#hg)" stroke="${spec.shade}" stroke-width="1" stroke-linejoin="round"/>` +
        `<path d="M24 50 Q15 72 13 98" fill="none" stroke="${lighten(spec.hair, 0.55)}" stroke-width="1.4" opacity=".5" stroke-linecap="round"/><path d="M76 50 Q85 72 87 98" fill="none" stroke="${lighten(spec.hair, 0.55)}" stroke-width="1.4" opacity=".4" stroke-linecap="round"/>`
      : '';

  const neck =
    `<path d="M43 70 L43 80 Q50 85 57 80 L57 70 Z" fill="url(#sk)"/>` +
    `<path d="M43 70 L43 78 Q50 83 57 78 L57 70 Z" fill="#000" opacity=".16"/>`;

  const head =
    `<path d="M27.6 50 Q27.2 28 50 27.6 Q72.8 28 72.4 50 Q72.6 63 65 71.5 Q57.5 78.5 50 78.5 Q42.5 78.5 35 71.5 Q27.4 63 27.6 50 Z" fill="url(#sk)"/>` +
    // forehead shadow under the hairline + soft cheek blush + jaw shading
    `<path d="M30 46 Q50 40 70 46 L70 52 Q50 46 30 52 Z" fill="#000" opacity=".1"/>` +
    `<ellipse cx="36" cy="67" rx="5" ry="2.6" fill="#ff6f61" opacity=".22"/><ellipse cx="64" cy="67" rx="5" ry="2.6" fill="#ff6f61" opacity=".22"/>` +
    `<path d="M31 62 Q34 74 46 77.6" fill="none" stroke="#000" opacity=".1" stroke-width="2.2" stroke-linecap="round"/>` +
    `<path d="M69 62 Q66 74 54 77.6" fill="none" stroke="#fff" opacity=".12" stroke-width="1.6" stroke-linecap="round"/>`;
  const nose = `<path d="M49 63 Q50 65.4 51.6 64.4" fill="none" stroke="#000" opacity=".3" stroke-width="1" stroke-linecap="round"/><ellipse cx="50.4" cy="61" rx="1.3" ry="2.4" fill="#fff" opacity=".12"/>`;

  let hair = '';
  if (spec.hairStyle === 'turban') {
    hair =
      `<path d="M26 47.5 Q25 19 50 19.5 Q75 19 74 47.5 Q50 37 26 47.5 Z" fill="#f6f6f6" stroke="#b5b5b5" stroke-width="1"/>` +
      `<path d="M27 41.5 Q50 29.5 73 41.5" fill="none" stroke="#c9c9c9" stroke-width="1.2"/><path d="M29 34 Q50 24 71 34" fill="none" stroke="#dcdcdc" stroke-width="1"/>` +
      `<path d="M30 44 Q50 36 70 44 L70 47 Q50 40 30 47 Z" fill="#000" opacity=".1"/>` +
      `<path d="M33 27 Q42 21.5 52 21" fill="none" stroke="#fff" stroke-width="2" opacity=".8" stroke-linecap="round"/>` +
      `<path d="M48 36.5 L50 41 L52 36.5 Z" fill="#7b4cd6"/>`;
  } else if (spec.hairStyle !== 'bald') {
    hair =
      `<path d="${hairPath(spec, pts)}" fill="url(#hg)" stroke="${spec.shade}" stroke-width="1" stroke-linejoin="round"/>` +
      `<g clip-path="url(#hc)">${hairFacets(spec, pts)}<path d="M33 44 Q50 33 67 44" fill="none" stroke="${hairHi}" stroke-width="2" opacity=".35" stroke-linecap="round"/></g>` +
      fringe(spec);
    if (spec.hairStyle === 'long') {
      hair +=
        `<path d="M43.5 40 L50 60 L56.5 40 Z" fill="url(#hg)" stroke="${spec.shade}" stroke-width=".8" stroke-linejoin="round"/>` +
        `<path d="M46 41 L50 55" stroke="${hairHi}" stroke-width="1" opacity=".5"/>`;
    }
    if (spec.peak) {
      // widow's peak shading
      hair += `<path d="M36 45 L50 53 L64 45" fill="none" stroke="${darken(spec.shade, 0.3)}" stroke-width=".8" stroke-linejoin="round" opacity=".7"/>`;
    }
  }
  const cape =
    form.cape
      ? `<path d="M8 102 Q12 75 50 74 Q88 75 92 102 L83 102 Q79 84 50 83 Q21 84 17 102 Z" fill="#f6f6f6" opacity=".95"/><path d="M17 102 Q21 84 50 83" fill="none" stroke="#bdbdbd" stroke-width=".8"/>`
      : '';

  // brows are drawn above hair/fringe so bangs never hide them
  const brows = spec.brows
    ? (() => {
        const c = spec.browColor ?? spec.hair;
        const col = c === spec.skin ? '#2a2118' : darken(c, 0.12);
        return `<path d="M32.5 49.2 L46.2 52.4" stroke="${col}" stroke-width="2.9" stroke-linecap="round"/><path d="M67.5 49.2 L53.8 52.4" stroke="${col}" stroke-width="2.9" stroke-linecap="round"/>`;
      })()
    : '';

  const glints = Array.from({ length: form.glints }, (_, i) => sparkle(GLINTS[i][0], GLINTS[i][1], GLINTS[i][2], i % 2 ? lighten(aura, 0.6) : '#fff')).join('');
  const showLightning = spec.extra === 'lightning';

  const eyeSvg = eyes(spec, !!form.eyeGlow);
  // eyes() already draws brows; strip those and draw them on top instead (after hair)
  const eyeNoBrows = spec.brows ? eyeSvg.replace(/<path d="M32\.5 49\.2[^>]*\/>/, '').replace(/<path d="M67\.5 49\.2[^>]*\/>/, '') : eyeSvg;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">` +
    `<defs>` +
    `<radialGradient id="bg" cx="50%" cy="42%" r="75%"><stop offset="0" stop-color="${spec.bg[0]}"/><stop offset="1" stop-color="${spec.bg[1]}"/></radialGradient>` +
    `<radialGradient id="au" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${aura}" stop-opacity=".62"/><stop offset=".6" stop-color="${aura2}" stop-opacity=".22"/><stop offset="1" stop-color="${aura}" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="vg" cx="50%" cy="50%" r="72%"><stop offset=".62" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>` +
    `<linearGradient id="hg" gradientUnits="userSpaceOnUse" x1="0" y1="4" x2="0" y2="64"><stop offset="0" stop-color="${hairHi}"/><stop offset=".45" stop-color="${spec.hair}"/><stop offset="1" stop-color="${spec.shade}"/></linearGradient>` +
    `<linearGradient id="sk" gradientUnits="userSpaceOnUse" x1="0" y1="28" x2="0" y2="80"><stop offset="0" stop-color="${skinHi}"/><stop offset=".5" stop-color="${spec.skin}"/><stop offset="1" stop-color="${skinLo}"/></linearGradient>` +
    `<linearGradient id="of" gradientUnits="userSpaceOnUse" x1="0" y1="74" x2="0" y2="102"><stop offset="0" stop-color="${lighten(spec.outfit, 0.18)}"/><stop offset="1" stop-color="${darken(spec.outfit, 0.3)}"/></linearGradient>` +
    `<linearGradient id="ir" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${darken(spec.eye, 0.45)}"/><stop offset=".55" stop-color="${spec.eye}"/><stop offset="1" stop-color="${lighten(spec.eye, 0.5)}"/></linearGradient>` +
    `<linearGradient id="fl" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${aura2}" stop-opacity=".9"/><stop offset="1" stop-color="${lighten(aura, 0.5)}" stop-opacity=".95"/></linearGradient>` +
    `<linearGradient id="gl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
    `<filter id="bl" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2"/></filter>` +
    `<clipPath id="hc"><path d="${hairPath(spec, pts)}"/></clipPath>` +
    `</defs>` +
    `<rect width="100" height="100" fill="url(#bg)"/>` +
    rays(aura, form.rays) +
    `<circle cx="50" cy="52" r="50" fill="url(#au)"/>` +
    flames(spec, form, aura, aura2) +
    longLocks +
    outfit(spec, form) + cape + neck + ears(spec) + head + nose + eyeNoBrows + mouth(spec) + extras(spec, aura) +
    hair + brows +
    (showLightning ? '' : '') +
    glints +
    `<rect width="100" height="100" fill="url(#gl)"/>` +
    `<rect width="100" height="100" fill="url(#vg)"/>` +
    `</svg>`
  );
}

const cache = new Map<number, string>();

/** Data URI portrait for a tile value. */
export function portraitFor(value: number): string {
  const key = characterFor(value).value;
  let uri = cache.get(key);
  if (!uri) {
    const c = characterFor(value);
    uri = 'data:image/svg+xml;utf8,' + encodeURIComponent(buildSvg(c.art, c.aura, c.aura2, c.value));
    cache.set(key, uri);
  }
  return uri;
}
