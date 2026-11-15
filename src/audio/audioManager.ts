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

/** The bed rises and falls over these times, so a hand-off is never a click. */
export const MUSIC_FADE_IN_MS = 1800;
export const MUSIC_FADE_OUT_MS = 900;

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
  private voiceShare = 1;
  private musicShare = 1;
  /** Bumped whenever a bed starts or stops, so a stale fade-out cannot cut a new start. */
  private fadeGeneration = new Map<string, number>();
  private warned = new Set<string>();
  private musicIds = new Set<string>();
  /**
   * Everyone who asked the score to stand down — a video with its own sound, for
   * instance. Holds are counted, not boolean: two owners overlapping must not
   * resume the bed when the first of them lets go.
   */
  private musicHolders = new Set<symbol>();

  private levelFor(id: string): number {
    return this.musicIds.has(id)
      ? this.volume * MUSIC_GAIN * this.musicShare
      : Math.min(1, this.volume * VOICE_GAIN * this.voiceShare);
  }

  private bump(id: string): number {
    const next = (this.fadeGeneration.get(id) ?? 0) + 1;
    this.fadeGeneration.set(id, next);
    return next;
  }

  /** Narration level as a share of the master volume. */
  setVoiceVolume(share: number): void {
    this.voiceShare = Math.min(1, Math.max(0, share));
    this.sounds.forEach((sound, id) => sound.volume(this.levelFor(id)));
  }

  /** Background music level as a share of the master volume. */
  setMusicVolume(share: number): void {
    this.musicShare = Math.min(1, Math.max(0, share));
    this.sounds.forEach((sound, id) => sound.volume(this.levelFor(id)));
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

  /** True while somebody holds the score down, so the game can tell why it is quiet. */
  isMusicHeld(): boolean {
    return this.musicHolders.size > 0;
  }

  /**
   * Silences the looping bed until the returned release is called. It only ever
   * touches the score: voice-over, one-shot effects and the shell's mute and
   * volume are left exactly as they are. Releasing is idempotent, and the bed is
   * only resumed if this manager still owns it and nothing else has paused it.
   */
  holdMusic(owner: symbol): () => void {
    this.musicHolders.add(owner);
    if (this.musicId) {
      this.sounds.get(this.musicId)?.pause();
    }
    let released = false;
    return () => {
      if (released) {
        return;
      }
      released = true;
      this.musicHolders.delete(owner);
      if (this.musicHolders.size > 0) {
        return;
      }
      const id = this.musicId;
      if (!id || this.pausedIds.has(id)) {
        return;
      }
      this.sounds.get(id)?.play();
    };
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
    if (options.loop) {
      this.bump(id);
      if (typeof sound.fade === 'function' && this.musicHolders.size === 0) {
        // Rise from silence instead of starting at full level.
        sound.volume(0);
        sound.fade(0, this.levelFor(id), MUSIC_FADE_IN_MS);
      }
    }
    if (options.loop && this.musicHolders.size > 0) {
      // A score asked for during a hold is remembered but stays silent.
      sound.pause();
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
    if (sound && this.musicIds.has(id) && this.musicId === id && sound.playing() && typeof sound.fade === 'function') {
      // The bed fades out, then stops, unless somebody started it again meanwhile.
      const generation = this.bump(id);
      sound.fade(sound.volume() as number, 0, MUSIC_FADE_OUT_MS);
      window.setTimeout(() => {
        if (this.fadeGeneration.get(id) === generation) {
          this.sounds.get(id)?.stop();
        }
      }, MUSIC_FADE_OUT_MS + 50);
      this.musicId = null;
      this.pausedIds.delete(id);
      return;
    }
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
      // A held bed is already silent, but the pause still has to be remembered:
      // otherwise releasing the hold would start it against the shell's wishes.
      if (id === this.musicId && this.musicHolders.size > 0) {
        this.pausedIds.add(id);
      }
      if (sound.playing()) {
        this.pausedIds.add(id);
        sound.pause();
      }
    });
  }

  resume(): void {
    this.pausedIds.forEach((id) => {
      // A held score stays down even when the rest of the shell resumes.
      if (id === this.musicId && this.musicHolders.size > 0) {
        return;
      }
      this.sounds.get(id)?.play();
    });
    this.pausedIds.clear();
  }

  unload(): void {
    this.musicHolders.clear();
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
