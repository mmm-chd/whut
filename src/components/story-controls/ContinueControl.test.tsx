import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it } from 'vitest';
import { useStoryStore } from '../../stores/story.store';
import { NarrativeController } from '../../engine/NarrativeController';
import { ContinueControl } from './ContinueControl';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function resetStore() {
  useStoryStore.setState({
    activeSceneId: 'p01-jezero',
    status: 'waiting',
    completedInteractions: [],
    isPaused: false,
  });
}

beforeEach(resetStore);

describe('ContinueControl', () => {
  it('is disabled when not all interactions are complete', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <NarrativeController>
          <ContinueControl requiredInteractions={['rock-a', 'rock-b', 'rock-c']} />
        </NarrativeController>,
      );
    });

    const button = container.querySelector('button');
    expect(button).not.toBeNull();
    expect(button!.disabled).toBe(true);
    expect(button!.classList.contains('continue-control--locked')).toBe(true);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('is enabled when all interactions are complete and status is waiting', async () => {
    useStoryStore.setState({
      completedInteractions: ['rock-a', 'rock-b', 'rock-c'],
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <NarrativeController>
          <ContinueControl requiredInteractions={['rock-a', 'rock-b', 'rock-c']} />
        </NarrativeController>,
      );
    });

    const button = container.querySelector('button');
    expect(button).not.toBeNull();
    expect(button!.disabled).toBe(false);
    expect(button!.classList.contains('continue-control--unlocked')).toBe(true);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('completes the scene when clicked while unlocked', async () => {
    useStoryStore.setState({
      status: 'waiting',
      completedInteractions: ['rock-a', 'rock-b', 'rock-c'],
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <NarrativeController>
          <ContinueControl requiredInteractions={['rock-a', 'rock-b', 'rock-c']} />
        </NarrativeController>,
      );
    });

    const button = container.querySelector('button') as HTMLButtonElement;
    expect(button.disabled).toBe(false);

    await act(async () => {
      button.click();
    });

    expect(useStoryStore.getState().status).toBe('completed');

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('does not complete when clicked while locked', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <NarrativeController>
          <ContinueControl requiredInteractions={['rock-a', 'rock-b', 'rock-c']} />
        </NarrativeController>,
      );
    });

    const button = container.querySelector('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);

    await act(async () => {
      button.click();
    });

    expect(useStoryStore.getState().status).toBe('waiting');

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});
