import { describe, expect, it } from 'vitest';
import type { Cell } from './grid';
import { cellCenter } from './mapInput';
import {
  MAX_DELTA_MS,
  isAtCellCentre,
  positionOf,
  shortestTurn,
  startMotion,
  stepDiscrete,
  stepMotion,
  type MotionEvent,
  type MotionState,
} from './movement';

const route: Cell[] = [
  { col: 2, row: 5 },
  { col: 2, row: 4 },
  { col: 2, row: 3 },
  { col: 3, row: 3 },
];
const free = () => true;

function run(state: MotionState, totalMs: number, canEnter: (c: Cell) => boolean = free) {
  let current = state;
  const events: MotionEvent[] = [];
  for (let t = 0; t < totalMs; t += 16) {
    const step = stepMotion(current, 16, canEnter);
    current = step.state;
    events.push(...step.events);
  }
  return { state: current, events };
}

describe('shortestTurn', () => {
  it('turns the short way round', () => {
    expect(shortestTurn(350, 10)).toBe(20);
    expect(shortestTurn(10, 350)).toBe(-20);
    expect(shortestTurn(0, 180)).toBe(180);
    expect(shortestTurn(90, 90)).toBe(0);
  });
});

describe('stepMotion', () => {
  it('reports waypoints in order and then the goal', () => {
    const { events, state } = run(startMotion(route, 0), 4000);
    const waypoints = events.filter((e) => e.type === 'waypoint').map((e) => (e as { index: number }).index);
    expect(waypoints).toEqual([1, 2, 3]);
    expect(events.at(-1)?.type).toBe('goal');
    expect(state.done).toBe(true);
    expect(isAtCellCentre(state, route[3])).toBe(true);
  });

  it('never overshoots the goal', () => {
    const { state } = run(startMotion(route, 0), 20_000);
    expect(positionOf(state)).toEqual(cellCenter(route[3]));
  });

  it('clamps one stalled frame', () => {
    const before = startMotion(route, 0);
    const step = stepMotion(before, 9000, free);
    // At most MAX_DELTA_MS of time: a cell is 40 units, 3.5 cells/s => ~0.35 cell per 100 ms.
    expect(step.state.index).toBe(0);
    expect(step.state.progress).toBeLessThanOrEqual((MAX_DELTA_MS / 1000) * 3.5 + 1e-9);
  });

  it('ignores zero, negative and nonfinite time', () => {
    const start = startMotion(route, 0);
    for (const dt of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(stepMotion(start, dt, free).state).toBe(start);
    }
  });

  it('turns before moving off in a new direction', () => {
    // Facing up (0) with the first segment going up: no turn. Facing right: turn first.
    const turning = stepMotion(startMotion(route, 90), 50, free);
    expect(turning.state.turn).not.toBeNull();
    expect(turning.state.progress).toBe(0);
    expect(turning.state.heading).toBeLessThan(90);
  });

  it('stops at a safe centre before a cell that is not safe, and does not move', () => {
    const blocked = (cell: Cell) => !(cell.col === 2 && cell.row === 3);
    const { state, events } = run(startMotion(route, 0), 4000, blocked);
    expect(events.some((e) => e.type === 'blocked')).toBe(true);
    expect(state.blockedBy).toEqual({ col: 2, row: 3 });
    expect(state.index).toBe(1);
    expect(isAtCellCentre(state, route[1])).toBe(true);
    // Further time changes nothing.
    expect(stepMotion(state, 100, blocked).state).toBe(state);
  });

  it('does nothing for a route of one cell', () => {
    expect(startMotion([route[0]], 0).done).toBe(true);
  });
});

describe('stepDiscrete (reduced motion)', () => {
  it('moves exactly one cell per call, snapping the heading, with the same hazard check', () => {
    let state = startMotion(route, 90);
    const first = stepDiscrete(state, free);
    expect(first.state.index).toBe(1);
    expect(first.state.heading).toBeCloseTo(0);
    state = first.state;
    const blocked = stepDiscrete(state, () => false);
    expect(blocked.events[0].type).toBe('blocked');
    expect(blocked.state.index).toBe(1);
  });

  it('reaches the goal once and then stops', () => {
    let state = startMotion(route, 0);
    const kinds: string[] = [];
    for (let i = 0; i < 6; i += 1) {
      const step = stepDiscrete(state, free);
      state = step.state;
      kinds.push(...step.events.map((e) => e.type));
    }
    expect(kinds.filter((k) => k === 'goal')).toHaveLength(1);
    expect(state.done).toBe(true);
  });
});
