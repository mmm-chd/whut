/**
 * Camera fitting for the inspector.
 *
 * The rover is normalised to a sphere of radius 1 around the origin, so the
 * only job left is to place a perspective camera far enough that the sphere
 * never clips out of the monitor, whatever its aspect ratio.
 */

export interface SphereFit {
  /** Distance from the origin along +Z. */
  readonly distance: number;
  readonly near: number;
  readonly far: number;
}

const DEGREES_TO_RADIANS = Math.PI / 180;
const MIN_RADIUS = 1e-3;
const DEFAULT_FOV = 35;
const MIN_FOV = 1;
const MAX_FOV = 179;
/** A tenth of room around the sphere: the rover is not a perfect ball. */
const FITTING_MARGIN = 1.15;

function positive(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/**
 * Fit a unit-normalised sphere into the monitor.
 *
 * The *limiting* field of view decides: a tall, narrow monitor is limited by
 * its horizontal angle, so the camera backs off further than on a wide one.
 */
export function fitInspectorSphere(
  radius: number,
  aspect: number,
  verticalFovDegrees: number,
): SphereFit {
  const safeRadius = positive(radius, MIN_RADIUS);
  const safeAspect = positive(aspect, 1);
  const fov =
    Number.isFinite(verticalFovDegrees) && verticalFovDegrees > MIN_FOV && verticalFovDegrees < MAX_FOV
      ? verticalFovDegrees
      : DEFAULT_FOV;

  const verticalHalf = (fov / 2) * DEGREES_TO_RADIANS;
  const horizontalHalf = Math.atan(Math.tan(verticalHalf) * safeAspect);
  const limitingHalf = Math.min(verticalHalf, horizontalHalf);

  const distance = (safeRadius / Math.sin(limitingHalf)) * FITTING_MARGIN;
  return {
    distance,
    near: Math.max(safeRadius * 0.05, distance - safeRadius * 1.5),
    far: distance + safeRadius * 3 + 1,
  };
}

/** Monitor aspect ratio, falling back to square for a zero-height rectangle. */
export function monitorAspect(width: number, height: number): number {
  return positive(width, 1) / positive(height, 1);
}

export interface Size3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface ModelTransform {
  /** Uniform scale that makes the largest half-extent `targetRadius`. */
  readonly scale: number;
  /** Translation that puts the model's centre on the origin, already scaled. */
  readonly offset: Size3;
}

/**
 * Centre a model on the origin and scale its largest half-extent to
 * `targetRadius`, so `fitInspectorSphere` always deals with radius 1.
 */
export function normalizeModelBox(size: Size3, center: Size3, targetRadius = 1): ModelTransform {
  const halfExtent = Math.max(
    Math.abs(size.x) / 2,
    Math.abs(size.y) / 2,
    Math.abs(size.z) / 2,
  );
  const scale = halfExtent > 0 && Number.isFinite(halfExtent) ? targetRadius / halfExtent : 1;
  return {
    scale,
    offset: {
      x: -center.x * scale,
      y: -center.y * scale,
      z: -center.z * scale,
    },
  };
}
