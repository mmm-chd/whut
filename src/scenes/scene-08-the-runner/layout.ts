import { BOARD_HEIGHT, BOARD_WIDTH } from './grid';

/**
 * Where the board and the DOM around it sit, in host pixels.
 *
 * The board is the largest 4:3 rectangle that fits beside a narration column;
 * the controls sit under it and the status panel on its bottom-right corner.
 * Compact hosts (short or narrow landscape) trade padding for room, never the
 * size of a touch target.
 */
export interface Rect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface RunnerLayout {
  readonly valid: boolean;
  readonly compact: boolean;
  readonly width: number;
  readonly height: number;
  readonly board: Rect;
  /** Board pixels per board unit. */
  readonly scale: number;
  /** How far the paper frame reaches beyond the board on every side. */
  readonly frame: number;
  readonly narration: Rect;
  readonly controls: Rect;
}

export const COMPACT_MAX_WIDTH = 900;
export const COMPACT_MAX_HEIGHT = 480;

const empty: Rect = { left: 0, top: 0, width: 0, height: 0 };

export function layoutRunner(width: number, height: number): RunnerLayout {
  if (![width, height].every(Number.isFinite) || width < 200 || height < 200) {
    return {
      valid: false,
      compact: true,
      width: 0,
      height: 0,
      board: empty,
      scale: 1,
      frame: 0,
      narration: empty,
      controls: empty,
    };
  }

  const compact = width <= COMPACT_MAX_WIDTH || height <= COMPACT_MAX_HEIGHT;
  const pad = compact ? 10 : 24;
  // Clears the playback bar that sits in the top-left corner of every scene.
  const top = compact ? 70 : 76;
  const controlsHeight = compact ? 52 : 68;
  const gap = compact ? 8 : 12;
  const narrationMin = compact ? 210 : 340;

  const frame = compact ? 11 : 15;
  const availH = height - top - controlsHeight - gap - pad - frame * 2;
  const availW = width - narrationMin - pad * 3 - frame * 2;
  const scale = Math.max(0.05, Math.min(availW / BOARD_WIDTH, availH / BOARD_HEIGHT));
  const boardW = BOARD_WIDTH * scale;
  const boardH = BOARD_HEIGHT * scale;

  const boardLeft = width - pad - frame - boardW;
  const boardTop = top + frame + Math.max(0, (availH - boardH) / 2);

  return {
    valid: true,
    compact,
    width,
    height,
    board: { left: boardLeft, top: boardTop, width: boardW, height: boardH },
    scale,
    frame,
    narration: {
      left: pad,
      top,
      width: Math.max(0, boardLeft - frame - pad * 2),
      // Ends above the controls bar, which spans the page below it.
      height: Math.max(0, boardTop + boardH + frame - top),
    },
    // The bar spans the page under the story column and the board, so the three
    // destination buttons and the command button share one row.
    controls: {
      left: pad,
      top: boardTop + boardH + frame + gap,
      width: width - pad * 2,
      height: controlsHeight,
    },
  };
}
