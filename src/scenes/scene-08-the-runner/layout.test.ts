import { describe, expect, it } from 'vitest';
import { layoutRunner } from './layout';

const sizes: ReadonlyArray<readonly [number, number]> = [
  [1280, 720],
  [1024, 768],
  [844, 390],
  [667, 375],
  [1920, 1080],
];

describe('runner layout', () => {
  it('rejects tiny or invalid hosts', () => {
    expect(layoutRunner(0, 720).valid).toBe(false);
    expect(layoutRunner(Number.NaN, 720).valid).toBe(false);
    expect(layoutRunner(100, 100).valid).toBe(false);
  });

  it('keeps a 4:3 board inside the host', () => {
    for (const [w, h] of sizes) {
      const { board, valid } = layoutRunner(w, h);
      expect(valid).toBe(true);
      expect(board.width / board.height).toBeCloseTo(4 / 3, 5);
      expect(board.left).toBeGreaterThanOrEqual(0);
      expect(board.top).toBeGreaterThanOrEqual(0);
      expect(board.left + board.width).toBeLessThanOrEqual(w);
      expect(board.top + board.height).toBeLessThanOrEqual(h);
    }
  });

  it('never lets narration, board and controls overlap', () => {
    for (const [w, h] of sizes) {
      const { board, narration, controls } = layoutRunner(w, h);
      expect(narration.left + narration.width).toBeLessThanOrEqual(board.left);
      expect(controls.top).toBeGreaterThanOrEqual(board.top + board.height);
      expect(controls.top + controls.height).toBeLessThanOrEqual(h);
    }
  });

  it('flags compact hosts', () => {
    expect(layoutRunner(1280, 720).compact).toBe(false);
    expect(layoutRunner(844, 390).compact).toBe(true);
  });

  it('leaves room for narration at the smallest supported size', () => {
    expect(layoutRunner(667, 375).narration.width).toBeGreaterThan(120);
  });
});
