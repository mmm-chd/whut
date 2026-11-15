/**
 * The ordered scene graph for this story segment. Values are intentionally
 * fixed: P-01 hands off to P-02, P-02 hands off to the cruise entry, the cruise
 * hands off to P-03, P-03 hands off to the P-04 story, and P-04 hands Percy to
 * the close-up, which owns the only inspector canvas. The close-up hands off to
 * the sampling game (story P-05), which hands off to the Cheyava Falls chapter.
 */
export type StorySceneId =
  | 'p01-jezero'
  | 'scene-02-launch-to-mars'
  | 'filler-scene-01-cruise'
  | 'scene-03-arrival-jezero'
  | 'scene-04-percy-inspection'
  | 'scene-05-percy-inspector'
  | 'scene-06-sample-workflow'
  | 'scene-07-cheyava-falls'
  | 'scene-08-the-runner';

const NEXT_SCENE: Record<StorySceneId, StorySceneId | null> = {
  'p01-jezero': 'scene-02-launch-to-mars',
  'scene-02-launch-to-mars': 'filler-scene-01-cruise',
  'filler-scene-01-cruise': 'scene-03-arrival-jezero',
  'scene-03-arrival-jezero': 'scene-04-percy-inspection',
  'scene-04-percy-inspection': 'scene-05-percy-inspector',
  'scene-05-percy-inspector': 'scene-06-sample-workflow',
  'scene-06-sample-workflow': 'scene-07-cheyava-falls',
  'scene-07-cheyava-falls': 'scene-08-the-runner',
  'scene-08-the-runner': null,
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
