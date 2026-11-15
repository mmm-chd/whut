import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDialogueStore } from '../../components/dialogue/dialogue.store';
import { NarrativeController } from '../../engine/NarrativeController';
import { useStoryStore } from '../../stores/story.store';
import { Scene08TheRunner } from './Scene';
import { RUNNER_SCENE_ID } from './scene.config';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * The whole scene in jsdom: there is no WebGL here, so the flat fallback board
 * draws and every step goes through the real controls, state machine, planner
 * and driver. Time only moves when the test moves it, in short chunks so each
 * render's effects arm before the next beat.
 */
let container: HTMLDivElement;
let root: Root;

const main = () => container.querySelector<HTMLElement>(`[data-scene="${RUNNER_SCENE_ID}"]`)!;
const phase = () => main().dataset.phase ?? '';
const find = <T extends HTMLElement>(selector: string) => container.querySelector<T>(selector);

async function tick(ms: number) {
  for (let spent = 0; spent < ms; spent += 100) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
  }
}

async function resolveActive() {
  await act(async () => {
    useDialogueStore.getState().resolve();
  });
}

/** Read every line as soon as it appears, until the map is open. */
async function reachChoosing(maxMs = 120_000) {
  for (let spent = 0; spent < maxMs && phase() !== 'choosing'; spent += 100) {
    if (useDialogueStore.getState().active) {
      await resolveActive();
    }
    await tick(100);
  }
}

