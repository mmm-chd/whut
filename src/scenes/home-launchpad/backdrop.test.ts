import { describe, expect, it } from 'vitest';
import {
  CLOUD_TONES,
  DUSK_SKY,
  HILL_FAR_KEYS,
  HILL_NEAR_KEYS,
  PAPER_CLOUDS,
  SEA_KEYS,
  SEA_STRIPES,
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
  stripPolygon,
} from './backdrop';

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
    const stops = layerStops(DUSK_SKY, SKY_OVERSCAN.top);
    expect(stops).toHaveLength(DUSK_SKY.length);
    expect(stops[0].at).toBe(DUSK_SKY[0].at - SKY_OVERSCAN.top);
    expect(stops[0].color).toBe(DUSK_SKY[0].color);
  });

  it('starts the sky at the top of the layer, not the top of the frame', () => {
    // The bug this guards: stops authored for y=0 while the layer starts at
    // SKY_OVERSCAN.top, which dropped the violet crown and bled coral upward.
    const stops = layerStops(DUSK_SKY, SKY_OVERSCAN.top);
    expect(stops[0].at).toBeGreaterThan(0);
    const offsets = stops.map((stop) => stop.at);
    expect([...offsets].sort((a, b) => a - b)).toEqual(offsets);
  });

  it('keeps the dusk palette ordered from violet to coral', () => {
    expect(DUSK_SKY[0].color).toBe('#4b3180');
    expect(DUSK_SKY[DUSK_SKY.length - 1].color).toBe('#f4a07a');
    const positions = DUSK_SKY.map((stop) => stop.at);
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
    const { left, right } = bounds(ridgePolygon(SEA_KEYS, 1500));
    expect(left).toBeLessThanOrEqual(-320);
    expect(right).toBeGreaterThanOrEqual(2240);
  });

  it('draws a stripe as a band of the requested thickness', () => {
    const stripe = stripPolygon(SEA_STRIPES[0].keys, SEA_STRIPES[0].thickness);
    const { top, bottom } = bounds(stripe);
    expect(bottom - top).toBeGreaterThanOrEqual(SEA_STRIPES[0].thickness);
    // Upper line and lower line, each smoothed past the raw keys.
    expect(stripe.length % 2).toBe(0);
    expect(stripe.length).toBeGreaterThan(SEA_STRIPES[0].keys.length * 4);
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
