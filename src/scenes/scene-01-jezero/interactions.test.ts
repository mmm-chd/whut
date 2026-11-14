import { describe, expect, it } from 'vitest';
import { interactions, getInteractionForRock } from './interactions';

describe('interactions data', () => {
  it('maps three rocks to FAKTA-2/3/4', () => {
    expect(interactions).toHaveLength(3);

    const byId = new Map(interactions.map((i) => [i.id, i]));
    expect(byId.has('rock-a')).toBe(true);
    expect(byId.has('rock-b')).toBe(true);
    expect(byId.has('rock-c')).toBe(true);

    expect(byId.get('rock-a')?.factId).toBe('FAKTA-2');
    expect(byId.get('rock-b')?.factId).toBe('FAKTA-3');
    expect(byId.get('rock-c')?.factId).toBe('FAKTA-4');
  });

  it('getInteractionForRock returns the right card', () => {
    expect(getInteractionForRock('rock-a')?.title).toContain('Volcanic rock');
    expect(getInteractionForRock('rock-b')?.title).toContain('water');
    expect(getInteractionForRock('rock-c')?.title).toContain('mission');
    expect(getInteractionForRock('rock-a')?.rockId).toBe('rock-a');
  });

  it('id is stable across repeated lookups', () => {
    const first = getInteractionForRock('rock-b');
    const second = getInteractionForRock('rock-b');
    expect(first?.id).toBe(second?.id);
  });
});
