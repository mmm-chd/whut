import { describe, expect, it } from 'vitest';
import { canContinue } from './selectors';

const requiredInteractions = ['rock-a', 'rock-b', 'rock-c'];

describe('canContinue', () => {
  it('is false while playing even when all interactions are complete', () => {
    expect(
      canContinue({
        status: 'playing',
        requiredInteractions,
        completedInteractions: requiredInteractions,
      }),
    ).toBe(false);
  });

  it('is false while waiting until every required interaction is complete', () => {
    expect(
      canContinue({
        status: 'waiting',
        requiredInteractions,
        completedInteractions: ['rock-a', 'rock-b'],
      }),
    ).toBe(false);
  });

  it('is true when waiting and every required interaction is complete', () => {
    expect(
      canContinue({
        status: 'waiting',
        requiredInteractions,
        completedInteractions: ['rock-c', 'rock-a', 'rock-b'],
      }),
    ).toBe(true);
  });

  it('is false when completed', () => {
    expect(
      canContinue({
        status: 'completed',
        requiredInteractions,
        completedInteractions: requiredInteractions,
      }),
    ).toBe(false);
  });
});
