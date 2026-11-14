import { LERP, MAX_SHIFT, ROCKET_TILT, Y_FACTOR } from './layers';

/**
 * Cursor parallax for the launchpad (concept 4.6): one normalized pointer
 * (-1..1), smoothed with a lerp, drives every layer through its depth factor.
 * A single module-level instance is shared by the WebGL layers and the DOM
 * Play button so they never drift apart.
 */
export interface Vec2 {
  x: number;
  y: number;
}

export interface ParallaxState {
  target: Vec2;
  current: Vec2;
}

export function createParallaxState(): ParallaxState {
  return {
    target: { x: 0, y: 0 },
    current: { x: 0, y: 0 },
  };
}

/** Normalized pointer from a client position: screen centre is (0, 0). */
export function pointerTarget(clientX: number, clientY: number, width: number, height: number): Vec2 {
  if (width <= 0 || height <= 0) {
    return { x: 0, y: 0 };
  }
  const clamp = (value: number) => Math.min(1, Math.max(-1, value));
  return {
    x: clamp(((clientX - width / 2) / (width / 2)) * 1),
    y: clamp(((clientY - height / 2) / (height / 2)) * 1),
  };
}

/** One smoothing step toward the target, in place. */
export function lerpStep(state: ParallaxState, factor = LERP): void {
  state.current.x += (state.target.x - state.current.x) * factor;
  state.current.y += (state.target.y - state.current.y) * factor;
}

/** Screen shift for a layer at `depth`: opposite the cursor, Y damped. */
export function layerOffset(pointer: Vec2, depth: number, maxShift = MAX_SHIFT): Vec2 {
  return {
    x: -pointer.x * depth * maxShift,
    y: -pointer.y * depth * maxShift * Y_FACTOR,
  };
}

/** Rocket tilt in degrees; the top leans toward the cursor. */
export function rocketTilt(pointer: Vec2, degrees = ROCKET_TILT): number {
  return pointer.x * degrees;
}

/** Live state for the mounted homepage scene. */
export const homeParallax = createParallaxState();

/** Returns the live state to rest (scene unmount, reduced motion). */
export function resetParallax(state: ParallaxState = homeParallax): void {
  state.target.x = 0;
  state.target.y = 0;
  state.current.x = 0;
  state.current.y = 0;
}
