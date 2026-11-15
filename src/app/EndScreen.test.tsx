import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useStoryStore } from '../stores/story.store';
import { EndScreen } from './EndScreen';
import { useExperienceStore } from './experience.store';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

async function show(sceneId: string | null, extra: { stage?: 'story' | 'homepage' } = {}) {
  useExperienceStore.setState({ stage: extra.stage ?? 'story' });
  useStoryStore.setState({
    activeSceneId: sceneId,
    status: 'completed',
    isPaused: false,
    completedInteractions: [],
    settings: { muted: true, volume: 0.5, reducedMotion: true },
  });
  await act(async () => {
    root.render(<EndScreen />);
  });
}

const button = (action: string) => container.querySelector<HTMLButtonElement>(`[data-action="${action}"]`);

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
});

describe('EndScreen', () => {
  it('shows the ending card with two actions and the honest copy', async () => {
    await show('scene-09-waiting-sample');
    expect(container.querySelector('[data-end-variant="perseverance-ending"]')).not.toBeNull();
    expect(container.textContent).toContain('The journey continues');
    expect(container.textContent).toMatch(/waiting for a way home/u);
    expect(container.textContent).not.toMatch(/mission accomplished|congratulations|on their way to Mars/iu);
    expect(container.querySelectorAll('button')).toHaveLength(2);
    expect(button('replay-story')?.textContent).toBe('Replay Story');
    expect(button('back-to-start')?.textContent).toBe('Back to Start');
  });

  it('focuses the heading once, with the buttons in normal tab order', async () => {
    await show('scene-09-waiting-sample');
    expect(document.activeElement?.tagName).toBe('H2');
    expect(button('replay-story')?.tabIndex).toBe(0);
  });

  it('Replay Story clears the story, keeps settings, and cannot be clicked twice', async () => {
    await show('scene-09-waiting-sample');
    const replay = button('replay-story')!;
    await act(async () => {
      replay.click();
      replay.click();
    });
    const story = useStoryStore.getState();
    expect(story.activeSceneId).toBeNull();
    expect(story.settings).toEqual({ muted: true, volume: 0.5, reducedMotion: true });
    // With no active scene the ending card gives way to the shell, so its buttons are gone
    // (or, at worst, still disabled): there is never a second live click.
    expect(button('replay-story')?.disabled ?? true).toBe(true);
    expect(button('back-to-start')?.disabled ?? true).toBe(true);
  });

  it('Back to Start returns to the launchpad', async () => {
    await show('scene-09-waiting-sample');
    await act(async () => {
      button('back-to-start')?.click();
    });
    expect(useExperienceStore.getState().stage).toBe('homepage');
    expect(useStoryStore.getState().activeSceneId).toBeNull();
  });

  it('re-enables the buttons when the action is refused', async () => {
    await show('scene-09-waiting-sample');
    // The story moved on underneath: the stale click is refused and the card stays usable.
    useStoryStore.setState({ status: 'playing' });
    await act(async () => {
      button('replay-story')?.click();
    });
    expect(button('replay-story')?.disabled).toBe(false);
    expect(useStoryStore.getState().activeSceneId).toBe('scene-09-waiting-sample');
  });

  it('keeps the earlier preview copy for the earlier terminal scenes', async () => {
    await show('scene-06-sample-workflow');
    expect(container.textContent).toContain('To be continued');
    expect(container.querySelectorAll('button')).toHaveLength(0);
    await show(null);
    expect(container.textContent).toContain('on their way to Mars');
  });
});
