import { describe, expect, it } from 'vitest';
import {
  clampPitch,
  DEFAULT_PITCH,
  DEFAULT_YAW,
  dragRotation,
  DRAG_THRESHOLD_PX,
  INITIAL_ROTATION,
  isDrag,
  MAX_PITCH,
  normalizeYaw,
  nudgePitch,
  nudgeYaw,
  pointerDistance,
  rotate,
} from './rotation';

const TWO_PI = Math.PI * 2;

describe('rotation limits', () => {
  it('clamps pitch to the configured limit in both directions', () => {
    expect(clampPitch(10)).toBeCloseTo(MAX_PITCH, 6);
    expect(clampPitch(-10)).toBeCloseTo(-MAX_PITCH, 6);
    expect(clampPitch(0.2)).toBeCloseTo(0.2, 6);
  });

  it('normalises yaw modulo a full turn', () => {
    expect(normalizeYaw(TWO_PI + 1)).toBeCloseTo(1, 6);
    expect(normalizeYaw(-1)).toBeCloseTo(TWO_PI - 1, 6);
    expect(normalizeYaw(0)).toBe(0);
  });

  it('ignores non-finite deltas instead of corrupting the view', () => {
    expect(normalizeYaw(Number.NaN)).toBeCloseTo(DEFAULT_YAW, 6);
    expect(clampPitch(Number.POSITIVE_INFINITY)).toBeCloseTo(DEFAULT_PITCH, 6);
    const unchanged = rotate(INITIAL_ROTATION, Number.NaN, Number.NaN);
    expect(unchanged.yaw).toBeCloseTo(INITIAL_ROTATION.yaw, 6);
    expect(unchanged.pitch).toBeCloseTo(INITIAL_ROTATION.pitch, 6);
  });

  it('applies a drag as yaw and pitch, never roll', () => {
    const turned = dragRotation({ yaw: 0, pitch: 0 }, 100, 50);
    expect(turned.yaw).toBeCloseTo(0.8, 6);
    expect(turned.pitch).toBeCloseTo(0.4, 6);
  });

  it('nudges one axis at a time', () => {
    const yawed = nudgeYaw({ yaw: 0, pitch: 0 }, 1);
    expect(yawed.pitch).toBe(0);
    expect(yawed.yaw).toBeGreaterThan(0);

    const tilted = nudgePitch({ yaw: 0, pitch: 0 }, -1);
    expect(tilted.yaw).toBe(0);
    expect(tilted.pitch).toBeLessThan(0);
  });

  it('cannot tilt past the limit however many nudges arrive', () => {
    let rotation = { yaw: 0, pitch: 0 };
    for (let i = 0; i < 50; i += 1) {
      rotation = nudgePitch(rotation, 1);
    }
    expect(rotation.pitch).toBeCloseTo(MAX_PITCH, 6);
  });
});

describe('drag versus click', () => {
  it('treats a press below the threshold as a click', () => {
    expect(isDrag(0)).toBe(false);
    expect(isDrag(DRAG_THRESHOLD_PX)).toBe(false);
    expect(isDrag(DRAG_THRESHOLD_PX + 1)).toBe(true);
  });

  it('never calls a non-finite movement a drag', () => {
    expect(isDrag(Number.NaN)).toBe(false);
  });

  it('measures pointer travel without exploding on bad input', () => {
    expect(pointerDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBeCloseTo(5, 6);
    expect(pointerDistance({ x: 0, y: 0 }, { x: Number.NaN, y: 1 })).toBeCloseTo(1, 6);
  });
});
