import { beforeEach, describe, expect, it } from 'vitest';
import { useStoryStore } from './story.store';

function resetStore() {
  useStoryStore.setState({
    activeSceneId: null,
    status: 'idle',
    isPaused: false,
    completedInteractions: [],
  });
}

beforeEach(resetStore);

describe('story store', () => {
  it('resets status and progress on replay', () => {
    const store = useStoryStore.getState();
    store.startScene('p01-jezero');
    store.markInteractionComplete('rock-a');
    store.resetScene();

    const state = useStoryStore.getState();
    expect(state.status).toBe('idle');
    expect(state.completedInteractions).toEqual([]);
  });

  it('does not duplicate completed interactions', () => {
    const store = useStoryStore.getState();
    store.markInteractionComplete('rock-a');
    store.markInteractionComplete('rock-a');

    expect(useStoryStore.getState().completedInteractions).toEqual(['rock-a']);
  });

  it('does not complete the scene when interactions change', () => {
    const store = useStoryStore.getState();
    store.startScene('p01-jezero');
    store.markInteractionComplete('rock-a');
    store.markInteractionComplete('rock-b');
    store.markInteractionComplete('rock-c');

    expect(useStoryStore.getState().status).toBe('playing');
  });

  it('rejects an invalid status transition', () => {
    const store = useStoryStore.getState();
    store.setStatus('completed');

    expect(useStoryStore.getState().status).toBe('idle');
  });
});
