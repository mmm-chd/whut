import { describe, expect, it } from 'vitest';
import {
  CLOUD_TONES,
  HOME_SKY,
  HILL_FAR_KEYS,
  HILL_NEAR_KEYS,
  PAPER_CLOUDS,
  CROWD_ARC,
  crowdFeetY,
  crowdGroundPolygon,
  crowdRowFeetY,
  SKY_OVERSCAN,
  SKY_SPARKLES,
  SKY_STARS,
  circlePolygon,
  cloudCircles,
  diamondPolygon,
  layerStops,
  offsetPolygon,
  ridgePolygon,
  sparklePolygon,
} from './backdrop';
import { CROWD_ROWS, crowdPlacements } from './layers';

/**
 * The launchpad backdrop is generated geometry now, so the properties the
 * picture depends on (gradient alignment, closed ridges, round lobes) are
 * asserted here instead of being eyeballed in the browser.
 */

const bounds = (points: readonly (readonly [number, number])[]) => {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return { top: Math.min(...ys), bottom: Math.max(...ys), left: Math.min(...xs), right: Math.max(...xs) };
};

describe('gradient stops', () => {
  it('shifts design-space stops onto the oversized layer', () => {
    const stops = layerStops(HOME_SKY, SKY_OVERSCAN.top);
    expect(stops).toHaveLength(HOME_SKY.length);
    expect(stops[0].at).toBe(HOME_SKY[0].at - SKY_OVERSCAN.top);
    expect(stops[0].color).toBe(HOME_SKY[0].color);
  });

  it('starts the sky at the top of the layer, not the top of the frame', () => {
    // The bug this guards: stops authored for y=0 while the layer starts at
    // SKY_OVERSCAN.top, which dropped the violet crown and bled coral upward.
    const stops = layerStops(HOME_SKY, SKY_OVERSCAN.top);
    expect(stops[0].at).toBeGreaterThan(0);
    const offsets = stops.map((stop) => stop.at);
    expect([...offsets].sort((a, b) => a - b)).toEqual(offsets);
  });

  it('keeps the clear-day sky ordered, blue crown to pale haze', () => {
    // Both ends read off the prototype's sky gradient (plan section 4.2).
    expect(HOME_SKY[0].color).toBe('#6f9bb8');
    expect(HOME_SKY[HOME_SKY.length - 1].color).toBe('#b9d0d5');
    const positions = HOME_SKY.map((stop) => stop.at);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });
});

describe('ridge polygons', () => {
  it('closes the ridge down to the base line', () => {
    const ridge = ridgePolygon(HILL_FAR_KEYS, 1500);
    expect(ridge.length).toBeGreaterThan(HILL_FAR_KEYS.length);
    const { bottom, top } = bounds(ridge);
    expect(bottom).toBe(1500);
    expect(top).toBeGreaterThanOrEqual(740);
    expect(top).toBeLessThan(820);
  });

  it('smooths every corner into several shorter segments', () => {
    const sharp = ridgePolygon(HILL_NEAR_KEYS, 1500, 0);
    const smooth = ridgePolygon(HILL_NEAR_KEYS, 1500, 2);
    expect(smooth.length).toBeGreaterThan(sharp.length * 3);
  });

  it('spans the full width so the parallax never reveals an edge', () => {
    const { left, right } = bounds(ridgePolygon(HILL_NEAR_KEYS, 1500));
    expect(left).toBeLessThanOrEqual(-320);
    expect(right).toBeGreaterThanOrEqual(2240);
  });

});

