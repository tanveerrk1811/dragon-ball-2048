/** Keyboard + swipe (pointer events) input. Fully disposable. */
type Handler = (dir: number) => void;

const KEY_MAP: Record<string, number> = {
  ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3,
  w: 0, d: 1, s: 2, a: 3,
  k: 0, l: 1, j: 2, h: 3,
};

export class InputManager {
  private handlers: Handler[] = [];
  private disposers: (() => void)[] = [];

  constructor(board: HTMLElement, onRestartKey?: () => void) {
    const listen = <K extends keyof DocumentEventMap>(t: Document, type: K, fn: (e: DocumentEventMap[K]) => void) => {
      t.addEventListener(type, fn as EventListener);
      this.disposers.push(() => t.removeEventListener(type, fn as EventListener));
    };

    listen(document, 'keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (document.querySelector('dialog[open]')) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (key in KEY_MAP) {
        e.preventDefault();
        this.emit(KEY_MAP[key]);
      } else if (key === 'r' && onRestartKey) {
        onRestartKey();
      }
    });

    let start: { x: number; y: number; id: number } | null = null;
    const down = (e: PointerEvent) => { start = { x: e.clientX, y: e.clientY, id: e.pointerId }; };
    const up = (e: PointerEvent) => {
      if (!start || start.id !== e.pointerId) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      start = null;
      const ax = Math.abs(dx);
      const ay = Math.abs(dy);
      if (Math.max(ax, ay) < 22) return;
      this.emit(ax > ay ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0);
    };
    const cancel = () => { start = null; };
    board.addEventListener('pointerdown', down);
    board.addEventListener('pointerup', up);
    board.addEventListener('pointercancel', cancel);
    this.disposers.push(() => {
      board.removeEventListener('pointerdown', down);
      board.removeEventListener('pointerup', up);
      board.removeEventListener('pointercancel', cancel);
    });
  }

  on(_event: 'move', cb: Handler) { this.handlers.push(cb); }
  private emit(dir: number) { this.handlers.forEach((h) => h(dir)); }
  dispose() { this.disposers.forEach((d) => d()); this.disposers = []; this.handlers = []; }
}
