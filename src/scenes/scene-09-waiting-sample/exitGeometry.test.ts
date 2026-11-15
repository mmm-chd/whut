import { describe, expect, it } from 'vitest';
import { RIG_ENVELOPE, exitTargetX, percyExitedRight } from './exitGeometry';
import { PERCY_SCALE, RIG_PARTS } from '../../characters/percy/rigLayout';

const view = { width: 1280, unit: 2 / 3, cameraX: 960, cameraScale: 1 };

describe('exit geometry', () => {
  it('requires the entire conservative rig envelope to leave', () => {
    expect(percyExitedRight({ ...view, bodyX: 1930 })).toBe(false);
    const target = exitTargetX(view);
    expect(target).not.toBeNull();
    if (target === null) {
      throw new Error('expected usable exit geometry');
    }
    expect(percyExitedRight({ ...view, bodyX: target })).toBe(true);
    expect(percyExitedRight({ ...view, bodyX: target - 60 })).toBe(false);
  });

  it('a centre just outside the frame is not enough', () => {
    const centreOffRight = view.cameraX + (view.width / 2 + 20) / (view.cameraScale * view.unit);
    expect(percyExitedRight({ ...view, bodyX: centreOffRight })).toBe(false);
  });

  it('rejects unusable geometry in both directions', () => {
    for (const bad of [
      { ...view, unit: 0 },
      { ...view, width: 0 },
      { ...view, cameraScale: -1 },
      { ...view, cameraX: Number.NaN },
      { ...view, unit: Number.POSITIVE_INFINITY },
    ]) {
      expect(percyExitedRight({ ...bad, bodyX: 99999 })).toBe(false);
      expect(exitTargetX(bad)).toBeNull();
    }
  });

  it('follows the camera zoom, so a closer camera needs less distance in units', () => {
    const near = exitTargetX({ ...view, cameraScale: 1.5 }) as number;
    const far = exitTargetX(view) as number;
    expect(near).toBeLessThan(far);
    expect(percyExitedRight({ ...view, cameraScale: 1.5, bodyX: near })).toBe(true);
  });

  it('keeps every rig part inside the envelope, at rest', () => {
    // Boxes are in rover pixels around the ground anchor; the rig draws them at PERCY_SCALE.
    let farthest = 0;
    for (const part of RIG_PARTS) {
      const { x, y, w, h } = part.box;
      for (const [cx, cy] of [
        [x, y],
        [x + w, y],
        [x, y + h],
        [x + w, y + h],
      ]) {
        farthest = Math.max(farthest, Math.hypot(cx, cy) * PERCY_SCALE);
      }
    }
    expect(farthest).toBeLessThan(RIG_ENVELOPE);
    // Room is left for the rolling bob and a raised mast or arm.
    expect(RIG_ENVELOPE - farthest).toBeGreaterThan(100);
  });
});
