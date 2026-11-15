import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useExperienceStore } from './experience.store';
import { useStoryStore } from '../stores/story.store';
import { AudioManager } from '../audio/audioManager';
import { resetAudioManager } from '../audio/audioManagerInstance';
import { STORY_SCORE_ID } from '../audio/useStoryScore';
import { App } from './App';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const DEFAULT_SETTINGS = { muted: false, volume: 0.8, reducedMotion: false };

function resetStore() {
  useExperienceStore.setState({ stage: 'story' });
  useStoryStore.setState({
    activeSceneId: 'p01-jezero',
    status: 'waiting',
    completedInteractions: ['rock-a', 'rock-b', 'rock-c'],
    isPaused: false,
    settings: DEFAULT_SETTINGS,
  });
}

beforeEach(resetStore);

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

function renderApp() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  return {
    container,
    render: async () => {
      await act(async () => {
        root.render(<App />);
      });
    },
    unmount: async () => {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('StorySequence', () => {
  it('hands completed P-01 to P-02 without losing settings and skips EndScreen', async () => {
    vi.useFakeTimers();
    const settings = { muted: true, volume: 0.35, reducedMotion: false };
    useStoryStore.setState({ settings });

    const app = renderApp();
    await app.render();

    expect(app.container.querySelector('[data-scene="p01-jezero"]')).not.toBeNull();

    await act(async () => {
      useStoryStore.getState().setStatus('completed');
    });

    // The outgoing scene stays mounted while the cover fades to black.
    expect(app.container.querySelector('[data-scene="p01-jezero"]')).not.toBeNull();
    expect(app.container.querySelector('.end-screen')).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(useStoryStore.getState().activeSceneId).toBe('scene-02-launch-to-mars');
    expect(useStoryStore.getState().status).toBe('playing');
    expect(useStoryStore.getState().settings).toEqual(settings);
    expect(app.container.querySelector('[data-scene="scene-02-launch-to-mars"]')).not.toBeNull();
    expect(app.container.querySelector('[data-scene="p01-jezero"]')).toBeNull();
    expect(app.container.querySelector('.end-screen')).toBeNull();

    await app.unmount();
  });

  it('keeps one looping score across the P-01 to P-02 handoff', async () => {
    // The score belongs to the story shell, not to a scene: the swap must not
    // restart the loop or stop the bed.
    vi.useFakeTimers();
    resetAudioManager();
    const playMusic = vi.spyOn(AudioManager.prototype, 'playMusic').mockReturnValue(true);
    const stop = vi.spyOn(AudioManager.prototype, 'stop');

    const app = renderApp();
    await app.render();

    expect(playMusic).toHaveBeenCalledTimes(1);
    expect(playMusic).toHaveBeenCalledWith(STORY_SCORE_ID);

    await act(async () => {
      useStoryStore.getState().setStatus('completed');
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(useStoryStore.getState().activeSceneId).toBe('scene-02-launch-to-mars');
    expect(playMusic).toHaveBeenCalledTimes(1);
    expect(stop).not.toHaveBeenCalledWith(STORY_SCORE_ID);

    await app.unmount();
    expect(stop).toHaveBeenCalledWith(STORY_SCORE_ID);
    vi.restoreAllMocks();
  });

  it('does not hand off while paused and rechecks on resume', async () => {
    vi.useFakeTimers();
    useStoryStore.setState({ isPaused: true });

    const app = renderApp();
    await app.render();

    await act(async () => {
      useStoryStore.getState().setStatus('completed');
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(useStoryStore.getState().activeSceneId).toBe('p01-jezero');
    expect(app.container.querySelector('[data-scene="p01-jezero"]')).not.toBeNull();

    await act(async () => {
      useStoryStore.getState().setPaused(false);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(useStoryStore.getState().activeSceneId).toBe('scene-02-launch-to-mars');

    await app.unmount();
  });

  it('swaps completed P-02 to the cruise entry without ending the story', async () => {
    vi.useFakeTimers();
    useStoryStore.setState({ activeSceneId: 'scene-02-launch-to-mars' });

    const app = renderApp();
    await app.render();

    expect(app.container.querySelector('[data-scene="scene-02-launch-to-mars"]')).not.toBeNull();

    await act(async () => {
      useStoryStore.getState().setStatus('completed');
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(useStoryStore.getState().activeSceneId).toBe('filler-scene-01-cruise');
    expect(useStoryStore.getState().status).toBe('playing');
    expect(app.container.querySelector('[data-scene="filler-scene-01-cruise"]')).not.toBeNull();
    expect(app.container.querySelector('.end-screen')).toBeNull();

    await app.unmount();
  });

  it('takes the reader from the cruise to P-03 through the scaffold Continue', async () => {
    vi.useFakeTimers();
    const settings = { muted: true, volume: 0.35, reducedMotion: false };
    useStoryStore.setState({
      activeSceneId: 'filler-scene-01-cruise',
      status: 'playing',
      completedInteractions: [],
      settings,
    });

    const trace: string[] = [];
    const unsubscribe = useStoryStore.subscribe((state, previous) => {
      if (state.status !== previous.status) {
        trace.push(`${previous.status}>${state.status}`);
      }
    });

    const app = renderApp();
    await app.render();
    expect(app.container.querySelector('[data-scene="filler-scene-01-cruise"]')).not.toBeNull();

    const button = app.container.querySelector<HTMLButtonElement>('.cruise-scene__continue');
    expect(button).not.toBeNull();
    await act(async () => {
      button?.click();
    });
    // The cover fades to black first; the cruise is still mounted under it.
    expect(app.container.querySelector('[data-scene="filler-scene-01-cruise"]')).not.toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    unsubscribe();

    expect(useStoryStore.getState().activeSceneId).toBe('scene-03-arrival-jezero');
    expect(useStoryStore.getState().status).toBe('playing');
    expect(useStoryStore.getState().settings).toEqual(settings);
    expect(app.container.querySelector('[data-scene="scene-03-arrival-jezero"]')).not.toBeNull();
    expect(app.container.querySelector('[data-scene="filler-scene-01-cruise"]')).toBeNull();
    expect(app.container.querySelector('.end-screen')).toBeNull();
    // playing > waiting > completed, then the legal reset and start.
    expect(trace).toEqual([
      'playing>waiting',
      'waiting>completed',
      'completed>idle',
      'idle>playing',
    ]);

    await app.unmount();
  });

  it('shows EndScreen only for terminal story completion', async () => {
    useStoryStore.setState({
      activeSceneId: 'scene-05-percy-inspector',
      status: 'completed',
    });

    const app = renderApp();
    await app.render();

    expect(app.container.querySelector('.end-screen')).not.toBeNull();
    expect(app.container.textContent).toContain('To be continued');
    expect(app.container.querySelector('[data-scene="scene-05-percy-inspector"]')).toBeNull();

    await app.unmount();
  });
});
