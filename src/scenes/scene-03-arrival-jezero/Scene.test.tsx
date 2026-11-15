import { act, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioManager } from '../../audio/audioManager';
import { useDialogueStore } from '../../components/dialogue/dialogue.store';
import { NarrativeController } from '../../engine/NarrativeController';
import type { NarrativeControllerApi } from '../../engine/narrativeControllerContext';
import { useNarrativeController } from '../../engine/useNarrativeController';
import { useStoryStore } from '../../stores/story.store';
import { getP03Line, p03StoryHoldingLineIds } from './dialogue';
import { Scene03ArrivalJezero } from './Scene';
import type { P03Timeline } from './timeline';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Keep the real P-03 timeline, but record every driver so the test can move the
// playhead with seek() instead of waiting in real time.
const recorded = vi.hoisted(() => ({ drivers: [] as P03Timeline[] }));

vi.mock('./timeline', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./timeline')>();
  return {
    ...actual,
    createP03Timeline: (options: Parameters<typeof actual.createP03Timeline>[0]) => {
      const driver = actual.createP03Timeline(options);
      vi.spyOn(driver, 'dispose');
      recorded.drivers.push(driver);
      return driver;
    },
  };
});

const SCENE_ID = 'scene-03-arrival-jezero';
let controller: NarrativeControllerApi | null = null;

function ControllerProbe() {
  const api = useNarrativeController();
  useEffect(() => {
    controller = api;
  }, [api]);
  return null;
}

function resetStores(reducedMotion = false) {
  useStoryStore.setState({
    activeSceneId: SCENE_ID,
    status: 'playing',
    isPaused: false,
    completedInteractions: [],
    settings: { muted: true, volume: 0.8, reducedMotion },
  });
  useDialogueStore.getState().clear();
}

const driver = () => {
  const current = recorded.drivers.at(-1);
  if (!current) {
    throw new Error('P-03 did not build a timeline');
  }
  return current;
};

interface Harness {
  container: HTMLDivElement;
  root: Root;
  render: (showScene?: boolean) => Promise<void>;
  unmount: () => Promise<void>;
}

