import {
  cellFromIndex,
  cellIndex,
  inBounds,
  isValidGridShape,
  neighbours,
  type Cell,
  type NavGrid,
} from './grid';

/**
 * Deterministic four-neighbour A* on the board.
 *
 * Equal step cost and a Manhattan heuristic, so a path never cuts a corner.
 * Ties break on total score, then heuristic, then cell index, so the same
 * input always gives the same path. The search is bounded by a node budget and
 * returns an explicit status instead of ever looping.
 */
export type GridPathResult =
  | { readonly kind: 'found'; readonly cells: readonly Cell[]; readonly visited: number }
  | { readonly kind: 'invalid' | 'unreachable' | 'budget-exceeded'; readonly visited: number };

/** At most this many cells are expanded or returned. */
export const MAX_EXPANSIONS = 768;

class IndexedHeap {
  private readonly heap: number[] = [];
  private readonly position: Int32Array;

  constructor(
    size: number,
    private readonly less: (a: number, b: number) => boolean,
  ) {
    this.position = new Int32Array(size).fill(-1);
  }

  get size(): number {
    return this.heap.length;
  }

  has(item: number): boolean {
    return this.position[item] >= 0;
  }

  push(item: number): void {
    this.heap.push(item);
    this.position[item] = this.heap.length - 1;
    this.up(this.heap.length - 1);
  }

  /** The key of an item in the heap got smaller. */
  decreased(item: number): void {
    this.up(this.position[item]);
  }

  pop(): number {
    const top = this.heap[0];
    const last = this.heap.pop() as number;
    this.position[top] = -1;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.position[last] = 0;
      this.down(0);
    }
    return top;
  }

  private swap(a: number, b: number): void {
    const itemA = this.heap[a];
    const itemB = this.heap[b];
    this.heap[a] = itemB;
    this.heap[b] = itemA;
    this.position[itemB] = a;
    this.position[itemA] = b;
  }

  private up(start: number): void {
    let at = start;
    while (at > 0) {
      const parent = (at - 1) >> 1;
      if (!this.less(this.heap[at], this.heap[parent])) {
        break;
      }
      this.swap(at, parent);
      at = parent;
    }
  }

  private down(start: number): void {
    let at = start;
    for (;;) {
      const left = at * 2 + 1;
      const right = left + 1;
      let best = at;
      if (left < this.heap.length && this.less(this.heap[left], this.heap[best])) {
        best = left;
      }
      if (right < this.heap.length && this.less(this.heap[right], this.heap[best])) {
        best = right;
      }
      if (best === at) {
        return;
      }
      this.swap(at, best);
      at = best;
    }
  }
}

function manhattan(columns: number, from: number, to: number): number {
  return (
    Math.abs((from % columns) - (to % columns)) +
    Math.abs(Math.floor(from / columns) - Math.floor(to / columns))
  );
}

export function findGridPath(grid: NavGrid, start: Cell, goal: Cell): GridPathResult {
  if (
    !isValidGridShape(grid) ||
    !inBounds(grid, start) ||
    !inBounds(grid, goal) ||
    grid.blocked.has(cellIndex(grid.columns, start)) ||
    grid.blocked.has(cellIndex(grid.columns, goal))
  ) {
    return { kind: 'invalid', visited: 0 };
  }

  const { columns, rows } = grid;
  const total = columns * rows;
  const from = cellIndex(columns, start);
  const to = cellIndex(columns, goal);

  const score = new Int32Array(total).fill(0x3fffffff);
  const parent = new Int32Array(total).fill(-1);
  const closed = new Uint8Array(total);
  const total_f = (index: number) => score[index] + manhattan(columns, index, to);

  const heap = new IndexedHeap(total, (a, b) => {
    const fa = total_f(a);
    const fb = total_f(b);
    if (fa !== fb) {
      return fa < fb;
    }
    const ha = manhattan(columns, a, to);
    const hb = manhattan(columns, b, to);
    if (ha !== hb) {
      return ha < hb;
    }
    return a < b;
  });

  score[from] = 0;
  heap.push(from);
  let visited = 0;

  while (heap.size > 0) {
    const current = heap.pop();
    if (closed[current]) {
      continue;
    }
    closed[current] = 1;
    visited += 1;

    if (current === to) {
      const indexes: number[] = [];
      for (let at = to; at !== -1; at = parent[at]) {
        indexes.push(at);
        if (indexes.length > MAX_EXPANSIONS) {
          return { kind: 'budget-exceeded', visited };
        }
      }
      indexes.reverse();
      return { kind: 'found', cells: indexes.map((index) => cellFromIndex(columns, index)), visited };
    }
    if (visited >= MAX_EXPANSIONS) {
      return { kind: 'budget-exceeded', visited };
    }

    for (const next of neighbours(columns, rows, current)) {
      if (closed[next] || grid.blocked.has(next)) {
        continue;
      }
      const candidate = score[current] + 1;
      if (candidate < score[next]) {
        score[next] = candidate;
        parent[next] = current;
        if (heap.has(next)) {
          heap.decreased(next);
        } else {
          heap.push(next);
        }
      }
    }
  }
  return { kind: 'unreachable', visited };
}

/** A route is only real if it starts and ends right and every step is clear. */
export function validateRoute(
  grid: NavGrid,
  route: readonly Cell[],
  start: Cell,
  goal: Cell,
): boolean {
  if (route.length === 0 || route.length > MAX_EXPANSIONS) {
    return false;
  }
  const first = route[0];
  const last = route[route.length - 1];
  if (first.col !== start.col || first.row !== start.row) {
    return false;
  }
  if (last.col !== goal.col || last.row !== goal.row) {
    return false;
  }
  for (let i = 0; i < route.length; i += 1) {
    const cell = route[i];
    if (!inBounds(grid, cell) || grid.blocked.has(cellIndex(grid.columns, cell))) {
      return false;
    }
    if (i > 0) {
      const before = route[i - 1];
      if (Math.abs(cell.col - before.col) + Math.abs(cell.row - before.row) !== 1) {
        return false;
      }
    }
  }
  return true;
}
