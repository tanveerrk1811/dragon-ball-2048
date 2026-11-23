/**
 * Classic 2048 engine (Tile, Grid, GameManager) re-implemented for this project.
 * Mechanics follow the original open-source game: 4x4 board, slide + single merge per move,
 * spawn 2 (90%) / 4 (10%), win at 2048 with "keep playing", game-over when no moves remain.
 * The engine has no DOM / ads / analytics dependencies — those attach via hooks.
 */
import { VICTORY_VALUE } from './characters';
import type { Store } from './storage';

export interface Pos { x: number; y: number }

export class Tile {
  x: number;
  y: number;
  value: number;
  previousPosition: Pos | null = null;
  mergedFrom: Tile[] | null = null;
  constructor(position: Pos, value = 2) {
    this.x = position.x;
    this.y = position.y;
    this.value = value;
  }
  savePosition() { this.previousPosition = { x: this.x, y: this.y }; }
  updatePosition(p: Pos) { this.x = p.x; this.y = p.y; }
  serialize() { return { position: { x: this.x, y: this.y }, value: this.value }; }
}

type SerializedTile = ReturnType<Tile['serialize']>;
export interface SerializedGrid { size: number; cells: (SerializedTile | null)[][] }

export class Grid {
  cells: (Tile | null)[][];
  constructor(public size: number, previous?: SerializedGrid) {
    this.cells = previous ? this.fromState(previous.cells) : this.empty();
  }
  private empty() {
    return Array.from({ length: this.size }, () => Array<Tile | null>(this.size).fill(null));
  }
  private fromState(state: (SerializedTile | null)[][]) {
    const cells = this.empty();
    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.size; y++) {
        const t = state[x]?.[y];
        cells[x][y] = t ? new Tile(t.position, t.value) : null;
      }
    }
    return cells;
  }
  randomAvailableCell(): Pos | undefined {
    const cells = this.availableCells();
    return cells.length ? cells[Math.floor(Math.random() * cells.length)] : undefined;
  }
  availableCells(): Pos[] {
    const out: Pos[] = [];
    this.eachCell((x, y, t) => { if (!t) out.push({ x, y }); });
    return out;
  }
  eachCell(cb: (x: number, y: number, t: Tile | null) => void) {
    for (let x = 0; x < this.size; x++) for (let y = 0; y < this.size; y++) cb(x, y, this.cells[x][y]);
  }
  cellsAvailable() { return this.availableCells().length > 0; }
  cellAvailable(c: Pos) { return !this.cellContent(c); }
  cellOccupied(c: Pos) { return !!this.cellContent(c); }
  cellContent(c: Pos): Tile | null {
    return this.withinBounds(c) ? this.cells[c.x][c.y] : null;
  }
  insertTile(t: Tile) { this.cells[t.x][t.y] = t; }
  removeTile(t: Tile) { this.cells[t.x][t.y] = null; }
  withinBounds(c: Pos) { return c.x >= 0 && c.x < this.size && c.y >= 0 && c.y < this.size; }
  highest(): number {
    let max = 0;
    this.eachCell((_x, _y, t) => { if (t && t.value > max) max = t.value; });
    return max;
  }
  serialize(): SerializedGrid {
    return { size: this.size, cells: this.cells.map((col) => col.map((t) => (t ? t.serialize() : null))) };
  }
}

export interface Meta {
  score: number;
  over: boolean;
  won: boolean;
  bestScore: number;
  terminated: boolean;
  highest: number;
  highestEver: number;
  merged: number[];
  canUndo: boolean;
  moved: boolean;
}

export interface Renderer {
  actuate(grid: Grid, meta: Meta): void;
  continueGame(): void;
}

export interface Hooks {
  onStart?(): void;
  onMove?(info: { moved: boolean; merged: number[] }): void;
  onWin?(): void;
  onGameOver?(score: number): void;
  onUnlock?(value: number): void;
}

export interface MoveSource { on(event: 'move', cb: (dir: number) => void): void }

interface Snapshot { grid: SerializedGrid; score: number; over: boolean; won: boolean; keepPlaying: boolean }

export class GameManager {
  grid!: Grid;
  score = 0;
  over = false;
  won = false;
  keepPlaying = false;
  startTiles = 2;
  private snapshot: Snapshot | null = null;
  private mergedThisMove: number[] = [];

  constructor(
    public size: number,
    input: MoveSource,
    private storage: Store,
    private renderer: Renderer,
    private hooks: Hooks = {},
  ) {
    input.on('move', (d) => this.move(d));
    this.setup();
  }

  restart() {
    this.storage.clearGameState();
    this.renderer.continueGame();
    this.snapshot = null;
    this.setup(true);
  }

  continuePlaying() {
    this.keepPlaying = true;
    this.renderer.continueGame();
  }

  isGameTerminated() { return this.over || (this.won && !this.keepPlaying); }

  setup(fresh = false) {
    const prev = fresh ? null : this.storage.getGameState();
    if (prev) {
      this.grid = new Grid(prev.grid.size, prev.grid);
      this.score = prev.score;
      this.over = prev.over;
      this.won = prev.won;
      this.keepPlaying = prev.keepPlaying;
    } else {
      this.grid = new Grid(this.size);
      this.score = 0;
      this.over = false;
      this.won = false;
      this.keepPlaying = false;
      this.addStartTiles();
      this.hooks.onStart?.();
    }
    this.mergedThisMove = [];
    this.actuate(false);
  }

