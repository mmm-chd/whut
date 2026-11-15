import { describe, expect, it } from 'vitest';
import { SPACE_DEPTHS, SPACE_STAR_COUNT, SPACE_STOPS, spaceStars } from '../shared/space';
import {
  WEDGE,
  WEDGE_CLIMB_DURATION,
  WEDGE_DX,
  WEDGE_TAKEOFF_AT,
  wedgeEdgeY,
  wedgePolygon,
  wedgeRevealTime,
} from './wedge';

describe('space wedge shape (T8b)', () => {
  it('starts below the frame, reaches the pad at lift-off and closes far below', () => {
    const resting = wedgePolygon(WEDGE.apexRest);
    const takeoff = wedgePolygon(WEDGE.apexTakeoff);
    expect(WEDGE.apexRest).toBe(1500);
    expect(WEDGE.apexTakeoff).toBe(930);
    // Apex sits on the rocket's centre line, at the requested height.
    expect(takeoff).toContainEqual([WEDGE.apexX, WEDGE.apexTakeoff]);
    expect(resting).toContainEqual([WEDGE.apexX, WEDGE.apexRest]);
    // The last two points close the mass below the frame, well outside it.
    expect(takeoff.slice(-2)).toEqual([
      [WEDGE.rightX, WEDGE.closeY],
      [WEDGE.leftX, WEDGE.closeY],
    ]);
    expect(WEDGE.closeY).toBeGreaterThan(1080);
    expect(WEDGE.leftX).toBeLessThan(0);
    expect(WEDGE.rightX).toBeGreaterThan(1920);
  });

  it('is jagged, not a straight line, and steeper on the right', () => {
    const points = wedgePolygon(WEDGE.apexTakeoff);
    // 10 left points + apex + 10 right points + 2 closing corners.
    expect(points).toHaveLength(WEDGE_DX.length * 2 + 1);
    const left = points.filter(([x]) => x < WEDGE.apexX);
    const right = points.filter(([x]) => x > WEDGE.apexX);
    // Every edge point is jittered away from the straight slope somewhere.
    const leftDeviation = left.filter(([x, y]) => Math.abs(y - (WEDGE.apexTakeoff + WEDGE.leftSlope * (WEDGE.apexX - x))) > 0.5);
    const rightDeviation = right.filter(([x, y]) => Math.abs(y - (WEDGE.apexTakeoff + WEDGE.rightSlope * (x - WEDGE.apexX))) > 0.5);
    expect(leftDeviation.length).toBeGreaterThan(6);
    expect(rightDeviation.length).toBeGreaterThan(6);
    // The right slope drops faster than the left, as in the prototype.
    expect(WEDGE.rightSlope).toBeGreaterThan(WEDGE.leftSlope);
  });

  it('lifts the outline by the inset, which is how the rim and shadow are cut', () => {
    const fill = wedgePolygon(1000, 0);
    const rim = wedgePolygon(1000, WEDGE.rim);
    const shadow = wedgePolygon(1000, WEDGE.shadow);
    expect(rim[WEDGE_DX.length - 1][1]).toBeCloseTo(fill[WEDGE_DX.length - 1][1] - WEDGE.rim, 5);
    expect(shadow[WEDGE_DX.length - 1][1]).toBeCloseTo(fill[WEDGE_DX.length - 1][1] - WEDGE.shadow, 5);
    expect(WEDGE.shadow).toBeGreaterThan(WEDGE.rim);
  });
});

describe('wedge edge', () => {
  it('returns the apex height under the rocket', () => {
    expect(wedgeEdgeY(WEDGE.apexX, 930)).toBeCloseTo(930, 5);
  });

  it('rises away from the apex on both sides', () => {
    const apex = 930;
    const left = wedgeEdgeY(600, apex);
    const right = wedgeEdgeY(1320, apex);
    expect(left).toBeGreaterThan(apex);
    expect(right).toBeGreaterThan(left);
  });

  it('follows the polyline between the named points', () => {
    // Halfway between the apex and the first left point, the edge is halfway up.
    const midX = WEDGE.apexX - WEDGE_DX[1] / 2;
    const midY = wedgeEdgeY(midX, 1000);
    const apexY = wedgeEdgeY(WEDGE.apexX, 1000);
    const firstLeft = wedgeEdgeY(WEDGE.apexX - WEDGE_DX[1], 1000);
    expect(midY).toBeGreaterThan(apexY);
    expect(midY).toBeLessThan(firstLeft);
  });
});

describe('star reveal timing', () => {
  it('is already covered at the lift-off beat for anything at or below the pad', () => {
    expect(wedgeRevealTime(WEDGE.apexTakeoff)).toBe(WEDGE_TAKEOFF_AT);
    expect(wedgeRevealTime(1080)).toBe(WEDGE_TAKEOFF_AT);
  });

  it('reveals higher stars later, inside the climb', () => {
    const low = wedgeRevealTime(800);
    const high = wedgeRevealTime(300);
    expect(high).toBeGreaterThan(low);
    expect(low).toBeGreaterThan(WEDGE_TAKEOFF_AT);
    expect(high).toBeLessThanOrEqual(WEDGE_TAKEOFF_AT + WEDGE_CLIMB_DURATION);
  });

  it('clamps when the climb cannot reach the star', () => {
    expect(wedgeRevealTime(-5000)).toBeCloseTo(WEDGE_TAKEOFF_AT + WEDGE_CLIMB_DURATION, 5);
  });
});

describe('space spec (§7.1)', () => {
  it('is the prototype’s three stops, seed and depths', () => {
    expect(SPACE_STOPS.map((stop) => stop.color)).toEqual(['#0e1b30', '#112039', '#13243c']);
    expect(SPACE_STOPS.map((stop) => stop.at)).toEqual([0, 0.5, 1]);
    expect(SPACE_DEPTHS.map((depth) => depth.count)).toEqual([44, 26, 12]);
    expect(SPACE_DEPTHS.map((depth) => depth.parallax)).toEqual([6, 14, 26]);
  });

  it('generates the same 82 stars twice, inside the frame', () => {
    const first = spaceStars();
    const second = spaceStars();
    expect(first).toHaveLength(SPACE_STAR_COUNT);
    expect(SPACE_STAR_COUNT).toBe(82);
    expect(second).toEqual(first);
    for (const star of first) {
      expect(star.x).toBeGreaterThanOrEqual(0);
      expect(star.x).toBeLessThanOrEqual(1920);
      expect(star.y).toBeGreaterThanOrEqual(0);
      expect(star.y).toBeLessThanOrEqual(1080);
      expect(star.r).toBeGreaterThan(0.7);
    }
    // Every third star breathes, the rest are steady.
    expect(first.filter((star) => star.twinkle)).toHaveLength(28);
  });

  it('gives the near depth the widest stars', () => {
    const stars = spaceStars();
    const near = stars.filter((star) => star.depth === 2);
    const far = stars.filter((star) => star.depth === 0);
    const mean = (list: typeof stars) => list.reduce((total, star) => total + star.r, 0) / list.length;
    expect(mean(near)).toBeGreaterThan(mean(far));
  });
});
