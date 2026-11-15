import { Howl } from 'howler';
import { assetManifest } from '../assets/manifest';

/** Name of the single slice a sprite manifest entry plays. */
const SPRITE = 'clip';

/**
 * Looping music plays at this share of the master volume, so it stays a quiet
 * bed under the narration instead of covering it.
 */
export const MUSIC_GAIN = 0.1;

/** Voice-over is boosted (capped at full scale) so it stays clear over the music. */
export const VOICE_GAIN = 1.25;

/**
 * Owns Howler instances outside React and Zustand.
 * Missing or placeholder audio is a supported state: text keeps working.
 */
export class AudioManager {
  private sounds = new Map<string, Howl>();
  private currentId: string | null = null;
  /** The looping bed; kept apart from `currentId` so a narration line cannot cut it. */
  private musicId: string | null = null;
  private pausedIds = new Set<string>();
  private muted = false;
  private volume = 0.8;
  private warned = new Set<string>();
  private musicIds = new Set<string>();

  private levelFor(id: string): number {
    return this.musicIds.has(id)
      ? this.volume * MUSIC_GAIN
      : Math.min(1, this.volume * VOICE_GAIN);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.sounds.forEach((sound) => sound.mute(muted));
  }

  setVolume(volume: number): void {
    this.volume = Math.min(1, Math.max(0, volume));
    this.sounds.forEach((sound, id) => sound.volume(this.levelFor(id)));
  }

  play(id: string): boolean {
    return this.playSound(id, { stopCurrent: true, loop: false });
  }

  /**
   * Plays the persistent score. Calling it again with the track that is already
   * running is a no-op: scene handoffs must not restart the loop from zero.
   */
  playMusic(id: string): boolean {
    if (this.musicId === id && this.sounds.get(id)?.playing()) {
      return true;
    }
    if (this.musicId && this.musicId !== id) {
      // A different bed replaces the old one; two scores never layer.
      this.sounds.get(this.musicId)?.stop();
      this.musicId = null;
    }
    return this.playSound(id, { stopCurrent: false, loop: true });
  }

  /** True while `id` owns the looping bed. */
  isMusicPlaying(id: string): boolean {
    return this.musicId === id;
  }

  private playSound(id: string, options: { stopCurrent: boolean; loop: boolean }): boolean {
    const entry = assetManifest[id];
    if (options.loop) {
      this.musicIds.add(id);
    } else {
      this.musicIds.delete(id);
    }

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
        sprite: entry.sprite ? { [SPRITE]: [...entry.sprite] } : undefined,
        volume: this.levelFor(id),
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
    sound.volume(this.levelFor(id));
    // A sprite entry plays its slice of the shared file.
    if (entry.sprite) {
      sound.play(SPRITE);
    } else {
      sound.play();
    }
    // Only one-shot lines arm `stopCurrent`; the score owns `musicId` instead,
    // so a voice-over never stops the music underneath it.
    if (options.loop) {
      this.musicId = id;
    } else {
      this.currentId = id;
    }
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
    if (this.musicId === id) {
      this.musicId = null;
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
    this.musicId = null;
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
