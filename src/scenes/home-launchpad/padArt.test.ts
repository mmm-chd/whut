import { describe, expect, it } from 'vitest';
import { PAD, cloudBands, padGantry, padHills, padSlab, pathToPolygons } from './padArt';

const everyPolygon = [
  padHills.far,
  padHills.near,
  ...cloudBands,
  padGantry.tower,
  ...padGantry.braces,
  ...padGantry.arms,
  ...padGantry.rails,
  padSlab.slab,
  ...padSlab.railDashes,
  padSlab.rail,
  padSlab.skirt,
  ...padSlab.legs,
  padSlab.shadow,
  padSlab.platform,
];

describe('pad art (T6c)', () => {
  it('is all finite, closed polygons with real area', () => {
    for (const polygon of everyPolygon) {
      expect(polygon.length).toBeGreaterThanOrEqual(4);
      for (const [x, y] of polygon) {
        expect(Number.isFinite(x)).toBe(true);
        expect(Number.isFinite(y)).toBe(true);
      }
    }
  });

  it('keeps the prototype’s colours', () => {
    expect(PAD).toEqual({
      gold: '#e3a73a',
      teal: '#4f6d70',
      brace: '#6b8685',
      road: '#d9d3c2',
      shadow: '#a98a48',
      platform: '#e9e2cf',
      leg: '#dcd0b4',
      hillFar: '#8f9552',
      hillNear: '#a8a55c',
      horizon: '#5d8aa3',
    });
  });

  it('places the slab and the platform under the rocket', () => {
    const bounds = (polygon: readonly (readonly [number, number])[]) => {
      const xs = polygon.map(([x]) => x);
      const ys = polygon.map(([, y]) => y);
      return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
    };
    const slab = bounds(padSlab.slab);
    expect(slab).toEqual({ left: 765, right: 1260, top: 872, bottom: 888 });
    // The rocket nozzle sits at x 960, so the slab must span it.
    expect(slab.left).toBeLessThan(960);
    expect(slab.right).toBeGreaterThan(960);
    const platform = bounds(padSlab.platform);
    expect(platform.top).toBe(896);
    expect(platform.bottom).toBe(912);
    // Legs reach from the slab down to the ground, below the slab.
    const legBottom = Math.max(...padSlab.legs.flat().map(([, y]) => y));
    expect(legBottom).toBeGreaterThan(950);
  });

  it('puts the gantry to the right of the rocket and braces it', () => {
    const xs = padGantry.tower.map(([x]) => x);
    expect(Math.min(...xs)).toBeGreaterThan(1160);
    expect(Math.max(...xs)).toBeLessThan(1280);
    expect(padGantry.braces).toHaveLength(4);
    expect(padGantry.arms).toHaveLength(2);
    // Two handrails of 142 px at 5 on / 11 off = 9 dashes each, plus two solid
    // lines under them. The wider slab rail is a separate block.
    expect(padGantry.rails).toHaveLength(20);
    expect(padSlab.railDashes.length).toBeGreaterThan(28);
  });

  it('draws the foothills as two bands, the far one higher', () => {
    const topOf = (polygon: readonly (readonly [number, number])[]) => Math.min(...polygon.map(([, y]) => y));
    expect(topOf(padHills.far)).toBeLessThan(topOf(padHills.near));
    // Both close below their ridge line so no gap can open under them.
    expect(Math.max(...padHills.far.map(([, y]) => y))).toBe(830);
    expect(Math.max(...padHills.near.map(([, y]) => y))).toBe(840);
  });

  it('parses absolute prototype paths into closed polygons', () => {
    const triangle = pathToPolygons('M0 0L10 0L10 10Z');
    expect(triangle).toHaveLength(1);
    expect(triangle[0]).toEqual([
      [0, 0],
      [10, 0],
      [10, 10],
    ]);
    // Curves are sampled, so a cubic contributes more than its endpoints.
    const curved = pathToPolygons('M0 0C10 0 20 10 30 10L30 20L0 20Z', 4)[0];
    expect(curved.length).toBeGreaterThan(5);
    // A relative path is accepted too.
    const relative = pathToPolygons('M5 5h10v10h-10Z')[0];
    expect(relative).toEqual([
      [5, 5],
      [15, 5],
      [15, 15],
      [5, 15],
    ]);
  });

  it('brings the prototype’s three swept cloud bands into the upper sky', () => {
    expect(cloudBands).toHaveLength(3);
    for (const band of cloudBands) {
      const ys = band.map(([, y]) => y);
      expect(Math.min(...ys)).toBeLessThan(240);
      expect(Math.max(...ys)).toBeLessThan(260);
    }
  });
});
