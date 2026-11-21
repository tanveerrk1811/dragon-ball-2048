import assert from 'node:assert/strict';
import { GameManager, Tile, type Meta, type Renderer } from '../src/game/engine';
import { MemoryStore } from '../src/game/storage';
import { CHARACTERS, characterFor, nextCharacter } from '../src/game/characters';
import { portraitFor } from '../src/game/art';
import { defaultConfig, mergeConfig, validateConfig, validatePlacement, deviceFor } from '../src/game/ads/ad-config';

let passed = 0;
const test = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log('  ✓', name);
};

function make(hooks = {}) {
  const metas: Meta[] = [];
  const renderer: Renderer = { actuate: (_g, m) => metas.push(m), continueGame: () => undefined };
  const input = { on: () => undefined };
  const store = new MemoryStore();
  const g = new GameManager(4, input, store, renderer, hooks);
  return { g, store, metas };
}
function put(g: GameManager, rows: number[][]) {
  // rows[y][x]
  g.grid.eachCell((x, y) => { g.grid.cells[x][y] = null; });
  rows.forEach((row, y) => row.forEach((v, x) => { if (v) g.grid.cells[x][y] = new Tile({ x, y }, v); }));
}
const rowOf = (g: GameManager, y: number) => [0, 1, 2, 3].map((x) => g.grid.cells[x][y]?.value ?? 0);
const count = (g: GameManager) => g.grid.cells.flat().filter(Boolean).length;

