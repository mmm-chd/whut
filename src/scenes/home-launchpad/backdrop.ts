/**
 * The launchpad backdrop, authored to the paper-cut reference
 * (docs-base/pics/home/home.png): a grainy dusk sky for the top ~70%, a gently
 * undulating hill line, and a striped coral sea for the bottom third.
 *
 * Everything here is pure data and pure geometry so it can be tested in jsdom
 * and reused by the WebGL layer without touching three.js.
 */

export type Point = readonly [number, number];
export type Polygon = readonly Point[];

/** A colour stop in design pixels from the top of the design frame. */
export interface DesignStop {
  /** Design-space y (0 = top of the 1920x1080 frame). */
  at: number;
  color: string;
}

export interface LayerStop {
  /** Pixels from the top of the drawn layer. */
  at: number;
  color: string;
}

/**
 * Gradient stops are authored in design space but drawn on an oversized layer
 * that starts above the frame (`layerTop` is negative). Without this shift the
 * sky silently loses its violet crown and the horizon colour bleeds upward.
 */
export function layerStops(
  stops: readonly DesignStop[],
  layerTop: number,
): readonly LayerStop[] {
  return stops.map((stop) => ({ at: stop.at - layerTop, color: stop.color }));
}

/** Dusk sky (concept 4.5): violet crown, plum and pink middle, coral horizon. */
export const DUSK_SKY: readonly DesignStop[] = [
  { at: 0, color: '#4b3180' },
  { at: 120, color: '#583a8a' },
  { at: 240, color: '#6b4a9a' },
  { at: 360, color: '#7c4c9b' },
  { at: 470, color: '#8f4d97' },
  { at: 570, color: '#a44f90' },
  { at: 620, color: '#bd5088' },
  { at: 680, color: '#d5507a' },
  { at: 730, color: '#e47275' },
  { at: 780, color: '#f2926e' },
  { at: 860, color: '#f4a07a' },
];

/** Deep space behind the sky, revealed when the rocket leaves (concept 4.7). */
export const SPACE_SKY: readonly DesignStop[] = [
  { at: 0, color: '#0e1b30' },
  { at: 540, color: '#112039' },
  { at: 1080, color: '#13243c' },
];

/** Overscan for the sky layers: they must survive parallax and letterboxing. */
export const SKY_OVERSCAN = { top: -420, bottom: 1500 } as const;

// --- Geometry helpers --------------------------------------------------------

/** One Chaikin smoothing pass: every segment becomes two shorter segments. */
function chaikin(points: readonly Point[], closed = false): Point[] {
  if (points.length < 3) {
    return points.map(([x, y]) => [x, y] as Point);
  }
  const result: Point[] = [];
  const count = points.length;
  const limit = closed ? count : count - 1;
  if (!closed) {
    result.push([points[0][0], points[0][1]]);
  }
  for (let index = 0; index < limit; index++) {
    const [x0, y0] = points[index];
    const [x1, y1] = points[(index + 1) % count];
    result.push([x0 * 0.75 + x1 * 0.25, y0 * 0.75 + y1 * 0.25]);
    result.push([x0 * 0.25 + x1 * 0.75, y0 * 0.25 + y1 * 0.75]);
  }
  if (!closed) {
    const last = points[count - 1];
    result.push([last[0], last[1]]);
  }
  return result;
}

/**
 * A paper-cut ridge: a smooth line through `keys`, closed down to `baseY` so it
 * can be filled. Two Chaikin passes round the peaks without rounding them away,
 * which is what makes the cut feel hand-made rather than polygonal.
 */
export function ridgePolygon(
  keys: readonly Point[],
  baseY: number,
  passes = 2,
): Polygon {
  if (keys.length < 2) {
    return [];
  }
  let line = keys.map(([x, y]) => [x, y] as Point);
  for (let pass = 0; pass < passes; pass++) {
    line = chaikin(line);
  }
  const first = line[0];
  const last = line[line.length - 1];
  return [...line, [last[0], baseY] as Point, [first[0], baseY] as Point];
}

/** Same ridge, but as a thin paper strip of `thickness` below the line. */
export function stripPolygon(keys: readonly Point[], thickness: number, passes = 2): Polygon {
  if (keys.length < 2) {
    return [];
  }
  let line = keys.map(([x, y]) => [x, y] as Point);
  for (let pass = 0; pass < passes; pass++) {
    line = chaikin(line);
  }
  const lower = line.map(([x, y]) => [x, y + thickness] as Point);
  return [...line, ...lower.reverse()];
}

/** A regular polygon approximating a circle (paper-cut dots and cloud lobes). */
export function circlePolygon(cx: number, cy: number, radius: number, segments = 28): Polygon {
  const points: Point[] = [];
  for (let index = 0; index < segments; index++) {
    const angle = (index / segments) * Math.PI * 2;
    points.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius]);
  }
  return points;
}

/** A four-point paper sparkle: a diamond with pinched waist, like a cut star. */
export function sparklePolygon(cx: number, cy: number, radius: number): Polygon {
  const inner = radius * 0.3;
  return [
    [cx, cy - radius],
    [cx + inner, cy - inner],
    [cx + radius, cy],
    [cx + inner, cy + inner],
    [cx, cy + radius],
    [cx - inner, cy + inner],
    [cx - radius, cy],
    [cx - inner, cy - inner],
  ];
}

