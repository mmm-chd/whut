import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { YOUTUBE_API_TIMEOUT_MS, loadYouTubeApi, resetYouTubeApiForTests } from './youtubeApi';

const SRC = 'https://www.youtube.com/iframe_api';
const scripts = () => Array.from(document.querySelectorAll<HTMLScriptElement>(`script[src="${SRC}"]`));

/** A player that exists only so the shape of the real one is satisfied. */
class StubPlayer {
  playVideo() {}

  pauseVideo() {}

  destroy() {}

  mute() {}

  unMute() {}

  setVolume() {}

  addEventListener() {}

  removeEventListener() {}
}

const stubApi = { Player: StubPlayer, PlayerState: { PLAYING: 1, PAUSED: 2, ENDED: 0 } };

/** Pretend the API has finished arriving, the way the real script announces it. */
function arrive() {
  window.YT = stubApi;
  window.onYouTubeIframeAPIReady?.();
}

beforeEach(() => {
  resetYouTubeApiForTests();
  delete window.YT;
  delete window.onYouTubeIframeAPIReady;
  document.head.replaceChildren();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('the YouTube loader', () => {
  it('adds the script once, however many cards ask', async () => {
    const first = loadYouTubeApi();
    const second = loadYouTubeApi();
    expect(scripts()).toHaveLength(1);
    arrive();
    const [a, b] = await Promise.all([first, second]);
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    expect(scripts()).toHaveLength(1);
  });

  it('gives up after the bound, without touching the story', async () => {
    vi.useFakeTimers();
    const result = loadYouTubeApi();
    await vi.advanceTimersByTimeAsync(YOUTUBE_API_TIMEOUT_MS + 1);
    await expect(result).resolves.toEqual({ ok: false, reason: 'timeout' });
  });

  it('reports a blocked or offline script rather than hanging', async () => {
    const result = loadYouTubeApi();
    scripts()[0].dispatchEvent(new Event('error'));
    await expect(result).resolves.toEqual({ ok: false, reason: 'error' });
  });

  it('answers at once when the API is already on the page', async () => {
    window.YT = stubApi;
    await expect(loadYouTubeApi()).resolves.toMatchObject({ ok: true });
    expect(scripts()).toHaveLength(0);
  });

  it('keeps a callback the page had already installed', async () => {
    const previous = vi.fn();
    window.onYouTubeIframeAPIReady = previous;
    const result = loadYouTubeApi();
    arrive();
    await expect(result).resolves.toMatchObject({ ok: true });
    expect(previous).toHaveBeenCalledTimes(1);
  });

  it('settles once, even if the script misbehaves after answering', async () => {
    const result = loadYouTubeApi();
    arrive();
    await result;
    // A second announcement must not throw or settle anything new.
    window.onYouTubeIframeAPIReady?.();
    await expect(result).resolves.toMatchObject({ ok: true });
  });
});