async function runUntil(target: string, maxMs: number, readFacts = false) {
  for (let spent = 0; spent < maxMs && phase() !== target; spent += 100) {
    const active = useDialogueStore.getState().active;
    if (readFacts && active?.line.id.startsWith('p07-fact')) {
      await resolveActive();
    }
    await tick(100);
  }
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
  useDialogueStore.getState().clear();
  useStoryStore.setState({
    activeSceneId: RUNNER_SCENE_ID,
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
        <Scene08TheRunner />
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

describe('Scene08TheRunner', () => {
  it('opens with Percy driving while the narrator speaks, and no controls yet', () => {
    expect(phase()).toBe('intro-moving');
    expect(find('[data-send]')).toBeNull();
    expect(find('[data-preset]')).toBeNull();
    expect(useDialogueStore.getState().active?.line.id).toBe('p07-narrator-01');
  });

  it('keeps Percy silent until he has stopped, then lets him speak, then opens the map', async () => {
    await reachChoosing();
    expect(phase()).toBe('choosing');
    expect(useStoryStore.getState().status).toBe('waiting');
    expect(find<HTMLButtonElement>('[data-send]')?.disabled).toBe(true);
    expect(find('[data-preset]')).not.toBeNull();
  });

  it('plays a direct route from choosing to completion, with Arrived! gated on the facts', async () => {
    await reachChoosing();
    const east = find<HTMLButtonElement>('[data-preset="east"]')!;
    await act(async () => {
      east.click();
    });
    expect(find<HTMLButtonElement>('[data-send]')?.disabled).toBe(false);

    await act(async () => {
      find<HTMLButtonElement>('[data-send]')?.click();
    });
    expect(phase()).toBe('signal');
    expect(find('.p07-status-title')?.textContent).toMatch(/Waiting for the signal to reach Mars/);
    // The goal stays locked while the signal travels.
    expect(find<HTMLButtonElement>('[data-preset="north"]')?.disabled).toBe(true);

    await runUntil('arrived', 60_000);
    expect(phase()).toBe('arrived');
    expect(useStoryStore.getState().completedInteractions).toEqual(
      expect.arrayContaining(['p07-command-sent', 'p07-signal-received', 'p07-goal-reached']),
    );
    // The direct route never met the rough patch.
    expect(find('.p07-hazard')).toBeNull();
    expect(find<HTMLButtonElement>('[data-arrived]')?.disabled).toBe(true);

    for (let i = 0; i < 400 && find<HTMLButtonElement>('[data-arrived]')?.disabled; i += 1) {
      const active = useDialogueStore.getState().active;
      if (active?.line.id.startsWith('p07-fact')) {
        await resolveActive();
      }
      await tick(100);
    }
    expect(find<HTMLButtonElement>('[data-arrived]')?.disabled).toBe(false);
    expect(useStoryStore.getState().status).toBe('waiting');

    await act(async () => {
      find<HTMLButtonElement>('[data-arrived]')?.click();
    });
    expect(phase()).toBe('exit');
    expect(useStoryStore.getState().status).toBe('waiting');
    await tick(1000);
    expect(useStoryStore.getState().status).toBe('completed');
    expect(useStoryStore.getState().completedInteractions).toEqual(
      expect.arrayContaining([
        'p07-fact-signal-read',
        'p07-fact-autonav-read',
        'p07-arrived-accepted',
      ]),
    );
  });

  it('meets the rough patch on the northern route, reroutes once and still arrives at the same goal', async () => {
    await reachChoosing();
    await act(async () => {
      find<HTMLButtonElement>('[data-preset="north"]')?.click();
    });
    await act(async () => {
      find<HTMLButtonElement>('[data-send]')?.click();
    });
    const seen = new Set<string>();
    for (let i = 0; i < 700 && phase() !== 'arrived'; i += 1) {
      seen.add(phase() ?? '');
      const active = useDialogueStore.getState().active;
      if (active?.line.id.startsWith('p07-fact')) {
        await resolveActive();
      }
      await tick(100);
    }
    expect(seen.has('assessing')).toBe(true);
    expect(phase()).toBe('arrived');
    // The patch stays marked, and the destination marker is still on the map.
    expect(find('.p07-hazard')).not.toBeNull();
    expect(find('.p07-goal')).not.toBeNull();
  });

  it('a paused signal does not finish', async () => {
    await reachChoosing();
    await act(async () => {
      find<HTMLButtonElement>('[data-preset="east"]')?.click();
    });
    await act(async () => {
      find<HTMLButtonElement>('[data-send]')?.click();
    });
    await tick(500);
    await act(async () => {
      useStoryStore.getState().setPaused(true);
    });
    await tick(10_000);
    expect(phase()).toBe('signal');
    await act(async () => {
      useStoryStore.getState().setPaused(false);
    });
    await tick(300);
    expect(phase()).toBe('signal');
    await tick(3000);
    expect(phase()).not.toBe('signal');
  });

  it('refuses a blocked tap with a kind message and keeps the map open', async () => {
    await reachChoosing();
    const surface = find<HTMLDivElement>('.p07-surface')!;
    const board = find<HTMLDivElement>('.p07-board')!;
    vi.spyOn(board, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 100,
      width: 640,
      height: 480,
      right: 740,
      bottom: 580,
      x: 100,
      y: 100,
      toJSON: () => ({}),
    });
    const at = (col: number, row: number) => ({
      clientX: 100 + (col + 0.5) * 20,
      clientY: 100 + (row + 0.5) * 20,
      pointerId: 5,
      isPrimary: true,
      button: 0,
      bubbles: true,
    });
    await act(async () => {
      surface.dispatchEvent(new PointerEvent('pointerdown', at(7, 8)));
      surface.dispatchEvent(new PointerEvent('pointerup', at(7, 8)));
    });
    expect(find('.p07-status-title')?.textContent).toMatch(/clear patch of ground/i);
    expect(find<HTMLButtonElement>('[data-send]')?.disabled).toBe(true);
    // A clear tap is accepted.
    await act(async () => {
      surface.dispatchEvent(new PointerEvent('pointerdown', at(27, 16)));
      surface.dispatchEvent(new PointerEvent('pointerup', at(27, 16)));
    });
    expect(find<HTMLButtonElement>('[data-send]')?.disabled).toBe(false);
  });

  it('replay starts a fresh run at the opening', async () => {
    await reachChoosing();
    await act(async () => {
      find<HTMLButtonElement>('[data-preset="east"]')?.click();
    });
    await act(async () => {
      useStoryStore.getState().resetScene();
      useStoryStore.getState().startScene(RUNNER_SCENE_ID);
    });
    expect(find<HTMLButtonElement>('[data-preset="east"]')).not.toBeNull();
  });
});
