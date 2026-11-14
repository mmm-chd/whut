import { CAMERA_X, DESIGN_WIDTH, PARALLAX } from './camera';
import { rocksConfig, type RockConfig } from './rocks.config';

/**
 * P-01 layout, in host pixels.
 *
 * P-01 is not fitted to a 16:9 frame: the old DOM stage filled the viewport
 * with percentage rules, so every number here is those percentages applied to
 * the host size (W x H). Coordinates are y down with the origin at the host's
 * top-left; the world container (the tall scroll) is 2.6 H high and its top
 * edge sits at y = 0 before the camera descends.
 */
export const WORLD_HEIGHT_FACTOR = 2.6;
/** The camera descent ends at -(160 / 260) of the container height. */
export const DESCENT_END_PERCENT = -61.54;

/** Source aspect ratios the CSS declared with `aspect-ratio`. */
const RIDGE_ASPECT = 1672 / 438;
const FG_ASPECT = 1672 / 176;
const FG_WIDE_ASPECT = 2172 / 176;
const MOBILE_MAX_WIDTH = 720;

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CloudSpec {
  id: string;
  /** Box in container coordinates; the height follows the cloud art. */
  x: number;
  y: number;
  w: number;
}

export interface PercyLayout {
  /** Rover width and the bottom-centre anchor, in container coordinates. */
  width: number;
  anchorX: number;
  anchorY: number;
}

export interface RockLayout {
  id: RockConfig['id'];
  /** Bottom-left anchor in container coordinates. */
  x: number;
  y: number;
  w: number;
}

export interface P01Layout {
  width: number;
  height: number;
  containerHeight: number;
  sky: Box;
  clouds: CloudSpec[];
  ridgeFar: Box;
  ridgeFarDupX: number;
  ridgeNear: Box;
  ridgeNearDupX: number;
  ground: Box;
  groundDupX: number;
  fgV1: Box;
  fgV2: Box;
  percy: PercyLayout;
  rocks: RockLayout[];
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const CLOUDS = [
  { id: 'bg-cloud-1', left: 5.86, top: 66.5, width: 39.89 },
  { id: 'bg-cloud-2', left: 32.54, top: 68.5, width: 43.9 },
  { id: 'bg-cloud-3', left: 56.94, top: 71, width: 43.06 },
] as const;

export function layoutP01(width: number, height: number): P01Layout {
  const containerHeight = height * WORLD_HEIGHT_FACTOR;
  const bottom = containerHeight;

  const ridgeFarW = 1.08 * width;
  const ridgeFarH = ridgeFarW / RIDGE_ASPECT;
  const ridgeNearW = 1.25 * width;
  const ridgeNearH = ridgeNearW / RIDGE_ASPECT;
  const fgV2W = 1.3125 * width;

  const mobile = width <= MOBILE_MAX_WIDTH;
  const percyWidth = mobile
    ? clamp(0.38 * width, 160, 240)
    : clamp(0.4 * width, 300, 780);
  const percyBottomFraction = mobile ? 0.22 : 0.18;

  // The actors box is one viewport tall and anchored to the container bottom.
  const actorsBottom = bottom;

  return {
    width,
    height,
    containerHeight,
    sky: { x: -0.01 * width, y: 0, w: 1.02 * width, h: containerHeight },
    clouds: CLOUDS.map((cloud) => ({
      id: cloud.id,
      x: (cloud.left / 100) * width,
      y: (cloud.top / 100) * containerHeight,
      w: (cloud.width / 100) * width,
    })),
    ridgeFar: {
      x: -0.04 * width,
      y: bottom - 0.1462 * containerHeight - ridgeFarH,
      w: ridgeFarW,
      h: ridgeFarH,
    },
    ridgeFarDupX: 1.04 * width,
    ridgeNear: {
      x: 0,
      y: bottom - 0.115 * containerHeight - ridgeNearH,
      w: ridgeNearW,
      h: ridgeNearH,
    },
    ridgeNearDupX: 1.06 * width,
    // One viewport tall; its bottom edge sits 0.38 H below the container.
    ground: { x: 0, y: bottom + 0.1462 * containerHeight - height, w: width, h: height },
    groundDupX: width,
    fgV1: { x: 0, y: bottom - width / FG_ASPECT, w: width, h: width / FG_ASPECT },
    fgV2: { x: 0, y: bottom - fgV2W / FG_WIDE_ASPECT, w: fgV2W, h: fgV2W / FG_WIDE_ASPECT },
    percy: {
      width: percyWidth,
      anchorX: 0.5 * width,
      anchorY: actorsBottom - percyBottomFraction * height,
    },
    rocks: rocksConfig.map((rock) => ({
      id: rock.id,
      x: ((rock.worldX / DESIGN_WIDTH) * 100 - rock.size * 50) * 0.01 * width,
      y: actorsBottom - (1 - rock.baseY) * height,
      w: rock.size * width,
    })),
  };
}

/** Horizontal pan shift of a layer, in host pixels, for pan progress 0..1. */
export function panShift(width: number, parallax: number, pan: number): number {
  return -((CAMERA_X.rocks * parallax) / DESIGN_WIDTH) * width * pan;
}

/** Percy drives further than the rover parallax: 190 design px short of the stop. */
export function percyPanShift(width: number, pan: number): number {
  return -(((CAMERA_X.rocks * PARALLAX.rover - 190) / DESIGN_WIDTH) * width) * pan;
}

export interface WorldTransform {
  scale: number;
  /** Zoom origin as host fractions. */
  originX: number;
  originY: number;
  /** Descent, in percent of the container height (0 to -61.54). */
  scrollPercent: number;
  pan: number;
}

/**
 * Host rect of a rock for the hit proxy, after descent, pan and world zoom.
 * `aspect` is the rock art's width / height.
 */
export function rockHostRect(
  layout: P01Layout,
  rock: RockLayout,
  aspect: number,
  transform: WorldTransform,
): { left: number; top: number; width: number; height: number } {
  const { width, height } = layout;
  const rockHeight = aspect > 0 ? rock.w / aspect : rock.w;
  const x = rock.x + panShift(width, PARALLAX.rocks, transform.pan);
  const y = rock.y - rockHeight + (transform.scrollPercent / 100) * layout.containerHeight;

  const ox = transform.originX * width;
  const oy = transform.originY * height;
  const s = transform.scale;
  return {
    left: ox + s * (x - ox),
    top: oy + s * (y - oy),
    width: rock.w * s,
    height: rockHeight * s,
  };
}
