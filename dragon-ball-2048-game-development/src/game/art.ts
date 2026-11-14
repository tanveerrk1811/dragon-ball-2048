import { characterFor, type ArtSpec } from './characters';

/**
 * Procedural, original vector portraits. Each tile value is rendered once and cached as an
 * SVG data URI, so the DOM only contains lightweight <img> elements (no duplicate gradient ids).
 */
const n1 = (n: number) => Math.round(n * 10) / 10;

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

function hairPath(spec: ArtSpec): string {
  const pts = crown(spec);
  const first = pts[0];
  const last = pts[pts.length - 1];
  let d = 'M' + pts.map((p) => `${n1(p[0])},${n1(p[1])}`).join(' L');
  d += spec.peak
    ? ` L64,45 L50,53 L36,45 L${n1(first[0])},${n1(first[1])} Z`
    : ` Q50,31 ${n1(first[0])},${n1(first[1])} Z`;
  void last;
  return d;
}

function mouth(spec: ArtSpec): string {
  const ink = '#3a1d17';
  switch (spec.mouth) {
    case 'grin':
      return `<path d="M43 69 Q50 77 57 69 Z" fill="#8a2a22" stroke="${ink}" stroke-width="1.2" stroke-linejoin="round"/>`;
    case 'smile':
      return `<path d="M44 69 Q50 73.5 56 69" fill="none" stroke="${ink}" stroke-width="1.4" stroke-linecap="round"/>`;
    case 'smirk':
      return `<path d="M44.5 70.5 Q51 72 57 67.5" fill="none" stroke="${ink}" stroke-width="1.5" stroke-linecap="round"/>`;
    default:
      return `<path d="M45 70 L55 70" fill="none" stroke="${ink}" stroke-width="1.5" stroke-linecap="round"/>`;
  }
}

function eyes(spec: ArtSpec): string {
  const ry = spec.eyeH ?? 5.6;
  const one = (x: number) =>
    `<ellipse cx="${x}" cy="57" rx="5.2" ry="${ry}" fill="#fff"/>` +
    `<ellipse cx="${x}" cy="57.4" rx="3.5" ry="${n1(ry - 1)}" fill="${spec.eye}"/>` +
    `<ellipse cx="${x}" cy="57.4" rx="1.7" ry="${n1(ry - 2.6)}" fill="#0b0b10"/>` +
    `<circle cx="${x + 1.1}" cy="${n1(57.4 - ry / 3)}" r="1" fill="#fff"/>`;
  let out = one(40.5) + one(59.5);
  if (spec.brows) {
    const c = spec.browColor ?? spec.hair;
    const col = c === spec.skin ? '#2a2118' : c;
    out += `<path d="M33.5 49.5 L46 52.5" stroke="${col}" stroke-width="2.6" stroke-linecap="round"/>`;
    out += `<path d="M66.5 49.5 L54 52.5" stroke="${col}" stroke-width="2.6" stroke-linecap="round"/>`;
  }
  return out;
}

function extras(spec: ArtSpec): string {
  switch (spec.extra) {
    case 'krillin': {
      const dots = [37.5, 42].flatMap((y) => [44.5, 50, 55.5].map((x) => `<circle cx="${x}" cy="${y}" r="1.2" fill="#9a5b3a"/>`));
      return dots.join('');
    }
    case 'tien':
      return `<ellipse cx="50" cy="44.5" rx="3.3" ry="2.4" fill="#fff" stroke="#8a6a42" stroke-width=".7"/><circle cx="50" cy="44.5" r="1.5" fill="#243326"/>`;
    case 'piccolo':
      return `<path d="M43 44 L40 35" stroke="#4f8a2f" stroke-width="2" stroke-linecap="round"/><path d="M57 44 L60 35" stroke="#4f8a2f" stroke-width="2" stroke-linecap="round"/>`;
    case 'scar':
      return `<path d="M32.5 62 L38 69" stroke="#9a4d3b" stroke-width="1.4" stroke-linecap="round"/>`;
    case 'lightning': {
      const bolt = (m: number) => {
        const x = (v: number) => (m === 1 ? v : 100 - v);
        return `<polyline points="${x(14)},26 ${x(22)},38 ${x(17)},40 ${x(26)},54 ${x(21)},56 ${x(28)},68" fill="none" stroke="#9ffcff" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round" opacity=".9"/>`;
      };
      return bolt(1) + bolt(-1);
    }
    case 'sparkle': {
      const star = (x: number, y: number, s: number) =>
        `<path d="M${x} ${y - s} L${x + s * 0.28} ${y - s * 0.28} L${x + s} ${y} L${x + s * 0.28} ${y + s * 0.28} L${x} ${y + s} L${x - s * 0.28} ${y + s * 0.28} L${x - s} ${y} L${x - s * 0.28} ${y - s * 0.28} Z" fill="#fff" opacity=".9"/>`;
      return star(14, 30, 6) + star(87, 38, 4.5) + star(80, 15, 3.5) + star(19, 60, 3);
    }
    default:
      return '';
  }
}

