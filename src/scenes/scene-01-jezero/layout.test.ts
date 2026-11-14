import { describe, expect, it } from 'vitest';
import {
  DESCENT_END_PERCENT,
  layoutP01,
  panShift,
  percyPanShift,
  rockHostRect,
} from './layout';

describe('layoutP01', () => {
  const layout = layoutP01(1920, 1080);

  it('sizes the world container at 2.6 viewports', () => {
    expect(layout.containerHeight).toBeCloseTo(2808);
  });

  it('lands the container bottom on the viewport bottom after the descent', () => {
    const descent = (DESCENT_END_PERCENT / 100) * layout.containerHeight;
    // -61.54 % of 2.6 H leaves exactly one viewport of the container showing.
    expect(layout.containerHeight + descent).toBeCloseTo(1080, 0);
  });

  it('keeps the CSS-era ridge, ground and foreground geometry', () => {
    expect(layout.ridgeFar.w).toBeCloseTo(1.08 * 1920);
    expect(layout.ridgeFar.x).toBeCloseTo(-0.04 * 1920);
    expect(layout.ridgeFar.y + layout.ridgeFar.h).toBeCloseTo(2808 - 0.1462 * 2808);
    expect(layout.ridgeNear.w).toBeCloseTo(1.25 * 1920);
    // The ground box is one viewport tall and hangs 0.38 H below the container.
    expect(layout.ground.h).toBe(1080);
    expect(layout.ground.y + layout.ground.h).toBeCloseTo(2808 + 0.1462 * 2808);
    expect(layout.fgV1.y + layout.fgV1.h).toBeCloseTo(2808);
    expect(layout.fgV2.w).toBeCloseTo(1.3125 * 1920);
  });

  it('clamps Percy between 300 and 780 px on wide hosts', () => {
    expect(layoutP01(1920, 1080).percy.width).toBe(768);
    expect(layoutP01(2560, 1440).percy.width).toBe(780);
    expect(layoutP01(1000, 600).percy.width).toBe(400);
    expect(layoutP01(700, 500).percy.width).toBeLessThanOrEqual(240);
  });

  it('puts the rocks where the mockup wants them after the pan', () => {
    const [rockA] = layout.rocks;
    // Frame-2 screen centre 0.83: pan shift puts the centre back on 0.83 W.
    const centre = rockA.x + rockA.w / 2 + panShift(1920, 0.9, 1);
    expect(centre / 1920).toBeCloseTo(0.83);
  });
});

describe('pan shifts', () => {
  it('scales the pan by the parallax factor', () => {
    expect(panShift(1920, 1, 0)).toBeCloseTo(0);
    expect(panShift(1920, 1, 1)).toBeCloseTo(-600);
    expect(panShift(1920, 0.5, 1)).toBeCloseTo(-300);
    expect(panShift(960, 1, 1)).toBeCloseTo(-300);
  });

  it('lets Percy stop 190 design px short of a full rover pan', () => {
    expect(percyPanShift(1920, 1)).toBeCloseTo(-410);
    expect(percyPanShift(1920, 0)).toBeCloseTo(0);
  });
});

describe('rockHostRect', () => {
  const layout = layoutP01(1920, 1080);
  const rock = layout.rocks[1];
  const rest = {
    scale: 1,
    originX: 0.5,
    originY: 0.5,
    scrollPercent: DESCENT_END_PERCENT,
    pan: 1,
  };

  it('matches the layout rect when the world is not zoomed', () => {
    const rect = rockHostRect(layout, rock, 2, rest);
    expect(rect.width).toBeCloseTo(rock.w);
    expect(rect.height).toBeCloseTo(rock.w / 2);
    expect(rect.left).toBeCloseTo(rock.x + panShift(1920, 0.9, 1));
  });

  it('zooms about the origin: the origin point stays put', () => {
    const origin = { ...rest, originX: 0, originY: 0, scale: 2 };
    const base = rockHostRect(layout, rock, 2, rest);
    const zoomed = rockHostRect(layout, rock, 2, origin);
    expect(zoomed.left).toBeCloseTo(base.left * 2);
    expect(zoomed.top).toBeCloseTo(base.top * 2);
    expect(zoomed.width).toBeCloseTo(base.width * 2);
  });
});
