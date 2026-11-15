import { fitScale } from '../../three/designSpace';
import { PERCY_DESIGN_WIDTH } from '../../characters/percy/rigLayout';

/**
 * P-06 geometry.
 *
 * The same rules as P-03: design units along the ground (x) and above it (y),
 * turned into host pixels by `unit = min(W / 1920, H / 1080)`, with the ground
 * line at the storybook's 0.82 H. Nothing here is a fixed pixel count, so a
 * narrow host shrinks the actors with the picture instead of cropping them.
 */
export const GROUND_LINE = 0.82;

/** Percy's opaque width in design units, and the margin kept past the edge. */
export const P06_PERCY_HALF_WIDTH = PERCY_DESIGN_WIDTH / 2;
const OFFSCREEN_MARGIN = 40;

export interface P06CameraPose {
  /** World x at the centre of the view, in design units. */
  readonly x: number;
  /** How far the view centre is raised above the host centre, in design units. */
  readonly lift: number;
  readonly scale: number;
}

export interface P06Layout {
  readonly valid: boolean;
  readonly width: number;
  readonly height: number;
  /** Host pixels per design unit. */
  readonly unit: number;
  /** Host y of the wheel contact line. */
  readonly groundY: number;
  /** Where Percy starts and where his journey ends. */
  readonly startX: number;
  readonly exitX: number;
  /** Where the Cheyava Falls rock sits in the second half of the chapter. */
  readonly rockX: number;
  readonly percyHalfWidth: number;
  readonly journey: P06CameraPose;
  readonly valley: P06CameraPose;
  /** Camera x that keeps Percy a little left of centre while he rolls right. */
  readonly followX: (percyX: number) => number;
}

/**
 * The camera shares the journey: it tracks Percy, so "he has left the picture"
 * is decided against a camera that is also moving, exactly as P-03 does it.
 */
export function layoutP06(width: number, height: number): P06Layout {
  const unit = fitScale(width, height) || 1;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return {
      valid: false,
      width: 0,
      height: 0,
      unit: 1,
      groundY: 0,
      startX: 0,
      exitX: 0,
      rockX: 0,
      percyHalfWidth: P06_PERCY_HALF_WIDTH,
      journey: { x: 0, lift: 0, scale: 1 },
      valley: { x: 0, lift: 0, scale: 1 },
      followX: (percyX) => percyX,
    };
  }

  const groundY = GROUND_LINE * height;
  /** Lift that puts the ground line at `fraction` of the host height at `scale`. */
  const liftForGround = (fraction: number, scale: number) =>
    (height / 2 - (groundY - ((fraction - 0.5) * height) / scale)) / unit;

  const journeyScale = 1.15;
  const valleyScale = 1.1;
  const followX = (percyX: number) => percyX - 120;

  const startX = 0;
  // The journey ends where the exit is guaranteed: half a viewport past the
  // point at which the camera stops following. The exact off-screen moment is
  // measured from the sprite's own bounds, not assumed from this number.
  const halfView = width / 2 / (journeyScale * unit);
  const exitX = startX + halfView * 2 + P06_PERCY_HALF_WIDTH + OFFSCREEN_MARGIN + 600;

  return {
    valid: true,
    width,
    height,
    unit,
    groundY,
    startX,
    exitX,
    rockX: exitX + 900,
    percyHalfWidth: P06_PERCY_HALF_WIDTH,
    journey: { x: followX(startX), lift: liftForGround(0.8, journeyScale), scale: journeyScale },
    valley: { x: exitX + 520, lift: liftForGround(0.78, valleyScale), scale: valleyScale },
    followX,
  };
}

/** Host-pixel span of Percy's opaque width at one camera pose. */
export function percyScreenSpan(
  percyX: number,
  camera: P06CameraPose,
  layout: P06Layout,
): { readonly left: number; readonly right: number } {
  const toScreen = (designX: number) =>
    layout.width / 2 + camera.scale * (designX - camera.x) * layout.unit;
  return {
    left: toScreen(percyX - layout.percyHalfWidth),
    right: toScreen(percyX + layout.percyHalfWidth),
  };
}

/**
 * Percy has left the picture when his whole opaque width is past the edge by
 * the margin. Pure math on node state, so no animation can claim an exit it did
 * not make, and a resize is answered by recomputing rather than replaying.
 */
export function isPercyOutsideViewport(
  percyX: number,
  camera: P06CameraPose,
  layout: P06Layout,
  margin: number = 24,
): boolean {
  if (!layout.valid) {
    return false;
  }
  const span = percyScreenSpan(percyX, camera, layout);
  const edge = margin * layout.unit;
  return span.left >= layout.width + edge || span.right <= -edge;
}
