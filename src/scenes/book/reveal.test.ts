import { describe, expect, it } from 'vitest';
import { nextRevealPhase, REVEAL_TIMING, revealDelay } from './reveal';

describe('book reveal', () => {
  it('walks arriving -> opening -> ready', () => {
    expect(nextRevealPhase('arriving')).toBe('opening');
    expect(nextRevealPhase('opening')).toBe('ready');
    expect(nextRevealPhase('ready')).toBeNull();
  });

  it('opens the cover before the journal is ready', () => {
    expect(REVEAL_TIMING.openAt).toBeGreaterThan(0);
    expect(REVEAL_TIMING.readyAt).toBeGreaterThan(REVEAL_TIMING.openAt);
    expect(revealDelay('arriving')).toBe(REVEAL_TIMING.openAt);
    expect(revealDelay('opening')).toBe(REVEAL_TIMING.readyAt - REVEAL_TIMING.openAt);
    expect(revealDelay('ready')).toBe(0);
  });
});
