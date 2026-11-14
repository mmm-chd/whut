import { describe, expect, it } from 'vitest';
import { getNextSceneId, narrowStorySceneId } from './sceneSequence';

describe('sceneSequence', () => {
  it('maps exactly P-01 -> P-02 -> cruise', () => {
    expect(getNextSceneId('p01-jezero')).toBe('scene-02-launch-to-mars');
    expect(getNextSceneId('scene-02-launch-to-mars')).toBe('filler-scene-01-cruise');
  });

  it('has no outgoing edge from the cruise entry', () => {
    expect(getNextSceneId('filler-scene-01-cruise')).toBeNull();
  });

  it('rejects unknown store IDs before render-map lookup', () => {
    expect(narrowStorySceneId('p01-jezero')).toBe('p01-jezero');
    expect(narrowStorySceneId('scene-02-launch-to-mars')).toBe('scene-02-launch-to-mars');
    expect(narrowStorySceneId('filler-scene-01-cruise')).toBe('filler-scene-01-cruise');
    expect(narrowStorySceneId('scene-99-unknown')).toBeNull();
    expect(narrowStorySceneId(null)).toBeNull();
    expect(narrowStorySceneId(undefined)).toBeNull();
  });
});
