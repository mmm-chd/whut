import { act, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioManager } from '../../audio/audioManager';
import { useDialogueStore } from '../../components/dialogue/dialogue.store';
import { NarrativeController } from '../../engine/NarrativeController';
import type { NarrativeControllerApi } from '../../engine/narrativeControllerContext';
import { useNarrativeController } from '../../engine/useNarrativeController';
import { useStoryStore } from '../../stores/story.store';
import { Scene02LaunchToMars } from './Scene';
import type { P02Nodes } from './nodes';
import type { P02Timeline } from './timeline';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Keep the real P-02 timeline, but record every driver the scene builds so
// the test can move the playhead with seek() instead of waiting in real time.
const recorded = vi.hoisted(() => ({
  drivers: [] as P02Timeline[],
  nodes: [] as P02Nodes[],
}));

vi.mock('./timeline', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./timeline')>();
  return {
    ...actual,
    createP02Timeline: (options: Parameters<typeof actual.createP02Timeline>[0]) => {
      const driver = actual.createP02Timeline(options);
      vi.spyOn(driver, 'dispose');
      vi.spyOn(driver, 'launch');
      recorded.drivers.push(driver);
      recorded.nodes.push(options.nodes);
      return driver;
    },
  };
});

const SCENE_ID = 'scene-02-launch-to-mars';
const DIALOGUE_GATES = [2.42, 8.02, 10.82, 12.82];
const LAUNCH_GATE = 13.42;

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

function currentDriver(): P02Timeline {
  const driver = recorded.drivers.at(-1);
  if (!driver) {
    throw new Error('P-02 did not build a timeline');
  }
  return driver;
}

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
            {showScene ? <Scene02LaunchToMars /> : null}
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

function sceneElement(): HTMLElement {
  const element = harness.container.querySelector<HTMLElement>(`[data-scene="${SCENE_ID}"]`);
  if (!element) {
    throw new Error('P-02 is not mounted');
  }
  return element;
}

const phase = () => sceneElement().dataset.phase;
const launchButton = () =>
  harness.container.querySelector<HTMLButtonElement>('[data-interaction="launch-button"]');
const countdownText = () =>
  harness.container.querySelector('.p02-countdown')?.textContent ?? '';
const button = (label: string) =>
  harness.container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);

/** Move the playhead like real playback, firing callbacks and gates on the way. */
async function seek(time: number) {
  await act(async () => {
    const driver = currentDriver();
    driver.pause();
    driver.seek(time, false);
  });
}

/** Resolve the active line that holds the story (the player's Continue). */
async function resolveHeldLine() {
  await act(async () => {
    const state = useDialogueStore.getState();
    expect(state.active?.holdsStory).toBe(true);
    state.resolve();
  });
}

async function reachLaunchGate() {
  for (const time of DIALOGUE_GATES) {
    await seek(time);
    await resolveHeldLine();
  }
  await seek(LAUNCH_GATE);
}

async function launchAndFinishAscent() {
  await reachLaunchGate();
  await act(async () => {
    launchButton()?.click();
  });
  await seek(22.2);
}

