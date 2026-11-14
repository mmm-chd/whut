import { describe, expect, it } from 'vitest';
import {
  createParallaxState,
  layerOffset,
  lerpStep,
  pointerTarget,
  resetParallax,
  rocketTilt,
} from './parallax';
import { LERP, MAX_SHIFT, ROCKET_TILT, Y_FACTOR } from './layers';

describe('pointer parallax (concept 4.6)', () => {
  it('normalizes the cursor with the screen centre at (0, 0)', () => {
    expect(pointerTarget(500, 400, 1000, 800)).toEqual({ x: 0, y: 0 });
    expect(pointerTarget(1000, 400, 1000, 800).x).toBeCloseTo(1);
    expect(pointerTarget(0, 400, 1000, 800).x).toBeCloseTo(-1);
    expect(pointerTarget(500, 800, 1000, 800).y).toBeCloseTo(1);
    expect(pointerTarget(500, 0, 1000, 800).y).toBeCloseTo(-1);
  });

  it('clamps the cursor outside the window', () => {
    const target = pointerTarget(-500, 5000, 1000, 800);
    expect(target.x).toBe(-1);
    expect(target.y).toBe(1);
  });

  it('is safe for a zero-size host', () => {
    expect(pointerTarget(10, 10, 0, 0)).toEqual({ x: 0, y: 0 });
  });

  it('shifts layers opposite the cursor, scaled by depth', () => {
    const pointer = { x: 1, y: 0 };
    const far = layerOffset(pointer, 0.02);
    const near = layerOffset(pointer, 0.8);
    expect(far.x).toBeCloseTo(-0.02 * MAX_SHIFT);
    expect(near.x).toBeCloseTo(-0.8 * MAX_SHIFT);
    // Cursor right -> layer shifts left.
    expect(near.x).toBeLessThan(0);
  });

  it('damps the vertical shift', () => {
    const pointer = { x: 0, y: 1 };
    const offset = layerOffset(pointer, 1);
    expect(offset.y).toBeCloseTo(-MAX_SHIFT * Y_FACTOR);
  });

  it('eases the current value toward the target', () => {
    const state = createParallaxState();
    state.target.x = 1;
    lerpStep(state);
    expect(state.current.x).toBeGreaterThan(0);
    expect(state.current.x).toBeLessThan(1);
    for (let index = 0; index < 200; index += 1) {
      lerpStep(state);
    }
    expect(state.current.x).toBeCloseTo(1, 2);
  });

  it('uses the documented lerp factor', () => {
    const state = createParallaxState();
    state.target.x = 1;
    lerpStep(state);
    expect(state.current.x).toBeCloseTo(LERP, 5);
  });

  it('tilts the rocket toward the cursor', () => {
    expect(rocketTilt({ x: 1, y: 0 })).toBeCloseTo(ROCKET_TILT);
    expect(rocketTilt({ x: -1, y: 0 })).toBeCloseTo(-ROCKET_TILT);
    expect(rocketTilt({ x: 0, y: 1 })).toBe(0);
  });

  it('resets to rest', () => {
    const state = createParallaxState();
    state.target.x = 1;
    state.current.y = -1;
    resetParallax(state);
    expect(state.target).toEqual({ x: 0, y: 0 });
    expect(state.current).toEqual({ x: 0, y: 0 });
  });
});
