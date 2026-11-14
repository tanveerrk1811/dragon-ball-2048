import type { SerializedGrid } from './engine';

/** localStorage wrapper with in-memory fallback (private mode / blocked storage / WebView quirks). */
const PREFIX = 'db2048.';
const memory = new Map<string, string>();

export function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(PREFIX + key);
  } catch {
    return memory.get(key) ?? null;
  }
}

export function safeSet(key: string, value: string) {
  try {
    window.localStorage.setItem(PREFIX + key, value);
  } catch {
    memory.set(key, value);
  }
}

export function safeRemove(key: string) {
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    memory.delete(key);
  }
}

export interface SavedState {
  grid: SerializedGrid;
  score: number;
  over: boolean;
  won: boolean;
  keepPlaying: boolean;
}

export interface Store {
  getBestScore(): number;
  setBestScore(n: number): void;
  getHighest(): number;
  setHighest(n: number): void;
  getGameState(): SavedState | null;
  setGameState(s: SavedState): void;
  clearGameState(): void;
}

export class Storage implements Store {
  getBestScore() { return Number(safeGet('best')) || 0; }
  setBestScore(n: number) { safeSet('best', String(n)); }
  getHighest() { return Number(safeGet('highest')) || 0; }
  setHighest(n: number) { safeSet('highest', String(n)); }
  getGameState(): SavedState | null {
    const raw = safeGet('state');
    if (!raw) return null;
    try {
      const s = JSON.parse(raw) as SavedState;
      if (s?.grid?.size === 4 && Array.isArray(s.grid.cells)) return s;
    } catch { /* corrupted state: ignore and start fresh */ }
    safeRemove('state');
    return null;
  }
  setGameState(s: SavedState) { safeSet('state', JSON.stringify(s)); }
  clearGameState() { safeRemove('state'); }
}

export class MemoryStore implements Store {
  best = 0; highest = 0; state: SavedState | null = null;
  getBestScore() { return this.best; }
  setBestScore(n: number) { this.best = n; }
  getHighest() { return this.highest; }
  setHighest(n: number) { this.highest = n; }
  getGameState() { return this.state; }
  setGameState(s: SavedState) { this.state = s; }
  clearGameState() { this.state = null; }
}
