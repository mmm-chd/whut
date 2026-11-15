import { describe, expect, it } from 'vitest';
import type { Rect } from '../layout';
import {
  DRAG_THRESHOLD_PX,
  MONITOR_FRAME_PX,
  clampToHost,
  dropAccepted,
  monitorContentRect,
  normalizedDrop,
  shouldStartDrag,
} from './transferMath';

/**
 * The transfer is the one place a pointer can start the inspector, so its
 * thresholds and its drop area must be exact and must not trust a bad number.
 */

const monitor: Rect = { left: 100, top: 100, width: 400, height: 300 };
const host: Rect = { left: 0, top: 0, width: 1000, height: 700 };

describe('drag threshold', () => {
  it('does not start a drag for a press', () => {
    expect(shouldStartDrag({ x: 0, y: 0 }, { x: 3, y: 0 })).toBe(false);
    expect(shouldStartDrag({ x: 0, y: 0 }, { x: 0, y: 0 })).toBe(false);
  });

  it('starts once the pointer moves far enough', () => {
    expect(shouldStartDrag({ x: 0, y: 0 }, { x: DRAG_THRESHOLD_PX, y: 0 })).toBe(true);
    expect(shouldStartDrag({ x: 0, y: 0 }, { x: 6, y: 6 })).toBe(true);
  });

  it('ignores a non-finite pointer delta', () => {
    expect(shouldStartDrag({ x: 0, y: 0 }, { x: Number.NaN, y: 20 })).toBe(false);
  });
});

describe('host clamp', () => {
  it('keeps the sprite inside the host', () => {
    expect(clampToHost({ x: -40, y: 900 }, host)).toEqual({ x: 0, y: 700 });
    expect(clampToHost({ x: 5000, y: -10 }, host)).toEqual({ x: 1000, y: 0 });
  });

  it('respects the sprite radius at the edges', () => {
    expect(clampToHost({ x: -40, y: 900 }, host, 20)).toEqual({ x: 20, y: 680 });
  });

  it('falls back to the corner for a non-finite point', () => {
    expect(clampToHost({ x: Number.NaN, y: Number.NaN }, host)).toEqual({ x: 0, y: 0 });
  });
});

describe('drop area', () => {
  it('insets the content rectangle by the frame', () => {
    expect(monitorContentRect(monitor)).toEqual({
      left: 100 + MONITOR_FRAME_PX,
      top: 100 + MONITOR_FRAME_PX,
      width: 400 - MONITOR_FRAME_PX * 2,
      height: 300 - MONITOR_FRAME_PX * 2,
    });
  });

  it('accepts the centre and rejects the frame and the outside', () => {
    expect(dropAccepted({ x: 300, y: 250 }, monitor)).toBe(true);
    // Inside the visible frame, outside the content rectangle.
    expect(dropAccepted({ x: 102, y: 250 }, monitor)).toBe(false);
    expect(dropAccepted({ x: 90, y: 250 }, monitor)).toBe(false);
    expect(dropAccepted({ x: 300, y: 410 }, monitor)).toBe(false);
  });

  it('normalizes the drop inside the content rectangle only', () => {
    const rect = monitorContentRect(monitor);
    const centre = normalizedDrop(
      { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
      monitor,
    );
    expect(centre.x).toBeCloseTo(0.5);
    expect(centre.y).toBeCloseTo(0.5);

    const outside = normalizedDrop({ x: -100, y: -100 }, monitor);
    expect(outside).toEqual({ x: 0, y: 0 });
  });

  it('reports the centre for a zero-sized monitor instead of dividing by zero', () => {
    expect(normalizedDrop({ x: 5, y: 5 }, { left: 0, top: 0, width: 0, height: 0 })).toEqual({
      x: 0.5,
      y: 0.5,
    });
  });
});
