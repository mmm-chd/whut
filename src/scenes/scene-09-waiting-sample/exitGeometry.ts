/**
 * When has Percy really left the picture?
 *
 * "Centre outside the frame" is not enough: his mast and arm reach far from the
 * body, and the world camera scales everything. So the test is about a
 * conservative envelope around his whole rig, in design units, measured against
 * the live host and camera. The formulas match the world camera's horizontal
 * transform (`MarsWorldCamera`).
 */
export const RIG_ENVELOPE = 400;
const MARGIN_PX = 8;
const EXTRA_UNITS = 32;

export interface ExitGeometry {
  readonly width: number;
  readonly unit: number;
  readonly cameraX: number;
  readonly cameraScale: number;
  readonly bodyX: number;
}

type View = Omit<ExitGeometry, 'bodyX'>;

function usable(values: readonly number[], width: number, unit: number, cameraScale: number): boolean {
  return values.every(Number.isFinite) && width > 0 && unit > 0 && cameraScale > 0;
}

/** True only when even the left edge of the rig's envelope is past the right edge. */
export function percyExitedRight(g: ExitGeometry): boolean {
  if (!usable([g.width, g.unit, g.cameraX, g.cameraScale, g.bodyX], g.width, g.unit, g.cameraScale)) {
    return false;
  }
  const screenCentre = g.width / 2 + g.cameraScale * g.unit * (g.bodyX - g.cameraX);
  const left = screenCentre - RIG_ENVELOPE * g.cameraScale * g.unit;
  return left > g.width + MARGIN_PX;
}

/** The body x at which the whole envelope has cleared the right edge, or null. */
export function exitTargetX(g: View): number | null {
  if (!usable([g.width, g.unit, g.cameraX, g.cameraScale], g.width, g.unit, g.cameraScale)) {
    return null;
  }
  return g.cameraX + (g.width / 2 + MARGIN_PX) / (g.cameraScale * g.unit) + RIG_ENVELOPE + EXTRA_UNITS;
}