console.log('Engine');
test('starts with two tiles, score 0', () => {
  const { g } = make();
  assert.equal(count(g), 2);
  assert.equal(g.score, 0);
});
test('slide left merges once per pair: [2,2,2,2] -> [4,4,0,0]', () => {
  const { g } = make();
  put(g, [[2, 2, 2, 2], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
  assert.equal(g.move(3), true);
  assert.deepEqual(rowOf(g, 0).slice(0, 2), [4, 4]);
  assert.equal(g.score, 8);
});
test('no double merge: [4,2,2,0] left -> [4,4,0,0]', () => {
  const { g } = make();
  put(g, [[4, 2, 2, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
  g.move(3);
  assert.deepEqual(rowOf(g, 0).slice(0, 2), [4, 4]);
});
test('spawns exactly one tile after a valid move', () => {
  const { g } = make();
  put(g, [[2, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
  g.move(1);
  assert.equal(count(g), 2);
});
test('invalid move does not spawn or change score', () => {
  const { g } = make();
  put(g, [[2, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
  assert.equal(g.move(3), false);
  assert.equal(count(g), 1);
});
test('vertical moves work (up/down)', () => {
  const { g } = make();
  put(g, [[2, 0, 0, 0], [2, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
  g.move(0);
  assert.equal(g.grid.cells[0][0]?.value, 4);
});
test('game over detected on full board without merges', () => {
  let over = 0;
  const { g, metas } = make({ onGameOver: () => over++ });
  put(g, [[2, 4, 2, 4], [4, 2, 4, 2], [64, 4, 2, 4], [8, 16, 32, 0]]);
  g.move(1); // last row slides right, the spawn (2 or 4) can never merge with its neighbours
  assert.equal(over, 1);
  assert.equal(g.over, true);
  assert.equal(metas[metas.length - 1].over, true);
  assert.equal(g.move(1), false);
});
test('game over: terminal board has no moves', () => {
  const { g } = make();
  put(g, [[2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 2]]);
  assert.equal(g.movesAvailable(), false);
});
test('win at 2048, can keep playing afterwards', () => {
  let won = 0;
  const { g } = make({ onWin: () => won++ });
  put(g, [[1024, 1024, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
  g.move(3);
  assert.equal(won, 1);
  assert.equal(g.won, true);
  assert.equal(g.isGameTerminated(), true);
  assert.equal(g.move(3), false);
  g.continuePlaying();
  assert.equal(g.isGameTerminated(), false);
  put(g, [[2048, 2048, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
  g.move(3);
  assert.equal(g.grid.cells[0][0]?.value, 4096);
  assert.equal(won, 1);
});
test('evolution beyond 2048 up to 16384 merges correctly', () => {
  const { g } = make();
  put(g, [[8192, 8192, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
  g.move(3);
  assert.equal(g.grid.cells[0][0]?.value, 16384);
});
test('best score + highest unlocked persisted via store', () => {
  const { g, store } = make();
  put(g, [[64, 64, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
  g.move(3);
  assert.equal(store.getBestScore(), 128);
  assert.equal(store.getHighest(), 128);
});
test('restart resets board and keeps best score', () => {
  const { g, store } = make();
  put(g, [[64, 64, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
  g.move(3);
  g.restart();
  assert.equal(g.score, 0);
  assert.equal(count(g), 2);
  assert.equal(store.getBestScore(), 128);
});
test('undo restores the previous position (rewarded undo)', () => {
  const { g } = make();
  put(g, [[2, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
  g.move(3);
  assert.equal(g.score, 4);
  assert.equal(g.undo(), true);
  assert.equal(g.score, 0);
  assert.deepEqual(rowOf(g, 0), [2, 2, 0, 0]);
  assert.equal(g.undo(), false);
});
test('saved game state is restored by a new manager', () => {
  const { g, store } = make();
  put(g, [[2, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
  g.move(3);
  const renderer: Renderer = { actuate: () => undefined, continueGame: () => undefined };
  const g2 = new GameManager(4, { on: () => undefined }, store, renderer);
  assert.equal(g2.score, 4);
});

console.log('Characters & art');
test('14-step evolution table matches the brief', () => {
  assert.equal(CHARACTERS.length, 14);
  assert.equal(characterFor(2).name, 'Kid Goku');
  assert.equal(characterFor(64).name, 'Vegeta');
  assert.equal(characterFor(2048).name, 'Super Saiyan God Goku');
  assert.equal(characterFor(16384).name, 'Mastered Ultra Instinct Goku');
  assert.equal(nextCharacter(16384), null);
  assert.equal(nextCharacter(2)?.value, 4);
});
test('every tier renders a distinct SVG portrait', () => {
  const set = new Set(CHARACTERS.map((c) => portraitFor(c.value)));
  assert.equal(set.size, 14);
  CHARACTERS.forEach((c) => assert.ok(portraitFor(c.value).startsWith('data:image/svg+xml')));
});

console.log('Ad configuration');
test('defaults are fully disabled and valid', () => {
  const c = defaultConfig();
  assert.equal(c.masterEnabled, false);
  assert.equal(c.web.enabled, false);
  assert.equal(c.android.enabled, false);
  assert.ok(Object.values(c.placements).every((p) => !p.enabled));
  assert.equal(validateConfig(c).filter((i) => i.level === 'error').length, 0);
});
test('invalid AdSense ids are rejected, valid ones accepted', () => {
  const c = defaultConfig();
  c.placements.topBanner.enabled = true;
  c.placements.topBanner.network = 'adsense';
  assert.ok(validatePlacement(c, 'topBanner').length >= 2);
  c.networks.adsense.publisherId = 'ca-pub-1234567890123456';
  c.placements.topBanner.adsense.slotId = '1234567890';
  assert.equal(validatePlacement(c, 'topBanner').length, 0);
});
test('Adsterra banner/native validation', () => {
  const c = defaultConfig();
  const p = c.placements.bottomBanner;
  p.enabled = true; p.network = 'adsterra';
  assert.ok(validatePlacement(c, 'bottomBanner').length > 0);
  p.adsterra.scriptSrc = '//example.com/abc/invoke.js';
  p.adsterra.key = 'a'.repeat(32);
  assert.equal(validatePlacement(c, 'bottomBanner').length, 0);
  p.adsterra.format = 'native';
  assert.ok(validatePlacement(c, 'bottomBanner').length > 0);
  p.adsterra.containerId = 'container-abc123';
  assert.equal(validatePlacement(c, 'bottomBanner').length, 0);
  p.adsterra.scriptSrc = 'javascript:alert(1)';
  assert.ok(validatePlacement(c, 'bottomBanner').length > 0);
});
test('mergeConfig ignores unknown keys and wrong types (hostile/garbled JSON)', () => {
  const c = mergeConfig({ masterEnabled: 'yes', evil: 1, web: { enabled: true, requireConsent: 5 } });
  assert.equal(c.masterEnabled, false);
  assert.equal(c.web.enabled, true);
  assert.equal(c.web.requireConsent, true);
  assert.equal((c as unknown as Record<string, unknown>).evil, undefined);
  assert.equal(mergeConfig(null).masterEnabled, false);
});
test('device breakpoints', () => {
  assert.equal(deviceFor(390), 'mobile');
  assert.equal(deviceFor(820), 'tablet');
  assert.equal(deviceFor(1440), 'desktop');
});

console.log(`\n${passed} tests passed`);
