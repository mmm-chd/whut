import { describe, expect, it } from 'vitest';
import { TRACK_COUNT, revealedTracks, trackPositions, updateTrackOpacity } from './tracks';

describe('tracks', () => {
  it('never exceeds twelve stamps and is fixed in advance', () => {
    const positions = trackPositions(500);
    expect(positions).toHaveLength(TRACK_COUNT);
    expect(TRACK_COUNT).toBeLessThanOrEqual(12);
    expect(positions).toEqual(trackPositions(500));
    expect([...positions].sort((a, b) => a - b)).toEqual([...positions]);
  });

  it('returns nothing for a nonfinite start', () => {
    expect(trackPositions(Number.NaN)).toEqual([]);
    expect(revealedTracks(Number.NaN, trackPositions(0))).toBe(0);
  });

  it('reveals a stamp only after Percy has rolled past it', () => {
    const positions = trackPositions(0);
    expect(revealedTracks(0, positions)).toBe(0);
    expect(revealedTracks(positions[0] + 31, positions)).toBe(1);
    expect(revealedTracks(positions[0] + 29, positions)).toBe(0);
    expect(revealedTracks(1e6, positions)).toBe(TRACK_COUNT);
  });

  it('writes into the same array and reports change only when it changes', () => {
    const opacity = new Float32Array(TRACK_COUNT);
    expect(updateTrackOpacity(opacity, 0)).toBe(false);
    expect(updateTrackOpacity(opacity, 3)).toBe(true);
    expect(opacity.slice(0, 3).every((value) => value > 0)).toBe(true);
    expect(opacity[3]).toBe(0);
    expect(updateTrackOpacity(opacity, 3)).toBe(false);
    expect(opacity).toHaveLength(TRACK_COUNT);
  });
});
