import { beforeEach, describe, expect, it } from 'vitest';
import { useDialogueStore } from '../components/dialogue/dialogue.store';
import { useStoryStore } from '../stores/story.store';
import { useExperienceStore } from './experience.store';
import { performEndingAction } from './storyEnding';

const settings = { muted: true, volume: 0.35, reducedMotion: true };

function finishEnding() {
  useExperienceStore.setState({ stage: 'story' });
  useStoryStore.setState({
    activeSceneId: 'scene-09-waiting-sample',
    status: 'completed',
    isPaused: false,
    completedInteractions: ['p08-samples-continued'],
    settings,
  });
}

describe('performEndingAction', () => {
  beforeEach(() => {
    useDialogueStore.getState().clear();
  });

  it('replays the whole story from P-01\'s own start and keeps the reader\'s settings', () => {
    finishEnding();
    expect(performEndingAction('replay-story')).toBe(true);
    const story = useStoryStore.getState();
    // No active scene: the shell shows P-01 at its title gate, as on first entry.
    expect(story.activeSceneId).toBeNull();
    expect(story.status).toBe('idle');
    expect(story.completedInteractions).toEqual([]);
    expect(story.settings).toEqual(settings);
    expect(useExperienceStore.getState().stage).toBe('story');
    // A stale second click does nothing.
    expect(performEndingAction('replay-story')).toBe(false);
    expect(performEndingAction('back-to-start')).toBe(false);
  });

  it('goes back to the launchpad before it clears the story', () => {
    finishEnding();
    const order: string[] = [];
    const unsubscribeStage = useExperienceStore.subscribe((state) => order.push(`stage:${state.stage}`));
    const unsubscribeStory = useStoryStore.subscribe((state) => order.push(`story:${state.activeSceneId}`));
    expect(performEndingAction('back-to-start')).toBe(true);
    unsubscribeStage();
    unsubscribeStory();
    expect(order).toEqual(['stage:homepage', 'story:null']);
    expect(useStoryStore.getState().settings).toEqual(settings);
  });

  it('refuses unless the story is finished on the ending', () => {
    useExperienceStore.setState({ stage: 'story' });
    for (const [scene, status] of [
      ['scene-08-the-runner', 'completed'],
      ['scene-09-waiting-sample', 'playing'],
      ['scene-09-waiting-sample', 'waiting'],
      [null, 'idle'],
    ] as const) {
      useStoryStore.setState({ activeSceneId: scene, status, settings });
      expect(performEndingAction('replay-story')).toBe(false);
      expect(useStoryStore.getState().activeSceneId).toBe(scene);
    }
    finishEnding();
    useExperienceStore.setState({ stage: 'homepage' });
    expect(performEndingAction('back-to-start')).toBe(false);
  });

  it('rejects an unknown action', () => {
    finishEnding();
    expect(performEndingAction('anything' as never)).toBe(false);
    expect(useStoryStore.getState().status).toBe('completed');
  });

  it('clears leftover captions', () => {
    finishEnding();
    useDialogueStore.getState().cue({
      id: 'left-over',
      speaker: 'narrator',
      text: 'x',
      audioId: null,
      timelineLabel: 'x',
      placement: 'bottom',
      advance: 'manual',
      emphasis: false,
    });
    performEndingAction('replay-story');
    expect(useDialogueStore.getState().active).toBeNull();
  });
});
