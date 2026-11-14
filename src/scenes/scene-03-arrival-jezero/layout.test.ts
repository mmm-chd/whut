import { describe, expect, it } from 'vitest';
import { DOOR, PERCY_HALF_WIDTH, ROCKET, layoutP03 } from './layout';
import { createP03Nodes, isPercyOffscreen, percyScreenSpan, resetP03Nodes } from './nodes';

const HOSTS: ReadonlyArray<readonly [string, number, number]> = [
  ['16:9', 1920, 1080],
  ['4:3', 1440, 1080],
  ['4:5', 1000, 1250],
  ['phone landscape', 844, 390],
];

describe('layoutP03', () => {
  it.each(HOSTS)('orders the stops and keeps the rock between B and C on %s', (_name, w, h) => {
    const layout = layoutP03(w, h);
    expect(layout.doorX).toBeLessThan(layout.exitOffX);
    expect(layout.exitOffX).toBeLessThan(layout.stopA);
    expect(layout.stopA).toBeLessThan(layout.stopA2);
    expect(layout.stopA2).toBeLessThan(layout.stopB);
    expect(layout.stopB).toBeLessThan(layout.rockX);
    expect(layout.rockX).toBeLessThan(layout.stopC);
    expect(layout.maxCameraPx).toBeGreaterThan(layout.stopC * layout.unit);
  });

  it('scales every actor with the picture, not the host', () => {
    const wide = layoutP03(1920, 1080);
    const small = layoutP03(960, 540);
    expect(small.unit).toBeCloseTo(wide.unit / 2);
    // Same design-unit geometry; only the unit changes.
    expect(small.exitOffX).toBeCloseTo(wide.exitOffX);
  });

  it.each(HOSTS)('lets Percy leave the door shot completely on %s', (_name, w, h) => {
    const layout = layoutP03(w, h);
    const nodes = createP03Nodes();
    resetP03Nodes(nodes, layout);
    Object.assign(nodes.camera, layout.poses.door);

    nodes.percy.body.x = layout.jumpFromX;
    expect(isPercyOffscreen(nodes, layout)).toBe(false);

    nodes.percy.body.x = layout.exitOffX;
    expect(isPercyOffscreen(nodes, layout)).toBe(true);
    // The whole visible width is past the edge, not just the centre.
    expect(percyScreenSpan(nodes, layout).left).toBeGreaterThanOrEqual(w);
  });

  it.each(HOSTS)('keeps Percy in frame at every pose on %s', (_name, w, h) => {
    const layout = layoutP03(w, h);
    const stopFor: Record<string, number> = {
      inspect: layout.stopB,
      confused: layout.stopC,
      rovers: layout.stopC,
      mission: layout.stopC,
      final: layout.stopC,
    };
    for (const [name, x] of Object.entries(stopFor)) {
      const pose = layout.poses[name as keyof typeof layout.poses];
      const nodes = createP03Nodes();
      resetP03Nodes(nodes, layout);
      Object.assign(nodes.camera, pose);
      nodes.percy.body.x = x;
      const span = percyScreenSpan(nodes, layout);
      expect(span.left, name).toBeGreaterThanOrEqual(0);
      expect(span.right, name).toBeLessThanOrEqual(w);
    }
  });

  it('keeps Percy narrower than the host at the follow zoom', () => {
    for (const [, w, h] of HOSTS) {
      const layout = layoutP03(w, h);
      const width = PERCY_HALF_WIDTH * 2 * layout.unit * layout.followScale;
      expect(width).toBeLessThan(w * 0.6);
    }
  });

  it('follows a little ahead of Percy', () => {
    const layout = layoutP03(1920, 1080);
    expect(layout.followX(1000)).toBeGreaterThan(1000);
  });
});

describe('the hatch', () => {
  it('is a small upright door, set high in the hull', () => {
    expect(DOOR.height).toBeGreaterThan(DOOR.width);
    expect(DOOR.width).toBeLessThanOrEqual(220);
    // Above the ground, and inside the rocket body (437 units wide).
    expect(DOOR.sill).toBeGreaterThan(300);
    expect(DOOR.width).toBeLessThan(ROCKET.art.baseX * 2 * ROCKET.scale * 0.5);
  });

  it('is cut from art that exists: the door rectangle lies inside the rocket picture', () => {
    const { art, scale } = ROCKET;
    const artWidth = DOOR.width / scale;
    const artTop = art.baseY - (DOOR.sill + DOOR.height) / scale;
    expect(art.baseX - artWidth / 2).toBeGreaterThan(0);
    expect(art.baseX + artWidth / 2).toBeLessThan(art.width);
    expect(artTop).toBeGreaterThan(0);
    expect(art.baseY - DOOR.sill / scale).toBeLessThan(art.height);
  });

  it.each(HOSTS)('shows the whole door and the landing ground at the door shot on %s', (_n, w, h) => {
    const layout = layoutP03(w, h);
    const { scale, lift } = layout.poses.door;
    // Height above the ground at the top and bottom of the view, in design units.
    const centre = (layout.groundY - (h / 2 - lift * layout.unit)) / layout.unit;
    const halfView = h / 2 / (scale * layout.unit);
    expect(centre + halfView).toBeGreaterThan(DOOR.sill + DOOR.height);
    expect(centre - halfView).toBeLessThan(0);
  });

  it('puts Percy at the door and has him land to its right', () => {
    const layout = layoutP03(1920, 1080);
    expect(Math.abs(layout.jumpFromX - layout.doorX)).toBeLessThan(DOOR.width);
    expect(layout.landX).toBeGreaterThan(layout.jumpFromX);
    expect(layout.landX).toBeLessThan(layout.exitOffX);
  });
});

describe('P-03 nodes', () => {
  it('reset returns to the first frame', () => {
    const layout = layoutP03(1920, 1080);
    const nodes = createP03Nodes();
    nodes.percy.body.x = 4000;
    nodes.cards.shown = 4;
    nodes.door.open = 1;
    nodes.rocket.y = 0;
    resetP03Nodes(nodes, layout, true);
    expect(nodes.percy.body.x).toBe(layout.jumpFromX);
    expect(nodes.percy.body.y).toBe(-DOOR.sill);
    expect(nodes.percy.body.opacity).toBe(0);
    expect(nodes.cards.shown).toBe(0);
    expect(nodes.door.open).toBe(0);
    expect(nodes.rocket.y).toBeLessThan(0);
    expect(nodes.flags.reducedMotion).toBe(true);
  });
});
