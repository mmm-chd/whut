/**
 * Camera and world coordinates for P-01.
 *
 * The design frame is 1920x1080; the world extends 600 design px to the right
 * (world width 2520). A layer's screen position is:
 *
 *   screenX = worldX - cameraX * parallax
 *
 * so near layers move further than the sky during the pan.
 */
export const DESIGN_WIDTH = 1920;
export const DESIGN_HEIGHT = 1080;
export const WORLD_WIDTH = 2520;

export const CAMERA_X = {
  /** C2 — frame 1, Percy centred. */
  intro: 0,
  /** C3 — frame 2, rocks. */
  rocks: 600,
} as const;

export const PARALLAX = {
  sky: 0.05,
  clouds: 0.15,
  ridgeFar: 0.35,
  // ridge-near paints in front of the ground, so it moves further during the pan.
  ridgeNear: 0.85,
  ground: 0.75,
  rocks: 0.9,
  rover: 1,
  foreground: 1,
} as const;

export type LayerName = keyof typeof PARALLAX;

export function worldToScreen(worldX: number, cameraX: number, parallax: number): number {
  return worldX - cameraX * parallax;
}

export function screenToWorld(screenX: number, cameraX: number, parallax: number): number {
  return screenX + cameraX * parallax;
}

/** World X in design px -> percent of the design frame. */
export function toPercent(designPx: number, designWidth = DESIGN_WIDTH): number {
  return (designPx / designWidth) * 100;
}

/** World X -> screen percent at a given camera stop. */
export function screenPercent(
  worldX: number,
  cameraX: number,
  parallax: number,
  designWidth = DESIGN_WIDTH,
): number {
  return toPercent(worldToScreen(worldX, cameraX, parallax), designWidth);
}
