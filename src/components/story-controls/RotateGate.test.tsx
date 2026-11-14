import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useStoryStore } from '../../stores/story.store';
import { NarrativeController } from '../../engine/NarrativeController';
import { useNarrativeController } from '../../engine/useNarrativeController';
import { RotateGate } from './RotateGate';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type OrientationListener = (event: { matches: boolean }) => void;

interface MatchMediaStub {
  setPortrait: (portrait: boolean) => void;
}

function stubMatchMedia(initialPortrait: boolean): MatchMediaStub {
  const listeners = new Set<OrientationListener>();
  let current = initialPortrait;
  const query = {
    get matches() {
      return current;
    },
    addEventListener: (_type: string, listener: OrientationListener) => {
      listeners.add(listener);
    },
    removeEventListener: (_type: string, listener: OrientationListener) => {
      listeners.delete(listener);
    },
  };
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => query),
  );
  return {
    setPortrait(portrait: boolean) {
      current = portrait;
      listeners.forEach((listener) => listener({ matches: portrait }));
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete document.body.dataset.storyFrozen;
});

describe('RotateGate', () => {
  it('renders the rotation prompt while portrait and nothing while landscape', async () => {
    const media = stubMatchMedia(true);
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <NarrativeController>
          <RotateGate />
        </NarrativeController>,
      );
    });

    expect(container.querySelector('[data-rotate-gate]')).not.toBeNull();
    expect(container.textContent).toContain('Rotate your device');

    await act(async () => {
      media.setPortrait(false);
    });

    expect(container.querySelector('[data-rotate-gate]')).toBeNull();

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('pauses a running story when portrait starts and resumes when landscape returns', async () => {
    const media = stubMatchMedia(false);
    const fake = { pauseCount: 0, resumeCount: 0, running: true };

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    function Harness() {
      const api = useNarrativeController();

      const attach = () => {
        api.attachTimeline({
          play: () => {},
          pause: () => {
            fake.pauseCount += 1;
            fake.running = false;
          },
          resume: () => {
            fake.resumeCount += 1;
            fake.running = true;
          },
          restart: () => {},
          isRunning: () => fake.running,
        });
      };

      return (
        <>
          <button type="button" data-attach onClick={attach}>
            attach
          </button>
          <RotateGate />
        </>
      );
    }

    await act(async () => {
      root.render(
        <NarrativeController>
          <Harness />
        </NarrativeController>,
      );
    });

    const attachButton = container.querySelector<HTMLButtonElement>('[data-attach]');
    await act(async () => {
      attachButton?.click();
    });

    await act(async () => {
      media.setPortrait(true);
    });

    // The running timeline is suspended behind the gate.
    expect(container.querySelector('[data-rotate-gate]')).not.toBeNull();
    expect(fake.pauseCount).toBe(1);
    expect(useStoryStore.getState().isPaused).toBe(true);
    expect(document.body.dataset.storyFrozen).toBe('true');

    await act(async () => {
      media.setPortrait(false);
    });

    expect(container.querySelector('[data-rotate-gate]')).toBeNull();
    expect(fake.resumeCount).toBe(1);
    expect(useStoryStore.getState().isPaused).toBe(false);
    expect(document.body.dataset.storyFrozen).toBeUndefined();

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('pauses everything while portrait even when the timeline rests at a dialogue gate, then clears only its own auto-pause', async () => {
    const media = stubMatchMedia(false);
    // The timeline sits at a dialogue gate: never "running".
    const fake = { pauseCount: 0, resumeCount: 0 };

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    function Harness() {
      const api = useNarrativeController();

      const attach = () => {
        api.attachTimeline({
          play: () => {},
          pause: () => {
            fake.pauseCount += 1;
          },
          resume: () => {
            fake.resumeCount += 1;
          },
          restart: () => {},
          isRunning: () => false,
        });
      };

      return (
        <>
          <button type="button" data-attach onClick={attach}>
            attach
          </button>
          <RotateGate />
        </>
      );
    }

    await act(async () => {
      root.render(
        <NarrativeController>
          <Harness />
        </NarrativeController>,
      );
    });

    const attachButton = container.querySelector<HTMLButtonElement>('[data-attach]');
    await act(async () => {
      attachButton?.click();
    });

    await act(async () => {
      media.setPortrait(true);
    });

    // Everything freezes even though the timeline was already idle.
    expect(container.querySelector('[data-rotate-gate]')).not.toBeNull();
    expect(fake.pauseCount).toBe(1);
    expect(useStoryStore.getState().isPaused).toBe(true);
    expect(document.body.dataset.storyFrozen).toBe('true');

    await act(async () => {
      media.setPortrait(false);
    });

    // No resume: the dialogue gate must keep waiting for its Continue press.
    expect(container.querySelector('[data-rotate-gate]')).toBeNull();
    expect(fake.resumeCount).toBe(0);
    // Our auto-pause is cleared; CSS animations unfreeze with the attribute.
    expect(useStoryStore.getState().isPaused).toBe(false);
    expect(document.body.dataset.storyFrozen).toBeUndefined();

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('keeps a manual user pause after the rotation round-trip', async () => {
    const media = stubMatchMedia(false);
    const fake = { pauseCount: 0, resumeCount: 0 };
    useStoryStore.setState({ isPaused: true });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    function Harness() {
      const api = useNarrativeController();

      const attach = () => {
        api.attachTimeline({
          play: () => {},
          pause: () => {
            fake.pauseCount += 1;
          },
          resume: () => {
            fake.resumeCount += 1;
          },
          restart: () => {},
          isRunning: () => false,
        });
      };

      return (
        <>
          <button type="button" data-attach onClick={attach}>
            attach
          </button>
          <RotateGate />
        </>
      );
    }

    await act(async () => {
      root.render(
        <NarrativeController>
          <Harness />
        </NarrativeController>,
      );
    });

    const attachButton = container.querySelector<HTMLButtonElement>('[data-attach]');
    await act(async () => {
      attachButton?.click();
    });

    await act(async () => {
      media.setPortrait(true);
    });

    expect(document.body.dataset.storyFrozen).toBe('true');

    await act(async () => {
      media.setPortrait(false);
    });

    // The user's own pause survives: no auto-resume, isPaused stays true.
    expect(fake.resumeCount).toBe(0);
    expect(useStoryStore.getState().isPaused).toBe(true);
    expect(document.body.dataset.storyFrozen).toBeUndefined();

    await act(async () => {
      useStoryStore.setState({ isPaused: false });
      root.unmount();
    });
    container.remove();
  });
});
