import type { InspectionPointId } from '../scene-04-percy-inspection/inspectionState';

/**
 * Chip placement and leader lines for the close-up.
 *
 * Every chip sits on the ray that leaves the picture centre through its own
 * part: when the model turns, the part moves and its chip orbits with it,
 * always at the same standing distance and never on top of the model. The
 * maths is pure, so the pixels can be proven without a WebGL context.
 */
export interface Point2 {
  readonly x: number;
  readonly y: number;
}

/** How far outside the part a chip floats, in monitor pixels. */
export const CHIP_STANDOFF_PX = 96;
/** Below this the chip would touch the model, so the leader is not drawn. */
export const LEADER_MIN_PX = 18;

export type ChipState = 'idle' | 'hover' | 'active' | 'done' | 'hidden';

export interface ChipAnchor extends Point2 {
  /** Which side of the picture the chip ended up on; used to align the text. */
  readonly side: 'left' | 'right';
}

const finite = (value: number): number => (Number.isFinite(value) ? value : 0);

/**
 * The chip position: outward from the picture centre, through the part.
 *
 * A part sitting exactly on the centre has no direction of its own, so it
 * falls back to straight up — a chip on top of the model is never the answer.
 */
export function chipAnchor(
  part: Point2,
  centre: Point2,
  standoff = CHIP_STANDOFF_PX,
): ChipAnchor {
  const dx = finite(part.x) - finite(centre.x);
  const dy = finite(part.y) - finite(centre.y);
  const length = Math.hypot(dx, dy);
  const safeStandoff = Math.max(0, finite(standoff));
  if (length < 0.5) {
    return { x: finite(centre.x), y: finite(centre.y) - safeStandoff, side: 'left' };
  }
  const scale = (length + safeStandoff) / length;
  return {
    x: finite(centre.x) + dx * scale,
    y: finite(centre.y) + dy * scale,
    side: dx < 0 ? 'left' : 'right',
  };
}

/** The leader from a chip to its part, or nothing when they already touch. */
export function leaderFor(anchor: Point2, part: Point2): { from: Point2; to: Point2; length: number; visible: boolean } {
  const from = { x: finite(anchor.x), y: finite(anchor.y) };
  const to = { x: finite(part.x), y: finite(part.y) };
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  return { from, to, length, visible: Number.isFinite(length) && length >= LEADER_MIN_PX };
}

/**
 * One state per chip. `active` outranks `hover`, and a part turned away from
 * the camera is `hidden`: the chip leaves the picture but stays in the tab
 * order, so keyboard access never depends on how the model is turned.
 */
export function chipState(input: {
  readonly point: InspectionPointId;
  readonly active: InspectionPointId | null;
  readonly hovered: InspectionPointId | null;
  readonly completed: readonly InspectionPointId[];
  readonly occluded: readonly InspectionPointId[];
}): ChipState {
  if (input.occluded.includes(input.point)) {
    return 'hidden';
  }
  if (input.active === input.point) {
    return 'active';
  }
  if (input.hovered === input.point) {
    return 'hover';
  }
  return input.completed.includes(input.point) ? 'done' : 'idle';
}
