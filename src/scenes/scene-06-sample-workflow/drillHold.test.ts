import { describe, expect, it } from 'vitest';
import {
  MAX_DRILL_DELTA_MS,
  advanceDrillHold,
  beginDrillHold,
  cancelDrillHold,
  createDrillHold,
  drillProgress,
  type DrillHold,
} from './drillHold';

/** Holds from `start` to `end` in 16 ms frames. */
function hold(state: DrillHold, start: number, end: number): DrillHold {
  let next = beginDrillHold(state, start, 'pointer');
  for (let t = start + 16; t <= end; t += 16) {
    next = advanceDrillHold(next, t);
  }
  return next;
}

describe('drill hold', () => {
  it('500 ms, a long wait, then 1300 ms makes exactly one stable outcome', () => {
    let state = createDrillHold(1800);
    state = hold(state, 0, 512);
    state = cancelDrillHold(state);
    expect(state.done).toBe(false);
    // Ten seconds pass with nothing held.
    state = advanceDrillHold(state, 10_512);
    expect(state.activeMs).toBeLessThan(600);
    state = hold(state, 11_000, 12_400);
    expect(state.done).toBe(true);
    expect(state.activeMs).toBe(1800);
  });

  it('a repeated press while holding does not restart the anchor', () => {
    let state = beginDrillHold(createDrillHold(1000), 100, 'keyboard');
    const again = beginDrillHold(state, 5000, 'keyboard');
    expect(again).toBe(state);
    state = advanceDrillHold(state, 150);
    expect(state.activeMs).toBe(50);
  });

  it('clamps a stalled frame to the maximum step', () => {
    let state = beginDrillHold(createDrillHold(5000), 0, 'pointer');
    state = advanceDrillHold(state, 9000);
    expect(state.activeMs).toBe(MAX_DRILL_DELTA_MS);
  });

  it('rejects negative and nonfinite timestamps', () => {
    const state = beginDrillHold(createDrillHold(1000), 100, 'pointer');
    expect(advanceDrillHold(state, Number.NaN)).toBe(state);
    expect(advanceDrillHold(state, -5)).toBe(state);
    expect(beginDrillHold(createDrillHold(1000), Number.POSITIVE_INFINITY, 'pointer').holding).toBe(false);
  });

  it('cancelling stops the clock, so time while cancelled adds nothing', () => {
    let state = hold(createDrillHold(2000), 0, 400);
    const before = state.activeMs;
    state = cancelDrillHold(state);
    state = advanceDrillHold(state, 5000);
    expect(state.activeMs).toBe(before);
    expect(state.anchor).toBeNull();
  });

  it('does nothing after it has finished', () => {
    let state = hold(createDrillHold(300), 0, 1000);
    expect(state.done).toBe(true);
    const after = advanceDrillHold(beginDrillHold(state, 2000, 'pointer'), 2100);
    expect(after.activeMs).toBe(300);
  });

  it('assisted drilling follows the same duration', () => {
    let state = beginDrillHold(createDrillHold(900), 0, 'assist');
    for (let t = 16; t <= 1200; t += 16) {
      state = advanceDrillHold(state, t);
    }
    expect(state.done).toBe(true);
    expect(drillProgress(state)).toBe(1);
  });

  it('an invalid required time can never finish', () => {
    const state = createDrillHold(Number.NaN);
    expect(hold(state, 0, 5000).done).toBe(false);
  });
});
