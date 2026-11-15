import { describe, expect, it } from 'vitest';
import { P04_LAYOUT, isInsideMonitor, layoutP04, monitorContentRect } from './layout';

/**
 * The three regions must never overlap, at any of the physical sizes the plan
 * requires checking, and an unusable host must be reported rather than laid
 * out with invented numbers.
 */

const SIZES = [
  [360, 640],
  [640, 360],
  [800, 600],
  [1280, 720],
  [1920, 1080],
] as const;

describe('host validation', () => {
  it('rejects a zero, negative or non-finite host', () => {
    expect(layoutP04(0, 640).valid).toBe(false);
    expect(layoutP04(640, 0).valid).toBe(false);
    expect(layoutP04(Number.NaN, 640).valid).toBe(false);
    expect(layoutP04(640, Number.POSITIVE_INFINITY).valid).toBe(false);
    expect(layoutP04(120, 200).valid).toBe(false);
  });

  it('never reports a unit scale of 1 for a broken host', () => {
    for (const [width, height] of [
      [0, 640],
      [Number.NaN, 640],
    ] as const) {
      const layout = layoutP04(width, height);
      expect(layout.valid).toBe(false);
      expect(layout.monitor.width).toBe(0);
    }
  });
});

describe('stacks on a narrow host', () => {
  it('puts the card below the monitor', () => {
    const mobile = layoutP04(360, 640);
    expect(mobile.valid).toBe(true);
    expect(mobile.card.top).toBeGreaterThanOrEqual(mobile.monitor.top + mobile.monitor.height);
    expect(mobile.card.left).toBe(mobile.monitor.left);
    expect(mobile.card.width).toBe(mobile.monitor.width);
  });

  it('keeps the stacked monitor inside its clamp', () => {
    for (const [width, height] of SIZES) {
      const layout = layoutP04(width, height);
      const stacked = layout.card.top > layout.monitor.top;
      if (!stacked) {
        continue;
      }
      expect(layout.monitor.height).toBeLessThanOrEqual(P04_LAYOUT.monitorMaxHeight);
      expect(layout.monitor.height).toBeGreaterThanOrEqual(P04_LAYOUT.monitorMinHeight);
    }
  });
});

describe('short hosts', () => {
  it('falls back to two columns when stacking cannot fit', () => {
    // A landscape phone has no vertical room for heading, monitor, card and
    // controls; overlapping them would be worse than narrow columns.
    const short = layoutP04(640, 360);
    expect(short.valid).toBe(true);
    expect(short.card.left).toBeGreaterThan(short.monitor.left + short.monitor.width - 1);
    expect(short.card.top).toBe(short.monitor.top);
    expect(short.monitor.height).toBeGreaterThan(0);
  });

  it('never lets the card or monitor run into the controls band', () => {
    for (const [width, height] of SIZES) {
      const layout = layoutP04(width, height);
      expect(layout.monitor.top + layout.monitor.height).toBeLessThanOrEqual(
        layout.controls.top + 1,
      );
      expect(layout.card.top + layout.card.height).toBeLessThanOrEqual(layout.controls.top + 1);
    }
  });
});

describe('side by side on a wide host', () => {
  it('reserves the card column to the right of the monitor', () => {
    const wide = layoutP04(1280, 720);
    expect(wide.valid).toBe(true);
    expect(wide.monitor.width).toBeGreaterThan(wide.card.width);
    expect(wide.card.left).toBe(wide.monitor.left + wide.monitor.width + P04_LAYOUT.gapWide);
    expect(wide.card.top).toBe(wide.monitor.top);
  });

  it('gives the card a readable width', () => {
    for (const [width, height] of SIZES.filter(([w]) => w >= P04_LAYOUT.wideMinWidth)) {
      const layout = layoutP04(width, height);
      expect(layout.card.width).toBeGreaterThanOrEqual(P04_LAYOUT.cardMin);
      expect(layout.card.width).toBeLessThanOrEqual(P04_LAYOUT.cardMax);
    }
  });

  it('keeps the controls outside the monitor', () => {
    for (const [width, height] of SIZES) {
      const layout = layoutP04(width, height);
      expect(layout.controls.top).toBeGreaterThanOrEqual(layout.monitor.top + layout.monitor.height);
      expect(layout.controls.top).toBeGreaterThanOrEqual(layout.card.top + layout.card.height);
      expect(layout.controls.left).toBe(layout.monitor.left);
    }
  });
});

describe('monitor geometry', () => {
  it('insets the content rectangle by the frame', () => {
    const rect = monitorContentRect({ left: 10, top: 20, width: 200, height: 100 }, 6);
    expect(rect).toEqual({ left: 16, top: 26, width: 188, height: 88 });
  });

  it('accepts drops inside the content rectangle only', () => {
    const monitor = layoutP04(1280, 720).monitor;
    const rect = monitorContentRect(monitor);
    expect(isInsideMonitor(monitor, rect.left + rect.width / 2, rect.top + rect.height / 2)).toBe(true);
    expect(isInsideMonitor(monitor, monitor.left - 4, monitor.top + 10)).toBe(false);
    expect(isInsideMonitor(monitor, monitor.left + monitor.width + 4, monitor.top + 10)).toBe(false);
  });

  it('keeps the ground line and a usable unit scale', () => {
    for (const [width, height] of SIZES) {
      const layout = layoutP04(width, height);
      expect(layout.unit).toBeGreaterThan(0);
      expect(layout.groundY).toBeCloseTo(layout.height * 0.82);
      expect(layout.returnRockX).toBeGreaterThan(0);
    }
  });
});
