import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAudioManager, resetAudioManager } from '../../../audio/audioManagerInstance';
import { AudioManager } from '../../../audio/audioManager';

declare global {
  // React 19 refuses act() outside a test environment it knows about.
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

const youtube = vi.hoisted(() => {
  const created: FakePlayer[] = [];
  class FakePlayer {
    readonly element: HTMLElement;
    readonly options: Record<string, unknown>;
    destroyed = false;
    volumeCalls: number[] = [];
    muted = false;
    paused = false;
    constructor(element: HTMLElement, options: Record<string, unknown>) {
      this.element = element;
      this.options = options;
      created.push(this);
    }

    playVideo() {}

    pauseVideo() {
      this.paused = true;
    }

    destroy() {
      this.destroyed = true;
    }

    mute() {
      this.muted = true;
    }

    unMute() {
      this.muted = false;
    }

    setVolume(value: number) {
      this.volumeCalls.push(value);
    }

    addEventListener() {}

    removeEventListener() {}

    get events() {
      return this.options.events as {
        onReady?: (event: { target: FakePlayer }) => void;
        onStateChange?: (event: { data: number; target: FakePlayer }) => void;
        onError?: (event: { data: number }) => void;
      };
    }
  }
  return { created, FakePlayer };
});

const loadState = vi.hoisted(() => ({
  /** The promise the hook is handed; a forever-pending one means "still offline". */
  promise: new Promise<unknown>(() => {}) as Promise<unknown>,
}));

vi.mock('../player/youtubeApi', () => ({
  loadYouTubeApi: () => loadState.promise,
}));

import { VideoCard, P06_VIDEO_WATCH_URL } from './VideoCard';

let root: Root | null = null;
let host: HTMLDivElement | null = null;

/** Let the loader promise, the player construction and the re-render all land. */
const flush = async () => {
  for (let i = 0; i < 4; i += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
};

function render(active = true) {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  act(() => {
    root?.render(<VideoCard active={active} />);
  });
}

/** Press the poster: this is the moment anything is allowed to load. */
async function openDialog() {
  const trigger = document.querySelector<HTMLButtonElement>('[data-video-open]');
  act(() => {
    trigger?.click();
  });
  await flush();
}

function apiReady(ok = true) {
  loadState.promise = Promise.resolve(
    ok
      ? {
          ok: true,
          api: {
            Player: youtube.FakePlayer,
            PlayerState: { PLAYING: 1, PAUSED: 2, ENDED: 0 },
          },
        }
      : { ok: false, reason: 'error' },
  );
}

// jsdom does not implement the dialog's modal behaviour; these two methods are
// all the component uses, and `open` plus the `close` event are what it reads.
beforeEach(() => {
  const proto = window.HTMLDialogElement?.prototype;
  if (proto && !('showModal' in proto)) {
    Object.defineProperty(proto, 'showModal', {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.open = true;
      },
    });
  }
  if (proto && !('close' in proto)) {
    Object.defineProperty(proto, 'close', {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.open = false;
        this.dispatchEvent(new Event('close'));
      },
    });
  }
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  youtube.created.length = 0;
  loadState.promise = new Promise(() => {});
  resetAudioManager();
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = null;
  host?.remove();
  host = null;
});

describe('the video on card one', () => {
  it('offers a poster and a real link, and loads nothing until pressed', async () => {
    apiReady();
    render();
    await flush();
    expect(youtube.created).toHaveLength(0);
    expect(document.querySelector('[data-video-open]')).not.toBeNull();
    const link = document.querySelector<HTMLAnchorElement>('.p06-video-link');
    expect(link?.href).toBe(P06_VIDEO_WATCH_URL);
    expect(link?.rel).toContain('noopener');
    expect(document.querySelector('[data-video-dialog]')?.hasAttribute('open')).toBe(false);
  });

  it('creates exactly one player for the fixed video once the dialog opens', async () => {
    apiReady();
    render();
    await openDialog();
    expect(youtube.created).toHaveLength(1);
    expect(youtube.created[0].options.videoId).toBe('9bLhVJKoIOg');
    const vars = youtube.created[0].options.playerVars as Record<string, number>;
    expect(vars.autoplay).toBe(0);
    expect(vars.loop).toBe(0);
    expect(youtube.created[0].options.host).toBe('https://www.youtube-nocookie.com');
  });

  it('falls back to text and the link when the API never arrives', async () => {
    apiReady(false);
    render();
    await openDialog();
    expect(youtube.created).toHaveLength(0);
    expect(document.querySelector('[data-video-fallback]')).not.toBeNull();
    expect(document.querySelector('.p06-video-link')).not.toBeNull();
  });

  it('falls back when the player reports an error, and lets the score go', async () => {
    apiReady();
    render();
    await openDialog();
    const player = youtube.created[0];
    const hold = vi.spyOn(AudioManager.prototype, 'holdMusic');
    act(() => {
      player.events.onReady?.({ target: player });
      player.events.onStateChange?.({ data: 1, target: player });
      player.events.onError?.({ data: 150 });
    });
    expect(document.querySelector('[data-video-fallback]')).not.toBeNull();
    // The hold has been taken and given back: nothing is left holding the score.
    expect(hold).toHaveBeenCalledTimes(1);
    expect(getAudioManager().isMusicHeld()).toBe(false);
    hold.mockRestore();
  });

  it('holds the score while the video plays and releases it when it stops', async () => {
    apiReady();
    render();
    await openDialog();
    const player = youtube.created[0];
    act(() => {
      player.events.onReady?.({ target: player });
    });
    expect(getAudioManager().isMusicHeld()).toBe(false);

    act(() => {
      player.events.onStateChange?.({ data: 1, target: player });
    });
    expect(getAudioManager().isMusicHeld()).toBe(true);

    act(() => {
      player.events.onStateChange?.({ data: 2, target: player });
    });
    expect(getAudioManager().isMusicHeld()).toBe(false);
  });

  it('applies the shell volume and mute to the player that is already there', async () => {
    apiReady();
    render();
    await openDialog();
    const player = youtube.created[0];
    act(() => {
      player.events.onReady?.({ target: player });
    });
    expect(player.volumeCalls.at(-1)).toBe(80);
    expect(player.muted).toBe(false);
  });

  it('destroys the player when the dialog is closed, and gets out of the way', async () => {
    apiReady();
    render();
    await openDialog();
    const player = youtube.created[0];
    act(() => {
      document.querySelector<HTMLButtonElement>('[data-video-close]')?.click();
    });
    await flush();
    expect(player.destroyed).toBe(true);
    const dialog = document.querySelector<HTMLDialogElement>('[data-video-dialog]');
    expect(dialog?.open).toBe(false);
    // Focus goes back to the poster, not to the top of the page.
    expect(document.activeElement).toBe(document.querySelector('[data-video-open]'));
  });

  it('destroys the player on unmount and ignores a late arrival', async () => {
    let resolveLoad: (value: unknown) => void = () => {};
    loadState.promise = new Promise((resolve) => {
      resolveLoad = resolve;
    });
    render();
    await openDialog();
    act(() => {
      root?.unmount();
    });
    root = null;
    resolveLoad({
      ok: true,
    
    });
    await flush();
    expect(youtube.created).toHaveLength(0);
  });
});
