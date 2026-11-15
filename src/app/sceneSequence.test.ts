import { describe, expect, it } from 'vitest';
import { getNextSceneId, narrowStorySceneId } from './sceneSequence';

describe('sceneSequence', () => {
  it('maps exactly P-01 -> P-02 -> cruise -> P-03', () => {
    expect(getNextSceneId('p01-jezero')).toBe('scene-02-launch-to-mars');
    expect(getNextSceneId('scene-02-launch-to-mars')).toBe('filler-scene-01-cruise');
    expect(getNextSceneId('filler-scene-01-cruise')).toBe('scene-03-arrival-jezero');
  });

  it('hands P-03 off to the P-04 inspection', () => {
    expect(getNextSceneId('scene-03-arrival-jezero')).toBe('scene-04-percy-inspection');
  });

  it('hands the close-up P-05 on from P-04', () => {
    expect(getNextSceneId('scene-04-percy-inspection')).toBe('scene-05-percy-inspector');
  });

  it('has no outgoing edge from the last scene', () => {
    expect(getNextSceneId('scene-05-percy-inspector')).toBe('scene-06-sample-workflow');
    expect(getNextSceneId('scene-06-sample-workflow')).toBeNull();
    expect(getNextSceneId('scene-08-the-runner')).toBeNull();
  });

  it('rejects unknown store IDs before render-map lookup', () => {
    expect(narrowStorySceneId('p01-jezero')).toBe('p01-jezero');
    expect(narrowStorySceneId('scene-02-launch-to-mars')).toBe('scene-02-launch-to-mars');
    expect(narrowStorySceneId('filler-scene-01-cruise')).toBe('filler-scene-01-cruise');
    expect(narrowStorySceneId('scene-03-arrival-jezero')).toBe('scene-03-arrival-jezero');
    expect(narrowStorySceneId('scene-04-percy-inspection')).toBe('scene-04-percy-inspection');
    expect(narrowStorySceneId('scene-99-unknown')).toBeNull();
    expect(narrowStorySceneId(null)).toBeNull();
    expect(narrowStorySceneId(undefined)).toBeNull();
  });
});
