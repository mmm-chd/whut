import { describe, expect, it } from 'vitest';
import { EMPTY_P05_LAYOUT, layoutP05, P05_LAYOUT } from './layout';

const overlaps = (a: { left: number; top: number; width: number; height: number }, b: typeof a) =>
  !(
    a.left + a.width <= b.left ||
    b.left + b.width <= a.left ||
    a.top + a.height <= b.top ||
    b.top + b.height <= a.top
  );

describe('layoutP05', () => {
  it('puts the picture and the card side by side on a wide host', () => {
    const layout = layoutP05(1280, 720);
    expect(layout.valid).toBe(true);
    expect(layout.stacked).toBe(false);
    expect(layout.picture.width).toBeGreaterThan(layout.card.width);
    expect(overlaps(layout.picture, layout.card)).toBe(false);
    expect(layout.card.width).toBeLessThanOrEqual(P05_LAYOUT.cardMax);
  });

  it('keeps the card a card, never a sliver', () => {
    for (const width of [960, 1200, 1600, 1920]) {
      const layout = layoutP05(width, 900);
      expect(layout.card.width).toBeGreaterThanOrEqual(P05_LAYOUT.cardMin);
      expect(layout.picture.width).toBeGreaterThan(400);
    }
  });

  it('docks the card under the picture on a narrow host', () => {
    const layout = layoutP05(720, 640);
    expect(layout.stacked).toBe(true);
    expect(layout.card.top).toBeGreaterThan(layout.picture.top + layout.picture.height);
    expect(overlaps(layout.picture, layout.card)).toBe(false);
  });

  it('keeps the picture inside the host with room for the chrome', () => {
    for (const [width, height] of [
      [1280, 720],
      [1024, 768],
      [720, 640],
      [640, 360],
    ]) {
      const layout = layoutP05(width, height);
      expect(layout.picture.left).toBeGreaterThan(0);
      expect(layout.picture.top).toBeGreaterThan(0);
      expect(layout.picture.left + layout.picture.width).toBeLessThanOrEqual(width);
      expect(layout.picture.top + layout.picture.height).toBeLessThanOrEqual(height);
      expect(layout.card.left + layout.card.width).toBeLessThanOrEqual(width);
    }
  });

  it('refuses a host too small to draw in', () => {
    expect(layoutP05(0, 0).valid).toBe(false);
    expect(layoutP05(Number.NaN, 720).valid).toBe(false);
    expect(layoutP05(1280, 200).valid).toBe(false);
    expect(EMPTY_P05_LAYOUT.valid).toBe(false);
  });
});

describe('narrow host with no card open', () => {
  it('gives the picture the whole height instead of an empty sheet', () => {
    const closed = layoutP05(800, 600);
    const open = layoutP05(800, 600, { cardOpen: true });
    expect(closed.stacked).toBe(true);
    expect(closed.card.height).toBe(0);
    expect(closed.picture.height).toBeGreaterThan(open.picture.height);
    expect(closed.picture.top + closed.picture.height).toBeLessThanOrEqual(600);
    // The open sheet is still readable and the picture still has a picture.
    expect(open.card.height).toBeGreaterThanOrEqual(120);
    expect(open.picture.height).toBeGreaterThanOrEqual(120);
  });
});
