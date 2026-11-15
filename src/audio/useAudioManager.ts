import { useEffect } from 'react';
import { useStoryStore } from '../stores/story.store';
import { AudioManager } from './audioManager';
import { getAudioManager } from './audioManagerInstance';

/**
 * The shared audio manager plus the story settings it follows.
 *
 * It never unloads on unmount: the manager is page-lifetime so the score can
 * survive a scene swap (see `audioManagerInstance`).
 */
export function useAudioManager(): AudioManager {
  const manager = getAudioManager();
  const muted = useStoryStore((state) => state.settings.muted);
  const volume = useStoryStore((state) => state.settings.volume);
  const isPaused = useStoryStore((state) => state.isPaused);

  useEffect(() => {
    manager.setMuted(muted);
  }, [manager, muted]);

  useEffect(() => {
    manager.setVolume(volume);
  }, [manager, volume]);

  useEffect(() => {
    if (isPaused) {
      manager.pause();
    } else {
      manager.resume();
    }
  }, [manager, isPaused]);

  return manager;
}
