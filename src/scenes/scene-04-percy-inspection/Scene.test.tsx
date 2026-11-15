import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NarrativeController } from '../../engine/NarrativeController';
import { useStoryStore } from '../../stores/story.store';
import { Scene04PercyInspection } from './Scene';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * The shell opens in the rolling half and owns nothing of the close-up: the
 * monitor, the four part buttons and the turn controls all belong to
 * `scene-05-percy-inspector`, so none of them can be reached from here even by
 * tabbing.
 */

const SCENE_ID = 'scene-04-percy-inspection';

interface Harness {
  container: HTMLDivElement;
  root: Root;
  mount: () => Promise<void>;
  unmount: () => Promise<void>;
}

let harness: Harness;

const scene = () => {
  const element = harness.container.querySelector<HTMLElement>(`[data-scene="${SCENE_ID}"]`);
  if (!element) {
    throw new Error('P-04 is not mounted');
  }
  return element;
};

beforeEach(async () => {
  useStoryStore.setState({
    activeSceneId: SCENE_ID,
    status: 'playing',
    isPaused: false,
    completedInteractions: [],
    settings: { muted: true, volume: 0.8, reducedMotion: false },
  });

  const container = document.createElement('div');
  container.style.width = '1280px';
  container.style.height = '720px';
  Object.defineProperty(container, 'clientWidth', { configurable: true, value: 1280 });
  Object.defineProperty(container, 'clientHeight', { configurable: true, value: 720 });
  document.body.appendChild(container);
  const root = createRoot(container);
  harness = {
    container,
    root,
    mount: async () => {
      await act(async () => {
        root.render(
          <NarrativeController>
            <Scene04PercyInspection />
          </NarrativeController>,
        );
      });
    },
    unmount: async () => {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    },
  };
  await harness.mount();
});

afterEach(async () => {
  await harness.unmount();
  document.body.innerHTML = '';
});

describe('opening state', () => {
  it('starts in the rolling half', () => {
    expect(scene().dataset.phase).toBe('entry');
  });

  it('owns nothing of the close-up', () => {
    expect(scene().querySelector('[data-inspection-monitor]')).toBeNull();
    expect(scene().querySelectorAll('[data-point]')).toHaveLength(0);
    expect(scene().querySelector('[data-inspector-toolbar]')).toBeNull();
    expect(scene().querySelector('[data-rotate-surface]')).toBeNull();
    expect(scene().querySelector('[data-exit-inspection]')).toBeNull();
    // The four part buttons move with the close-up, so the old progress line is
    // gone too: there is nothing to count here any more.
    expect(scene().querySelector('.p04-progress')).toBeNull();
  });

  it('offers no hand-over control before the invitation', () => {
    expect(scene().querySelector('[data-inspect-entry]')).toBeNull();
    expect(scene().querySelector('[data-transfer]')).toBeNull();
    expect(scene().querySelector('[data-return-mars]')).toBeNull();
  });

  it('renders the stage and the accessible heading', () => {
    expect(scene().querySelector('[data-p04-stage]')).not.toBeNull();
    expect(scene().querySelector('h1')?.textContent).toBe('A Closer Look at Percy');
  });

  it('credits nothing on mount', () => {
    expect(useStoryStore.getState().completedInteractions).toEqual([]);
  });
});

describe('the hand-over', () => {
  it('runs on its own, so no control has to be found to finish the scene', () => {
    // The scripted carry lives in `PercyTransfer` and starts from `canEnter`
    // alone; nothing here waits for a pointer. The DOM contract this test can
    // hold is that the scene ships no second, competing way in.
    expect(scene().querySelectorAll('[data-inspect-entry]')).toHaveLength(0);
  });
});

describe('teardown', () => {
  it('leaves the store idle-ready and clears the dialogue', async () => {
    await harness.unmount();
    expect(harness.container.querySelector('[data-scene]')).toBeNull();
    // Mount a fresh harness for afterEach.
    const container = document.createElement('div');
    document.body.appendChild(container);
    harness = {
      container,
      root: createRoot(container),
      mount: async () => {},
      unmount: async () => {
        container.remove();
      },
    };
  });
});