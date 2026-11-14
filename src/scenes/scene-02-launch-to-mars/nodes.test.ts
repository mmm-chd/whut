import { describe, expect, it } from 'vitest';
import { P02_CAMERA, P02_LAND, P02_ROCKET_ESTABLISHING, isP02RocketOffscreen } from './camera';
import { createP02Nodes, getP02NodeBounds, p02CameraPose, resetP02Nodes } from './nodes';
import { SMOKE_NODES } from './smoke';
import { parsePolygonPath, skyCloudPolygons } from './skyPolygons';
import { P02_SKY_CLOUDS } from './skyClouds';

const FRAME = { left: 0, top: 0, right: 1920, bottom: 1080 };

describe('P-02 node state', () => {
  it('starts on the first frame of the cue sheet', () => {
    const nodes = createP02Nodes();
    expect(nodes.rocket.y).toBe(P02_ROCKET_ESTABLISHING.offsetY);
    expect(nodes.rocket.scale).toBe(P02_ROCKET_ESTABLISHING.scale);
    expect(nodes.land.y).toBe(P02_LAND.establishingOffsetY);
    expect(nodes.closeup.opacity).toBe(0);
    expect(nodes.smoke).toHaveLength(SMOKE_NODES.length);
    expect(p02CameraPose(nodes)).toMatchObject(P02_CAMERA.establishing);
  });

  it('resets a played-out run back to rest', () => {
    const nodes = createP02Nodes();
    nodes.rocket.y = -2680;
    nodes.exhaust.opacity = 1;
    nodes.camera.scale = 0.5;
    nodes.flags.launching = true;

    resetP02Nodes(nodes);

    expect(nodes.rocket.y).toBe(P02_ROCKET_ESTABLISHING.offsetY);
    expect(nodes.exhaust.opacity).toBe(0);
    expect(p02CameraPose(nodes)).toMatchObject(P02_CAMERA.establishing);
    expect(nodes.flags.launching).toBe(false);
  });

  it('a shake moves the view the opposite way', () => {
    const nodes = createP02Nodes();
    nodes.shake.x = 10;
    expect(p02CameraPose(nodes).centerX).toBe(950);
  });
});

describe('getP02NodeBounds', () => {
  it('keeps the establishing rocket inside the frame', () => {
    const bounds = getP02NodeBounds(createP02Nodes());
    expect(bounds.top).toBeGreaterThan(0);
    expect(isP02RocketOffscreen(bounds, FRAME, 24)).toBe(false);
  });

  it('puts the launch-pose rocket on the pad, full height', () => {
    const nodes = createP02Nodes();
    nodes.rocket.y = 0;
    nodes.rocket.scale = 1;
    Object.assign(nodes.camera, {
      x: 960 - 960,
      y: 540 - 560,
      scale: 1,
    });
    const bounds = getP02NodeBounds(nodes);
    // Rocket box top 51 at launch, camera centre y 560 -> 31 on screen.
    expect(bounds.top).toBeCloseTo(51 - 20);
    expect(bounds.left).toBeCloseTo(814);
    expect(bounds.right).toBeCloseTo(814 + 292);
  });

  it('counts the exhaust: a long flame lowers the bottom edge', () => {
    const nodes = createP02Nodes();
    nodes.exhaust.scaleY = 1;
    const short = getP02NodeBounds(nodes).bottom;
    nodes.exhaust.scaleY = 2;
    expect(getP02NodeBounds(nodes).bottom).toBeGreaterThan(short);
  });

  it('clears the frame at the ascent endpoint', () => {
    const nodes = createP02Nodes();
    nodes.rocket.y = -2680;
    nodes.rocket.scale = 0.75;
    nodes.exhaust.scaleY = 1.2;
    Object.assign(nodes.camera, { x: 960 - 960 * 0.5, y: 540 - -300 * 0.5, scale: 0.5 });
    expect(isP02RocketOffscreen(getP02NodeBounds(nodes), FRAME, 24)).toBe(true);
  });
});

describe('sky cloud polygons', () => {
  it('parses an M/L path into points', () => {
    expect(parsePolygonPath('M0 0 L10.5 2 L-3 4Z')).toEqual([
      [0, 0],
      [10.5, 2],
      [-3, 4],
    ]);
  });

  it('turns every ribbon into a closed polygon at its world position', () => {
    const polygons = skyCloudPolygons(P02_SKY_CLOUDS);
    const ribbons = P02_SKY_CLOUDS.reduce((sum, cloud) => sum + cloud.paths.length, 0);
    expect(polygons).toHaveLength(ribbons);
    for (const polygon of polygons) {
      expect(polygon.length).toBeGreaterThan(100);
    }
    const [first] = P02_SKY_CLOUDS;
    const local = parsePolygonPath(first.paths[0])[0];
    expect(polygons[0][0]).toEqual([local[0] + first.left, local[1] + first.top]);
  });
});