function ears(spec: ArtSpec): string {
  if (spec.extra === 'piccolo') {
    return `<polygon points="28.5,52 17,56 28.5,64" fill="${spec.skin}"/><polygon points="71.5,52 83,56 71.5,64" fill="${spec.skin}"/>`;
  }
  return `<ellipse cx="28.3" cy="58" rx="3.2" ry="4.6" fill="${spec.skin}"/><ellipse cx="71.7" cy="58" rx="3.2" ry="4.6" fill="${spec.skin}"/>`;
}

function buildSvg(spec: ArtSpec, aura: string): string {
  const longLocks =
    spec.hairStyle === 'long'
      ? `<path d="M28 44 L12 98 L31 74 L37 56 Z" fill="url(#hg)"/><path d="M72 44 L88 98 L69 74 L63 56 Z" fill="url(#hg)"/>`
      : '';
  const body =
    `<path d="M10 101 Q14 76 50 75 Q86 76 90 101 Z" fill="${spec.outfit}"/>` +
    `<path d="M37 77 L50 94 L63 77 Z" fill="${spec.outfit2}"/>` +
    (spec.pads
      ? `<ellipse cx="21" cy="86" rx="11" ry="7.5" fill="${spec.pads}" transform="rotate(-18 21 86)"/><ellipse cx="79" cy="86" rx="11" ry="7.5" fill="${spec.pads}" transform="rotate(18 79 86)"/>`
      : '');
  const neck = `<rect x="43.5" y="72" width="13" height="9" rx="3" fill="${spec.skin}"/><rect x="43.5" y="72" width="13" height="3" fill="#000" opacity=".12"/>`;
  const head = `<ellipse cx="50" cy="52" rx="22" ry="24" fill="${spec.skin}"/>`;
  const nose = `<ellipse cx="50" cy="64" rx="1.1" ry=".8" fill="#000" opacity=".28"/>`;
  let hair = '';
  if (spec.hairStyle === 'turban') {
    hair = `<path d="M26.5 47 Q26 20 50 20.5 Q74 20 73.5 47 Q50 37 26.5 47 Z" fill="#f4f4f4" stroke="#bdbdbd" stroke-width="1"/><path d="M27 41 Q50 30 73 41" fill="none" stroke="#cfcfcf" stroke-width="1.2"/>`;
  } else if (spec.hairStyle !== 'bald') {
    hair = `<path d="${hairPath(spec)}" fill="url(#hg)" stroke="${spec.shade}" stroke-width="1" stroke-linejoin="round"/>`;
    if (spec.hairStyle === 'long') {
      hair += `<path d="M44 40 L50 56 L56 40 Z" fill="${spec.hair}" stroke="${spec.shade}" stroke-width=".8"/>`;
    }
  }
  const cape = spec.hairStyle === 'turban' ? `<path d="M10 101 Q14 76 50 75 Q86 76 90 101 L82 101 Q78 84 50 83 Q22 84 18 101 Z" fill="#f4f4f4" opacity=".92"/>` : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">` +
    `<defs><radialGradient id="bg" cx="50%" cy="42%" r="75%"><stop offset="0" stop-color="${spec.bg[0]}"/><stop offset="1" stop-color="${spec.bg[1]}"/></radialGradient>` +
    `<radialGradient id="au" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${aura}" stop-opacity=".55"/><stop offset="1" stop-color="${aura}" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="hg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${spec.hair}"/><stop offset="1" stop-color="${spec.shade}"/></linearGradient></defs>` +
    `<rect width="100" height="100" fill="url(#bg)"/><circle cx="50" cy="52" r="48" fill="url(#au)"/>` +
    longLocks + body + cape + neck + ears(spec) + head + nose + eyes(spec) + mouth(spec) + extras(spec) + hair +
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
    uri = 'data:image/svg+xml;utf8,' + encodeURIComponent(buildSvg(c.art, c.aura));
    cache.set(key, uri);
  }
  return uri;
}
