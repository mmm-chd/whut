import { useEffect } from 'react';
import { getAudioManager } from './audioManagerInstance';

/**
 * Owns one looping track for as long as `enabled` is true.
 *
 * Ownership sits in a shell (the story shell, the app shell) rather than in a
 * scene, because scenes unmount each other: a scene-owned track would restart
 * or double up at every handoff. Playback is attempted on mount (the reader has
 * usually clicked by then) and retried on the first gesture, which is what
 * browsers require before audio may start. Both paths are idempotent.
 */
export function useScoreTrack(id: string, enabled = true): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const audio = getAudioManager();

    const detach = () => {
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('keydown', onGesture);
    };

    const onGesture = () => {
      audio.playMusic(id);
      detach();
    };

    onGesture();
    window.addEventListener('pointerdown', onGesture);
    window.addEventListener('keydown', onGesture);

    return () => {
      detach();
      // Only our own track is stopped: a handoff to another shell's score must
      // not be silenced by this cleanup.
      audio.stop(id);
    };
  }, [id, enabled]);
}
