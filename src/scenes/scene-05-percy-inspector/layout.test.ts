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
  it('gives the picture the whole width on a wide host, with the card over it', () => {
    const layout = layoutP05(1280, 720);
    expect(layout.valid).toBe(true);
    expect(layout.stacked).toBe(false);
    expect(layout.picture.width).toBeGreaterThan(layout.card.width);
    expect(overlaps(layout.picture, layout.card)).toBe(true);
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
    const layout = layoutP05(640, 640);
    expect(layout.mode).toBe('sheet');
    expect(layout.stacked).toBe(true);
    // The drawer sits at the bottom edge of the picture, not below it.
    expect(layout.card.top + layout.card.height).toBeLessThanOrEqual(
      layout.picture.top + layout.picture.height + 1,
    );
    expect(layout.card.top).toBeGreaterThan(layout.picture.top + layout.picture.height / 2);
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
    const closed = layoutP05(640, 600);
    const open = layoutP05(640, 600, { cardOpen: true });
    expect(closed.stacked).toBe(true);
    expect(closed.card.height).toBe(0);
    // Opening the drawer does not re-fit the model.
    expect(closed.picture.height).toBe(open.picture.height);
    expect(closed.picture.top + closed.picture.height).toBeLessThanOrEqual(600);
    // The open sheet is still readable and the picture still has a picture.
    expect(open.card.height).toBeGreaterThanOrEqual(120);
    expect(open.picture.height).toBeGreaterThanOrEqual(120);
  });

  it('floats the panel over a full-width picture on a tablet', () => {
    const layout = layoutP05(1024, 768);
    expect(layout.mode).toBe('overlay');
    expect(layout.stacked).toBe(false);
    // The picture keeps the whole content width: the model is not shrunk.
    expect(layout.picture.width).toBeGreaterThan(layoutP05(1024, 768).width - 60);
    // The panel sits over the picture's right edge, inside the host.
    expect(layout.card.top).toBeGreaterThanOrEqual(layout.picture.top);
    expect(layout.card.left).toBeGreaterThan(layout.picture.left);
    expect(layout.card.left + layout.card.width).toBeLessThanOrEqual(1024);
    expect(layout.picture.left + layout.picture.width).toBeLessThanOrEqual(1024);
    // It covers part of the picture, which is the point of an overlay...
    expect(overlaps(layout.picture, layout.card)).toBe(true);
    // ...but never all of it: the rover stays visible beside it.
    const uncovered = layout.card.left - layout.picture.left;
    expect(uncovered).toBeGreaterThan(200);
  });

  it('fills the screen on a desktop and floats the card over the picture', () => {
    const layout = layoutP05(1280, 720);
    expect(layout.mode).toBe('overlay');
    expect(layout.stacked).toBe(false);
    // The picture runs nearly edge to edge and well down the page, with a small margin.
    expect(layout.picture.left).toBeGreaterThan(0);
    expect(layout.picture.left).toBeLessThanOrEqual(20);
    expect(layout.picture.width).toBeGreaterThan(1280 - 40);
    expect(layout.picture.top + layout.picture.height).toBeGreaterThan(720 - 40);
    expect(layout.picture.top + layout.picture.height).toBeLessThanOrEqual(720);
    // The card is over the picture, with the rover left uncovered beside it.
    expect(overlaps(layout.picture, layout.card)).toBe(true);
    expect(layout.card.left - layout.picture.left).toBeGreaterThan(400);
  });
});
