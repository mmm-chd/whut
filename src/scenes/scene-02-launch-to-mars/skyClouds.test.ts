import { describe, expect, it } from 'vitest';
import {
  P02_SKY_CLOUDS,
  P02_SKY_CLOUD_AREA,
  P02_SKY_RIBBON,
  createP02SkyClouds,
} from './skyClouds';

describe('P-02 procedural sky clouds', () => {
  it('draws the same sky for the same seed and a different one for another seed', () => {
    expect(createP02SkyClouds(7)).toEqual(createP02SkyClouds(7));
    expect(createP02SkyClouds(7)).not.toEqual(createP02SkyClouds(8));
  });

  it('fills the whole ascent view with several bands of clouds', () => {
    expect(P02_SKY_CLOUDS.length).toBeGreaterThanOrEqual(16);
    const lefts = P02_SKY_CLOUDS.map((cloud) => cloud.left);
    const rights = P02_SKY_CLOUDS.map((cloud) => cloud.left + cloud.width);
    expect(Math.min(...lefts)).toBeLessThanOrEqual(P02_SKY_CLOUD_AREA.left);
    expect(Math.max(...rights)).toBeGreaterThanOrEqual(P02_SKY_CLOUD_AREA.right);
  });

  it('keeps every cloud above the opening frame', () => {
    for (const cloud of P02_SKY_CLOUDS) {
      expect(cloud.top + cloud.height).toBeLessThan(0);
    }
  });

  it('never overlaps two clouds of the same band', () => {
    const sorted = [...P02_SKY_CLOUDS].sort((a, b) => a.left - b.left);
    for (let i = 0; i < sorted.length; i += 1) {
      for (let j = i + 1; j < sorted.length; j += 1) {
        const a = sorted[i];
        const b = sorted[j];
        const sameBand = Math.abs(a.top - b.top) < 150;
        if (sameBand) {
          expect(b.left).toBeGreaterThanOrEqual(a.left + a.width);
        }
      }
    }
  });

  it('gives every cloud its own shape inside the measured ribbon size', () => {
    const shapes = new Set(P02_SKY_CLOUDS.map((cloud) => cloud.paths.join('|')));
    expect(shapes.size).toBe(P02_SKY_CLOUDS.length);
    for (const cloud of P02_SKY_CLOUDS) {
      expect(cloud.width).toBeGreaterThanOrEqual(P02_SKY_RIBBON.minLength);
      expect(cloud.paths.length).toBeLessThanOrEqual(2);
      for (const path of cloud.paths) {
        expect(path.startsWith('M')).toBe(true);
        expect(path.endsWith('Z')).toBe(true);
        expect(path).not.toMatch(/NaN|Infinity/u);
      }
    }
  });
});
