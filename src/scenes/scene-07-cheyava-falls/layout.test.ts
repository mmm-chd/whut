import { describe, expect, it } from 'vitest';
import { layoutP06, isPercyOutsideViewport, percyScreenSpan } from './layout';

describe('layoutP06', () => {
  it('refuses a host with no size instead of dividing by zero', () => {
    expect(layoutP06(0, 720).valid).toBe(false);
    expect(layoutP06(Number.NaN, 720).valid).toBe(false);
    expect(layoutP06(1280, 720).valid).toBe(true);
  });

  it('puts the ground line at the storybook fraction', () => {
    const layout = layoutP06(1280, 720);
    expect(layout.groundY).toBeCloseTo(0.82 * 720, 5);
  });

  it('scales actors with the picture rather than with the window', () => {
    const wide = layoutP06(1920, 1080);
    const small = layoutP06(960, 540);
    expect(wide.unit).toBeCloseTo(1, 5);
    expect(small.unit).toBeCloseTo(0.5, 5);
  });

  it('follows Percy with the camera, keeping him a little left of centre', () => {
    const layout = layoutP06(1280, 720);
    expect(layout.followX(500)).toBeLessThan(500);
  });
});

describe('the journey exit', () => {
  it('is decided from the sprite bounds at the current camera', () => {
    const layout = layoutP06(1280, 720);
    const camera = layout.journey;
    // Far left of the view: off screen, and nothing about elapsed time says so.
    expect(isPercyOutsideViewport(layout.exitX + 4000, camera, layout)).toBe(true);
    expect(isPercyOutsideViewport(camera.x, camera, layout)).toBe(false);
  });

  it('needs the whole opaque width past the edge, not the centre', () => {
    const layout = layoutP06(1280, 720);
    const camera = layout.valley;
    // Put Percy exactly on the right edge: his body still overlaps the frame.
    // The centre of the view's right edge, in design units.
    const edgeX = camera.x + layout.width / 2 / (camera.scale * layout.unit);
    // His left side is on the edge: half of him still shows.
    const straddling = edgeX + layout.percyHalfWidth;
    expect(percyScreenSpan(straddling, camera, layout).left).toBeCloseTo(layout.width, 3);
    // Measured against the edge itself, ignoring the safety margin.
    expect(isPercyOutsideViewport(straddling - 2, camera, layout, 0)).toBe(false);
    expect(isPercyOutsideViewport(straddling + 2, camera, layout, 0)).toBe(true);
    // With the default margin the same spot is still on screen.
    expect(isPercyOutsideViewport(straddling + 2, camera, layout)).toBe(false);
  });
});
