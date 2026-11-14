import { DESIGN_HEIGHT, DESIGN_WIDTH, fitScale } from '../../three/designSpace';
import { DUSK_SKY, SKY_OVERSCAN, SPACE_SKY, layerStops } from './backdrop';

/**
 * Homepage "The Launchpad" layout, in design pixels (y down, 1920x1080).
 * Numbers follow the paper-cut reference (docs-base/pics/home/home.png) and
 * NASA_Storybook_Concept.md sections 4.5-4.7.
 */

/** "Dusk" palette, sampled from the reference (perceptual, draft values). */
export const DUSK = {
  skyTop: '#6b4a9a',
  skyMid1: '#a34e8f',
  skyMid2: '#d5507a',
  skyLow: '#e87e6f',
  horizon: '#f2926e',
  hills: '#8e4e9e',
  hillsDark: '#6e3d86',
  sea: '#e4706b',
  seaWave: '#f2926e',
  silhouette: '#2a1f63',
  spaceTop: '#0e1b30',
  spaceBottom: '#13243c',
  star: '#d9e4ec',
  cream: '#fff1d6',
} as const;

/** Sky stops shifted onto the oversized backdrop layer (design y -> layer y). */
export const SKY_STOPS = layerStops(DUSK_SKY, SKY_OVERSCAN.top);
export const SPACE_STOPS = layerStops(SPACE_SKY, SKY_OVERSCAN.top);

/**
 * The gradient backdrop is drawn oversized so parallax shifts and letterbox
 * hosts never reveal an edge (concept 4.6: overscan 5-8%).
 */
export const BACKDROP = { x: -320, y: SKY_OVERSCAN.top, w: 2560, h: 1840 } as const;

/**
 * Rocket + boosters box, sized like the reference: the nose starts near the top
 * of the frame and the nozzle ends above the smoke. The box keeps the asset's
 * 200:430 aspect, so `fit="contain"` never stretches it.
 */
export const ROCKET = { left: 846, top: 84, width: 228, height: 490 } as const;
export const ROCKET_CENTER = {
  x: ROCKET.left + ROCKET.width / 2,
  y: ROCKET.top + ROCKET.height / 2,
} as const;
export const ROCKET_NOZZLE = { x: ROCKET_CENTER.x, y: ROCKET.top + ROCKET.height - 30 } as const;
export const FLAME = { left: 912, top: 552, width: 96, height: 214 } as const;

/** The Play button rides on the rocket body at this design point. */
export const PLAY_ANCHOR = { x: ROCKET_CENTER.x, y: 396 } as const;

/** Towers flank the rocket and stand on the horizon (reference). */
export const TOWERS = [
  { left: 688, top: 320, width: 120 },
  { left: 1140, top: 372, width: 100 },
] as const;

/** The little boat sits on the sea, right of the rocket. */
export const BOAT = { left: 1508, top: 884, width: 118 } as const;

/** Smoke clusters: two sprites per layer for full-width coverage. */
export interface SmokeCluster {
  left: number;
  top: number;
  width: number;
}

export const SMOKE_LAYERS = {
  far: [
    { left: -220, top: 520, width: 1250 },
    { left: 880, top: 470, width: 1160 },
  ],
  mid: [
    { left: -260, top: 600, width: 1290 },
    { left: 900, top: 540, width: 1180 },
  ],
  near: [
    { left: -300, top: 700, width: 1330 },
    { left: 920, top: 630, width: 1220 },
  ],
} as const;

export const SMOKE_SPRITE_ASPECT = 520 / 300;

export const CROWD = { left: -60, top: 820, width: 720 } as const;
export const CROWD_SPRITE_ASPECT = 640 / 190;

/** Denser stars revealed with the deep-space gradient during the transition. */
export const SPACE_STARS = [
  [140, 60], [260, 170], [380, 90], [500, 230], [620, 140], [740, 40],
  [860, 190], [980, 90], [1100, 250], [1220, 120], [1340, 60], [1460, 200],
  [1580, 100], [1700, 240], [1820, 140], [1940, 70], [2060, 200], [2180, 110],
  [330, 330], [730, 320], [1130, 350], [1530, 330], [1930, 340], [530, 60],
  [930, 170], [1330, 280], [1730, 40], [2130, 320], [80, 260], [2280, 220],
] as const;

/** Parallax tuning (concept 4.6). */
export const MAX_SHIFT = 34;
export const Y_FACTOR = 0.4;
export const LERP = 0.06;
/** Rocket tilt follows the cursor, in degrees at full deflection. */
export const ROCKET_TILT = 1.5;

/** Depth factor per layer, far to near (concept 4.6 table). */
export const DEPTHS = {
  sky: 0.02,
  stars: 0.04,
  moon: 0.06,
  sea: 0.1,
  boat: 0.1,
  clouds: 0.12,
  towers: 0.18,
  smokeFar: 0.25,
  rocket: 0.3,
  smokeMid: 0.4,
  smokeNear: 0.55,
  crowd: 0.8,
} as const;

/** Liftoff shift per layer: deeper layers leave the frame faster. */
export const LIFTOFF_SHIFT = 2600;

/**
 * Projects a design-space anchor (with its layer's parallax applied) to CSS
 * pixels in the host. Pure, so tests and the HUD share one truth.
 */
export function projectToHost(
  point: { x: number; y: number },
  offset: { x: number; y: number },
  hostWidth: number,
  hostHeight: number,
): { x: number; y: number } {
  const fit = fitScale(hostWidth, hostHeight);
  if (fit <= 0) {
    return { x: 0, y: 0 };
  }
  return {
    x: (point.x + offset.x) * fit + (hostWidth - DESIGN_WIDTH * fit) / 2,
    y: (point.y + offset.y) * fit + (hostHeight - DESIGN_HEIGHT * fit) / 2,
  };
}
