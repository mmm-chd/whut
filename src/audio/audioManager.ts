import { Howl } from 'howler';
import { assetManifest } from '../assets/manifest';

/**
 * Owns Howler instances outside React and Zustand.
 * Missing or placeholder audio is a supported state: text keeps working.
 */
export class AudioManager {
  private sounds = new Map<string, Howl>();
  private currentId: string | null = null;
  private pausedIds = new Set<string>();
  private muted = false;
  private volume = 0.8;
  private warned = new Set<string>();

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.sounds.forEach((sound) => sound.mute(muted));
  }

  setVolume(volume: number): void {
    this.volume = Math.min(1, Math.max(0, volume));
    this.sounds.forEach((sound) => sound.volume(this.volume));
  }

  play(id: string): boolean {
    return this.playSound(id, { stopCurrent: true, loop: false });
  }

  /** Plays persistent scene music without interrupting dialogue voice-over. */
  playMusic(id: string): boolean {
    return this.playSound(id, { stopCurrent: false, loop: true });
  }

  private playSound(id: string, options: { stopCurrent: boolean; loop: boolean }): boolean {
    const entry = assetManifest[id];

    if (!entry || entry.type !== 'audio' || !entry.path) {
      if (!this.warned.has(id)) {
        this.warned.add(id);
        console.warn(`[audio] No playable audio for ${id}; continuing with text.`);
      }
      return false;
    }

    if (options.stopCurrent) {
      this.stopCurrent();
    }

    let sound = this.sounds.get(id);
    if (!sound) {
      sound = new Howl({
        src: [entry.path],
        volume: this.volume,
        mute: this.muted,
        loop: options.loop,
        onloaderror: (_soundId, error) => {
          console.warn(`[audio] Failed to load ${id}:`, error);
        },
        onplayerror: () => {
          console.warn(`[audio] Playback blocked for ${id}; continuing with text.`);
        },
      });
      this.sounds.set(id, sound);
    }

    sound.stop();
    sound.loop(options.loop);
    sound.mute(this.muted);
    sound.volume(this.volume);
    sound.play();
    this.currentId = id;
    this.pausedIds.delete(id);
    return true;
  }

  stop(id: string): void {
    const sound = this.sounds.get(id);
    if (sound) {
      sound.stop();
    }
    if (this.currentId === id) {
      this.currentId = null;
    }
    this.pausedIds.delete(id);
  }

  pause(): void {
    this.sounds.forEach((sound, id) => {
      if (sound.playing()) {
        this.pausedIds.add(id);
        sound.pause();
      }
    });
  }

  resume(): void {
    this.pausedIds.forEach((id) => this.sounds.get(id)?.play());
    this.pausedIds.clear();
  }

  unload(): void {
    this.sounds.forEach((sound) => sound.unload());
    this.sounds.clear();
    this.currentId = null;
    this.pausedIds.clear();
  }

  private stopCurrent(): void {
    if (!this.currentId) {
      return;
    }
    this.sounds.get(this.currentId)?.stop();
    this.currentId = null;
    this.pausedIds.clear();
  }
}
