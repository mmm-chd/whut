import { fitScale } from '../../three/designSpace';
import { GROUND_LINE } from '../scene-03-arrival-jezero/layout';

/**
 * Where the Mars picture puts Percy and his rock in the sampling scene.
 *
 * The game UI is DOM laid out by CSS; this only places the world behind it.
 * Design units are the 1920 x 1080 storybook frame, `unit` turns them into host
 * pixels, and the ground line is the one P-03 and P-04 use.
 *
 * Percy stands right of centre, under the mission card, with his rock a little
 * further right, so the close-up frame on the left never covers him.
 */
export interface SampleLayout {
  readonly valid: boolean;
  readonly width: number;
  readonly height: number;
  readonly unit: number;
  readonly groundY: number;
  /** Camera x (design units) that puts Percy at `percyScreenShare` of the width. */
  readonly cameraX: number;
  readonly percyX: number;
  readonly rockX: number;
  /** Narrow or short hosts drop the decorative world detail. */
  readonly compact: boolean;
}

/** Share of the host width Percy stands at. */
export const PERCY_SCREEN_SHARE = 0.7;
/** Distance from Percy to the rock, in design units. */
export const ROCK_OFFSET = 330;
export const COMPACT_MAX_WIDTH = 900;
export const COMPACT_MAX_HEIGHT = 480;

export function layoutSample(width: number, height: number): SampleLayout {
  const unit = fitScale(width, height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0 || !unit) {
    return {
      valid: false,
      width: 0,
      height: 0,
      unit: 1,
      groundY: 0,
      cameraX: 0,
      percyX: 0,
      rockX: ROCK_OFFSET,
      compact: true,
    };
  }
  // Screen x of world x is width / 2 + (x - cameraX) * unit.
  const cameraX = ((0.5 - PERCY_SCREEN_SHARE) * width) / unit;
  return {
    valid: true,
    width,
    height,
    unit,
    groundY: GROUND_LINE * height,
    cameraX,
    percyX: 0,
    rockX: ROCK_OFFSET,
    compact: width <= COMPACT_MAX_WIDTH || height <= COMPACT_MAX_HEIGHT,
  };
}
