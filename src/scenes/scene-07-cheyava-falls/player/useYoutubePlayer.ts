import { useEffect, useRef, useState } from 'react';
import { getAudioManager } from '../../../audio/audioManagerInstance';
import { useStoryStore } from '../../../stores/story.store';
import { loadYouTubeApi, type YouTubePlayerLike } from './youtubeApi';

/**
 * One YouTube player, owned by card one only.
 *
 * The player is created after the card finishes revealing, never before: a
 * reader who opens cards two to five never touches the network. Every callback
 * checks whether the run it belongs to is still alive, so a late API load cannot
 * attach a player to a card that has closed, or to a second copy of itself.
 */
export type PlayerStatus = 'loading' | 'ready' | 'unavailable';

export interface PlayerOptions {
  readonly container: HTMLElement | null;
  /** Only the card that owns the video may mount it. */
  readonly enabled: boolean;
  readonly videoId: string;
  /** Global story pause and hidden page: pause the video, never the story. */
  readonly paused: boolean;
  readonly muted: boolean;
  readonly volume: number;
}

export interface PlayerHandle {
  readonly status: PlayerStatus;
  readonly failure: 'timeout' | 'error' | 'unavailable' | null;
}

/** State numbers from the IFrame API, kept here so no test needs the network. */
const PLAYING = 1;
const PAUSED = 2;
const ENDED = 0;

export function useYoutubePlayer(options: PlayerOptions): PlayerHandle {
  const { container, enabled, videoId, muted, volume } = options;
  const [status, setStatus] = useState<PlayerStatus>('loading');
  const [failure, setFailure] = useState<PlayerHandle['failure']>(null);
  const playerRef = useRef<YouTubePlayerLike | null>(null);
  const releaseRef = useRef<(() => void) | null>(null);

  // A player reference that outlives a callback, plus one flag that makes every
  // later callback from this mount inert.
  useEffect(() => {
    if (!enabled || !container) {
      return;
    }
    let live = true;

    const releaseHold = () => {
      releaseRef.current?.();
      releaseRef.current = null;
    };
    const takeHold = () => {
      if (!releaseRef.current) {
        releaseRef.current = getAudioManager().holdMusic(Symbol('p06-video'));
      }
    };

    void loadYouTubeApi().then((result) => {
      if (!live) {
        return;
      }
      if (!result.ok) {
        setFailure(result.reason);
        setStatus('unavailable');
        return;
      }
      const host = document.createElement('div');
      container.replaceChildren(host);
      const onStateChange = (event: { data: number }) => {
        if (!live) {
          return;
        }
        // The video's own sound outranks the score while it plays.
        if (event.data === PLAYING) {
          takeHold();
        } else if (event.data === PAUSED || event.data === ENDED) {
          releaseHold();
        }
      };
      try {
        playerRef.current = new result.api.Player(host, {
          videoId,
          // The privacy-enhanced host is used for the actual embed.
          host: 'https://www.youtube-nocookie.com',
          playerVars: {
            autoplay: 0,
            loop: 0,
            rel: 0,
            playsinline: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              if (!live) {
                return;
              }
              const player = playerRef.current;
              if (!player) {
                return;
              }
              // Settings applied at the moment the player can hear them, read
              // from the store so the creation effect needs no settings deps.
              const settings = useStoryStore.getState().settings;
              player.setVolume(Math.round(Math.min(1, Math.max(0, settings.volume)) * 100));
              if (settings.muted) {
                player.mute();
              } else {
                player.unMute();
              }
              setStatus('ready');
            },
            onStateChange: (event) => onStateChange(event),
            onError: () => {
              if (!live) {
                return;
              }
              releaseHold();
              setFailure('error');
              setStatus('unavailable');
            },
          },
        });
      } catch {
        setFailure('error');
        setStatus('unavailable');
      }
    });

    return () => {
      live = false;
      releaseHold();
      const player = playerRef.current;
      playerRef.current = null;
      if (player) {
        try {
          player.destroy();
        } catch {
          // A player that is already gone needs no teardown.
        }
      }
      container.replaceChildren();
    };
  }, [container, enabled, videoId]);

  // Mute and volume follow the shell, applied to the player that already exists.
  useEffect(() => {
    const player = playerRef.current;
    if (!player || status !== 'ready') {
      return;
    }
    player.setVolume(Math.round(Math.min(1, Math.max(0, volume)) * 100));
    if (muted) {
      player.mute();
    } else {
      player.unMute();
    }
  }, [muted, status, volume]);

  // The story's pause reaches the video; it never travels the other way.
  useEffect(() => {
    const player = playerRef.current;
    if (!player || status !== 'ready') {
      return;
    }
    if (options.paused) {
      player.pauseVideo();
      releaseRef.current?.();
      releaseRef.current = null;
    }
  }, [options.paused, status]);

  return { status, failure };
}