function createHarness(): Harness {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  return {
    container,
    root,
    render: async (showScene = true) => {
      await act(async () => {
        root.render(
          <NarrativeController>
            <ControllerProbe />
            {showScene ? <Scene03ArrivalJezero /> : null}
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
}

let harness: Harness;

const scene = () => {
  const element = harness.container.querySelector<HTMLElement>(`[data-scene="${SCENE_ID}"]`);
  if (!element) {
    throw new Error('P-03 is not mounted');
  }
  return element;
};
const phase = () => scene().dataset.phase;
const labelTime = (lineId: string) => driver().labels[getP03Line(lineId).timelineLabel];

async function seek(time: number) {
  await act(async () => {
    driver().pause();
    driver().seek(time, false);
  });
}

/**
 * The reader's Continue on a holding line. Earlier auto lines that are still
 * queued (the test jumps instead of playing) are dismissed first, as they would
 * have left on their own.
 */
async function resolveThrough(lineId: string) {
  await act(async () => {
    const store = useDialogueStore.getState;
    for (let guard = 0; guard < 20 && store().active?.line.id !== lineId; guard += 1) {
      store().resolve();
    }
    expect(store().active?.line.id).toBe(lineId);
    store().resolve();
  });
}

/** The reader slides back to the lake and presses on. */
async function playTheSlider() {
  await seek(driver().labels['time-game'] + 0.02);
  const ticks = harness.container.querySelectorAll<HTMLButtonElement>('.tt-tick');
  expect(ticks).toHaveLength(6);
  await act(async () => {
    ticks[ticks.length - 1].click();
  });
  await act(async () => {
    harness.container.querySelector<HTMLButtonElement>('[data-time-travel-done]')?.click();
  });
}

async function playToFinalGate() {
  const gates = [...p03StoryHoldingLineIds]
    .filter((id) => id !== 'p03-narrator-12')
    .sort((a, b) => labelTime(a) - labelTime(b));
  for (const id of gates) {
    await seek(labelTime(id) + 0.02);
    await resolveThrough(id);
  }
  await playTheSlider();
  await seek(labelTime('p03-narrator-12') + 0.02);
}

beforeEach(() => {
  recorded.drivers.length = 0;
  controller = null;
  resetStores();
  vi.spyOn(AudioManager.prototype, 'playMusic').mockReturnValue(false);
  vi.spyOn(AudioManager.prototype, 'stop');
  harness = createHarness();
});

afterEach(async () => {
  if (harness.container.isConnected) {
    await harness.unmount();
  }
  vi.restoreAllMocks();
  useDialogueStore.getState().clear();
  document.body.innerHTML = '';
});

describe('Scene03ArrivalJezero', () => {
  it('opens on the landing and builds one run', async () => {
    await harness.render();
    expect(phase()).toBe('landing');
    expect(recorded.drivers).toHaveLength(1);
    expect(useStoryStore.getState().status).toBe('playing');
    expect(harness.container.querySelector('.p03-cover')).not.toBeNull();
  });

  it('shows the rover cards in narration order and removes none early', async () => {
    await harness.render();
    const roverLabel = labelTime('p03-narrator-07');
    await seek(roverLabel + 0.02);
    const shown = () =>
      [...harness.container.querySelectorAll('.p03-card')].filter(
        (card) => (card as HTMLElement).dataset.shown === 'true',
      ).length;
    expect(shown()).toBe(0);
    await seek(roverLabel + 2);
    expect(shown()).toBe(1);
    await seek(roverLabel + 6);
    expect(shown()).toBe(4);
    const names = [...harness.container.querySelectorAll('.p03-card__name')].map(
      (node) => node.textContent,
    );
    expect(names).toEqual(['Sojourner', 'Spirit', 'Opportunity', 'Curiosity']);
  });

  it('marks the story waiting when the time slider opens', async () => {
    await harness.render();
    const gates = ['p03-percy-01', 'p03-percy-02', 'p03-narrator-06'];
    await seek(labelTime(gates[0]) + 0.02);
    expect(useStoryStore.getState().status).toBe('playing');
    await playToFinalGate();
    expect(phase()).toBe('final-quote');
    expect(useStoryStore.getState().status).toBe('waiting');
  });

  it('holds the story on the time slider until the reader reaches the lake', async () => {
    await harness.render();
    const gates = [...p03StoryHoldingLineIds]
      .filter((id) => id !== 'p03-narrator-12')
      .sort((a, b) => labelTime(a) - labelTime(b));
    for (const id of gates) {
      await seek(labelTime(id) + 0.02);
      await resolveThrough(id);
    }
    await seek(driver().labels['time-game'] + 0.02);
    expect(phase()).toBe('timeline');
    expect(harness.container.querySelector('[data-time-travel]')).not.toBeNull();
    expect(useStoryStore.getState().status).toBe('waiting');
    // Done only appears once the lake has been reached.
    expect(harness.container.querySelector('[data-time-travel-done]')).toBeNull();
    const slider = harness.container.querySelector<HTMLInputElement>('.tt-slider')!;
    expect(slider.max).toBe('5');
    const ticks = harness.container.querySelectorAll<HTMLButtonElement>('.tt-tick');
    await act(async () => {
      ticks[2].click();
    });
    expect(harness.container.querySelector('[data-stop-card]')?.getAttribute('data-stop-card')).toBe('jul-2024');
    expect(harness.container.querySelector('[data-time-travel-done]')).toBeNull();
    expect(phase()).toBe('timeline');
    await act(async () => {
      ticks[5].click();
    });
    expect(harness.container.querySelector('[data-stop-card]')?.getAttribute('data-stop-card')).toBe('ancient');
    expect(harness.container.querySelector('[data-percy-bubble]')).not.toBeNull();
    await act(async () => {
      harness.container.querySelector<HTMLButtonElement>('[data-time-travel-done]')?.click();
    });
    expect(harness.container.querySelector('[data-time-travel]')).toBeNull();
  });

  it('accepts the final Continue once and completes after the fade', async () => {
    await harness.render();
    await playToFinalGate();
    await resolveThrough('p03-narrator-12');
    expect(useStoryStore.getState().completedInteractions).toContain('p03-continue');

    await seek(10_000);
    expect(phase()).toBe('done');
    expect(useStoryStore.getState().status).toBe('completed');

    // A repeated Continue changes nothing.
    await act(async () => {
      useDialogueStore.getState().resolve();
    });
    expect(useStoryStore.getState().status).toBe('completed');
    expect(
      useStoryStore.getState().completedInteractions.filter((id) => id === 'p03-continue'),
    ).toHaveLength(1);
  });

  it('does not complete when the fade ends without an accepted Continue', async () => {
    await harness.render();
    await playToFinalGate();
    // The reader never presses Continue: the timeline is held at the gate.
    await act(async () => {
      driver().pause();
    });
    expect(phase()).toBe('final-quote');
    expect(useStoryStore.getState().status).toBe('waiting');
  });

  it('replays from the landing with a clean dialogue state', async () => {
    await harness.render();
    const first = driver();
    await seek(labelTime('p03-percy-01') + 0.02);
    expect(useDialogueStore.getState().active).not.toBeNull();

    await act(async () => {
      controller?.replay();
    });

    expect(driver()).not.toBe(first);
    expect(first.dispose).toHaveBeenCalled();
    expect(useDialogueStore.getState().active).toBeNull();
    expect(phase()).toBe('landing');
    expect(useStoryStore.getState().status).toBe('playing');
  });

  it('reaches done with reduced motion and still plays every beat', async () => {
    resetStores(true);
    await harness.render();
    expect(scene().dataset.reducedMotion).toBe('true');
    await playToFinalGate();
    await resolveThrough('p03-narrator-12');
    await seek(10_000);
    expect(phase()).toBe('done');
    expect(useStoryStore.getState().status).toBe('completed');
  });

  it('cleans up the run on unmount', async () => {
    await harness.render();
    const current = driver();
    await seek(labelTime('p03-percy-01') + 0.02);
    expect(useDialogueStore.getState().active).not.toBeNull();

    await harness.render(false);

    expect(current.dispose).toHaveBeenCalled();
    expect(controller?.isTimelineRunning()).toBe(false);
    expect(useDialogueStore.getState().active).toBeNull();
    // The score outlives the scene; the shell stops it when the story ends.
    expect(AudioManager.prototype.stop).not.toHaveBeenCalledWith('music-perseverance');

    // A disposed driver no longer cues lines.
    current.seek(labelTime('p03-percy-01') + 0.02, false);
    expect(useDialogueStore.getState().active).toBeNull();
  });
});
