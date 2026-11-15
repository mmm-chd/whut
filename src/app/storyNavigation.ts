import { useDialogueStore } from '../components/dialogue/dialogue.store';
import { useStoryStore } from '../stores/story.store';
import { useExperienceStore } from './experience.store';
import { listStorySceneIds, type StorySceneId } from './sceneSequence';

/** Names a child can read in the pause menu's scene list. */
const SCENE_LABELS: Record<StorySceneId, string> = {
  'p01-jezero': 'Jezero Crater',
  'scene-02-launch-to-mars': 'Launch to Mars',
  'filler-scene-01-cruise': 'The long trip',
  'scene-03-arrival-jezero': 'Arriving at Jezero',
  'scene-04-percy-inspection': 'Meet Percy up close',
  'scene-05-percy-inspector': 'Percy in 3D',
  'scene-06-sample-workflow': 'Collecting samples',
  'scene-07-cheyava-falls': 'Cheyava Falls',
  'scene-08-the-runner': 'The Runner',
  'scene-09-waiting-sample': 'The Waiting Sample',
};

export interface SceneChoice {
  readonly id: StorySceneId;
  readonly label: string;
}

export function listSceneChoices(): SceneChoice[] {
  return listStorySceneIds().map((id) => ({ id, label: SCENE_LABELS[id] }));
}

/** Back to the launchpad. The story is forgotten; the reader's settings are kept. */
export function leaveToMainMenu(): void {
  useDialogueStore.getState().clear();
  useExperienceStore.getState().setStage('homepage');
  useStoryStore.getState().resetStory();
}

/**
 * Jump to the start of a scene. P-01 goes back to its own title card (no active
 * scene), every other scene starts playing, exactly as the shell would start it.
 */
export function jumpToScene(id: StorySceneId): void {
  useDialogueStore.getState().clear();
  const story = useStoryStore.getState();
  if (id === 'p01-jezero') {
    story.resetStory();
    return;
  }
  story.resetScene();
  story.startScene(id);
}
