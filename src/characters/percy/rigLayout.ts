/**
 * Layout of the layered Percy rig, in "rover pixels": the 964 x 549 frame of
 * the flat `rover` sprite. Each of the 13 source parts was matched against
 * that sprite (scale and position of its opaque bounds), so the rig assembles
 * into the same rover and any part can move on its own.
 *
 * Numbers are measured from `src/assets/perseverance` (read-only originals);
 * the manifest points at the copies in `src/assets/fixed/percy`.
 */
export const ROVER_FRAME = { width: 964, height: 549 } as const;

/** Where the rover meets the ground: the centre of the wheel base, rover pixels. */
export const ROVER_ANCHOR = { x: 430, y: 520 } as const;

/** Visible width of the assembled rover in rover pixels (rear wheel to arm tip). */
export const ROVER_VISIBLE_WIDTH = 848;

export type RigPartId =
  | 'wheel-rear-left'
  | 'generator'
  | 'body'
  | 'back-panel'
  | 'chassis'
  | 'wheel-mid-left'
  | 'neck'
  | 'camera'
  | 'arm'
  | 'wheel-front-left'
  | 'wheel-front-right';

interface PartSource {
  id: RigPartId;
  asset: string;
  /** Source canvas size and opaque bounds (alpha > 8). */
  canvas: { width: number; height: number };
  bounds: { x0: number; y0: number; x1: number; y1: number };
  /** Top-left of the opaque bounds in rover pixels, and the part's scale. */
  x: number;
  y: number;
  scale: number;
}

/** Back to front. The order is the paint order. */
const SOURCES: readonly PartSource[] = [
  { id: 'wheel-rear-left', asset: 'percy-tire-rear', canvas: { width: 198, height: 215 }, bounds: { x0: 30, y0: 47, x1: 167, y1: 180 }, x: 72, y: 308, scale: 0.92 },
  { id: 'generator', asset: 'percy-generator-back', canvas: { width: 126, height: 204 }, bounds: { x0: 33, y0: 75, x1: 94, y1: 165 }, x: 143, y: 114, scale: 0.95 },
  { id: 'body', asset: 'percy-body', canvas: { width: 561, height: 330 }, bounds: { x0: 23, y0: 27, x1: 532, y1: 293 }, x: 126, y: 169, scale: 1 },
  { id: 'back-panel', asset: 'percy-back-panel', canvas: { width: 205, height: 135 }, bounds: { x0: 3, y0: 3, x1: 175, y1: 111 }, x: 232, y: 150, scale: 0.95 },
  { id: 'chassis', asset: 'percy-chassis', canvas: { width: 420, height: 253 }, bounds: { x0: 67, y0: 95, x1: 363, y1: 230 }, x: 179, y: 315, scale: 1 },
  { id: 'wheel-mid-left', asset: 'percy-tire-front-3', canvas: { width: 232, height: 221 }, bounds: { x0: 53, y0: 57, x1: 197, y1: 192 }, x: 166, y: 372, scale: 0.98 },
  { id: 'neck', asset: 'percy-camera-neck', canvas: { width: 152, height: 269 }, bounds: { x0: 43, y0: 38, x1: 116, y1: 244 }, x: 420, y: 122, scale: 0.95 },
  { id: 'camera', asset: 'percy-camera', canvas: { width: 202, height: 145 }, bounds: { x0: 22, y0: 11, x1: 177, y1: 116 }, x: 383, y: 43, scale: 1 },
  { id: 'arm', asset: 'percy-arm', canvas: { width: 494, height: 258 }, bounds: { x0: 26, y0: 48, x1: 460, y1: 212 }, x: 594, y: 207, scale: 0.75 },
  { id: 'wheel-front-left', asset: 'percy-tire-front-2', canvas: { width: 191, height: 213 }, bounds: { x0: 18, y0: 45, x1: 167, y1: 182 }, x: 384, y: 381, scale: 1.1 },
  { id: 'wheel-front-right', asset: 'percy-tire-front-1', canvas: { width: 218, height: 218 }, bounds: { x0: 23, y0: 34, x1: 181, y1: 182 }, x: 614, y: 342, scale: 1 },
];

