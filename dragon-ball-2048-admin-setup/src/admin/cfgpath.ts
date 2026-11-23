/** Tiny dotted-path helpers for the configuration object (immutable updates, flat diff). */
type Dict = Record<string, unknown>;
const isObj = (v: unknown): v is Dict => typeof v === 'object' && v !== null && !Array.isArray(v);

export function getAt(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((o, k) => (isObj(o) ? o[k] : undefined), obj);
}

export function setAt<T>(obj: T, path: string, value: unknown): T {
  const next = JSON.parse(JSON.stringify(obj)) as Dict;
  const keys = path.split('.');
  const last = keys.pop() as string;
  let cur: Dict = next;
  for (const k of keys) {
    if (!isObj(cur[k])) cur[k] = {};
    cur = cur[k] as Dict;
  }
  cur[last] = value;
  return next as T;
}

function flatten(v: unknown, prefix: string, out: Map<string, string>) {
  if (isObj(v)) Object.keys(v).forEach((k) => flatten(v[k], prefix ? `${prefix}.${k}` : k, out));
  else out.set(prefix, JSON.stringify(v));
}

export interface Change {
  path: string;
  before: string;
  after: string;
}

/** Leaf-level differences between two configurations (arrays compared as whole values). */
export function diffConfig(before: unknown, after: unknown): Change[] {
  const a = new Map<string, string>();
  const b = new Map<string, string>();
  flatten(before, '', a);
  flatten(after, '', b);
  const paths = new Set([...a.keys(), ...b.keys()]);
  const out: Change[] = [];
  paths.forEach((p) => {
    const x = a.get(p) ?? '—';
    const y = b.get(p) ?? '—';
    if (x !== y) out.push({ path: p, before: x, after: y });
  });
  return out.sort((m, n) => m.path.localeCompare(n.path));
}

export const sameConfig = (a: unknown, b: unknown) => diffConfig(a, b).length === 0;
