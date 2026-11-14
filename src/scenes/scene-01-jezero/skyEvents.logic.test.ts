import { describe, expect, it } from 'vitest';
import {
  COMET_MAX_GAP_MS,
  chooseSpawn,
  createSkyEvent,
  streakOpacity,
  streakPose,
} from './skyEvents.logic';

/** A deterministic "random": cycles through the given values. */
function sequence(values: number[]) {
  let index = 0;
  return () => values[index++ % values.length];
}

describe('chooseSpawn', () => {
  it('only spawns meteors once the camera is in the Mars sky', () => {
    const lowRoll = () => 0;
    const result = chooseSpawn('sky', COMET_MAX_GAP_MS * 10, 0, lowRoll);
    expect(result).toEqual({ kind: 'meteor', band: 'mars' });
  });

  it('spawns a comet on a low roll in space', () => {
    expect(chooseSpawn('space', 1000, 900, () => 0.1)).toEqual({ kind: 'comet', band: 'space' });
    expect(chooseSpawn('space', 1000, 900, () => 0.9)).toEqual({ kind: 'meteor', band: 'space' });
  });

  it('forces a comet when none has appeared for too long', () => {
    const result = chooseSpawn('space', COMET_MAX_GAP_MS + 1, 0, () => 0.99);
    expect(result.kind).toBe('comet');
  });
});

describe('createSkyEvent', () => {
  it('keeps meteors small and fast, comets large and slow', () => {
    const meteor = createSkyEvent(1, 'meteor', 'space', sequence([0.2, 0.5, 0.5]));
    const comet = createSkyEvent(2, 'comet', 'space', sequence([0.2, 0.5, 0.5]));
    expect(meteor.length).toBeLessThan(comet.length);
    expect(meteor.durationMs).toBeLessThan(comet.durationMs);
    expect(meteor.drop).toBe(0);
    expect(comet.drop).toBeGreaterThan(0);
    expect(comet.dropEase).toBe('ease-in');
  });
});

describe('streak motion', () => {
  const spec = createSkyEvent(1, 'meteor', 'space', () => 0.5);
  const host = { width: 1000, height: 600 };

  it('fades in, holds, and fades out', () => {
    expect(streakOpacity(0)).toBe(0);
    expect(streakOpacity(0.06)).toBeCloseTo(0.5);
    expect(streakOpacity(0.5)).toBe(1);
    expect(streakOpacity(0.78)).toBe(1);
    expect(streakOpacity(0.89)).toBeCloseTo(0.5);
    expect(streakOpacity(1)).toBe(0);
  });

  it('travels along its own axis', () => {
    const start = streakPose(spec, 0, host, 0, 600);
    const end = streakPose(spec, 1, host, 0, 600);
    const axis = (spec.angle * Math.PI) / 180;
    const travelled = spec.travel * host.width + spec.length + spec.length;
    // Along-axis distance covered between the two poses.
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    expect(Math.hypot(dx, dy)).toBeCloseTo(travelled - spec.length, 5);
    expect(Math.atan2(dy, dx)).toBeCloseTo(axis, 5);
  });
});
