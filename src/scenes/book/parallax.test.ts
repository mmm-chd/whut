import { describe, expect, it } from 'vitest';
import {
  BOOK_TILT_DEGREES,
  bookTilt,
  createBookParallaxState,
  parallaxOffset,
  pointerToTarget,
  resetBookParallax,
  stepParallax,
} from './parallax';

describe('book parallax', () => {
  it('normalises the pointer and clamps it to the viewport', () => {
    expect(pointerToTarget(400, 300, 800, 600)).toEqual({ x: 0, y: 0 });
    expect(pointerToTarget(800, 600, 800, 600)).toEqual({ x: 1, y: 1 });
    expect(pointerToTarget(-100, 900, 800, 600)).toEqual({ x: -1, y: 1 });
    expect(pointerToTarget(10, 10, 0, 0)).toEqual({ x: 0, y: 0 });
  });

  it('moves layers against the cursor, deeper layers further', () => {
    const pointer = { x: 1, y: 1 };
    const near = parallaxOffset(pointer, 0.2);
    const far = parallaxOffset(pointer, 0.8);
    expect(near.x).toBeLessThan(0);
    expect(near.y).toBeLessThan(0);
    expect(Math.abs(far.x)).toBeGreaterThan(Math.abs(near.x));
  });

  it('eases the current value toward the target', () => {
    const state = createBookParallaxState();
    state.target.x = 1;
    stepParallax(state, 0.5);
    expect(state.current.x).toBeCloseTo(0.5);
    stepParallax(state, 0.5);
    expect(state.current.x).toBeCloseTo(0.75);
  });

  it('tilts the book with the cursor', () => {
    expect(bookTilt({ x: 0, y: 0 })).toEqual({ rotateX: 0, rotateY: 0 });
    expect(bookTilt({ x: 1, y: 0 }).rotateY).toBeCloseTo(BOOK_TILT_DEGREES);
  });

  it('resets both target and current', () => {
    const state = createBookParallaxState();
    state.target.x = 1;
    state.current.y = -1;
    resetBookParallax(state);
    expect(state.target).toEqual({ x: 0, y: 0 });
    expect(state.current).toEqual({ x: 0, y: 0 });
  });
});
