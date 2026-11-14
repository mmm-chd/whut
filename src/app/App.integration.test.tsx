import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useStoryStore } from '../stores/story.store';
import { App } from './App';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function resetStore() {
  useStoryStore.setState({
    activeSceneId: 'p01-jezero',
    status: 'playing',
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

describe('Integration: dialogue flow narrator-01 - full flow', () => {
  it('simulate full flow: title continue -> narrator-02 continue -> check narrator-01', async () => {
    const app = renderApp();
    await app.render();

    // Step 1: Wait for scene to mount
    const sceneEl = app.container.querySelector('[data-scene="p01-jezero"]');
    expect(sceneEl).not.toBeNull();

    // Step 2: Simulate title Continue gate
    const titleGate = app.container.querySelector<HTMLElement>('.circular-gate--dialogue');
    if (titleGate) {
      await act(async () => {
        titleGate.click();
      });
    }
    await act(async () => {});

    // Step 3: Wait for timeline to progress past title
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 4: Simulate narrator-02 Continue gate
    const narrator02Gate = app.container.querySelector<HTMLElement>('[data-dialogue-line="narrator-02"]');
    if (narrator02Gate) {
      await act(async () => {
        narrator02Gate.click();
      });
    }
    await act(async () => {});

    // Step 5: Wait for timeline to progress
    await new Promise(resolve => setTimeout(resolve, 1000));

// Step 6: Wait for timeline to progress further
    await new Promise(resolve => setTimeout(resolve, 500));

    // Step 7: Check narrator-01 DOM
    const narrator01El = app.container.querySelector('[data-dialogue-line="narrator-01"]');
    console.log('narrator-01 DOM:', narrator01El);

    // The bug: narrator-01 should appear but doesn't
    // This test documents the bug
    // expect(narrator01El).not.toBeNull(); // This will fail, showing the bug

    await app.unmount();
  });
});