beforeEach(() => {
  recorded.drivers.length = 0;
  recorded.nodes.length = 0;
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

describe('Scene02LaunchToMars', () => {
  it('shows Launch only at the launch gate while the story waits', async () => {
    await harness.render();
    expect(phase()).toBe('flashback');
    expect(launchButton()).toBeNull();

    for (const time of DIALOGUE_GATES) {
      await seek(time);
      expect(launchButton()).toBeNull();
      expect(useStoryStore.getState().status).toBe('playing');
      await resolveHeldLine();
    }

    await seek(LAUNCH_GATE);

    expect(phase()).toBe('awaiting-launch');
    expect(useStoryStore.getState().status).toBe('waiting');
    expect(launchButton()).not.toBeNull();
    expect(currentDriver().paused()).toBe(true);
  });

  it('ignores a repeated Launch click and does not restart the countdown', async () => {
    await harness.render();
    await reachLaunchGate();

    const launch = launchButton();
    expect(launch).not.toBeNull();

    await act(async () => {
      launch?.click();
      launch?.click();
    });

    const driver = currentDriver();
    expect(driver.launch).toHaveBeenCalledTimes(1);
    expect(phase()).toBe('countdown');
    expect(launchButton()).toBeNull();
    expect(useStoryStore.getState().completedInteractions).toEqual(['launch-button']);
    // The score belongs to the story shell now, so the launch does not restart it.
    expect(AudioManager.prototype.playMusic).not.toHaveBeenCalled();

    await seek(15.1);
    expect(countdownText()).toBe('2');

    // A late launch attempt cannot reopen the gate or rewind the countdown.
    await act(async () => {
      expect(driver.launch()).toBe(false);
    });
    expect(countdownText()).toBe('2');
    expect(phase()).toBe('countdown');
  });

  it('keeps dialogue gates held through pause and resume', async () => {
    await harness.render();
    await seek(DIALOGUE_GATES[0]);
    const driver = currentDriver();
    expect(phase()).toBe('establishing');

    // Pause and resume without resolving: the gate still holds.
    await act(async () => {
      button('Pause story')?.click();
    });
    expect(useStoryStore.getState().isPaused).toBe(true);
    await act(async () => {
      button('Resume story')?.click();
    });
    expect(useStoryStore.getState().isPaused).toBe(false);
    expect(driver.paused()).toBe(true);
    expect(useDialogueStore.getState().active?.line.id).toBe('p02-narrator-01');
    expect(useDialogueStore.getState().active?.holdsStory).toBe(true);

    // A line resolved during a story pause must not resume through it.
    await act(async () => {
      button('Pause story')?.click();
    });
    await resolveHeldLine();
    expect(driver.paused()).toBe(true);

    await act(async () => {
      button('Resume story')?.click();
    });
    expect(driver.paused()).toBe(false);
    expect(phase()).toBe('establishing');
  });

  it('keeps the launch gate held through pause and resume', async () => {
    await harness.render();
    await reachLaunchGate();
    const driver = currentDriver();

    await act(async () => {
      controller?.pause();
    });
    // Launch is refused while the story is paused.
    await act(async () => {
      launchButton()?.click();
    });
    expect(driver.launch).not.toHaveBeenCalled();

    await act(async () => {
      controller?.resume();
    });
    expect(driver.paused()).toBe(true);
    expect(phase()).toBe('awaiting-launch');
    expect(launchButton()).not.toBeNull();

    await act(async () => {
      launchButton()?.click();
    });
    expect(driver.launch).toHaveReturnedWith(true);
    expect(phase()).toBe('countdown');
  });

  it('replay rebuilds the run, clears dialogue and returns to the flashback', async () => {
    await harness.render();
    await seek(DIALOGUE_GATES[0]);
    await resolveHeldLine();
    await seek(DIALOGUE_GATES[1]);

    const firstDriver = currentDriver();
    expect(phase()).toBe('percy');
    expect(useDialogueStore.getState().active).not.toBeNull();

    await act(async () => {
      button('Replay scene')?.click();
    });

    expect(firstDriver.dispose).toHaveBeenCalled();
    expect(recorded.drivers).toHaveLength(2);
    expect(currentDriver()).not.toBe(firstDriver);
    expect(useDialogueStore.getState().active).toBeNull();
    expect(useDialogueStore.getState().queue).toEqual([]);
    expect(phase()).toBe('flashback');
    expect(useStoryStore.getState().status).toBe('playing');

    // The new run starts from its own first gate.
    await seek(DIALOGUE_GATES[0]);
    expect(useDialogueStore.getState().active?.line.id).toBe('p02-narrator-01');
  });

  it('reaches done with reduced motion once the rocket is offscreen', async () => {
    resetStores(true);
    await harness.render();
    expect(sceneElement().dataset.reducedMotion).toBe('true');

    await launchAndFinishAscent();

    expect(phase()).toBe('done');
    expect(useStoryStore.getState().status).toBe('completed');
  });

  it('does not complete while the rocket is still inside the frame', async () => {
    await harness.render();
    await reachLaunchGate();
    await act(async () => {
      launchButton()?.click();
    });
    await seek(22.0);

    // The ascent is over, but the rocket is put back on the pad: its bounds
    // are inside the frame, so the endpoint check must refuse to complete.
    const nodes = recorded.nodes.at(-1);
    if (!nodes) {
      throw new Error('P-02 did not build node state');
    }
    nodes.rocket.y = 0;
    nodes.rocket.scale = 1;
    await seek(22.2);

    expect(phase()).toBe('exit');
    expect(useStoryStore.getState().status).toBe('waiting');
  });

  it('cleans up the run on unmount', async () => {
    await harness.render();
    await seek(DIALOGUE_GATES[0]);
    const driver = currentDriver();
    expect(useDialogueStore.getState().active).not.toBeNull();

    await resolveHeldLine();
    expect(controller?.isTimelineRunning()).toBe(true);

    // Unmount the scene but keep the controller to inspect its attachment.
    await harness.render(false);

    expect(driver.dispose).toHaveBeenCalled();
    expect(controller?.isTimelineRunning()).toBe(false);
    expect(useDialogueStore.getState().active).toBeNull();
    // The score outlives the scene; only the cue channel is torn down here.
    expect(AudioManager.prototype.stop).not.toHaveBeenCalledWith('music-perseverance');
    expect(AudioManager.prototype.stop).toHaveBeenCalledWith('p02-sfx-liftoff');
    expect(AudioManager.prototype.stop).toHaveBeenCalledWith('p02-sfx-countdown');

    // A disposed driver no longer cues lines.
    driver.seek(8.02, false);
    expect(useDialogueStore.getState().active).toBeNull();
  });
});
