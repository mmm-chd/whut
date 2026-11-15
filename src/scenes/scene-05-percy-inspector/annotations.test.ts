import { describe, expect, it } from 'vitest';
import { chipAnchor, chipState, leaderFor, CHIP_STANDOFF_PX, LEADER_MIN_PX } from './annotations';

const CENTRE = { x: 450, y: 260 };

describe('chipAnchor', () => {
  it('floats the chip outward from the centre, through the part', () => {
    const anchor = chipAnchor({ x: 600, y: 260 }, CENTRE);
    expect(anchor.y).toBeCloseTo(260, 6);
    expect(anchor.x).toBeCloseTo(600 + CHIP_STANDOFF_PX, 6);
    expect(anchor.side).toBe('right');
  });

  it('keeps the same standoff in every direction', () => {
    for (const part of [
      { x: 300, y: 260 },
      { x: 450, y: 120 },
      { x: 450, y: 400 },
      { x: 560, y: 350 },
    ]) {
      const anchor = chipAnchor(part, CENTRE);
      const toPart = Math.hypot(part.x - CENTRE.x, part.y - CENTRE.y);
      const toAnchor = Math.hypot(anchor.x - CENTRE.x, anchor.y - CENTRE.y);
      expect(toAnchor - toPart).toBeCloseTo(CHIP_STANDOFF_PX, 6);
    }
  });

  it('marks the side the chip leans towards', () => {
    expect(chipAnchor({ x: 300, y: 260 }, CENTRE).side).toBe('left');
    expect(chipAnchor({ x: 450, y: 120 }, CENTRE).side).toBe('right');
  });

  it('never stacks a chip on the centre when the part sits there', () => {
    const anchor = chipAnchor(CENTRE, CENTRE);
    expect(anchor.y).toBeCloseTo(CENTRE.y - CHIP_STANDOFF_PX, 6);
    expect(anchor.x).toBeCloseTo(CENTRE.x, 6);
  });

  it('survives a broken measurement instead of drawing NaN', () => {
    const anchor = chipAnchor({ x: Number.NaN, y: 260 }, CENTRE);
    expect(Number.isFinite(anchor.x)).toBe(true);
    expect(Number.isFinite(anchor.y)).toBe(true);
    expect(chipAnchor({ x: 600, y: 260 }, CENTRE, Number.NaN).x).toBeGreaterThan(CENTRE.x);
  });
});

describe('leaderFor', () => {
  it('draws from the chip to the part', () => {
    const leader = leaderFor({ x: 700, y: 260 }, { x: 600, y: 260 });
    expect(leader.visible).toBe(true);
    expect(leader.length).toBeCloseTo(100, 6);
    expect(leader.from).toEqual({ x: 700, y: 260 });
    expect(leader.to).toEqual({ x: 600, y: 260 });
  });

  it('refuses a leader too short to read', () => {
    expect(leaderFor({ x: 600, y: 260 }, { x: 601, y: 260 }).visible).toBe(false);
    expect(leaderFor({ x: 600, y: 260 }, { x: 600 + LEADER_MIN_PX, y: 260 }).visible).toBe(true);
  });
});

describe('chipState', () => {
  const base = {
    point: 'cameras' as const,
    active: null,
    hovered: null,
    completed: [] as const,
    occluded: [] as const,
  };

  it('reports idle, hover, active and done', () => {
    expect(chipState(base)).toBe('idle');
    expect(chipState({ ...base, hovered: 'cameras' })).toBe('hover');
    expect(chipState({ ...base, active: 'cameras' })).toBe('active');
    expect(chipState({ ...base, completed: ['cameras'] })).toBe('done');
  });

  it('lets active outrank hover and done', () => {
    expect(chipState({ ...base, active: 'cameras', hovered: 'cameras', completed: ['cameras'] })).toBe(
      'active',
    );
  });

  it('hides a part turned away, whatever else is true', () => {
    expect(chipState({ ...base, active: 'cameras', occluded: ['cameras'] })).toBe('hidden');
  });

  it('leaves the other chips alone', () => {
    expect(chipState({ ...base, active: 'moxie', completed: ['moxie'] })).toBe('idle');
  });
});
