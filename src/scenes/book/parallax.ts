/**
 * Cursor parallax for the book stage backdrop and the book tilt. Same shape
 * as the homepage driver (one normalized pointer, lerped once per frame, per
 * layer depth), but with its own instance: the two stages never coexist except
 * for a single frame during handoff.
 */

export interface Vec2 {
  x: number;
  y: number;
}

export interface BookParallaxState {
  target: Vec2;
  current: Vec2;
}

export const BOOK_LERP = 0.06;
export const BOOK_MAX_SHIFT = 26;
export const BOOK_Y_FACTOR = 0.5;

export function createBookParallaxState(): BookParallaxState {
  return { target: { x: 0, y: 0 }, current: { x: 0, y: 0 } };
}

/** Normalized pointer (-1..1) with the screen centre at (0, 0). */
export function pointerToTarget(
  clientX: number,
  clientY: number,
  width: number,
  height: number,
): Vec2 {
  if (width <= 0 || height <= 0) {
    return { x: 0, y: 0 };
  }
  const clamp = (value: number) => Math.min(1, Math.max(-1, value));
  return {
    x: clamp((clientX - width / 2) / (width / 2)),
    y: clamp((clientY - height / 2) / (height / 2)),
  };
}

export function stepParallax(state: BookParallaxState, factor = BOOK_LERP): void {
  state.current.x += (state.target.x - state.current.x) * factor;
  state.current.y += (state.target.y - state.current.y) * factor;
}

/** Layer shift opposite the cursor, scaled by depth. */
export function parallaxOffset(
  pointer: Vec2,
  depth: number,
  maxShift = BOOK_MAX_SHIFT,
  yFactor = BOOK_Y_FACTOR,
): Vec2 {
  return {
    x: -pointer.x * depth * maxShift,
    y: -pointer.y * depth * maxShift * yFactor,
  };
}

/** Maximum book tilt in degrees at full cursor deflection. */
export const BOOK_TILT_DEGREES = 1.4;

export function bookTilt(pointer: Vec2): { rotateX: number; rotateY: number } {
  const rotateX = -pointer.y * BOOK_TILT_DEGREES * 0.6;
  return {
    rotateX: rotateX === 0 ? 0 : rotateX,
    rotateY: pointer.x * BOOK_TILT_DEGREES,
  };
}

export const bookParallax = createBookParallaxState();

export function resetBookParallax(state: BookParallaxState = bookParallax): void {
  state.target.x = 0;
  state.target.y = 0;
  state.current.x = 0;
  state.current.y = 0;
}
