import { describe, expect, it } from 'vitest';
import { cellIndex, COLUMNS, reachableCells, type Cell, type NavGrid } from './grid';
import { OPENING_ROUTE, defaultMap, hazardAt, knownGridWith, validateNavigationMap, isSupportedDestination } from './map';
import { MAX_EXPANSIONS, findGridPath, validateRoute } from './pathfinding';

describe('findGridPath', () => {
  const grid: NavGrid = { columns: 3, rows: 3, blocked: new Set([4]) };
  const start: Cell = { col: 0, row: 1 };
  const goal: Cell = { col: 2, row: 1 };

  it('goes around a blocked centre without cutting a corner', () => {
    const result = findGridPath(grid, start, goal);
    expect(result.kind).toBe('found');
    if (result.kind === 'found') {
      expect(result.cells).toHaveLength(5);
      expect(validateRoute(grid, result.cells, start, goal)).toBe(true);
      expect(result.cells.some((c) => c.col === 1 && c.row === 1)).toBe(false);
    }
  });

  it('rejects a blocked, off-board or fractional goal', () => {
    expect(findGridPath(grid, start, { col: 1, row: 1 }).kind).toBe('invalid');
    expect(findGridPath(grid, start, { col: 9, row: 1 }).kind).toBe('invalid');
    expect(findGridPath(grid, start, { col: 1.5, row: 0 }).kind).toBe('invalid');
  });

  it('reports an unreachable goal instead of looping', () => {
    const walled: NavGrid = { columns: 3, rows: 3, blocked: new Set([1, 3, 5, 7]) };
    expect(findGridPath(walled, { col: 0, row: 0 }, { col: 2, row: 2 }).kind).toBe('unreachable');
  });

  it('is deterministic', () => {
    const a = findGridPath(defaultMap.known, defaultMap.start, defaultMap.presets[1].cell);
    const b = findGridPath(defaultMap.known, defaultMap.start, defaultMap.presets[1].cell);
    expect(a).toEqual(b);
  });

  it('finds the shortest four-neighbour path', () => {
    const open: NavGrid = { columns: 6, rows: 6, blocked: new Set() };
    const result = findGridPath(open, { col: 0, row: 0 }, { col: 5, row: 4 });
    expect(result.kind).toBe('found');
    if (result.kind === 'found') {
      expect(result.cells).toHaveLength(10);
    }
  });

  it('rejects a malformed grid', () => {
    expect(findGridPath({ columns: 0, rows: 3, blocked: new Set() }, start, goal).kind).toBe('invalid');
  });

  it('never expands more than the budget', () => {
    const result = findGridPath(defaultMap.safety, defaultMap.start, defaultMap.presets[0].cell);
    expect(result.visited).toBeLessThanOrEqual(MAX_EXPANSIONS);
  });
});

describe('validateRoute', () => {
  const open: NavGrid = { columns: 4, rows: 4, blocked: new Set([5]) };
  const a: Cell = { col: 0, row: 0 };
  const b: Cell = { col: 2, row: 0 };

  it('accepts a clear adjacent route', () => {
    expect(validateRoute(open, [a, { col: 1, row: 0 }, b], a, b)).toBe(true);
  });

  it('rejects a jump, a wrong end, an empty route and a blocked step', () => {
    expect(validateRoute(open, [a, b], a, b)).toBe(false);
    expect(validateRoute(open, [a, { col: 1, row: 0 }], a, b)).toBe(false);
    expect(validateRoute(open, [], a, b)).toBe(false);
    expect(validateRoute(open, [{ col: 1, row: 0 }, { col: 1, row: 1 }], { col: 1, row: 0 }, { col: 1, row: 1 })).toBe(false);
  });
});

describe('the default map', () => {
  it('is valid', () => {
    expect(validateNavigationMap(defaultMap)).toEqual([]);
  });

  it('keeps the planned number of connected safe cells', () => {
    expect(reachableCells(defaultMap.safety, defaultMap.start).size).toBe(569);
  });

  it('reaches every preset', () => {
    for (const preset of defaultMap.presets) {
      expect(isSupportedDestination(defaultMap, preset.cell, defaultMap.start)).toBe(true);
      const safe = findGridPath(defaultMap.safety, defaultMap.start, preset.cell);
      expect(safe.kind).toBe('found');
    }
  });

  it('plans the northern route straight through the unseen patch', () => {
    const north = defaultMap.presets[0].cell;
    const route = findGridPath(defaultMap.known, defaultMap.start, north);
    expect(route.kind).toBe('found');
    if (route.kind === 'found') {
      expect(route.cells.some((c) => hazardAt(defaultMap, c) !== null)).toBe(true);
    }
  });

  it('reroutes to the same goal from the safe stop once the patch is known', () => {
    const from: Cell = { col: 16, row: 15 };
    const target = defaultMap.presets[0].cell;
    const grid = knownGridWith(defaultMap, ['rough-patch']);
    const route = findGridPath(grid, from, target);
    expect(route.kind).toBe('found');
    if (route.kind === 'found') {
      expect(validateRoute(defaultMap.safety, route.cells, from, target)).toBe(true);
      expect(route.cells.at(-1)).toEqual(target);
    }
  });

  it('plans the other presets without meeting the patch', () => {
    for (const preset of defaultMap.presets.slice(1)) {
      const route = findGridPath(defaultMap.known, defaultMap.start, preset.cell);
      expect(route.kind).toBe('found');
      if (route.kind === 'found') {
        expect(route.cells.some((c) => hazardAt(defaultMap, c) !== null)).toBe(false);
      }
    }
  });

  it('refuses blockers, the edge and the clearance ring as destinations', () => {
    expect(isSupportedDestination(defaultMap, { col: 7, row: 8 }, defaultMap.start)).toBe(false);
    expect(isSupportedDestination(defaultMap, { col: 0, row: 0 }, defaultMap.start)).toBe(false);
    expect(isSupportedDestination(defaultMap, { col: 16, row: 13 }, defaultMap.start)).toBe(false);
    expect(defaultMap.safety.blocked.has(cellIndex(COLUMNS, { col: 16, row: 13 }))).toBe(true);
    expect(defaultMap.known.blocked.has(cellIndex(COLUMNS, { col: 16, row: 13 }))).toBe(false);
  });

  it('catches a broken map', () => {
    const broken = { ...defaultMap, start: { col: 0, row: 0 } };
    expect(validateNavigationMap(broken).length).toBeGreaterThan(0);
  });
});

describe('the opening drive', () => {
  it('enters from below, stays on open ground and ends on the start cell', () => {
    expect(OPENING_ROUTE[0].row).toBeGreaterThanOrEqual(24);
    expect(OPENING_ROUTE.at(-1)).toEqual(defaultMap.start);
    for (const cell of OPENING_ROUTE.slice(1)) {
      expect(defaultMap.safety.blocked.has(cellIndex(COLUMNS, cell))).toBe(cell.row === 23);
    }
    for (let i = 1; i < OPENING_ROUTE.length; i += 1) {
      const a = OPENING_ROUTE[i - 1];
      const b = OPENING_ROUTE[i];
      expect(Math.abs(a.col - b.col) + Math.abs(a.row - b.row)).toBe(1);
    }
  });
});
