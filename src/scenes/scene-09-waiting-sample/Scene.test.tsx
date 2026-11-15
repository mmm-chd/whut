import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDialogueStore } from '../../components/dialogue/dialogue.store';
import { NarrativeController } from '../../engine/NarrativeController';
import { useStoryStore } from '../../stores/story.store';
import { P08_BOUNDARY_LINE, P08_FINAL_LINE_ID } from './dialogue';
import { Scene09WaitingSample } from './Scene';
import { P08_SCENE_ID } from './scene.config';
import { P08_INTERACTION_IDS } from './state';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * The whole ending in jsdom: no WebGL, so the flat fallback draws, but the
 * state machine, the driver, the exit geometry and the caption script are the
 * real ones. Time only moves when the test moves it, in short steps so each
 * render's effects arm before the next beat.
 */
let container: HTMLDivElement;
let root: Root;

const stage = () => container.querySelector<HTMLElement>('[data-p08-stage]');
const phase = () => stage()?.dataset.phase ?? '';
const activeId = () => useDialogueStore.getState().active?.line.id ?? null;

async function tick(ms: number) {
  for (let spent = 0; spent < ms; spent += 100) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
  }
}

async function read() {
  await act(async () => {
    useDialogueStore.getState().resolve();
  });
}

/** Read every caption as soon as it shows, until the predicate holds. */
async function readUntil(done: () => boolean, maxMs = 240_000, log?: string[]) {
  for (let spent = 0; spent < maxMs && !done(); spent += 100) {
    if (log && phase() !== log[log.length - 1]) {
      log.push(phase());
    }
    if (useDialogueStore.getState().active) {
      await read();
    }
    await tick(100);
  }
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
  useDialogueStore.getState().clear();
  useStoryStore.setState({
    activeSceneId: P08_SCENE_ID,
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
        <Scene09WaitingSample />
      </NarrativeController>,
    );
  });
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
  vi.useRealTimers();
});

describe('Scene09WaitingSample', () => {
  it('shows the samples first, with a dated fact, and waits for the reader', async () => {
    await tick(1500);
    expect(phase()).toBe('samples');
    expect(useStoryStore.getState().status).toBe('waiting');
    expect(activeId()).toBe('p08-samples-count');
    expect(container.querySelector('.p08-tray')).not.toBeNull();
    expect(container.querySelector('.p08-fact-source')?.textContent).toMatch(/As of 20 June 2026/u);
  });

  it('never moves on by itself: the first boundary line stays until it is read', async () => {
    await tick(1500);
    await read();
    await tick(500);
    expect(activeId()).toBe(P08_BOUNDARY_LINE.samples);
    await tick(60_000);
    expect(activeId()).toBe(P08_BOUNDARY_LINE.samples);
    expect(phase()).toBe('samples');
  });

  it('walks every phase in order and completes only after exit, final narration and the fade', async () => {
    const seen: string[] = [];
    await tick(1500);
    await readUntil(() => useStoryStore.getState().status === 'completed', 240_000, seen);
    expect(useStoryStore.getState().status).toBe('completed');
    expect(seen).toEqual([
      'samples',
      'hope-transition',
      'hope',
      'message-transition',
      'message',
      'emotional-pause',
      'message',
      'departing',
      'tracks',
      'fade',
    ]);
    expect(useStoryStore.getState().completedInteractions).toEqual(expect.arrayContaining([...P08_INTERACTION_IDS]));
  });

  it('keeps the quiet pause: no caption between the news and the check-in', async () => {
    await tick(1500);
    await readUntil(() => phase() === 'emotional-pause');
    expect(phase()).toBe('emotional-pause');
    expect(activeId()).toBeNull();
    await tick(1800);
    expect(phase()).toBe('emotional-pause');
    expect(activeId()).toBeNull();
    await tick(800);
    expect(phase()).toBe('message');
  });

  it('does not fade before the final line is read', async () => {
    await tick(1500);
    await readUntil(() => activeId() === 'p08-final-narration-1');
    await tick(20_000);
    expect(phase()).toBe('tracks');
    expect(useStoryStore.getState().status).toBe('waiting');
    await read();
    await tick(300);
    expect(activeId()).toBe(P08_FINAL_LINE_ID);
    await tick(10_000);
    expect(phase()).toBe('tracks');
    await read();
    await tick(500);
    expect(phase()).toBe('fade');
    await tick(2000);
    expect(useStoryStore.getState().status).toBe('completed');
  });

  it('puts a boundary line back if Continue is pressed while paused', async () => {
    await tick(1500);
    await read();
    await tick(300);
    expect(activeId()).toBe(P08_BOUNDARY_LINE.samples);
    await act(async () => {
      useStoryStore.getState().setPaused(true);
    });
    await read();
    await tick(300);
    // The press was not accepted, so the same line is on screen again.
    expect(activeId()).toBe(P08_BOUNDARY_LINE.samples);
    expect(phase()).toBe('samples');
    await act(async () => {
      useStoryStore.getState().setPaused(false);
    });
    await read();
    await tick(1000);
    expect(phase()).not.toBe('samples');
  });

  it('a paused ending does not advance its timers', async () => {
    await tick(1500);
    await read();
    await tick(300);
    await read();
    await tick(100);
    expect(phase()).toBe('hope-transition');
    await act(async () => {
      useStoryStore.getState().setPaused(true);
    });
    await tick(10_000);
    expect(phase()).toBe('hope-transition');
    await act(async () => {
      useStoryStore.getState().setPaused(false);
    });
    await tick(1500);
    expect(phase()).toBe('hope');
  });

  it('replay builds a fresh run at the samples', async () => {
    await tick(1500);
    await read();
    await tick(300);
    await read();
    await tick(1500);
    expect(phase()).not.toBe('samples');
    await act(async () => {
      useStoryStore.getState().resetScene();
      useStoryStore.getState().startScene(P08_SCENE_ID);
    });
    expect(stage()).not.toBeNull();
  });
});