export interface RigPart {
  id: RigPartId;
  asset: string;
  /** Full source canvas drawn in rover pixels, relative to the ground anchor. */
  box: { x: number; y: number; w: number; h: number };
  /** Centre of the opaque bounds, relative to the anchor. */
  center: { x: number; y: number };
  /** Opaque bounds in rover pixels, relative to the anchor. */
  visible: { left: number; top: number; right: number; bottom: number };
}

function build(source: PartSource): RigPart {
  const { canvas, bounds, scale } = source;
  const left = source.x - bounds.x0 * scale - ROVER_ANCHOR.x;
  const top = source.y - bounds.y0 * scale - ROVER_ANCHOR.y;
  const visibleWidth = (bounds.x1 - bounds.x0) * scale;
  const visibleHeight = (bounds.y1 - bounds.y0) * scale;
  const visLeft = source.x - ROVER_ANCHOR.x;
  const visTop = source.y - ROVER_ANCHOR.y;
  return {
    id: source.id,
    asset: source.asset,
    box: { x: left, y: top, w: canvas.width * scale, h: canvas.height * scale },
    center: { x: visLeft + visibleWidth / 2, y: visTop + visibleHeight / 2 },
    visible: {
      left: visLeft,
      top: visTop,
      right: visLeft + visibleWidth,
      bottom: visTop + visibleHeight,
    },
  };
}

export const RIG_PARTS: readonly RigPart[] = SOURCES.map(build);

export function rigPart(id: RigPartId): RigPart {
  const part = RIG_PARTS.find((item) => item.id === id);
  if (!part) {
    throw new Error(`Unknown Percy rig part: ${id}`);
  }
  return part;
}

/** The four wheels, in the order they spin. */
export const WHEEL_IDS: readonly RigPartId[] = [
  'wheel-rear-left',
  'wheel-mid-left',
  'wheel-front-left',
  'wheel-front-right',
];

/** Pivots (relative to the anchor) for the moving parts. */
export function mastBasePivot(): { x: number; y: number } {
  const neck = rigPart('neck');
  return { x: (neck.visible.left + neck.visible.right) / 2, y: neck.visible.bottom };
}

export function mastHeadPivot(): { x: number; y: number } {
  const neck = rigPart('neck');
  return { x: (neck.visible.left + neck.visible.right) / 2, y: neck.visible.top };
}

export function armShoulderPivot(): { x: number; y: number } {
  const arm = rigPart('arm');
  return {
    x: arm.visible.left + (arm.visible.right - arm.visible.left) * 0.07,
    y: arm.visible.top + (arm.visible.bottom - arm.visible.top) * 0.45,
  };
}

/** Rover pixels to design units: the rover is drawn 340 design px wide. */
export const PERCY_DESIGN_WIDTH = 340;
export const PERCY_SCALE = PERCY_DESIGN_WIDTH / ROVER_VISIBLE_WIDTH;

/**
 * Rolling feel. The wheels are three-quarter views, so turning the sprites in
 * the picture plane makes them tumble. They stay still instead, and the body
 * bobs a little with the ground it covers: one small bounce per
 * `ROLL_BOB_PERIOD` design units. The bob comes from distance rolled, not from
 * a clock, so it stops when Percy stops and when the presentation is paused.
 */
export const ROLL_BOB_PERIOD = 46;
export const ROLL_BOB_AMPLITUDE = 1.8;

/** Vertical bob in design units for a distance rolled; negative is up. */
export function rollBobUnits(distance: number): number {
  return -Math.abs(Math.sin((distance / ROLL_BOB_PERIOD) * Math.PI)) * ROLL_BOB_AMPLITUDE;
}

/** Matching tilt of the body in degrees: it rocks as it rides over the ground. */
export function rollRockDegrees(distance: number): number {
  return Math.sin((distance / ROLL_BOB_PERIOD) * Math.PI * 2) * 0.35;
}
