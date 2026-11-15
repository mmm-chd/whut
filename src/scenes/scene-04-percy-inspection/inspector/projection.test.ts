import { describe, expect, it } from 'vitest';
import { modelAnchors } from './modelConfig';
import { monitorViewport, MONITOR_FRAME_PX, projectAnchor, visibleAnchors, type MonitorViewport } from './projection';
import { INITIAL_ROTATION, MAX_PITCH } from './rotation';

const VIEWPORT: MonitorViewport = { width: 900, height: 516, fovDegrees: 35, distance: 3.82 };
const CENTRE = { x: 0, y: 0, z: 0 };

describe('projectAnchor', () => {
  it('puts the model centre in the middle of the monitor, at any rotation', () => {
    for (const rotation of [
      INITIAL_ROTATION,
      { yaw: 0, pitch: 0 },
      { yaw: 2.4, pitch: -MAX_PITCH },
    ]) {
      const projected = projectAnchor(CENTRE, rotation, VIEWPORT);
      expect(projected.x).toBeCloseTo(VIEWPORT.width / 2, 6);
      expect(projected.y).toBeCloseTo(VIEWPORT.height / 2, 6);
      expect(projected.visible).toBe(true);
    }
  });

  it('moves a front-facing point sideways when the model turns', () => {
    const front = { x: 0, y: 0, z: 0.8 };
    const straight = projectAnchor(front, { yaw: 0, pitch: 0 }, VIEWPORT);
    const right = projectAnchor(front, { yaw: Math.PI / 2, pitch: 0 }, VIEWPORT);
    const left = projectAnchor(front, { yaw: -Math.PI / 2, pitch: 0 }, VIEWPORT);

    expect(straight.x).toBeCloseTo(VIEWPORT.width / 2, 6);
    expect(right.x).toBeGreaterThan(straight.x);
    expect(left.x).toBeLessThan(straight.x);
    // Half a turn puts it on the far side of the model, back on the centre line.
    const back = projectAnchor(front, { yaw: Math.PI, pitch: 0 }, VIEWPORT);
    expect(back.x).toBeCloseTo(VIEWPORT.width / 2, 6);
    expect(back.depth).toBeGreaterThan(straight.depth);
  });

  it('reports a point behind the camera as not visible', () => {
    const behind = projectAnchor({ x: 0, y: 0, z: 3.82 }, { yaw: 0, pitch: 0 }, VIEWPORT);
    expect(behind.visible).toBe(false);
  });

  it('reports a point off the monitor edge as not visible', () => {
    const offEdge = projectAnchor({ x: 1, y: 1, z: 1 }, { yaw: 0, pitch: 0 }, VIEWPORT);
    expect(offEdge.visible).toBe(false);
  });

  it('survives a zero-sized monitor', () => {
    const projected = projectAnchor(CENTRE, INITIAL_ROTATION, { ...VIEWPORT, width: 0, height: 0 });
    expect(Number.isFinite(projected.x)).toBe(true);
    expect(Number.isFinite(projected.y)).toBe(true);
  });
});

describe('monitorViewport', () => {
  it('is the screen inside the monitor frame', () => {
    const viewport = monitorViewport({ width: 912, height: 528 });
    expect(viewport.width).toBe(912 - MONITOR_FRAME_PX * 2);
    expect(viewport.height).toBe(528 - MONITOR_FRAME_PX * 2);
  });

  it('backs the camera off when the monitor is tall and narrow', () => {
    const wide = monitorViewport({ width: 900, height: 340 });
    const tall = monitorViewport({ width: 340, height: 900 });
    expect(tall.distance).toBeGreaterThan(wide.distance);
  });
});

describe('visibleAnchors', () => {
  it('keeps the four configured points reachable from some rotation', () => {
    const seen = new Set<string>();
    for (let step = 0; step < 24; step += 1) {
      const rotation = { yaw: (step / 24) * Math.PI * 2, pitch: 0 };
      for (const entry of visibleAnchors(modelAnchors(), rotation, VIEWPORT)) {
        seen.add(entry.point);
      }
    }
    expect([...seen].sort()).toEqual(['cameras', 'earth-team', 'microphone', 'moxie']);
  });

  it('drops the further of two points that land on the same pixel', () => {
    const anchors = {
      near: { x: 0, y: 0, z: 0.5 },
      far: { x: 0, y: 0, z: -0.5 },
    };
    const kept = visibleAnchors(anchors, { yaw: 0, pitch: 0 }, VIEWPORT);
    expect(kept.map((entry) => entry.point)).toEqual(['near']);
  });

  it('draws nothing when every point turned away', () => {
    const anchors = { only: { x: 0, y: 0, z: 3.9 } };
    expect(visibleAnchors(anchors, { yaw: 0, pitch: 0 }, VIEWPORT)).toEqual([]);
  });
});
