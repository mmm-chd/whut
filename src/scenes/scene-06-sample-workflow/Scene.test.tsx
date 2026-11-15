import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDialogueStore } from '../../components/dialogue/dialogue.store';
import { NarrativeController } from '../../engine/NarrativeController';
import { useStoryStore } from '../../stores/story.store';
import { Scene06SampleWorkflow } from './Scene';
import { SAMPLE_SCENE_ID } from './scene.config';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * The sampling scene with graphics mocked out: jsdom has no Canvas2D, so the
 * rock surface is blank and every interaction goes through the accessible
 * controls, which share the real coverage and state code.
 */
let container: HTMLDivElement;
let root: Root;

const main = () => container.querySelector<HTMLElement>(`[data-scene="${SAMPLE_SCENE_ID}"]`)!;
const phase = () => main().dataset.phase;
const button = (selector: string) => container.querySelector<HTMLButtonElement>(selector);

async function click(selector: string) {
  await act(async () => {
    button(selector)?.click();
  });
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

/** Resolve every queued opening line, as a reader pressing Continue would. */
async function readOpening() {
  for (let i = 0; i < 12 && useDialogueStore.getState().active; i += 1) {
    await act(async () => {
      useDialogueStore.getState().resolve();
    });
  }
}

async function brushUntilClean() {
  for (let i = 0; i < 60 && phase() === 'brush'; i += 1) {
    await click('[data-brush-next]');
  }
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  useDialogueStore.getState().clear();
  useStoryStore.setState({
    activeSceneId: SAMPLE_SCENE_ID,
    status: 'playing',
    isPaused: false,
    completedInteractions: [],
    settings: { muted: true, volume: 0.8, reducedMotion: false },
  });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <NarrativeController>
        <Scene06SampleWorkflow />
      </NarrativeController>,
    );
  });
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('Scene06SampleWorkflow', () => {
  it('opens with narration and offers no start button until it is read', async () => {
    expect(phase()).toBe('opening');
    expect(button('[data-start]')).toBeNull();
    expect(useDialogueStore.getState().active?.line.id).toBe('p05-sample-narrator-01');
  });

  it('reaches the intro once the opening lines are read, then waits for the reader', async () => {
    await readOpening();
    expect(phase()).toBe('intro');
    expect(useStoryStore.getState().status).toBe('playing');
    expect(button('[data-start]')).not.toBeNull();

    await click('[data-start]');
    expect(phase()).toBe('brush');
    expect(useStoryStore.getState().status).toBe('waiting');
  });

  it('keeps the four steps in order: no drill before brush and an accepted inspection', async () => {
    await readOpening();
    await click('[data-start]');
    expect(button('[data-drill-hold]')).toBeNull();
    expect(button('[data-accept]')).toBeNull();

    await brushUntilClean();
    expect(phase()).toBe('inspect');
    expect(button('[data-accept]')?.disabled).toBe(true);

    await click('[data-inspect]');
    expect(container.querySelector('[data-description]')?.textContent).toMatch(/Solid and layered/);
    expect(button('[data-accept]')?.disabled).toBe(false);

    await click('[data-accept]');
    expect(phase()).toBe('drill-ready');
  });

  it('plays a two-tube session through to the choice and finishes into the shell', async () => {
    await readOpening();
    await click('[data-start]');

    const runCycle = async () => {
      await brushUntilClean();
      await click('[data-inspect]');
      await click('[data-accept]');
      await click('[data-drill-assist]');
      await advance(2300);
      expect(phase()).toBe('result-core');
      await click('[data-seal]');
      // Each beat arms its timer after a render, so step through them one by one.
      await advance(700);
      await advance(500);
      await advance(700);
    };

    await runCycle();
    expect(phase()).toBe('cycle-complete');
    expect(container.querySelectorAll('.p05s-slot[data-kind="core"]')).toHaveLength(1);

    await click('[data-next-site]');
    await runCycle();
    expect(phase()).toBe('mission-complete');
    expect(useStoryStore.getState().completedInteractions).toContain('p05-sample-gameplay-complete');
    // Filling the tubes does not end the scene.
    expect(useStoryStore.getState().status).toBe('waiting');

    const dialogButton = (label: RegExp) =>
      [...container.querySelectorAll<HTMLButtonElement>('.p05s-complete button')].find((b) => label.test(b.textContent ?? ''));
    await act(async () => {
      dialogButton(/continue/i)?.click();
    });
    expect(phase()).toBe('achievement');
    expect(container.querySelector('.p05s-stamp')).not.toBeNull();
    await act(async () => {
      dialogButton(/next/i)?.click();
    });
    expect(phase()).toBe('choice');

    expect(button('[data-choice="ingenuity"]')?.disabled).toBe(true);
    await click('[data-choice="ingenuity"]');
    expect(useStoryStore.getState().status).toBe('waiting');

    await click('[data-choice="percy-story"]');
    expect(useStoryStore.getState().status).toBe('completed');
    expect(useStoryStore.getState().completedInteractions).toEqual(
      expect.arrayContaining([
        'p05-sample-gameplay-complete',
        'p05-sample-ending-read',
        'p05-sample-next-choice',
      ]),
    );
  });

  it('a paused drill adds no progress and does not finish by itself', async () => {
    await readOpening();
    await click('[data-start]');
    await brushUntilClean();
    await click('[data-inspect]');
    await click('[data-accept]');

    await click('[data-drill-assist]');
    await advance(400);
    await act(async () => {
      useStoryStore.getState().setPaused(true);
    });
    expect(phase()).toBe('drill-ready');
    await advance(10_000);
    expect(phase()).toBe('drill-ready');

    await act(async () => {
      useStoryStore.getState().setPaused(false);
    });
    // Resuming needs a fresh press.
    await advance(3000);
    expect(phase()).toBe('drill-ready');
    await click('[data-drill-assist]');
    await advance(2000);
    expect(phase()).toBe('result-core');
  });

  it('replay builds a fresh run with empty tubes', async () => {
    await readOpening();
    await click('[data-start]');
    await brushUntilClean();
    expect(phase()).toBe('inspect');

    await act(async () => {
      useStoryStore.getState().resetScene();
      useStoryStore.getState().startScene(SAMPLE_SCENE_ID);
    });
    expect(container.querySelectorAll('.p05s-slot[data-kind="empty"]').length).toBeGreaterThan(0);
  });
});
