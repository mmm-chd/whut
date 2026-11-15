import { useDialogueStore } from '../components/dialogue/dialogue.store';
import { P08_SCENE_ID } from '../scenes/scene-09-waiting-sample/scene.config';
import { useStoryStore } from '../stores/story.store';
import { useExperienceStore } from './experience.store';

/**
 * What the two end-screen buttons do.
 *
 * The ending has already been torn down by the time they are visible, so
 * neither action goes through a scene controller: `replay-story` starts P-01
 * from its own title gate, and `back-to-start` returns to the launchpad. Both
 * keep the reader's settings (mute, volume, reduced motion), and both refuse to
 * run unless the story really is finished on the ending, so a stale click can
 * never restart or redirect a scene that is already running.
 */
export type EndingAction = 'replay-story' | 'back-to-start';

export function performEndingAction(action: EndingAction): boolean {
  if (action !== 'replay-story' && action !== 'back-to-start') {
    return false;
  }
  const story = useStoryStore.getState();
  const experience = useExperienceStore.getState();
  if (experience.stage !== 'story' || story.status !== 'completed' || story.activeSceneId !== P08_SCENE_ID) {
    return false;
  }

  // Residual captions of the old run are cleared; the scene's own driver is gone.
  useDialogueStore.getState().clear();

  if (action === 'back-to-start') {
    // Leave the story stage first, so clearing the story cannot briefly remount the ending.
    experience.setStage('homepage');
    story.resetStory();
    return true;
  }

  // A clean story state is P-01's pristine start: with no active scene the shell
  // shows P-01 at its title gate, exactly as on first entry, and the gate starts
  // the scene itself. Starting P-01 from here would skip that gate while its
  // opening still waits on it.
  story.resetStory();
  return true;
}
