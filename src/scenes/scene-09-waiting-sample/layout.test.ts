import { describe, expect, it } from 'vitest';
import { DEPARTURE_UNITS_PER_SECOND, FOLLOW_SCREEN_SHARE, TRAVEL_UNITS_PER_SECOND, layoutP08 } from './layout';

describe('P-08 layout', () => {
  it('rejects zero, negative and nonfinite hosts or budgets', () => {
    for (const [w, h, b] of [
      [0, 720, 1000],
      [1280, 0, 1000],
      [-1, 720, 1000],
      [Number.NaN, 720, 1000],
      [1280, 720, -1],
      [1280, 720, Number.POSITIVE_INFINITY],
    ]) {
      expect(layoutP08(w, h, b)).toBeNull();
    }
  });

  it('puts Percy at the follow position while he is followed', () => {
    const layout = layoutP08(1280, 720, 30_000)!;
    const bodyX = 600;
    const screenX = layout.width / 2 + (bodyX - layout.followX(bodyX)) * layout.unit;
    expect(screenX / layout.width).toBeCloseTo(FOLLOW_SCREEN_SHARE, 5);
  });

  it('bounds the landscape ring by the travel budget, not by waiting', () => {
    const short = layoutP08(1280, 720, 10_000)!;
    const long = layoutP08(1280, 720, 60_000)!;
    expect(long.maxCameraX - short.maxCameraX).toBeCloseTo(50 * TRAVEL_UNITS_PER_SECOND, 5);
    expect(layoutP08(1280, 720, 0)!.maxCameraX).toBeGreaterThan(0);
  });

  it('keeps the ground line where the other scenes put it', () => {
    const layout = layoutP08(1280, 720, 1000)!;
    expect(layout.groundY).toBeCloseTo(0.82 * 720, 5);
  });

  it('offers a lift for every ground fraction and scale', () => {
    const layout = layoutP08(1280, 720, 1000)!;
    for (const [fraction, scale] of [
      [0.8, layout.closeupScale],
      [0.55, layout.tracksScale],
    ]) {
      expect(Number.isFinite(layout.liftForGround(fraction, scale))).toBe(true);
    }
    // A lower ground line needs a different lift than a higher one.
    expect(layout.liftForGround(0.8, 1.5)).not.toBe(layout.liftForGround(0.5, 1.5));
  });

  it('moves faster leaving than rolling', () => {
    expect(DEPARTURE_UNITS_PER_SECOND).toBeGreaterThan(TRAVEL_UNITS_PER_SECOND);
  });
});
