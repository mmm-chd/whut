/**
 * The Runner's board: 32 x 24 cells of 40 design units (1280 x 960).
 *
 * Everything here is plain data and pure functions, so the planner, the input
 * mapping and the tests need no browser. A cell is walkable only if neither the
 * board's edge nor an inflated blocker covers it; visible art never decides
 * that.
 */
export const COLUMNS = 32;
export const ROWS = 24;
export const CELL_SIZE = 40;
export const BOARD_WIDTH = COLUMNS * CELL_SIZE;
export const BOARD_HEIGHT = ROWS * CELL_SIZE;

export interface Cell {
  readonly col: number;
  readonly row: number;
}

export interface NavGrid {
  readonly columns: number;
  readonly rows: number;
  /** Index = row * columns + col. */
  readonly blocked: ReadonlySet<number>;
}

export function cellIndex(columns: number, cell: Cell): number {
  return cell.row * columns + cell.col;
}

export function cellFromIndex(columns: number, index: number): Cell {
  return { col: index % columns, row: Math.floor(index / columns) };
}

export function sameCell(a: Cell | null, b: Cell | null): boolean {
  return a !== null && b !== null && a.col === b.col && a.row === b.row;
}

/** A whole-number cell that lies on the board. */
export function inBounds(grid: Pick<NavGrid, 'columns' | 'rows'>, cell: Cell): boolean {
  return (
    Number.isInteger(cell.col) &&
    Number.isInteger(cell.row) &&
    cell.col >= 0 &&
    cell.row >= 0 &&
    cell.col < grid.columns &&
    cell.row < grid.rows
  );
}

export function isWalkable(grid: NavGrid, cell: Cell): boolean {
  return inBounds(grid, cell) && !grid.blocked.has(cellIndex(grid.columns, cell));
}

export function isValidGridShape(grid: NavGrid): boolean {
  return (
    Number.isInteger(grid.columns) &&
    Number.isInteger(grid.rows) &&
    grid.columns > 0 &&
    grid.rows > 0 &&
    grid.columns * grid.rows <= 4096
  );
}

/** The four neighbours that exist on the board, in a fixed order. */
export function neighbours(columns: number, rows: number, index: number): number[] {
  const col = index % columns;
  const row = Math.floor(index / columns);
  const out: number[] = [];
  if (row > 0) {
    out.push(index - columns);
  }
  if (col > 0) {
    out.push(index - 1);
  }
  if (col < columns - 1) {
    out.push(index + 1);
  }
  if (row < rows - 1) {
    out.push(index + columns);
  }
  return out;
}

/** The outer ring of cells; the rover never drives on the board's edge. */
export function boundaryCells(columns: number, rows: number): Set<number> {
  const out = new Set<number>();
  for (let col = 0; col < columns; col += 1) {
    out.add(col);
    out.add((rows - 1) * columns + col);
  }
  for (let row = 0; row < rows; row += 1) {
    out.add(row * columns);
    out.add(row * columns + columns - 1);
  }
  return out;
}

/** Each cell and all eight of its neighbours: the rover's clearance. */
export function inflate(cells: readonly Cell[], columns: number, rows: number): Set<number> {
  const out = new Set<number>();
  for (const cell of cells) {
    for (let dRow = -1; dRow <= 1; dRow += 1) {
      for (let dCol = -1; dCol <= 1; dCol += 1) {
        const col = cell.col + dCol;
        const row = cell.row + dRow;
        if (col >= 0 && row >= 0 && col < columns && row < rows) {
          out.add(row * columns + col);
        }
      }
    }
  }
  return out;
}

/** Every cell of a rectangle, corners inclusive. */
export function rectCells(col0: number, row0: number, col1: number, row1: number): Cell[] {
  const out: Cell[] = [];
  for (let row = row0; row <= row1; row += 1) {
    for (let col = col0; col <= col1; col += 1) {
      out.push({ col, row });
    }
  }
  return out;
}

/** Cells reachable from `start` over four-neighbour steps, as a bounded BFS. */
export function reachableCells(grid: NavGrid, start: Cell): ReadonlySet<number> {
  const seen = new Set<number>();
  if (!isValidGridShape(grid) || !isWalkable(grid, start)) {
    return seen;
  }
  const first = cellIndex(grid.columns, start);
  const queue: number[] = [first];
  seen.add(first);
  for (let head = 0; head < queue.length; head += 1) {
    for (const next of neighbours(grid.columns, grid.rows, queue[head])) {
      if (!seen.has(next) && !grid.blocked.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
}
