import { DESIGN_HEIGHT, DESIGN_WIDTH, fitScale } from '../../three/designSpace';
import { HOME_SKY, SKY_OVERSCAN, SPACE_SKY, crowdRowFeetY, layerStops } from './backdrop';

/**
 * Homepage "The Launchpad" layout, in design pixels (y down, 1920x1080).
 * Numbers follow the paper-cut reference (docs-base/pics/home/home.png) and
 * NASA_Storybook_Concept.md sections 4.5-4.7.
 */

/**
 * The launchpad palette: the clear day of the prototype
 * (`docs-base/Cerita Roket (2).html`), plan section 4.2. Four sky stops read
 * straight off its `gSky` gradient, then the far strip, the two ground tones of
 * its `gGround` gradient, the teal crowd mass, and the clouds' cream. The
 * splash keeps its own navy card; the journal keeps the Mars paper palette.
 */
export const HOME = {
  skyTop: '#6f9bb8',
  skyMid1: '#8db1c6',
  skyMid2: '#b9d0d5',
  skyLow: '#b9d0d5',
  horizon: '#5d8aa3',
  hills: '#bd9a50',
  hillsDark: '#cfb46c',
  silhouette: '#1f3a40',
  spaceTop: '#0e1b30',
  spaceBottom: '#13243c',
  star: '#d9e4ec',
  cream: '#f3e3c3',
} as const;

/** Sky stops shifted onto the oversized backdrop layer (design y -> layer y). */
export const SKY_STOPS = layerStops(HOME_SKY, SKY_OVERSCAN.top);
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

/**
 * Cream lattice towers flanking the rocket (reference). `contain` keeps the
 * asset's 110:340 aspect, so a width fixes the height: the bases land on the
 * horizon at about y 800.
 */
export const TOWERS = [
  { left: 655, top: 336, width: 150 },
  { left: 1112, top: 305, width: 160 },
] as const;

/** Smoke clusters: two sprites per layer for full-width coverage. */
export interface SmokeCluster {
  left: number;
  top: number;
  width: number;
}

/**
 * Two sand layers, not three (plan §6.2, T7b): one behind the rocket, one in
 * front. Each is two clusters so the bank is wider than the frame.
 */
export const SMOKE_LAYERS = {
  back: [
    { left: -220, top: 520, width: 1250 },
    { left: 880, top: 470, width: 1160 },
  ],
  front: [
    { left: -300, top: 700, width: 1330 },
    { left: 920, top: 630, width: 1220 },
  ],
} as const;

/**
 * How far each sand layer sits from the wedge's edge line, design px: the back
 * bank hides the seam from above, the front bank from below (plan §6.2).
 */
export const SMOKE_EDGE_OFFSET = { back: -30, front: 18 } as const;

export const SMOKE_SPRITE_ASPECT = 520 / 300;

export const CROWD_SPRITE_ASPECT = 640 / 190;

/**
 * Crowd placement along the concave arc (L8). Two rows: the back row at the
 * arc's own scale, the front row 1.08x and nearer the camera. Each placement is
 * one sprite of the same pose pair, so the crowd costs one asset per pose and
 * no new art. `feetY` is where the sprite's bottom edge sits.
 */
export interface CrowdPlacement {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  /** Row index, 0 = back row. Front rows draw over the ones behind them. */
  readonly row: number;
  /** Multiplier for the shared crowd asset: this row's tone. */
  readonly tint: readonly [number, number, number];
}

/**
 * Five rows, back to front (plan §6.1). Scale step 0.08 like the prototype, and
 * the colour ramp `#4a6a6e → #1f3a40` is applied as a tint on one asset pair
 * rather than five recoloured files: the biggest row renders the art at
 * `#4a6a6e`, every other row multiplies it down.
 */
export const CROWD_BASE_TONE = '#4a6a6e';
export const CROWD_TINTS: readonly (readonly [number, number, number])[] = [
  [1, 1, 1],
  [0.851, 0.906, 0.909],
  [0.703, 0.792, 0.818],
  [0.568, 0.67, 0.7],
  [0.419, 0.547, 0.582],
];

export const CROWD_ROWS = [
  { width: 576, step: 470, offset: 0, row: 0 },
  { width: 627, step: 512, offset: 52, row: 1 },
  { width: 678, step: 554, offset: 104, row: 2 },
  { width: 730, step: 596, offset: 156, row: 3 },
  { width: 781, step: 638, offset: 208, row: 4 },
] as const;

export function crowdPlacements(): readonly CrowdPlacement[] {
  const placements: CrowdPlacement[] = [];
  CROWD_ROWS.forEach((row, index) => {
    for (let x = -80 + row.offset; x <= 2000; x += row.step) {
      const h = row.width / CROWD_SPRITE_ASPECT;
      placements.push({
        x: x - row.width / 2,
        y: crowdRowFeetY(x, index) - h + 6,
        w: row.width,
        h,
        row: index,
        tint: CROWD_TINTS[index],
      });
    }
  });
  return placements;
}

/** Denser stars revealed with the deep-space gradient during the transition. */
export const SPACE_STARS = [
  [140, 60], [260, 170], [380, 90], [500, 230], [620, 140], [740, 40],
  [860, 190], [980, 90], [1100, 250], [1220, 120], [1340, 60], [1460, 200],
  [1580, 100], [1700, 240], [1820, 140], [1940, 70], [2060, 200], [2180, 110],
  [330, 330], [730, 320], [1130, 350], [1530, 330], [1930, 340], [530, 60],
  [930, 170], [1330, 280], [1730, 40], [2130, 320], [80, 260], [2280, 220],
] as const;

/** Parallax tuning (concept 4.6). */
// Dimensional without exposing the backdrop's overscan at narrow crops.
export const MAX_SHIFT = 44;
export const Y_FACTOR = 0.4;
export const LERP = 0.06;
/** Rocket tilt follows the cursor, in degrees at full deflection. */
export const ROCKET_TILT = 1.5;

/** Depth factor per layer, far to near (concept 4.6 table). */
export const DEPTHS = {
  sky: 0.02,
  stars: 0.04,
  moon: 0.06,
  ground: 0.1,
  clouds: 0.12,
  towers: 0.18,
  smokeBack: 0.25,
  rocket: 0.3,
  smokeFront: 0.55,
  crowd: 0.9,
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
