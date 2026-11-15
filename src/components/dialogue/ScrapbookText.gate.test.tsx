import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStoryStore } from '../../stores/story.store';
import { ScrapbookText } from './ScrapbookText';
import type { DialogueLine } from './types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const line = (extra: Partial<DialogueLine> = {}): DialogueLine => ({
  id: 'gate-test',
  speaker: 'narrator',
  text: 'Hello',
  audioId: null,
  timelineLabel: 'gate-test',
  placement: 'bottom',
  advance: 'manual',
  emphasis: false,
  ...extra,
});

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.useFakeTimers();
  useStoryStore.setState({
    isPaused: false,
    settings: { muted: true, volume: 0.5, reducedMotion: true },
  });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
  vi.useRealTimers();
});

async function show(l: DialogueLine) {
  await act(async () => {
    root.render(<ScrapbookText line={l} />);
  });
}

const gate = () => container.querySelector('.circular-gate, [class*="circular-gate"]');

describe('manual gate delay', () => {
  it('shows Continue at once by default', async () => {
    await show(line());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(gate()).not.toBeNull();
  });

  it('hides Continue until the delay has passed', async () => {
    await show(line({ gateDelay: 3 }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(gate()).toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1200);
    });
    expect(gate()).not.toBeNull();
  });

  it('keeps what is left across a pause instead of restarting', async () => {
    await show(line({ gateDelay: 3 }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    await act(async () => {
      useStoryStore.setState({ isPaused: true });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });
    expect(gate()).toBeNull();
    await act(async () => {
      useStoryStore.setState({ isPaused: false });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1200);
    });
    expect(gate()).not.toBeNull();
  });
});
