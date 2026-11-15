import { P04_INVITATION_X } from './annotations';
import { P04_START_X } from './nodes';

/**
 * Part A travel math.
 *
 * The walk is bounded on purpose: it covers a fixed stretch of Mars, so actor
 * and camera coordinates stay small floats and the landscape keeps its fixed
 * tile ring. There is nothing to rebase, and no distance-proportional array to
 * allocate.
 */
export interface TravelPlan {
  readonly fromX: number;
  readonly toX: number;
  /** Design units per second while cruising. */
  readonly cruise: number;
}

export const P04_TRAVEL: TravelPlan = {
  fromX: P04_START_X,
  toX: P04_INVITATION_X,
  cruise: 70,
};

/** Wheel radius in design units, used to turn distance into a spin angle. */
export const P04_WHEEL_RADIUS = 13;

/** Seconds the walk takes at cruise speed; never zero, so a tween has a span. */
export function travelDuration(plan: TravelPlan = P04_TRAVEL): number {
  const span = Math.abs(plan.toX - plan.fromX);
  if (!Number.isFinite(span) || plan.cruise <= 0) {
    return 0;
  }
  return span / plan.cruise;
}

/** Distance covered at `progress` (0..1); the ends are exact, never overshot. */
export function travelledDistance(progress: number, plan: TravelPlan = P04_TRAVEL): number {
  const clamped = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;
  return plan.fromX + (plan.toX - plan.fromX) * clamped;
}

/** Wheel spin in radians for a covered distance. */
export function wheelAngle(distance: number, radius = P04_WHEEL_RADIUS): number {
  if (!Number.isFinite(distance) || radius <= 0) {
    return 0;
  }
  return distance / radius;
}

/**
 * The camera that follows Percy while he rolls. The rover stays centred and the
 * picture does not zoom during Part A, so the shared landscape never has to
 * rescale mid-walk.
 */
export function followPose(x: number): { x: number; lift: number; scale: number } {
  return {
    x: Number.isFinite(x) ? x : P04_TRAVEL.fromX,
    lift: 0,
    scale: 1,
  };
}
