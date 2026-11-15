import { describe, expect, it } from 'vitest';
import { PERCY_SCREEN_SHARE, layoutSample } from './layout';

describe('sampling layout', () => {
  it('rejects a zero, negative or nonfinite host', () => {
    for (const [w, h] of [
      [0, 720],
      [1280, 0],
      [-10, 700],
      [Number.NaN, 700],
      [1280, Number.POSITIVE_INFINITY],
    ]) {
      expect(layoutSample(w, h).valid).toBe(false);
    }
  });

  it('puts Percy at his share of the width', () => {
    const layout = layoutSample(1280, 720);
    const screenX = layout.width / 2 + (layout.percyX - layout.cameraX) * layout.unit;
    expect(layout.valid).toBe(true);
    expect(screenX / layout.width).toBeCloseTo(PERCY_SCREEN_SHARE, 5);
  });

  it('keeps the rock to the right of Percy and on screen', () => {
    for (const [w, h] of [
      [1920, 1080],
      [1280, 720],
      [1024, 768],
      [844, 390],
    ]) {
      const layout = layoutSample(w, h);
      const rockScreen = layout.width / 2 + (layout.rockX - layout.cameraX) * layout.unit;
      expect(rockScreen).toBeGreaterThan(layout.width * PERCY_SCREEN_SHARE);
      expect(rockScreen).toBeLessThan(layout.width);
    }
  });

  it('flags compact hosts', () => {
    expect(layoutSample(1280, 720).compact).toBe(false);
    expect(layoutSample(844, 390).compact).toBe(true);
    expect(layoutSample(800, 769).compact).toBe(true);
  });
});
