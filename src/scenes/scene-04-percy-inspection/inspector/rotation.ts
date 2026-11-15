/**
 * Rotation rules for the inspector.
 *
 * The model rotates; the camera stays put. That keeps projection cheap (one
 * rotation of a known point, one perspective divide) and means a rotation
 * change never re-fits the model.
 */

export interface InspectorRotation {
  /** Yaw around the vertical axis, normalised to [0, 2π). */
  readonly yaw: number;
  /** Pitch in radians, clamped to the configured limit. */
  readonly pitch: number;
}

export const MAX_PITCH = (35 * Math.PI) / 180;
/** A press only becomes a drag after this much movement. */
export const DRAG_THRESHOLD_PX = 8;
/** Radians of rotation per CSS pixel dragged. */
export const DRAG_RADIANS_PER_PX = 0.008;
/** One tap of a toolbar control. */
export const NUDGE_YAW = Math.PI / 12;
export const NUDGE_PITCH = (10 * Math.PI) / 180;

/** A three-quarter view: the mast, one side of the body and the deck all read. */
export const DEFAULT_YAW = 0.9;
export const DEFAULT_PITCH = 0.12;
export const INITIAL_ROTATION: InspectorRotation = { yaw: DEFAULT_YAW, pitch: DEFAULT_PITCH };

export function normalizeYaw(yaw: number): number {
  if (!Number.isFinite(yaw)) {
    return DEFAULT_YAW;
  }
  const twoPi = Math.PI * 2;
  const wrapped = ((yaw % twoPi) + twoPi) % twoPi;
  return wrapped;
}

export function clampPitch(pitch: number): number {
  if (!Number.isFinite(pitch)) {
    return DEFAULT_PITCH;
  }
  return Math.min(MAX_PITCH, Math.max(-MAX_PITCH, pitch));
}

export function rotate(rotation: InspectorRotation, deltaYaw: number, deltaPitch: number): InspectorRotation {
  return {
    yaw: normalizeYaw(rotation.yaw + (Number.isFinite(deltaYaw) ? deltaYaw : 0)),
    pitch: clampPitch(rotation.pitch + (Number.isFinite(deltaPitch) ? deltaPitch : 0)),
  };
}

/** Drag distance, in CSS pixels, mapped to a rotation delta. */
export function dragRotation(rotation: InspectorRotation, dx: number, dy: number): InspectorRotation {
  const yawDelta = Number.isFinite(dx) ? dx * DRAG_RADIANS_PER_PX : 0;
  const pitchDelta = Number.isFinite(dy) ? dy * DRAG_RADIANS_PER_PX : 0;
  return rotate(rotation, yawDelta, pitchDelta);
}

export function nudgeYaw(rotation: InspectorRotation, direction: 1 | -1): InspectorRotation {
  return rotate(rotation, NUDGE_YAW * direction, 0);
}

export function nudgePitch(rotation: InspectorRotation, direction: 1 | -1): InspectorRotation {
  return rotate(rotation, 0, NUDGE_PITCH * direction);
}

/**
 * Drag-versus-click arbitration: a press that never leaves the threshold is a
 * click (and may open a hotspot); anything further is rotation.
 */
export function isDrag(distancePx: number): boolean {
  return Number.isFinite(distancePx) && distancePx > DRAG_THRESHOLD_PX;
}

/** Distance travelled by a pointer, clamped for non-finite input. */
export function pointerDistance(from: { x: number; y: number }, to: { x: number; y: number }): number {
  const dx = Number.isFinite(to.x - from.x) ? to.x - from.x : 0;
  const dy = Number.isFinite(to.y - from.y) ? to.y - from.y : 0;
  return Math.hypot(dx, dy);
}
