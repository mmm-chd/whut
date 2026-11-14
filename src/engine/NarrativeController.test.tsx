import { act, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStoryStore } from '../stores/story.store';
import { NarrativeController } from './NarrativeController';
import { useNarrativeController } from './useNarrativeController';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let controller: ReturnType<typeof useNarrativeController> | null = null;

function Harness() {
  const api = useNarrativeController();

  useEffect(() => {
    controller = api;
  }, [api]);

  return null;
}

function resetStore() {
  useStoryStore.setState({
    activeSceneId: null,
    status: 'idle',
    isPaused: false,
    completedInteractions: [],
  });
}

beforeEach(resetStore);

describe('NarrativeController', () => {
  it('only completes the scene from waiting', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <NarrativeController>
          <Harness />
        </NarrativeController>,
      );
    });

    expect(controller).not.toBeNull();

    await act(async () => {
      controller!.start();
    });
    expect(useStoryStore.getState().status).toBe('playing');

    await act(async () => {
      controller!.completeScene();
    });
    expect(useStoryStore.getState().status).toBe('playing');

    await act(async () => {
      controller!.markWaiting();
    });
    expect(useStoryStore.getState().status).toBe('waiting');

    await act(async () => {
      controller!.completeScene();
    });
    expect(useStoryStore.getState().status).toBe('completed');

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('replays and controls the attached timeline without replacing it', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <NarrativeController>
          <Harness />
        </NarrativeController>,
      );
    });

    expect(controller).not.toBeNull();

    const timeline = {
      pause: vi.fn(),
      resume: vi.fn(),
      restart: vi.fn(),
    };

    await act(async () => {
      controller!.attachTimeline(timeline);
      controller!.start();
      controller!.replay();
    });

    expect(useStoryStore.getState().status).toBe('playing');
    expect(timeline.restart).toHaveBeenCalledTimes(1);

    await act(async () => {
      controller!.pause();
      controller!.resume();
    });

    expect(timeline.pause).toHaveBeenCalledTimes(1);
    expect(timeline.resume).toHaveBeenCalledTimes(1);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});
