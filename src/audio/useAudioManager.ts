import { useEffect, useRef } from 'react';
import { useStoryStore } from '../stores/story.store';
import { AudioManager } from './audioManager';

export function useAudioManager(): AudioManager {
  const managerRef = useRef<AudioManager | null>(null);

  if (!managerRef.current) {
    managerRef.current = new AudioManager();
  }

  const manager = managerRef.current;
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

  useEffect(() => {
    return () => manager.unload();
  }, [manager]);

  return manager;
}
