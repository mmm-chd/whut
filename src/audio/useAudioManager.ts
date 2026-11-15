import { useEffect } from 'react';
import { useStoryStore } from '../stores/story.store';
import { AudioManager } from './audioManager';
import { getAudioManager } from './audioManagerInstance';

/**
 * The shared audio manager plus the story settings it follows.
 *
 * `presentationPausedOverride` adds a scene-owned hold on top of the store's pause.
 * It never unloads on unmount: the manager is page-lifetime so the score can
 * survive a scene swap (see `audioManagerInstance`).
 */
export function useAudioManager(presentationPausedOverride = false): AudioManager {
  const manager = getAudioManager();
  const muted = useStoryStore((state) => state.settings.muted);
  const volume = useStoryStore((state) => state.settings.volume);
  const voiceVolume = useStoryStore((state) => state.settings.voiceVolume);
  const musicVolume = useStoryStore((state) => state.settings.musicVolume);
  const isPaused = useStoryStore((state) => state.isPaused);

  useEffect(() => {
    manager.setMuted(muted);
  }, [manager, muted]);

  useEffect(() => {
    manager.setVolume(volume);
  }, [manager, volume]);

  useEffect(() => {
    manager.setVoiceVolume(voiceVolume ?? 1);
  }, [manager, voiceVolume]);

  useEffect(() => {
    manager.setMusicVolume(musicVolume ?? 1);
  }, [manager, musicVolume]);

  // A hidden tab or a rotated phone holds the audio too, without touching the
  // store's own pause flag, so a store resume cannot restart sound the host is
  // still holding back.
  const held = isPaused || presentationPausedOverride;
  useEffect(() => {
    if (held) {
      manager.pause();
    } else {
      manager.resume();
    }
  }, [manager, held]);

  return manager;
}
