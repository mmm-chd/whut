import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioManager } from './audioManager';
import { resetAudioManager } from './audioManagerInstance';
import { MENU_SCORE_ID, useMenuScore } from './useMenuScore';

/**
 * The menu bed covers the splash, the launchpad and the character journal, and
 * it stops the moment the story takes over (the story shell mounts its own
 * score then).
 */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Harness({ enabled }: { enabled: boolean }) {
  useMenuScore(enabled);
  return null;
}

let container: HTMLDivElement | null = null;
let root: ReturnType<typeof createRoot> | null = null;

async function render(enabled: boolean) {
  if (!root) {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  }
  const activeRoot = root;
  await act(async () => {
    activeRoot.render(<Harness enabled={enabled} />);
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

describe('menu score', () => {
  it('starts the shared track for the pages outside the story', async () => {
    await render(true);
    expect(AudioManager.prototype.playMusic).toHaveBeenCalledWith(MENU_SCORE_ID);
  });

  it('stays silent while the story owns the audio', async () => {
    await render(false);
    expect(AudioManager.prototype.playMusic).not.toHaveBeenCalled();
  });

  it('keeps the track running when only the route changes', async () => {
    // homepage -> /characters: the shell re-renders, the effect must not rerun.
    await render(true);
    await render(true);
    expect(AudioManager.prototype.playMusic).toHaveBeenCalledTimes(1);
    expect(AudioManager.prototype.stop).not.toHaveBeenCalledWith(MENU_SCORE_ID);
  });

  it('hands over to the story and back without layering tracks', async () => {
    await render(true);
    await render(false);

    expect(AudioManager.prototype.stop).toHaveBeenCalledWith(MENU_SCORE_ID);

    await render(true);
    expect(AudioManager.prototype.playMusic).toHaveBeenCalledTimes(2);
    expect(AudioManager.prototype.playMusic).toHaveBeenLastCalledWith(MENU_SCORE_ID);
  });
});
