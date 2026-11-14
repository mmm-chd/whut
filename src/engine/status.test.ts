import { describe, expect, it } from 'vitest';
import { assertTransition, canTransition } from './status';

describe('scene status transitions', () => {
  it('allows the normal lifecycle', () => {
    expect(canTransition('idle', 'playing')).toBe(true);
    expect(canTransition('playing', 'waiting')).toBe(true);
    expect(canTransition('waiting', 'completed')).toBe(true);
  });

  it('allows a reset to idle from active states', () => {
    expect(canTransition('playing', 'idle')).toBe(true);
    expect(canTransition('waiting', 'idle')).toBe(true);
    expect(canTransition('completed', 'idle')).toBe(true);
  });

  it('rejects skipping the lifecycle', () => {
    expect(canTransition('idle', 'waiting')).toBe(false);
    expect(canTransition('idle', 'completed')).toBe(false);
    expect(canTransition('playing', 'completed')).toBe(false);
  });

  it('throws on an invalid transition', () => {
    expect(() => assertTransition('idle', 'completed')).toThrow(
      'Invalid scene status transition: idle -> completed',
    );
  });
});
