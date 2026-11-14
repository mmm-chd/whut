/**
 * The ordered scene graph for this story segment. Values are intentionally
 * fixed: P-01 hands off to P-02, P-02 hands off to the cruise entry, and the
 * cruise entry has no outgoing edge.
 */
export type StorySceneId = 'p01-jezero' | 'scene-02-launch-to-mars' | 'filler-scene-01-cruise';

const NEXT_SCENE: Record<StorySceneId, StorySceneId | null> = {
  'p01-jezero': 'scene-02-launch-to-mars',
  'scene-02-launch-to-mars': 'filler-scene-01-cruise',
  'filler-scene-01-cruise': null,
};

const STORY_SCENE_IDS = Object.keys(NEXT_SCENE) as StorySceneId[];

export function getNextSceneId(id: StorySceneId): StorySceneId | null {
  return NEXT_SCENE[id];
}

/** Narrows a live store value before it indexes the render map. */
export function narrowStorySceneId(id: string | null | undefined): StorySceneId | null {
  if (!id) {
    return null;
  }
  return STORY_SCENE_IDS.includes(id as StorySceneId) ? (id as StorySceneId) : null;
}
