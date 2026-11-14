/**
 * Character evolution table + procedural art specifications.
 * All portraits are ORIGINAL, simplified chibi-style vector icons generated in code
 * (see art.ts). They are NOT official artwork. See docs/COMPLIANCE.md for IP risks.
 */
export type HairStyle = 'spiky' | 'bald' | 'turban' | 'long';
export type Mouth = 'smile' | 'grin' | 'flat' | 'smirk';
export type Extra = 'krillin' | 'tien' | 'piccolo' | 'scar' | 'lightning' | 'sparkle' | 'none';

export interface ArtSpec {
  skin: string;
  hair: string;
  shade: string;
  eye: string;
  outfit: string;
  outfit2: string;
  pads?: string;
  hairStyle: HairStyle;
  spikes: number;
  spikeH: number;
  lift?: number;
  peak?: boolean;
  brows: boolean;
  browColor?: string;
  eyeH?: number;
  mouth: Mouth;
  extra: Extra;
  bg: [string, string];
}

export interface Character {
  value: number;
  name: string;
  short: string;
  title: string;
  aura: string;
  aura2: string;
  art: ArtSpec;
}

const SKIN = '#f3c496';
const BLACK = '#17171d';
const ORANGE = '#f4801c';
const BLUE = '#2a4ea6';

