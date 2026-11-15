import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useExperienceStore } from './experience.store';
import { useStoryStore } from '../stores/story.store';
import { applyBootRoute } from './useStageUrl';
import { App } from './App';

/**
 * Stage <-> URL sync: every stage change pushes its path, and Back/Forward
 * mounts the stage the address points at.
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

async function renderAt(pathname: string) {
  window.history.replaceState({}, '', pathname);
  applyBootRoute(pathname);
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(<App />);
  });
  return {
    container,
    unmount: async () => {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    },
  };
}

beforeEach(resetStores);

afterEach(() => {
  document.body.innerHTML = '';
  window.history.replaceState({}, '', '/');
});

describe('boot from the address bar', () => {
  it('plays the splash on /', async () => {
    const app = await renderAt('/');
    expect(useExperienceStore.getState().stage).toBe('splash');
    expect(window.location.pathname).toBe('/');
    await app.unmount();
  });

  it('opens the journal straight away on /characters', async () => {
    const app = await renderAt('/characters');
    expect(useExperienceStore.getState().stage).toBe('book');
    expect(app.container.querySelector('[data-scene="book"]')).not.toBeNull();
    expect(app.container.textContent).toContain('Select your explorer');
    expect(window.location.pathname).toBe('/characters');
    await app.unmount();
  });

  it('rewrites a non-canonical path without adding history', async () => {
    const app = await renderAt('/characters/');
    expect(window.location.pathname).toBe('/characters');
    expect(useExperienceStore.getState().stage).toBe('book');
    await app.unmount();
  });
});

describe('stage changes write the address', () => {
  it('pushes /characters when the launch hands over to the journal', async () => {
    const app = await renderAt('/');
    await act(async () => {
      useExperienceStore.setState({ stage: 'book' });
    });
    expect(window.location.pathname).toBe('/characters');
    expect(app.container.querySelector('[data-scene="book"]')).not.toBeNull();
    await app.unmount();
  });

  it('pushes /story when the journal starts the story', async () => {
    const app = await renderAt('/characters');
    await act(async () => {
      useExperienceStore.setState({ stage: 'story' });
    });
    expect(window.location.pathname).toBe('/story');
    await app.unmount();
  });

  it('keeps "/" for both the splash and the homepage', async () => {
    const app = await renderAt('/');
    await act(async () => {
      useExperienceStore.setState({ stage: 'homepage' });
    });
    expect(window.location.pathname).toBe('/');
    await app.unmount();
  });
});

describe('back and forward', () => {
  it('mounts the stage the address points at', async () => {
    const app = await renderAt('/characters');

    // Browser Back lands on the homepage, without replaying the splash.
    window.history.replaceState({}, '', '/');
    await act(async () => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(useExperienceStore.getState().stage).toBe('homepage');
    expect(app.container.querySelector('[data-scene="home-launchpad"]')).not.toBeNull();

    // Forward again: the journal is back, and so is its path.
    window.history.replaceState({}, '', '/characters');
    await act(async () => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(useExperienceStore.getState().stage).toBe('book');

    await app.unmount();
  });
});
