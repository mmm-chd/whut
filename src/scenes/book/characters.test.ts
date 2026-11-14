import { describe, expect, it } from 'vitest';
import { characterSpreads, getSpread, spreadTitle } from './characters';

describe('character spreads', () => {
  it('has one spread per explorer', () => {
    expect(characterSpreads.map((spread) => spread.id)).toEqual(['percy', 'ginny']);
  });

  it('fills every field the pages render', () => {
    for (const spread of characterSpreads) {
      expect(spread.name.length).toBeGreaterThan(0);
      expect(spread.tab.length).toBeGreaterThan(0);
      expect(spread.headline.length).toBeGreaterThan(0);
      expect(spread.intro.length).toBeGreaterThan(0);
      expect(spread.facts.length).toBeGreaterThanOrEqual(3);
      expect(spread.facts.every((fact) => fact.label.length > 0 && fact.value.length > 0)).toBe(
        true,
      );
      expect(spread.quote.length).toBeGreaterThan(0);
      expect(spread.sticky.length).toBeGreaterThan(0);
      expect(spread.discover.length).toBeGreaterThan(0);
      expect(spread.portrait).toMatch(/\.png/);
      expect(spread.model).toMatch(/\.glb/);
    }
  });

  it('keeps inspector hotspots inside the viewer and unique', () => {
    const ids = new Set<string>();
    for (const spread of characterSpreads) {
      expect(spread.nodes.length).toBeGreaterThanOrEqual(4);
      for (const node of spread.nodes) {
        expect(node.x).toBeGreaterThanOrEqual(0);
        expect(node.x).toBeLessThanOrEqual(100);
        expect(node.y).toBeGreaterThanOrEqual(0);
        expect(node.y).toBeLessThanOrEqual(100);
        expect(node.label.length).toBeGreaterThan(0);
        expect(node.title.length).toBeGreaterThan(0);
        expect(node.body.length).toBeGreaterThan(0);
        expect(ids.has(node.id)).toBe(false);
        ids.add(node.id);
      }
    }
  });

  it('only Percy has a story to start yet', () => {
    expect(
      characterSpreads.filter((spread) => spread.storyReady).map((spread) => spread.id),
    ).toEqual(['percy']);
  });

  it('clamps spread lookups and titles them', () => {
    expect(getSpread(-3).id).toBe('percy');
    expect(getSpread(0).id).toBe('percy');
    expect(getSpread(99).id).toBe('ginny');
    expect(spreadTitle(getSpread(0))).toBe('Percy, The Mars Rover');
  });
});
