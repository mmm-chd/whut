import { describe, expect, it } from 'vitest';
import {
  applyBrushSweep,
  brushRadiusFor,
  coverageRatio,
  createBrushCoverage,
  finishClearing,
  nextUnclearedSweep,
} from './brushCoverage';
import { P05_SAMPLE_ROCKS } from './content';

const shape = P05_SAMPLE_ROCKS[0].shape;
const radius = brushRadiusFor(shape);

describe('brush coverage', () => {
  it('counts only cells on the rock face', () => {
    const coverage = createBrushCoverage(shape);
    expect(coverage.totalEligible).toBeGreaterThan(100);
    expect(coverage.totalEligible).toBeLessThan(32 * 24);
  });

  it('a stroke outside the rock clears nothing', () => {
    const coverage = createBrushCoverage(shape);
    expect(applyBrushSweep(coverage, { u: 0.01, v: 0.01 }, { u: 0.04, v: 0.02 }, radius)).toBe(0);
    expect(coverageRatio(coverage)).toBe(0);
  });

  it('sweeping the same segment twice adds nothing the second time', () => {
    const coverage = createBrushCoverage(shape);
    const a = { u: 0.2, v: 0.5 };
    const b = { u: 0.8, v: 0.5 };
    const first = applyBrushSweep(coverage, a, b, radius);
    const second = applyBrushSweep(coverage, a, b, radius);
    expect(first).toBeGreaterThan(0);
    expect(second).toBe(0);
  });

  it('a fast long segment clears the cells it crosses, not just its ends', () => {
    const coverage = createBrushCoverage(shape);
    applyBrushSweep(coverage, { u: 0.15, v: 0.5 }, { u: 0.85, v: 0.5 }, radius);
    // A cell in the middle of the stroke is clear.
    const middle = 12 * 32 + 16;
    expect(coverage.cleared[middle]).toBe(1);
  });

  it('ignores nonfinite points and a bad radius', () => {
    const coverage = createBrushCoverage(shape);
    expect(applyBrushSweep(coverage, { u: Number.NaN, v: 0.5 }, { u: 0.5, v: 0.5 }, radius)).toBe(0);
    expect(applyBrushSweep(coverage, { u: 0.5, v: 0.5 }, { u: 0.5, v: 0.5 }, 0)).toBe(0);
  });

  it('the accessible sweeps reach the threshold through real cells', () => {
    const coverage = createBrushCoverage(shape);
    let guard = 0;
    while (coverageRatio(coverage) < 0.85 && guard < 100) {
      const sweep = nextUnclearedSweep(coverage);
      expect(sweep).not.toBeNull();
      expect(applyBrushSweep(coverage, sweep!.from, sweep!.to, radius)).toBeGreaterThan(0);
      guard += 1;
    }
    expect(coverageRatio(coverage)).toBeGreaterThanOrEqual(0.85);
    expect(guard).toBeLessThan(100);
  });

  it('84% is below the threshold and finishing clears the rest', () => {
    const coverage = createBrushCoverage(shape);
    const target = Math.floor(coverage.totalEligible * 0.84);
    let cleared = 0;
    for (let i = 0; i < coverage.eligible.length && cleared < target; i += 1) {
      if (coverage.eligible[i]) {
        coverage.cleared[i] = 1;
        cleared += 1;
      }
    }
    coverage.clearedEligible = cleared;
    expect(coverageRatio(coverage)).toBeLessThan(0.85);
    finishClearing(coverage);
    expect(coverageRatio(coverage)).toBe(1);
    expect(nextUnclearedSweep(coverage)).toBeNull();
  });
});
