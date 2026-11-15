/**
 * The official YouTube IFrame API, loaded once for the whole page.
 *
 * Three rules make this safe to call from a scene that can unmount at any
 * moment: the script is added once no matter how many callers ask, the promise
 * settles exactly once, and a failed load is remembered so a second card does
 * not start a second download of something that is already known to be broken.
 */

export const YOUTUBE_API_TIMEOUT_MS = 12_000;
const API_SRC = 'https://www.youtube.com/iframe_api';

/** The slice of the API this scene uses, and nothing more. */
export interface YouTubePlayerLike {
  playVideo: () => void;
  pauseVideo: () => void;
  destroy: () => void;
  mute: () => void;
  unMute: () => void;
  setVolume: (volume: number) => void;
  addEventListener: (event: string, handler: (event: unknown) => void) => void;
  removeEventListener: (event: string, handler: (event: unknown) => void) => void;
}

export interface YouTubeApi {
  Player: new (
    element: HTMLElement | string,
    options: {
      videoId: string;
      host?: string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: (event: { target: YouTubePlayerLike }) => void;
        onStateChange?: (event: { data: number; target: YouTubePlayerLike }) => void;
        onError?: (event: { data: number }) => void;
      };
    },
  ) => YouTubePlayerLike;
  PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
}

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export type YouTubeLoadResult =
  | { readonly ok: true; readonly api: YouTubeApi }
  | { readonly ok: false; readonly reason: 'timeout' | 'error' | 'unavailable' };

let pending: Promise<YouTubeLoadResult> | null = null;

/** True once a load has failed; the deck falls back to text and a link. */
export function resetYouTubeApiForTests(): void {
  pending = null;
}

/**
 * Loads the API, or returns the answer already known. Never rejects: the caller
 * has a text fallback for every failure, so a thrown error would only become an
 * unhandled rejection.
 */
export function loadYouTubeApi(
  timeoutMs: number = YOUTUBE_API_TIMEOUT_MS,
): Promise<YouTubeLoadResult> {
  if (typeof document === 'undefined') {
    return Promise.resolve({ ok: false, reason: 'unavailable' } as const);
  }
  if (window.YT?.Player) {
    return Promise.resolve({ ok: true, api: window.YT } as const);
  }
  if (pending) {
    return pending;
  }

  pending = new Promise<YouTubeLoadResult>((resolve) => {
    let settled = false;
    const previous = window.onYouTubeIframeAPIReady;
    const finish = (result: YouTubeLoadResult) => {
      if (settled) {
        return;
      }
      settled = true;
      window.clearTimeout(timer);
      resolve(result);
    };
    const timer = window.setTimeout(() => finish({ ok: false, reason: 'timeout' }), timeoutMs);

    // Somebody else may own this global (another player library, an embed on the
    // page). Chain rather than replace, so their callback still runs.
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      finish(window.YT?.Player ? { ok: true, api: window.YT } : { ok: false, reason: 'error' });
    };

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${API_SRC}"]`);
    if (existing) {
      existing.addEventListener('error', () => finish({ ok: false, reason: 'error' }), {
        once: true,
      });
      return;
    }
    const script = document.createElement('script');
    script.src = API_SRC;
    script.async = true;
    script.addEventListener('error', () => finish({ ok: false, reason: 'error' }), { once: true });
    document.head.appendChild(script);
  });

  return pending;
}