/** A small diamond, for the dense far stars. */
export function diamondPolygon(cx: number, cy: number, radius: number): Polygon {
  return [
    [cx, cy - radius],
    [cx + radius * 0.7, cy],
    [cx, cy + radius],
    [cx - radius * 0.7, cy],
  ];
}

/** Moves a polygon; used for the soft paper shadow under each ridge. */
export function offsetPolygon(polygon: Polygon, dx: number, dy: number): Polygon {
  return polygon.map(([x, y]) => [x + dx, y + dy] as Point);
}

/** Rounded lobe circles of one stacked paper cloud, as separate polygons so
 * none of them self-intersects during triangulation. */
export function cloudCircles(
  cloud: PaperCloud,
  dy = 0,
): readonly Polygon[] {
  const { x, y, scale } = cloud;
  return [
    circlePolygon(x - 78 * scale, y + dy + 26 * scale, 40 * scale),
    circlePolygon(x, y + dy + 6 * scale, 56 * scale),
    circlePolygon(x + 82 * scale, y + dy + 30 * scale, 38 * scale),
    circlePolygon(x + 30 * scale, y + dy + 40 * scale, 34 * scale),
  ];
}

// --- Composition (design pixels, y down, 1920x1080) -------------------------

/** Horizon: the hills start to bite at ~68% of the frame (reference). */
export const HORIZON_Y = 736;

/** Far ridge: the dark violet band right under the sky. */
export const HILL_FAR_KEYS: readonly Point[] = [
  [-320, 806],
  [180, 762],
  [520, 792],
  [880, 748],
  [1180, 784],
  [1520, 750],
  [1840, 788],
  [2240, 756],
];

/** Near ridge: one shade lighter, so the two hills read as stacked paper. */
export const HILL_NEAR_KEYS: readonly Point[] = [
  [-320, 848],
  [240, 812],
  [600, 836],
  [960, 798],
  [1320, 832],
  [1680, 802],
  [2240, 838],
];

/** The coral sea, gently undulating, filling the bottom third. */
export const SEA_KEYS: readonly Point[] = [
  [-320, 872],
  [160, 858],
  [520, 870],
  [880, 852],
  [1240, 868],
  [1600, 850],
  [1960, 866],
  [2240, 856],
];

/** Wavy stripes across the sea (reference: salmon, pink, pale peach). */
export interface SeaStripe {
  keys: readonly Point[];
  color: string;
  thickness: number;
}

function stripeKeys(startY: number, amplitude: number, phase: number): readonly Point[] {
  const keys: Point[] = [];
  for (let x = -320; x <= 2240; x += 160) {
    keys.push([x, startY + Math.sin((x / 260) * Math.PI + phase) * amplitude]);
  }
  return keys;
}

export const SEA_STRIPES: readonly SeaStripe[] = [
  { keys: stripeKeys(940, 9, 0), color: '#f2926e', thickness: 12 },
  { keys: stripeKeys(996, 8, 1.1), color: '#f7a88c', thickness: 10 },
  { keys: stripeKeys(1046, 7, 2.2), color: '#efd7bd', thickness: 8 },
  { keys: stripeKeys(1100, 6, 0.6), color: '#e87e6f', thickness: 14 },
];

/** Paper shadow sits this far under each ridge (concept 4.5). */
export const PAPER_SHADOW = { dx: 0, dy: 18 } as const;

/** Sparse stacked-bar clouds, placed to keep the moon and rocket clear. */
export interface PaperCloud {
  x: number;
  y: number;
  scale: number;
  /** Which paper tone this stack is cut from. */
  tone: 'cream' | 'peach' | 'pink';
}

export const PAPER_CLOUDS: readonly PaperCloud[] = [
  { x: 1470, y: 150, scale: 1.1, tone: 'cream' },
  { x: 1830, y: 404, scale: 0.85, tone: 'pink' },
  { x: 706, y: 566, scale: 0.7, tone: 'peach' },
];

/** Cloud paper tones: the fill plus the shadow bar underneath. */
export const CLOUD_TONES = {
  cream: { fill: '#fff1d6', shade: '#e9bfe0' },
  peach: { fill: '#ffe1b8', shade: '#e8b48f' },
  pink: { fill: '#f7c4d8', shade: '#d9a3bf' },
} as const;

/** Crescent moon: upper-left in the reference, clear of the clouds. */
export const MOON = { left: 356, top: 122, width: 132 } as const;

/** Pale-yellow stars, in design pixels: [x, y, radius, kind]. */
export const SKY_STARS: readonly (readonly [number, number, number])[] = [
  [180, 88, 7],
  [300, 236, 5],
  [468, 168, 6],
  [612, 74, 5],
  [742, 214, 8],
  [880, 128, 5],
  [1004, 268, 6],
  [1120, 96, 5],
  [1252, 196, 7],
  [1380, 66, 5],
  [1496, 284, 5],
  [1622, 132, 6],
  [1744, 250, 5],
  [1866, 92, 7],
  [96, 322, 5],
  [386, 396, 4],
  [660, 340, 5],
  [944, 388, 4],
  [1240, 372, 5],
  [1540, 392, 4],
];

/** Bigger four-point sparkles, the ones the eye reads as cut paper. */
export const SKY_SPARKLES: readonly (readonly [number, number, number])[] = [
  [246, 168, 15],
  [806, 96, 19],
  [1078, 208, 13],
  [1616, 214, 17],
  [452, 300, 12],
];
