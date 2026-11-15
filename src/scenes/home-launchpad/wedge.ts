/**
 * The space wedge (plan §6.2, T8b): a jagged edge that rises behind the rocket
 * until deep space fills the frame, so the handoff to the journal is a shape
 * change, not a cut.
 *
 * Every number here is the prototype's, kept as named constants so the shape can
 * be tested without a GPU.
 */

/** Half-widths of the jagged edge, apex outward, in design px. */
export const WEDGE_DX = [0, 70, 150, 240, 330, 440, 560, 700, 880, 1100, 1400] as const;

/** Vertical jitter of the left edge at each `WEDGE_DX`, design px. */
export const WEDGE_JITTER_LEFT = [0, -5, 7, -4, 9, -6, 5, -8, 6, -4, 0] as const;

/** Vertical jitter of the right edge at each `WEDGE_DX`, design px. */
export const WEDGE_JITTER_RIGHT = [0, 6, -5, 8, -4, 7, -6, 5, -7, 4, 0] as const;

export const WEDGE = {
  /** The apex sits over the rocket's centre line. */
  apexX: 960,
  /** Apex height while the rocket waits: below the frame, so nothing shows. */
  apexRest: 1500,
  /** Apex height at the lift-off beat. */
  apexTakeoff: 930,
  /** How far the apex climbs with the rocket after lift-off. */
  climb: 2800,
  /** Cream rim above the edge, design px. */
  rim: 10,
  /** Soft shadow above the rim, design px. */
  shadow: 26,
  /** Slope of the left edge: 0.22 px down per px out. */
  leftSlope: 0.22,
  /** Slope of the right edge. */
  rightSlope: 0.3,
  /** The wedge always closes below the frame, at this y. */
  closeY: 4200,
  /** Closing corners, far outside the frame so no edge can show. */
  leftX: -640,
  rightX: 2560,
} as const;

/** When the wedge reaches its lift-off height, seconds. */
export const WEDGE_TAKEOFF_AT = 0.9;
/** How long the apex takes to climb with the rocket. */
export const WEDGE_CLIMB_DURATION = 2.7;

export type WedgePolygon = readonly (readonly [number, number])[];

/**
 * The closed wedge for a given apex height.
 *
 * `inset` lifts the whole outline, which is how the rim and the shadow are made:
 * drawn under the fill, only the strip above the edge shows.
 */
export function wedgePolygon(apexY: number, inset = 0): WedgePolygon {
  const points: [number, number][] = [];
  const edgeY = apexY - inset;
  for (let i = WEDGE_DX.length - 1; i >= 1; i -= 1) {
    points.push([
      WEDGE.apexX - WEDGE_DX[i],
      edgeY + WEDGE.leftSlope * WEDGE_DX[i] + WEDGE_JITTER_LEFT[i],
    ]);
  }
  points.push([WEDGE.apexX, edgeY]);
  for (let i = 1; i < WEDGE_DX.length; i += 1) {
    points.push([
      WEDGE.apexX + WEDGE_DX[i],
      edgeY + WEDGE.rightSlope * WEDGE_DX[i] + WEDGE_JITTER_RIGHT[i],
    ]);
  }
  // Close well below the frame: the wedge is a mass of space, not a stripe.
  points.push([WEDGE.rightX, WEDGE.closeY], [WEDGE.leftX, WEDGE.closeY]);
  return points;
}

/** The edge height at a design x, following the polygon's own segments. */
export function wedgeEdgeY(x: number, apexY: number): number {
  const points = wedgePolygon(apexY, 0);
  const edge = points.slice(0, points.length - 2);
  // Left side runs right-to-left in the array; the right side runs left-to-right.
  const ascending = [...edge].sort((a, b) => a[0] - b[0]);
  if (x <= ascending[0][0]) {
    return ascending[0][1];
  }
  for (let i = 1; i < ascending.length; i += 1) {
    const [x0, y0] = ascending[i - 1];
    const [x1, y1] = ascending[i];
    if (x <= x1) {
      const t = x1 === x0 ? 0 : (x - x0) / (x1 - x0);
      return y0 + (y1 - y0) * t;
    }
  }
  return ascending[ascending.length - 1][1];
}

/**
 * When the edge passes a given design y, in seconds from Play.
 *
 * The climb eases in quadratically (`power2.in`), so the inverse is a square
 * root. Anything at or below the lift-off height is already covered when the
 * rocket leaves the pad.
 */
export function wedgeRevealTime(designY: number): number {
  const required = (WEDGE.apexTakeoff - designY) / WEDGE.climb;
  if (required <= 0) {
    return WEDGE_TAKEOFF_AT;
  }
  return WEDGE_TAKEOFF_AT + WEDGE_CLIMB_DURATION * Math.sqrt(Math.min(1, required));
}
