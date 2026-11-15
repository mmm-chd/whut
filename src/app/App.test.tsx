import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useExperienceStore } from './experience.store';
import { useStoryStore } from '../stores/story.store';
import { App } from './App';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function resetStore() {
  useExperienceStore.setState({ stage: 'story' });
  useStoryStore.setState({
    activeSceneId: null,
    status: 'idle',
    completedInteractions: [],
    isPaused: false,
  });
}

beforeEach(resetStore);

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

afterEach(() => {
  document.body.innerHTML = '';
});

describe('App end screen', () => {
  it('shows the P-01 scene when status is idle', async () => {
    const app = renderApp();
    await app.render();

    expect(app.container.querySelector('[data-scene="p01-jezero"]')).not.toBeNull();
    expect(app.container.querySelector('.stage')).not.toBeNull();

    await app.unmount();
  });

  it('shows the end screen only after the ending scene completes', async () => {
    useStoryStore.setState({
      activeSceneId: 'scene-09-waiting-sample',
      status: 'completed',
    });

    const app = renderApp();
    await app.render();

    expect(app.container.querySelector('[data-scene="p01-jezero"]')).toBeNull();
    expect(app.container.textContent).toContain('The journey continues');

    await app.unmount();
  });

  it('does not end the story when P-01 completes', async () => {
    useStoryStore.setState({ activeSceneId: 'p01-jezero', status: 'completed' });

    const app = renderApp();
    await app.render();

    expect(app.container.querySelector('.end-screen')).toBeNull();
    expect(app.container.querySelector('[data-scene="p01-jezero"]')).not.toBeNull();

    await app.unmount();
  });
});

describe('App splash and homepage stages', () => {
  it('mounts the launchpad behind the splash and crossfades after two frames', async () => {
    vi.useFakeTimers();
    useExperienceStore.setState({ stage: 'splash' });

    const app = renderApp();
    await app.render();

    // The homepage is already mounted (preloading) behind the overlay.
    expect(app.container.querySelector('[data-scene="home-launchpad"]')).not.toBeNull();
    expect(app.container.querySelector('.splash-overlay')).not.toBeNull();
    expect(app.container.textContent).toContain('What Happens Up There');

    // Frame 1 -> frame 2 (the AI note).
    await act(async () => {
      vi.advanceTimersByTime(3400);
    });
    expect(app.container.textContent).toContain('AI-assisted');

    // Frame 2 -> leaving (the crossfade).
    await act(async () => {
      vi.advanceTimersByTime(3400);
    });
    expect(app.container.querySelector('.splash-overlay')).not.toBeNull();
    expect(app.container.querySelector('.splash-overlay')?.getAttribute('data-leaving')).toBe(
      'true',
    );

    // Crossfade completes -> homepage.
    await act(async () => {
      vi.advanceTimersByTime(900);
    });
    expect(useExperienceStore.getState().stage).toBe('homepage');
    expect(app.container.querySelector('.splash-overlay')).toBeNull();
    expect(app.container.querySelector('.home-play')).not.toBeNull();

    await app.unmount();
    vi.useRealTimers();
  });

  it('jumps to the next frame when the reader clicks anywhere', async () => {
    vi.useFakeTimers();
    useExperienceStore.setState({ stage: 'splash' });

    const app = renderApp();
    await app.render();

    await act(async () => {
      window.dispatchEvent(new Event('pointerdown'));
    });
    expect(app.container.textContent).toContain('AI-assisted');
    expect(app.container.textContent).not.toContain('What happens up there?');

    await act(async () => {
      window.dispatchEvent(new Event('pointerdown'));
    });
    await act(async () => {
      vi.advanceTimersByTime(900);
    });

    expect(useExperienceStore.getState().stage).toBe('homepage');
    expect(app.container.querySelector('.splash-overlay')).toBeNull();

    await app.unmount();
    vi.useRealTimers();
  });
});

describe('App book stage', () => {
  it('renders the adventure journal with the first explorer spread', async () => {
    useExperienceStore.setState({ stage: 'book' });

    const app = renderApp();
    await app.render();

    expect(app.container.querySelector('[data-scene="book"]')).not.toBeNull();
    expect(app.container.querySelector('[data-scene="home-launchpad"]')).toBeNull();
    expect(app.container.textContent).toContain('Select your explorer');
    expect(app.container.textContent).toContain('Meet Percy!');
    expect(app.container.textContent).toContain('Explore Percy!');
    expect(app.container.querySelector('.page-arrow--next')).not.toBeNull();

    await app.unmount();
  });
});
