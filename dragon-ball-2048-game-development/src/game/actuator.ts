import { portraitFor } from './art';
import { characterFor } from './characters';
import type { Grid, Meta, Renderer, Tile } from './engine';

export interface ActuatorEls {
  tiles: HTMLElement;
  score: HTMLElement;
  scoreBox: HTMLElement;
  best: HTMLElement;
  overlay: HTMLElement;
  ovTitle: HTMLElement;
  ovSub: HTMLElement;
  ovKeep: HTMLElement;
}

/** DOM renderer: positions tiles with CSS custom properties (resolution independent, GPU transforms). */
export class Actuator implements Renderer {
  private score = 0;

  constructor(private els: ActuatorEls, private onState: (grid: Grid, meta: Meta) => void) {}

  actuate(grid: Grid, meta: Meta) {
    window.requestAnimationFrame(() => {
      this.els.tiles.replaceChildren();
      grid.cells.forEach((col) => col.forEach((t) => { if (t) this.addTile(t); }));
      this.updateScore(meta.score);
      this.els.best.textContent = String(meta.bestScore);
      if (meta.terminated) this.message(meta.over, meta.won);
      this.onState(grid, meta);
    });
  }

  continueGame() { this.clearMessage(); }

  private addTile(tile: Tile) {
    const c = characterFor(tile.value);
    const el = document.createElement('div');
    const pos = tile.previousPosition ?? { x: tile.x, y: tile.y };
    el.className = 'tile';
    if (tile.value >= 256) el.classList.add('tier-hi');
    if (tile.value >= 2048) el.classList.add('tier-god');
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', `${c.name}, ${tile.value}`);
    el.style.setProperty('--x', String(pos.x));
    el.style.setProperty('--y', String(pos.y));
    el.style.setProperty('--aura', c.aura);
    el.style.setProperty('--aura2', c.aura2);

    const inner = document.createElement('div');
    inner.className = 'tile-inner';
    const img = document.createElement('img');
    img.alt = '';
    img.decoding = 'async';
    img.draggable = false;
    img.src = portraitFor(tile.value);
    const val = document.createElement('span');
    val.className = 'val';
    val.textContent = String(tile.value);
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = c.short;
    inner.append(img, val, name);
    el.appendChild(inner);

    if (tile.previousPosition) {
      window.requestAnimationFrame(() => {
        el.style.setProperty('--x', String(tile.x));
        el.style.setProperty('--y', String(tile.y));
      });
    } else if (tile.mergedFrom) {
      el.classList.add('tile-merged');
      tile.mergedFrom.forEach((m) => this.addTile(m));
    } else {
      el.classList.add('tile-new');
    }
    this.els.tiles.appendChild(el);
  }

  private updateScore(score: number) {
    this.els.score.textContent = String(score);
    const diff = score - this.score;
    this.score = score;
    if (diff > 0) {
      const add = document.createElement('div');
      add.className = 'score-add';
      add.textContent = `+${diff}`;
      this.els.scoreBox.appendChild(add);
      window.setTimeout(() => add.remove(), 700);
    }
  }

  private message(over: boolean, won: boolean) {
    const { overlay, ovTitle, ovSub, ovKeep } = this.els;
    overlay.classList.remove('won', 'over');
    if (won && !over) {
      overlay.classList.add('won');
      ovTitle.textContent = 'Super Saiyan God unlocked!';
      ovSub.textContent = 'You reached 2048. Keep going to unlock even higher evolutions.';
      ovKeep.hidden = false;
    } else {
      overlay.classList.add('over');
      ovTitle.textContent = 'Power depleted';
      ovSub.textContent = 'No more moves. Gather your energy and try again.';
      ovKeep.hidden = true;
    }
    overlay.classList.add('show');
    overlay.setAttribute('aria-hidden', 'false');
  }

  private clearMessage() {
    this.els.overlay.classList.remove('show', 'won', 'over');
    this.els.overlay.setAttribute('aria-hidden', 'true');
  }
}
