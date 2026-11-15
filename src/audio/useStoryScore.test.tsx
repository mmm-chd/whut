import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioManager } from './audioManager';
import { resetAudioManager } from './audioManagerInstance';
import { STORY_SCORE_ID, useStoryScore } from './useStoryScore';

/**
 * The story shell owns the music, so the hook must start one looping bed when
 * the story mounts, retry on the first gesture (autoplay policies), and stop
 * it when the reader leaves the story.
 */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Harness() {
  useStoryScore();
  return null;
}

let container: HTMLDivElement | null = null;
let root: ReturnType<typeof createRoot> | null = null;

async function mount() {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(<Harness />);
  });
}

async function unmount() {
  await act(async () => {
    root?.unmount();
  });
  container?.remove();
  container = null;
  root = null;
}

beforeEach(() => {
  resetAudioManager();
  vi.spyOn(AudioManager.prototype, 'playMusic').mockReturnValue(true);
  vi.spyOn(AudioManager.prototype, 'stop');
});

afterEach(async () => {
  if (root) {
    await unmount();
  }
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('story score', () => {
  it('starts the shared track as soon as the story mounts', async () => {
    await mount();
    expect(AudioManager.prototype.playMusic).toHaveBeenCalledWith(STORY_SCORE_ID);
  });

  it('retries on the first gesture without restarting the loop', async () => {
    await mount();
    expect(AudioManager.prototype.playMusic).toHaveBeenCalledTimes(1);

    // A blocked autoplay is fixed by the reader's first tap; the manager keeps
    // a track that is already running untouched.
    await act(async () => {
      window.dispatchEvent(new Event('pointerdown'));
    });
    expect(AudioManager.prototype.playMusic).toHaveBeenCalledTimes(2);
    expect(AudioManager.prototype.playMusic).toHaveBeenLastCalledWith(STORY_SCORE_ID);

    // Only the first gesture is listened for.
    await act(async () => {
      window.dispatchEvent(new Event('keydown'));
    });
    expect(AudioManager.prototype.playMusic).toHaveBeenCalledTimes(2);
  });

  it('stops the bed when the story unmounts', async () => {
    await mount();
    await unmount();
    expect(AudioManager.prototype.stop).toHaveBeenCalledWith(STORY_SCORE_ID);
  });

  it('removes its listeners on unmount', async () => {
    await mount();
    await unmount();
    const callsAfterUnmount = vi.mocked(AudioManager.prototype.playMusic).mock.calls.length;

    await act(async () => {
      window.dispatchEvent(new Event('pointerdown'));
      window.dispatchEvent(new Event('keydown'));
    });
    expect(vi.mocked(AudioManager.prototype.playMusic).mock.calls.length).toBe(callsAfterUnmount);
  });
});
