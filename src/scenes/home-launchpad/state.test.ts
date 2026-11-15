import { describe, expect, it } from 'vitest';
import { canStartLaunch } from './state';

describe('launch gate', () => {
  it('accepts Play only from the idle phase', () => {
    expect(canStartLaunch({ phase: 'idle', launched: false })).toBe(true);
    expect(canStartLaunch({ phase: 'ignition', launched: true })).toBe(false);
    expect(canStartLaunch({ phase: 'ignition', launched: true })).toBe(false);
    expect(canStartLaunch({ phase: 'liftoff', launched: true })).toBe(false);
    expect(canStartLaunch({ phase: 'exit', launched: true })).toBe(false);
    expect(canStartLaunch({ phase: 'done', launched: true })).toBe(false);
  });

  it('rejects a second launch', () => {
    expect(canStartLaunch({ phase: 'idle', launched: true })).toBe(false);
  });
});
