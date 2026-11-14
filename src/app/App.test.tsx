import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useStoryStore } from '../stores/story.store';
import { App } from './App';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function resetStore() {
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

  it('shows the end screen when status is completed', async () => {
    useStoryStore.setState({ status: 'completed' });

    const app = renderApp();
    await app.render();

    expect(app.container.querySelector('[data-scene="p01-jezero"]')).toBeNull();
    expect(app.container.textContent).toContain('P-02 not built yet');

    await app.unmount();
  });
});
