import { CELL_SIZE, sameCell, type Cell } from './grid';
import { cellCenter, headingBetween } from './mapInput';

/**
 * Percy's travel along a validated route, as pure steps in active time.
 *
 * The route is a list of adjacent cells. Movement is along each axis-aligned
 * segment, after a short turn in place. The next cell is checked against the
 * real hazards before a segment starts, so Percy stops at a safe cell centre
 * and never drives into a patch and then jumps back. Frame deltas are clamped,
 * progress never overshoots, and a waypoint is only reported once reached.
 */
export const CRUISE_CELLS_PER_SECOND = 3.5;
export const TURN_MS = 180;
export const MAX_DELTA_MS = 100;
/** Reduced motion: one cell per readable interval. */
export const DISCRETE_STEP_MS = 240;

export interface Turn {
  readonly from: number;
  readonly to: number;
  readonly elapsedMs: number;
}

export interface MotionState {
  readonly route: readonly Cell[];
  /** The waypoint Percy is on (or has just left). */
  readonly index: number;
  /** 0..1 along the segment from `index` to `index + 1`. */
  readonly progress: number;
  readonly heading: number;
  readonly turn: Turn | null;
  /** The next segment has been checked and its turn started. */
  readonly checked: boolean;
  /** Percy is stopped before this cell because it is not safe. */
  readonly blockedBy: Cell | null;
  readonly done: boolean;
}

export type MotionEvent =
  | { readonly type: 'waypoint'; readonly index: number }
  | { readonly type: 'blocked'; readonly index: number; readonly cell: Cell }
  | { readonly type: 'goal'; readonly index: number };

export interface MotionStep {
  readonly state: MotionState;
  readonly events: readonly MotionEvent[];
}

export function startMotion(route: readonly Cell[], heading: number): MotionState {
  return {
    route,
    index: 0,
    progress: 0,
    heading,
    turn: null,
    checked: false,
    blockedBy: null,
    done: route.length <= 1,
  };
}

/** The shortest signed turn from one heading to another, in (-180, 180]. */
export function shortestTurn(from: number, to: number): number {
  let diff = (((to - from) % 360) + 540) % 360 - 180;
  if (diff === -180) {
    diff = 180;
  }
  return diff;
}

const normalise = (degrees: number) => ((degrees % 360) + 360) % 360;

/** Where Percy is, in board units, from the motion state. */
export function positionOf(state: MotionState): { readonly x: number; readonly y: number } {
  const here = state.route[state.index];
  const next = state.route[state.index + 1];
  const from = cellCenter(here);
  if (!next || state.progress <= 0) {
    return from;
  }
  const to = cellCenter(next);
  return { x: from.x + (to.x - from.x) * state.progress, y: from.y + (to.y - from.y) * state.progress };
}

/**
 * Starts the next segment: checks that its first cell may be entered and works
 * out the turn. Returns the updated state and whether Percy may go on.
 */
function beginSegment(
  state: MotionState,
  canEnter: (cell: Cell) => boolean,
  instantTurn: boolean,
): { state: MotionState; event: MotionEvent | null } {
  const next = state.route[state.index + 1];
  if (!canEnter(next)) {
    return {
      state: { ...state, blockedBy: next, checked: true },
      event: { type: 'blocked', index: state.index, cell: next },
    };
  }
  const target = headingBetween(state.route[state.index], next);
  const diff = shortestTurn(state.heading, target);
  if (instantTurn || Math.abs(diff) < 1) {
    return { state: { ...state, heading: target, turn: null, checked: true }, event: null };
  }
  return {
    state: { ...state, turn: { from: state.heading, to: target, elapsedMs: 0 }, checked: true },
    event: null,
  };
}

/** Advance by `deltaMs` of active time. Invalid or negative time does nothing. */
export function stepMotion(
  start: MotionState,
  deltaMs: number,
  canEnter: (cell: Cell) => boolean,
  cellsPerSecond: number = CRUISE_CELLS_PER_SECOND,
): MotionStep {
  if (!Number.isFinite(deltaMs) || deltaMs <= 0 || start.done || start.blockedBy) {
    return { state: start, events: [] };
  }
  let state = start;
  let remaining = Math.min(deltaMs, MAX_DELTA_MS);
  const events: MotionEvent[] = [];
  let guard = 0;

  while (remaining > 1e-6 && !state.done && !state.blockedBy && guard < 16) {
    guard += 1;
    if (!state.checked) {
      const began = beginSegment(state, canEnter, false);
      state = began.state;
      if (began.event) {
        events.push(began.event);
        break;
      }
    }

    if (state.turn) {
      const left = TURN_MS - state.turn.elapsedMs;
      const used = Math.min(remaining, left);
      const elapsed = state.turn.elapsedMs + used;
      remaining -= used;
      if (elapsed >= TURN_MS - 1e-6) {
        state = { ...state, heading: state.turn.to, turn: null };
      } else {
        const diff = shortestTurn(state.turn.from, state.turn.to);
        state = {
          ...state,
          heading: normalise(state.turn.from + diff * (elapsed / TURN_MS)),
          turn: { ...state.turn, elapsedMs: elapsed },
        };
        break;
      }
      continue;
    }

    const speed = Math.max(0.01, cellsPerSecond);
    const room = 1 - state.progress;
    const wanted = (remaining / 1000) * speed;
    const move = Math.min(wanted, room);
    remaining -= (move / speed) * 1000;
    const progress = state.progress + move;
    if (progress >= 1 - 1e-9) {
      const index = state.index + 1;
      const atGoal = index >= state.route.length - 1;
      state = { ...state, index, progress: 0, checked: false, done: atGoal };
      events.push({ type: 'waypoint', index });
      if (atGoal) {
        events.push({ type: 'goal', index });
      }
    } else {
      state = { ...state, progress };
    }
  }
  return { state, events };
}

/**
 * Reduced motion: exactly one cell per call, heading snapped, same hazard
 * check. The caller spaces the calls (`DISCRETE_STEP_MS`).
 */
export function stepDiscrete(start: MotionState, canEnter: (cell: Cell) => boolean): MotionStep {
  if (start.done || start.blockedBy) {
    return { state: start, events: [] };
  }
  const began = beginSegment({ ...start, checked: false }, canEnter, true);
  if (began.event) {
    return { state: began.state, events: [began.event] };
  }
  const index = start.index + 1;
  const atGoal = index >= start.route.length - 1;
  const state: MotionState = { ...began.state, index, progress: 0, checked: false, done: atGoal };
  const events: MotionEvent[] = [{ type: 'waypoint', index }];
  if (atGoal) {
    events.push({ type: 'goal', index });
  }
  return { state, events };
}

/** True when Percy stands exactly on the centre of `cell` (within `tolerance`). */
export function isAtCellCentre(state: MotionState, cell: Cell, tolerance = 0.1): boolean {
  if (!sameCell(state.route[state.index], cell) || state.progress > 0) {
    return false;
  }
  const at = positionOf(state);
  const centre = cellCenter(cell);
  return Math.hypot(at.x - centre.x, at.y - centre.y) <= tolerance;
}

export const CELL_UNITS = CELL_SIZE;
