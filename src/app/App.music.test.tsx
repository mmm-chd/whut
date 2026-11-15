import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioManager } from '../audio/audioManager';
import { resetAudioManager } from '../audio/audioManagerInstance';
import { MENU_SCORE_ID } from '../audio/useMenuScore';
import { STORY_SCORE_ID } from '../audio/useStoryScore';
import { useExperienceStore } from './experience.store';
import { useStoryStore } from '../stores/story.store';
import { App } from './App';

/**
 * Which bed plays where: `music-main` for the splash, the launchpad and the
 * character journal; `music-perseverance` for the story scenes only.
 */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function resetStores() {
  useExperienceStore.setState({ stage: 'homepage' });
  useStoryStore.setState({
    activeSceneId: null,
    status: 'idle',
    completedInteractions: [],
    isPaused: false,
  });
}

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

beforeEach(() => {
  window.history.replaceState({}, '', '/');
  resetStores();
  resetAudioManager();
  vi.spyOn(AudioManager.prototype, 'playMusic').mockReturnValue(true);
  vi.spyOn(AudioManager.prototype, 'stop');
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('score per page', () => {
  it('plays the menu bed on the homepage', async () => {
    const app = renderApp();
    await app.render();

    expect(AudioManager.prototype.playMusic).toHaveBeenCalledTimes(1);
    expect(AudioManager.prototype.playMusic).toHaveBeenCalledWith(MENU_SCORE_ID);

    await app.unmount();
  });

  it('keeps the same menu bed on the character journal', async () => {
    useExperienceStore.setState({ stage: 'book' });
    const app = renderApp();
    await app.render();

    expect(AudioManager.prototype.playMusic).toHaveBeenCalledTimes(1);
    expect(AudioManager.prototype.playMusic).toHaveBeenCalledWith(MENU_SCORE_ID);

    // The journal is not the story: no perseverance score here.
    expect(AudioManager.prototype.playMusic).not.toHaveBeenCalledWith(STORY_SCORE_ID);

    await app.unmount();
  });

  it('swaps to the story bed when the story starts', async () => {
    const app = renderApp();
    await app.render();

    await act(async () => {
      useExperienceStore.setState({ stage: 'story' });
    });

    // The menu bed stops, and the story bed waits for Continue on the title card.
    expect(AudioManager.prototype.stop).toHaveBeenCalledWith(MENU_SCORE_ID);
    expect(AudioManager.prototype.playMusic).not.toHaveBeenCalledWith(STORY_SCORE_ID);

    await act(async () => {
      useStoryStore.getState().startScene('p01-jezero');
    });
    expect(AudioManager.prototype.playMusic).toHaveBeenLastCalledWith(STORY_SCORE_ID);

    await app.unmount();
  });

  it('returns to the menu bed when the reader leaves the story', async () => {
    useExperienceStore.setState({ stage: 'story' });
    useStoryStore.setState({ activeSceneId: 'p01-jezero', status: 'playing' });
    const app = renderApp();
    await app.render();
    expect(AudioManager.prototype.playMusic).toHaveBeenLastCalledWith(STORY_SCORE_ID);

    await act(async () => {
      useExperienceStore.setState({ stage: 'book' });
    });

    expect(AudioManager.prototype.playMusic).toHaveBeenLastCalledWith(MENU_SCORE_ID);

    await app.unmount();
  });
});
