import { fitScale } from '../../three/designSpace';
import { GROUND_LINE } from '../scene-03-arrival-jezero/layout';

/**
 * Where the ending's world sits, in design units (the 1920 x 1080 frame) and
 * host pixels. All authored paths are in design units; `unit` turns them into
 * pixels for the real host, so nothing here depends on a fixed window.
 */
export const TRAVEL_UNITS_PER_SECOND = 70;
export const DEPARTURE_UNITS_PER_SECOND = 110;
/** Percy stands this share of the host width from the left while he is followed. */
export const FOLLOW_SCREEN_SHARE = 0.34;

export interface P08Layout {
  readonly width: number;
  readonly height: number;
  readonly unit: number;
  /** Host pixels, as PercyRig needs it. */
  readonly groundY: number;
  readonly hopeStartX: number;
  /** Furthest world x the camera ever reaches, in design units. */
  readonly maxCameraX: number;
  /** Camera x that puts a body at `x` at the follow position. */
  readonly followX: (bodyX: number) => number;
  readonly closeupScale: number;
  readonly tracksScale: number;
  /** Lift that puts the ground line at `fraction` of the host height at `scale`. */
  readonly liftForGround: (fraction: number, scale: number) => number;
}

/**
 * Null until the host is usable. `hopeBudgetMs` is the finite time Percy may
 * roll in the hope phase (its auto narration plus audio allowances), so the
 * landscape ring covers exactly that and never grows with how long a reader
 * waits at a gate.
 */
export function layoutP08(width: number, height: number, hopeBudgetMs: number): P08Layout | null {
  if (![width, height, hopeBudgetMs].every(Number.isFinite) || width <= 0 || height <= 0 || hopeBudgetMs < 0) {
    return null;
  }
  const unit = fitScale(width, height);
  if (!(unit > 0)) {
    return null;
  }
  const groundY = GROUND_LINE * height;
  const hopeStartX = 0;
  const travel = (hopeBudgetMs / 1000) * TRAVEL_UNITS_PER_SECOND;
  const followOffset = ((0.5 - FOLLOW_SCREEN_SHARE) * width) / unit;
  return {
    width,
    height,
    unit,
    groundY,
    hopeStartX,
    maxCameraX: hopeStartX + travel + followOffset + 200,
    followX: (bodyX) => bodyX + followOffset,
    closeupScale: 1.55,
    tracksScale: 1.4,
    liftForGround: (fraction, scale) => (height / 2 - (groundY - ((fraction - 0.5) * height) / scale)) / unit,
  };
}
