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

/**
 * The launchpad sky, read straight off P-02's `sky.png` (1670x942): #82a5b4 at
 * the crown, #88acbc at 42 % of the frame, #a5bbc1 at 70 %, #bdc4be at 85 % and
 * #d6cebb at the horizon. Nothing here is invented — the rows are pixel reads
 * from the launch-site art the rocket actually stands in.
 */
export const HOME_SKY: readonly DesignStop[] = [
  { at: 0, color: '#6f9bb8' },
  { at: 648, color: '#8db1c6' },
  { at: 842, color: '#b9d0d5' },
  { at: 1080, color: '#b9d0d5' },
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

/**
 * The crowd stands along a concave arc (owner lock L8): the feet line is the
 * lower half of an ellipse, lowest in the middle so the rocket keeps open
 * ground, and rising toward both edges. Numbers come from the plan
 * (src/docs/stage00-01-splash-home-plan.md, section 6.1) and are mirrored in
 * `layers.ts` for placement.
 */
export const CROWD_ARC = { cx: 960, cy: 480, rx: 1100, ry: 520 } as const;

/** Each further row of figures stands this much deeper down the bowl. */
export const CROWD_ROW_STEP = 34;

/** Feet line of the crowd at design x. Flat below the arc means "inside". */
export function crowdFeetY(x: number): number {
  // Clamped to the ellipse's own domain, not the frame: the prototype's arc
  // ends at y = 480 at x = -140 and 2060, so the overscan outside the frame
  // holds 480 instead of running up the far side of the ellipse.
  const frameX = Math.max(CROWD_ARC.cx - CROWD_ARC.rx, Math.min(CROWD_ARC.cx + CROWD_ARC.rx, x));
  const t = (frameX - CROWD_ARC.cx) / CROWD_ARC.rx;
  return CROWD_ARC.cy + CROWD_ARC.ry * Math.sqrt(1 - t * t);
}

/**
 * Feet line of row `row` (0 = back row). Five rows step 34 design px down the
 * bowl, so the front row is both lower and larger and reads as nearer.
 */
export function crowdRowFeetY(x: number, row: number): number {
  return crowdFeetY(x) + CROWD_ROW_STEP * row;
}

/** Tangent of the arc at design x, in degrees, for leaning the ground shadow. */
export function crowdSlope(x: number): number {
  const frameX = Math.max(0, Math.min(1920, x));
  const t = (frameX - CROWD_ARC.cx) / CROWD_ARC.rx;
  const span = 1 - t * t;
  if (span <= 0) {
    return 0;
  }
  const dy = (-CROWD_ARC.ry * t) / Math.sqrt(span);
  return (Math.atan(dy / CROWD_ARC.rx) * 180) / Math.PI;
}

/**
 * The regolith mass under the crowd: the arc, sampled, closed down to the
 * bottom of the design frame. No gap can appear under the figures.
 */
export function crowdGroundPolygon(baseY = 1500): Polygon {
  const points: Point[] = [];
  for (let x = -320; x <= 2240; x += 80) {
    points.push([x, crowdFeetY(x)]);
  }
  // Close the arc down to the bottom of the frame: the mass, not just the line.
  const first = points[0];
  const last = points[points.length - 1];
  return [...points, [last[0], baseY] as Point, [first[0], baseY] as Point];
}

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
  cream: { fill: '#f3e3c3', shade: '#dccfb4' },
  peach: { fill: '#efe5cf', shade: '#dcd0b4' },
  pink: { fill: '#e9dcc0', shade: '#cfc0a2' },
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
