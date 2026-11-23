/// <reference types="vite/client" />
import { characterFor } from './characters';

import kidGoku from './portraits/kid-goku.jpg';
import krillin from './portraits/krillin.jpg';
import yamcha from './portraits/yamcha.jpg';
import tien from './portraits/tien.jpg';
import piccolo from './portraits/piccolo.jpg';
import vegeta from './portraits/vegeta.jpg';
import goku from './portraits/goku.jpg';
import ssj from './portraits/ssj.jpg';
import ssj2 from './portraits/ssj2.jpg';
import ssj3 from './portraits/ssj3.jpg';
import ssg from './portraits/ssg.jpg';
import ssb from './portraits/ssb.jpg';
import ui from './portraits/ui.jpg';
import mui from './portraits/mui.jpg';

/**
 * Anime-style portrait images (512x512, head-and-shoulders, face centred) — one per tier.
 * Images are bundled by Vite (inlined into the single-file build), so no extra network requests.
 * Public API is unchanged: portraitFor(value) returns an image URL usable as <img src>.
 */
const PORTRAITS: Record<number, string> = {
  2: kidGoku,
  4: krillin,
  8: yamcha,
  16: tien,
  32: piccolo,
  64: vegeta,
  128: goku,
  256: ssj,
  512: ssj2,
  1024: ssj3,
  2048: ssg,
  4096: ssb,
  8192: ui,
  16384: mui,
};

/** Image URL portrait for a tile value. */
export function portraitFor(value: number): string {
  return PORTRAITS[characterFor(value).value];
}