export const CHARACTERS: Character[] = [
  {
    value: 2, name: 'Kid Goku', short: 'Kid Goku', title: 'The Curious Fighter',
    aura: '#ffb44a', aura2: '#ff7a00',
    art: { skin: SKIN, hair: BLACK, shade: '#2c2c36', eye: '#2a2118', outfit: ORANGE, outfit2: BLUE, hairStyle: 'spiky', spikes: 5, spikeH: 8, brows: true, mouth: 'grin', extra: 'none', bg: ['#3a2a14', '#14100a'] },
  },
  {
    value: 4, name: 'Krillin', short: 'Krillin', title: 'Earth’s Clever Monk',
    aura: '#ffc46b', aura2: '#ff8f1f',
    art: { skin: '#f6d0a6', hair: '#f6d0a6', shade: '#f6d0a6', eye: '#2a2118', outfit: '#e86f12', outfit2: '#f4a43a', hairStyle: 'bald', spikes: 0, spikeH: 0, brows: false, mouth: 'smile', extra: 'krillin', bg: ['#3b2a1b', '#15100b'] },
  },
  {
    value: 8, name: 'Yamcha', short: 'Yamcha', title: 'Desert Bandit',
    aura: '#ffd27a', aura2: '#e0922b',
    art: { skin: '#ecbd8c', hair: '#201c20', shade: '#35303a', eye: '#2a2118', outfit: '#e9e3d4', outfit2: '#d46a1e', hairStyle: 'spiky', spikes: 7, spikeH: 7, brows: true, mouth: 'smirk', extra: 'scar', bg: ['#33291c', '#13100c'] },
  },
  {
    value: 16, name: 'Tien Shinhan', short: 'Tien', title: 'Three-Eyed Master',
    aura: '#9be37f', aura2: '#35b24e',
    art: { skin: '#e8c08c', hair: '#e8c08c', shade: '#e8c08c', eye: '#243326', outfit: '#1f9a56', outfit2: '#e8c08c', hairStyle: 'bald', spikes: 0, spikeH: 0, brows: true, browColor: '#2a2118', mouth: 'flat', extra: 'tien', bg: ['#1e3326', '#0c130e'] },
  },
  {
    value: 32, name: 'Piccolo', short: 'Piccolo', title: 'Namekian Warrior',
    aura: '#b387ff', aura2: '#7b4cd6',
    art: { skin: '#79bd4b', hair: '#f1f1f1', shade: '#cfcfcf', eye: '#2a1b33', outfit: '#6a42a8', outfit2: '#f1f1f1', pads: '#f1f1f1', hairStyle: 'turban', spikes: 0, spikeH: 0, brows: true, browColor: '#1f3d17', mouth: 'flat', extra: 'piccolo', bg: ['#2a1f3d', '#0f0b16'] },
  },
  {
    value: 64, name: 'Vegeta', short: 'Vegeta', title: 'Prince of Saiyans',
    aura: '#6fb4ff', aura2: '#2c6bd6',
    art: { skin: '#f0bd8e', hair: '#16161c', shade: '#2b2b38', eye: '#17171d', outfit: '#2a4ea6', outfit2: '#f4f4f4', pads: '#f4f4f4', hairStyle: 'spiky', spikes: 4, spikeH: 15, lift: 0.7, peak: true, brows: true, mouth: 'smirk', extra: 'none', bg: ['#17284a', '#0a0e18'] },
  },
  {
    value: 128, name: 'Goku', short: 'Goku', title: 'Saiyan Raised on Earth',
    aura: '#ffa23d', aura2: '#ff6a00',
    art: { skin: SKIN, hair: BLACK, shade: '#2e2e3a', eye: '#2a2118', outfit: ORANGE, outfit2: BLUE, hairStyle: 'spiky', spikes: 6, spikeH: 15, brows: true, mouth: 'grin', extra: 'none', bg: ['#40240c', '#140c06'] },
  },
  {
    value: 256, name: 'Super Saiyan Goku', short: 'SSJ Goku', title: 'The Golden Warrior',
    aura: '#ffe14d', aura2: '#ffb300',
    art: { skin: SKIN, hair: '#ffd93b', shade: '#e3a400', eye: '#1fb9b0', outfit: ORANGE, outfit2: BLUE, hairStyle: 'spiky', spikes: 6, spikeH: 17, brows: true, eyeH: 4.8, mouth: 'smirk', extra: 'none', bg: ['#5a4310', '#1a1305'] },
  },
  {
    value: 512, name: 'Super Saiyan 2 Goku', short: 'SSJ2 Goku', title: 'Lightning Surge',
    aura: '#fff06a', aura2: '#ffc400',
    art: { skin: SKIN, hair: '#ffe047', shade: '#e8a800', eye: '#1fcfc2', outfit: ORANGE, outfit2: BLUE, hairStyle: 'spiky', spikes: 7, spikeH: 18, lift: 0.25, brows: true, eyeH: 4.5, mouth: 'smirk', extra: 'lightning', bg: ['#5f4a10', '#1b1405'] },
  },
  {
    value: 1024, name: 'Super Saiyan 3 Goku', short: 'SSJ3 Goku', title: 'Limit Breaker',
    aura: '#ffe95c', aura2: '#ff9d00',
    art: { skin: SKIN, hair: '#ffd531', shade: '#df9a00', eye: '#1fcfc2', outfit: ORANGE, outfit2: BLUE, hairStyle: 'long', spikes: 7, spikeH: 19, lift: 0.35, brows: false, eyeH: 4.4, mouth: 'flat', extra: 'lightning', bg: ['#664d0b', '#1c1404'] },
  },
  {
    value: 2048, name: 'Super Saiyan God Goku', short: 'SSG Goku', title: 'Divine Crimson',
    aura: '#ff4a5c', aura2: '#d4102a',
    art: { skin: SKIN, hair: '#e8203a', shade: '#a80f26', eye: '#ff3a4e', outfit: ORANGE, outfit2: BLUE, hairStyle: 'spiky', spikes: 6, spikeH: 16, lift: 0.1, brows: true, eyeH: 4.8, mouth: 'smirk', extra: 'sparkle', bg: ['#5a1018', '#1a0509'] },
  },
  {
    value: 4096, name: 'Super Saiyan Blue Goku', short: 'SSB Goku', title: 'Blue Divinity',
    aura: '#3cc8ff', aura2: '#1676ff',
    art: { skin: SKIN, hair: '#2fb4ff', shade: '#1578d6', eye: '#4fd4ff', outfit: ORANGE, outfit2: BLUE, hairStyle: 'spiky', spikes: 6, spikeH: 16, lift: 0.1, brows: true, eyeH: 4.8, mouth: 'smirk', extra: 'sparkle', bg: ['#0f3a66', '#050f1c'] },
  },
  {
    value: 8192, name: 'Ultra Instinct Goku', short: 'UI Goku', title: 'Autonomous Instinct',
    aura: '#cfe3ff', aura2: '#7fa8ff',
    art: { skin: SKIN, hair: '#c9d2e4', shade: '#8d99b5', eye: '#d8e3f5', outfit: ORANGE, outfit2: BLUE, hairStyle: 'spiky', spikes: 6, spikeH: 15, lift: 0.1, brows: true, eyeH: 4.4, mouth: 'flat', extra: 'sparkle', bg: ['#26385c', '#080c16'] },
  },
  {
    value: 16384, name: 'Mastered Ultra Instinct Goku', short: 'MUI Goku', title: 'Perfected Instinct',
    aura: '#ffffff', aura2: '#a9c4ff',
    art: { skin: SKIN, hair: '#f6f8ff', shade: '#b5c0dc', eye: '#ffffff', outfit: '#e7ecfa', outfit2: '#3a4f93', hairStyle: 'spiky', spikes: 7, spikeH: 17, lift: 0.15, brows: true, eyeH: 4.2, mouth: 'flat', extra: 'sparkle', bg: ['#3a4f82', '#0a0f1d'] },
  },
];

export const MAX_TILE_VALUE = CHARACTERS[CHARACTERS.length - 1].value;
export const VICTORY_VALUE = 2048;

const byValue = new Map(CHARACTERS.map((c) => [c.value, c]));

/** Returns the character for a tile value (values beyond the table reuse the final form). */
export function characterFor(value: number): Character {
  return byValue.get(value) ?? CHARACTERS[CHARACTERS.length - 1];
}

export function tierIndex(value: number): number {
  const i = CHARACTERS.findIndex((c) => c.value === value);
  return i === -1 ? CHARACTERS.length - 1 : i;
}

export function nextCharacter(value: number): Character | null {
  const i = CHARACTERS.findIndex((c) => c.value === value);
  if (i === -1 || i === CHARACTERS.length - 1) return null;
  return CHARACTERS[i + 1];
}
