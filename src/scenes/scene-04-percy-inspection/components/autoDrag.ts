import type { Point } from './transferMath';

/**
 * The scripted hand-over.
 *
 * P-04 ends by carrying Percy into the close-up frame on its own: no pointer,
 * no waiting for input. The sequence is a pure function of elapsed time so the
 * timing, the spline and the "gripped" window can be asserted without a browser
 * and without timers.
 *
 * Four stages, in order:
 * `approach` the hand cursor travels to Percy,
 * `grab`     the cursor closes on him,
 * `pull`     Percy follows the cursor to the frame centre,
 * `settle`   the cursor lets go and he rests.
 */
export type AutoDragStage = 'approach' | 'grab' | 'pull' | 'settle';

export interface AutoDragPath {
  /** Where Percy waits for the hand. */
  readonly from: Point;
  /** The frame centre he ends up in. */
  readonly to: Point;
  /** Where the hand enters the picture. */
  readonly cursorStart: Point;
}

export interface AutoDragFrame {
  readonly stage: AutoDragStage;
  readonly cursor: Point;
  /** Percy's own position; equals the cursor while he is gripped. */
  readonly sprite: Point;
  readonly gripping: boolean;
  readonly done: boolean;
}

export const AUTO_DRAG_STAGES_MS = {
  approach: 820,
  grab: 220,
  pull: 1080,
  settle: 260,
} as const;

export const AUTO_DRAG_TOTAL_MS =
  AUTO_DRAG_STAGES_MS.approach +
  AUTO_DRAG_STAGES_MS.grab +
  AUTO_DRAG_STAGES_MS.pull +
  AUTO_DRAG_STAGES_MS.settle;

const APPROACH_END = AUTO_DRAG_STAGES_MS.approach;
const GRAB_END = APPROACH_END + AUTO_DRAG_STAGES_MS.grab;
const PULL_END = GRAB_END + AUTO_DRAG_STAGES_MS.pull;

const clamp01 = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
};

const mix = (a: Point, b: Point, t: number): Point => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

/** Slows down at both ends, so the hand does not snap into place. */
export function easeInOut(t: number): number {
  const value = clamp01(t);
  return value < 0.5 ? 4 * value * value * value : 1 - (-2 * value + 2) ** 3 / 2;
}

/** Slows only at the end: the pull leaves quickly and lands softly. */
export function easeOut(t: number): number {
  const value = clamp01(t);
  return 1 - (1 - value) ** 3;
}

/**
 * The frame at `elapsed` ms. Elapsed past the end is the finished pose, and a
 * non-finite elapsed time is treated as the start, so a broken clock can never
 * strand the picture half way.
 */
export function autoDragFrame(elapsed: number, path: AutoDragPath): AutoDragFrame {
  const time = Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;

  if (time >= AUTO_DRAG_TOTAL_MS) {
    return { stage: 'settle', cursor: path.to, sprite: path.to, gripping: false, done: true };
  }

  if (time < APPROACH_END) {
    const travel = easeInOut(time / AUTO_DRAG_STAGES_MS.approach);
    return {
      stage: 'approach',
      cursor: mix(path.cursorStart, path.from, travel),
      sprite: path.from,
      gripping: false,
      done: false,
    };
  }

  if (time < GRAB_END) {
    return { stage: 'grab', cursor: path.from, sprite: path.from, gripping: true, done: false };
  }

  if (time < PULL_END) {
    const travel = easeOut((time - GRAB_END) / AUTO_DRAG_STAGES_MS.pull);
    const cursor = mix(path.from, path.to, travel);
    return { stage: 'pull', cursor, sprite: cursor, gripping: true, done: false };
  }

  return { stage: 'settle', cursor: path.to, sprite: path.to, gripping: false, done: false };
}

/** The hand enters from the lower right, the way a pointer enters a screen. */
export function autoDragPath(from: Point, to: Point, width: number, height: number): AutoDragPath {
  return {
    from,
    to,
    cursorStart: { x: width * 0.78, y: height * 0.94 },
  };
}