  private addStartTiles() { for (let i = 0; i < this.startTiles; i++) this.addRandomTile(); }

  addRandomTile() {
    if (!this.grid.cellsAvailable()) return;
    const value = Math.random() < 0.9 ? 2 : 4;
    this.grid.insertTile(new Tile(this.grid.randomAvailableCell()!, value));
  }

  private actuate(moved: boolean) {
    if (this.storage.getBestScore() < this.score) this.storage.setBestScore(this.score);
    if (this.over) this.storage.clearGameState();
    else this.storage.setGameState(this.serialize());
    const highest = this.grid.highest();
    const ever = this.storage.getHighest();
    if (highest > ever) {
      this.storage.setHighest(highest);
      if (highest >= 8) this.hooks.onUnlock?.(highest);
    }
    this.renderer.actuate(this.grid, {
      score: this.score,
      over: this.over,
      won: this.won,
      bestScore: this.storage.getBestScore(),
      terminated: this.isGameTerminated(),
      highest,
      highestEver: this.storage.getHighest(),
      merged: this.mergedThisMove,
      canUndo: !!this.snapshot,
      moved,
    });
  }

  serialize(): Snapshot {
    return { grid: this.grid.serialize(), score: this.score, over: this.over, won: this.won, keepPlaying: this.keepPlaying };
  }

  /** Restores the state before the last successful move (used by the optional rewarded Undo). */
  undo(): boolean {
    if (!this.snapshot) return false;
    const s = this.snapshot;
    this.grid = new Grid(s.grid.size, s.grid);
    this.score = s.score;
    this.over = s.over;
    this.won = s.won;
    this.keepPlaying = s.keepPlaying;
    this.snapshot = null;
    this.mergedThisMove = [];
    this.actuate(false);
    return true;
  }

  private prepareTiles() {
    this.grid.eachCell((_x, _y, t) => {
      if (t) { t.mergedFrom = null; t.savePosition(); }
    });
  }

  private moveTile(tile: Tile, cell: Pos) {
    this.grid.cells[tile.x][tile.y] = null;
    this.grid.cells[cell.x][cell.y] = tile;
    tile.updatePosition(cell);
  }

  /** direction: 0 up, 1 right, 2 down, 3 left */
  move(direction: number): boolean {
    if (this.isGameTerminated()) return false;
    const vector = this.getVector(direction);
    const traversals = this.buildTraversals(vector);
    const before = this.serialize();
    let moved = false;
    this.mergedThisMove = [];
    this.prepareTiles();

    traversals.x.forEach((x) => {
      traversals.y.forEach((y) => {
        const cell = { x, y };
        const tile = this.grid.cellContent(cell);
        if (!tile) return;
        const positions = this.findFarthestPosition(cell, vector);
        const next = this.grid.cellContent(positions.next);
        if (next && next.value === tile.value && !next.mergedFrom) {
          const merged = new Tile(positions.next, tile.value * 2);
          merged.mergedFrom = [tile, next];
          this.grid.insertTile(merged);
          this.grid.removeTile(tile);
          tile.updatePosition(positions.next);
          this.score += merged.value;
          this.mergedThisMove.push(merged.value);
          if (merged.value === VICTORY_VALUE && !this.won) {
            this.won = true;
            this.hooks.onWin?.();
          }
        } else {
          this.moveTile(tile, positions.farthest);
        }
        if (cell.x !== tile.x || cell.y !== tile.y) moved = true;
      });
    });

    if (moved) {
      this.snapshot = before;
      this.addRandomTile();
      if (!this.movesAvailable()) {
        this.over = true;
        this.hooks.onGameOver?.(this.score);
      }
      this.hooks.onMove?.({ moved, merged: this.mergedThisMove });
      this.actuate(true);
    }
    return moved;
  }

  getVector(d: number): Pos {
    return ([{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }] as Pos[])[d];
  }

  buildTraversals(v: Pos) {
    const t = { x: [] as number[], y: [] as number[] };
    for (let i = 0; i < this.size; i++) { t.x.push(i); t.y.push(i); }
    if (v.x === 1) t.x.reverse();
    if (v.y === 1) t.y.reverse();
    return t;
  }

  findFarthestPosition(cell: Pos, v: Pos) {
    let previous: Pos;
    let c = cell;
    do {
      previous = c;
      c = { x: previous.x + v.x, y: previous.y + v.y };
    } while (this.grid.withinBounds(c) && this.grid.cellAvailable(c));
    return { farthest: previous, next: c };
  }

  movesAvailable() { return this.grid.cellsAvailable() || this.tileMatchesAvailable(); }

  tileMatchesAvailable() {
    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.size; y++) {
        const tile = this.grid.cellContent({ x, y });
        if (!tile) continue;
        for (let d = 0; d < 4; d++) {
          const v = this.getVector(d);
          const other = this.grid.cellContent({ x: x + v.x, y: y + v.y });
          if (other && other.value === tile.value) return true;
        }
      }
    }
    return false;
  }
}