describe('crowd arc (L8)', () => {
  it('puts the trough in the middle and the high ends at the frame edges', () => {
    // The prototype's arc: centre (960, 480), radii 1100 x 520 (plan L14).
    expect(CROWD_ARC).toMatchObject({ cx: 960, cy: 480, rx: 1100, ry: 520 });
    expect(crowdFeetY(CROWD_ARC.cx)).toBeCloseTo(1000, 0);
    expect(crowdFeetY(0)).toBeCloseTo(733.87, 1);
    expect(crowdFeetY(1920)).toBeCloseTo(733.87, 1);
    // Concave: every point between the edges stands lower than the edges.
    for (let x = 0; x <= 1920; x += 60) {
      expect(crowdFeetY(x)).toBeGreaterThanOrEqual(733.8);
      expect(crowdFeetY(x)).toBeLessThanOrEqual(1000.001);
    }
  });

  it('holds the arc end height beyond the frame instead of climbing back up', () => {
    // The ellipse itself ends at y = 480 at x = -140 and 2060.
    expect(crowdFeetY(-140)).toBeCloseTo(480, 0);
    expect(crowdFeetY(2060)).toBeCloseTo(480, 0);
    expect(crowdFeetY(-320)).toBeCloseTo(480, 0);
    expect(crowdFeetY(2240)).toBeCloseTo(480, 0);
  });

  it('steps five rows down the bowl, back row highest', () => {
    expect(crowdRowFeetY(960, 0)).toBeCloseTo(1000, 0);
    expect(crowdRowFeetY(960, 4)).toBeCloseTo(1136, 0);
    expect(CROWD_ROWS).toHaveLength(5);
    const rows = new Set(crowdPlacements().map((spot) => spot.row));
    expect([...rows].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4]);
  });

  it('keeps the rocket and the flame clear of every head', () => {
    // Flame tip at 766 (FLAME.top 552 + 214); the plan keeps heads 24 px below.
    // Only the sprites that stand under the rocket matter: the bowl rises away
    // from the middle, so the figures at the frame edges sit higher on purpose.
    const underRocket = crowdPlacements().filter(
      (spot) => spot.x + spot.w > 846 && spot.x < 1074,
    );
    expect(underRocket.length).toBeGreaterThan(0);
    for (const spot of underRocket) {
      expect(spot.y).toBeGreaterThanOrEqual(766 + 24);
    }
  });

  it('closes the ground mass below the arc so no gap can open', () => {
    const ground = crowdGroundPolygon(1500);
    const { left, right, bottom } = bounds(ground);
    expect(left).toBeLessThanOrEqual(-320);
    expect(right).toBeGreaterThanOrEqual(2160);
    expect(bottom).toBe(1500);
  });
});

describe('paper shapes', () => {
  it('cuts circles with the requested radius and segment count', () => {
    const circle = circlePolygon(100, 100, 40, 12);
    expect(circle).toHaveLength(12);
    for (const [x, y] of circle) {
      expect(Math.hypot(x - 100, y - 100)).toBeCloseTo(40, 5);
    }
  });

  it('cuts sparkles with pinched waists', () => {
    const sparkle = sparklePolygon(0, 0, 10);
    expect(sparkle).toHaveLength(8);
    expect(Math.max(...sparkle.map(([, y]) => Math.abs(y)))).toBeCloseTo(10);
    // The waist points are the short diagonals.
    expect(Math.hypot(sparkle[1][0], sparkle[1][1])).toBeLessThan(10);
  });

  it('cuts diamonds that are taller than they are wide', () => {
    const diamond = diamondPolygon(0, 0, 10);
    const { left, right, top, bottom } = bounds(diamond);
    expect(top).toBe(-10);
    expect(bottom).toBe(10);
    expect(right - left).toBeLessThan(bottom - top);
  });

  it('moves a polygon for the paper shadow', () => {
    const shifted = offsetPolygon(diamondPolygon(0, 0, 10), 0, 18);
    expect(bounds(shifted).top).toBe(8);
  });
});

describe('clouds', () => {
  it('gives every cloud four round lobes plus a shadow copy', () => {
    for (const cloud of PAPER_CLOUDS) {
      expect(cloudCircles(cloud)).toHaveLength(4);
      const shade = cloudCircles(cloud, 14 * cloud.scale).flat();
      expect(bounds(shade).top).toBeGreaterThan(bounds(cloudCircles(cloud).flat()).top);
    }
  });

  it('uses the three paper tones of the reference', () => {
    const tones = new Set(PAPER_CLOUDS.map((cloud) => cloud.tone));
    expect([...tones].sort()).toEqual(['cream', 'peach', 'pink']);
    for (const tone of tones) {
      expect(CLOUD_TONES[tone].fill).toMatch(/^#[0-9a-f]{6}$/);
      expect(CLOUD_TONES[tone].shade).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe('sky dressing', () => {
  it('keeps the moon area clear of clouds', () => {
    // The crescent sits upper-left; no paper cloud may cover it.
    const moon = { x: 356, y: 122, size: 132 };
    for (const cloud of PAPER_CLOUDS) {
      const lobes = cloudCircles(cloud);
      const { left, right, top, bottom } = bounds(lobes.flat());
      const overlaps =
        right > moon.x && left < moon.x + moon.size && bottom > moon.y && top < moon.y + moon.size;
      expect(overlaps).toBe(false);
    }
  });

  it('scatters stars inside the frame and leaves the sky bare of clustering', () => {
    for (const [x, y, radius] of SKY_STARS) {
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(1920);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(736);
      expect(radius).toBeGreaterThan(0);
    }
    expect(SKY_SPARKLES.length).toBeGreaterThan(0);
  });
});
