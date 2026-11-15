import { describe, expect, it } from 'vitest';
import { stageReady } from './WebGLStage';

/**
 * The stage must never reveal a mis-sized picture: a new `<canvas>` is
 * 300 x 150 until the first measurement, and that window is visible on a warm
 * cache where textures are uploaded first.
 */
describe('stageReady', () => {
  it('waits for the textures', () => {
    expect(stageReady(false, 1280, 720)).toBe(false);
  });

  it('waits for a real measurement', () => {
    expect(stageReady(true, 0, 0)).toBe(false);
    expect(stageReady(true, 1280, 720)).toBe(true);
    // A small host is still a real host: only a degenerate size is refused.
    expect(stageReady(true, 300, 150)).toBe(true);
  });

  it('refuses a degenerate size even when the textures are up', () => {
    expect(stageReady(true, 1, 720)).toBe(false);
    expect(stageReady(true, 1280, 1)).toBe(false);
    expect(stageReady(true, 2, 2)).toBe(true);
  });
});
