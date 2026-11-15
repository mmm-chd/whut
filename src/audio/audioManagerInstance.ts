import { AudioManager } from './audioManager';

/**
 * One audio manager for the whole page.
 *
 * Scenes hand over by unmounting, and a fresh manager per scene meant a fresh
 * set of Howls per scene: the outgoing scene's score kept looping while the
 * next scene started a second copy of the same file. Sharing one manager keeps
 * a single looping bed, one narration channel, and one volume/mute state while
 * the reader walks from P-01 to P-03.
 */
let instance: AudioManager | null = null;

export function getAudioManager(): AudioManager {
  if (!instance) {
    instance = new AudioManager();
  }
  return instance;
}

/** Test seam: forget the shared manager so each test starts silent. */
export function resetAudioManager(): void {
  instance?.unload();
  instance = null;
}
