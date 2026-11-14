import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStoryStore } from '../../stores/story.store';
import { NarrativeController } from '../../engine/NarrativeController';
import { CircularGate } from './CircularGate';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function resetStore() {
  useStoryStore.setState({
    activeSceneId: 'p01-jezero',
    status: 'waiting',
    isPaused: false,
    completedInteractions: [],
  });
}

beforeEach(resetStore);

describe('CircularGate', () => {
  it('renders an accessible circular button, focuses it, and activates once', async () => {
    const onActivate = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <NarrativeController>
          <CircularGate label="Continue to Mars" hint="Press to land" onActivate={onActivate} />
        </NarrativeController>,
      );
    });

    const button = container.querySelector('button[aria-label="Continue to Mars"]');
    expect(button).not.toBeNull();
    expect(document.activeElement).toBe(button);

    await act(async () => {
      (button as HTMLButtonElement).click();
    });

    expect(onActivate).toHaveBeenCalledTimes(1);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('never completes the scene when activated', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <NarrativeController>
          <CircularGate label="Continue to the rocks" onActivate={() => {}} />
        </NarrativeController>,
      );
    });

    const button = container.querySelector('button') as HTMLButtonElement;

    await act(async () => {
      button.click();
    });

    expect(useStoryStore.getState().status).toBe('waiting');
    expect(useStoryStore.getState().status).not.toBe('completed');

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});
