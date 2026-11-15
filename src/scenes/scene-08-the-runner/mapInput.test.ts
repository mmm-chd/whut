import { describe, expect, it } from 'vitest';
import { clientToCell, headingBetween, stepCell, transformFromRect, cellCenter } from './mapInput';
import { layoutRunner } from './layout';

const rect = { left: 100, top: 50, width: 640, height: 480 };

describe('board transform', () => {
  it('maps a point to the cell under it, once', () => {
    const t = transformFromRect(rect)!;
    expect(t.scale).toBe(0.5);
    // board unit (440, 300) is cell (11, 7)
    expect(clientToCell(100 + 440 * 0.5, 50 + 300 * 0.5, t)).toEqual({ col: 11, row: 7 });
    expect(clientToCell(100, 50, t)).toEqual({ col: 0, row: 0 });
  });

  it('rejects outside points and bad numbers', () => {
    const t = transformFromRect(rect)!;
    expect(clientToCell(99, 100, t)).toBeNull();
    expect(clientToCell(100 + 640, 100, t)).toBeNull();
    expect(clientToCell(Number.NaN, 100, t)).toBeNull();
    expect(clientToCell(100, Number.POSITIVE_INFINITY, t)).toBeNull();
  });

  it('refuses a rectangle that is not 4:3 or has no size', () => {
    expect(transformFromRect({ ...rect, height: 300 })).toBeNull();
    expect(transformFromRect({ ...rect, width: 0 })).toBeNull();
    expect(transformFromRect({ ...rect, left: Number.NaN })).toBeNull();
  });

  it('agrees with the layout under letterboxing at several host sizes', () => {
    for (const [w, h] of [
      [1280, 720],
      [1024, 768],
      [844, 390],
      [667, 375],
    ]) {
      const layout = layoutRunner(w, h);
      const t = transformFromRect(layout.board)!;
      const target = { col: 20, row: 10 };
      const centre = cellCenter(target);
      expect(clientToCell(t.left + centre.x * t.scale, t.top + centre.y * t.scale, t)).toEqual(target);
    }
  });
});

describe('heading and keyboard steps', () => {
  it('uses forward-up art: up 0, right 90, down 180, left 270', () => {
    const c = { col: 5, row: 5 };
    expect(headingBetween(c, { col: 5, row: 4 })).toBeCloseTo(0);
    expect(headingBetween(c, { col: 6, row: 5 })).toBeCloseTo(90);
    expect(headingBetween(c, { col: 5, row: 6 })).toBeCloseTo(180);
    expect(headingBetween(c, { col: 4, row: 5 })).toBeCloseTo(270);
  });

  it('steps one cell and stays on the board', () => {
    expect(stepCell({ col: 5, row: 5 }, 'ArrowRight')).toEqual({ col: 6, row: 5 });
    expect(stepCell({ col: 0, row: 0 }, 'ArrowLeft')).toEqual({ col: 0, row: 0 });
    expect(stepCell({ col: 31, row: 23 }, 'ArrowDown')).toEqual({ col: 31, row: 23 });
  });
});
