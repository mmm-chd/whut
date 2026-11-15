import { describe, expect, it } from 'vitest';
import { P04_INVITATION_X } from './annotations';
import {
  P04_TRAVEL,
  followPose,
  travelledDistance,
  travelDuration,
  wheelAngle,
} from './travel';

/**
 * Travel is bounded and exact: it ends on the invitation stop, never overshoots,
 * and a broken input degrades to standing still rather than to a runaway float.
 */

describe('walk length', () => {
  it('takes the cruise span and is never zero-length', () => {
    const seconds = travelDuration(P04_TRAVEL);
    expect(seconds).toBeCloseTo((P04_INVITATION_X - P04_TRAVEL.fromX) / P04_TRAVEL.cruise);
    expect(seconds).toBeGreaterThan(5);
  });

  it('reports zero for a broken plan instead of dividing by zero', () => {
    expect(travelDuration({ fromX: 0, toX: 100, cruise: 0 })).toBe(0);
    expect(travelDuration({ fromX: 0, toX: Number.NaN, cruise: 10 })).toBe(0);
  });
});

describe('distance along the walk', () => {
  it('starts at the first stop and ends exactly on the invitation', () => {
    expect(travelledDistance(0)).toBe(P04_TRAVEL.fromX);
    expect(travelledDistance(1)).toBe(P04_TRAVEL.toX);
    expect(travelledDistance(1)).toBe(P04_INVITATION_X);
  });

  it('rises monotonically and never overshoots', () => {
    let previous = Number.NEGATIVE_INFINITY;
    for (let step = 0; step <= 20; step += 1) {
      const value = travelledDistance(step / 20);
      expect(value).toBeGreaterThanOrEqual(previous);
      expect(value).toBeLessThanOrEqual(P04_INVITATION_X);
      previous = value;
    }
  });

  it('clamps nonsense progress instead of jumping backwards', () => {
    expect(travelledDistance(-2)).toBe(P04_TRAVEL.fromX);
    expect(travelledDistance(9)).toBe(P04_TRAVEL.toX);
    expect(travelledDistance(Number.NaN)).toBe(P04_TRAVEL.fromX);
  });
});

describe('wheel spin', () => {
  it('turns in proportion to distance', () => {
    expect(wheelAngle(0)).toBe(0);
    expect(wheelAngle(26)).toBeCloseTo(2);
    expect(wheelAngle(52)).toBeCloseTo(2 * wheelAngle(26));
  });

  it('stays finite for broken input', () => {
    expect(wheelAngle(Number.NaN)).toBe(0);
    expect(wheelAngle(10, 0)).toBe(0);
  });
});

describe('camera follow', () => {
  it('centres the rover without zooming', () => {
    expect(followPose(300)).toEqual({ x: 300, lift: 0, scale: 1 });
  });

  it('falls back to the start for a non-finite position', () => {
    expect(followPose(Number.NaN).x).toBe(P04_TRAVEL.fromX);
  });
});
