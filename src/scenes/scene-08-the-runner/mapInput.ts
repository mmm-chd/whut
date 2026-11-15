import { BOARD_HEIGHT, BOARD_WIDTH, CELL_SIZE, COLUMNS, ROWS, inBounds, type Cell } from './grid';

/**
 * One transform for the picture and the input.
 *
 * The board element is measured on screen (`getBoundingClientRect`) and its
 * letterboxing is already in that rectangle, so a click maps to a cell by
 * removing the rectangle's own offset and scale exactly once. The drawing, the
 * route overlay and the pointer all use the same board units (1280 x 960).
 */
export interface MapTransform {
  readonly left: number;
  readonly top: number;
  readonly scale: number;
  readonly width: number;
  readonly height: number;
}

export interface ScreenRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** The transform of a measured board rectangle, or null when it is unusable. */
export function transformFromRect(rect: ScreenRect): MapTransform | null {
  const values = [rect.left, rect.top, rect.width, rect.height];
  if (!values.every(Number.isFinite) || rect.width <= 0 || rect.height <= 0) {
    return null;
  }
  const scale = rect.width / BOARD_WIDTH;
  // The board is 4:3; a rectangle that is not is a layout bug, not a click.
  if (Math.abs(rect.height / BOARD_HEIGHT - scale) > 0.02 * scale) {
    return null;
  }
  return { left: rect.left, top: rect.top, scale, width: rect.width, height: rect.height };
}

/** The cell under a client point, or null outside the board or on bad input. */
export function clientToCell(x: number, y: number, transform: MapTransform): Cell | null {
  if (!Number.isFinite(x) || !Number.isFinite(y) || !(transform.scale > 0)) {
    return null;
  }
  const worldX = (x - transform.left) / transform.scale;
  const worldY = (y - transform.top) / transform.scale;
  if (worldX < 0 || worldY < 0 || worldX >= BOARD_WIDTH || worldY >= BOARD_HEIGHT) {
    return null;
  }
  const cell = { col: Math.floor(worldX / CELL_SIZE), row: Math.floor(worldY / CELL_SIZE) };
  return inBounds({ columns: COLUMNS, rows: ROWS }, cell) ? cell : null;
}

export function cellCenter(cell: Cell): { readonly x: number; readonly y: number } {
  return { x: (cell.col + 0.5) * CELL_SIZE, y: (cell.row + 0.5) * CELL_SIZE };
}

/**
 * Heading of an art that faces up when the angle is 0: degrees clockwise,
 * 0..360. Moving up is 0, right 90, down 180, left 270.
 */
export function headingBetween(from: Cell, to: Cell): number {
  const degrees = (Math.atan2(to.row - from.row, to.col - from.col) * 180) / Math.PI + 90;
  return ((degrees % 360) + 360) % 360;
}

export type ArrowKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';

/** The cell one arrow key away, staying on the board. */
export function stepCell(cell: Cell, key: ArrowKey): Cell {
  const next: Cell = {
    ArrowUp: { col: cell.col, row: cell.row - 1 },
    ArrowDown: { col: cell.col, row: cell.row + 1 },
    ArrowLeft: { col: cell.col - 1, row: cell.row },
    ArrowRight: { col: cell.col + 1, row: cell.row },
  }[key];
  return inBounds({ columns: COLUMNS, rows: ROWS }, next) ? next : cell;
}
