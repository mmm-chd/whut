import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioManager } from './audioManager';
import { getAudioManager, resetAudioManager } from './audioManagerInstance';

/**
 * Howler is mocked so the assertions are about our policy (one looping bed,
 * idempotent starts, narration never cutting the score) rather than about
 * decoding real audio in jsdom.
 */
const howler = vi.hoisted(() => {
  interface FakeOptions {
    src: string[];
    loop?: boolean;
  }

  class FakeHowl {
    opts: FakeOptions;
    playCalls = 0;
    stopCalls = 0;
    unloadCalls = 0;
    loopValue: boolean | undefined;
    private playingValue = false;

    constructor(opts: FakeOptions) {
      this.opts = opts;
      this.loopValue = opts.loop;
      howler.instances.push(this);
    }

    play() {
      this.playCalls += 1;
      this.playingValue = true;
      return 1;
    }

    stop() {
      this.stopCalls += 1;
      this.playingValue = false;
      return this;
    }

    pause() {
      this.playingValue = false;
      return this;
    }

    playing() {
      return this.playingValue;
    }

    loop(value: boolean) {
      this.loopValue = value;
      return this;
    }

    volume() {
      return this;
    }

    mute() {
      return this;
    }

    unload() {
      this.unloadCalls += 1;
      return this;
    }
  }

  const instances: FakeHowl[] = [];
  return { FakeHowl, instances };
});

vi.mock('howler', () => ({ Howl: howler.FakeHowl }));

const SCORE = 'music-perseverance';
const OTHER_SCORE = 'music-kindred-spirits';

beforeEach(() => {
  howler.instances.length = 0;
  resetAudioManager();
});

describe('one shared manager', () => {
  it('hands the same instance to every caller', () => {
    expect(getAudioManager()).toBe(getAudioManager());
  });

  it('forgets the instance on reset', () => {
    const first = getAudioManager();
    resetAudioManager();
    expect(getAudioManager()).not.toBe(first);
  });
});

describe('looping score', () => {
  it('loops the track', () => {
    const audio = new AudioManager();
    audio.playMusic(SCORE);

    expect(howler.instances).toHaveLength(1);
    expect(howler.instances[0].loopValue).toBe(true);
  });

  it('keeps playing when a scene asks for the same track again', () => {
    // This is the scene handoff: P-02 asking for the bed P-01 already started
    // must not restart it from zero.
    const audio = new AudioManager();
    audio.playMusic(SCORE);
    const bed = howler.instances[0];
    const stopsAfterStart = bed.stopCalls;

    audio.playMusic(SCORE);
    audio.playMusic(SCORE);

    expect(howler.instances).toHaveLength(1);
    expect(bed.playCalls).toBe(1);
    expect(bed.stopCalls).toBe(stopsAfterStart);
    expect(audio.isMusicPlaying(SCORE)).toBe(true);
  });

  it('replaces a different track instead of layering two', () => {
    const audio = new AudioManager();
    audio.playMusic(SCORE);
    const first = howler.instances[0];

    audio.playMusic(OTHER_SCORE);

    expect(first.stopCalls).toBeGreaterThan(0);
    expect(audio.isMusicPlaying(OTHER_SCORE)).toBe(true);
    expect(audio.isMusicPlaying(SCORE)).toBe(false);
  });

  it('stops the bed on request (leaving the story)', () => {
    const audio = new AudioManager();
    audio.playMusic(SCORE);
    audio.stop(SCORE);

    expect(howler.instances[0].stopCalls).toBeGreaterThan(0);
    expect(audio.isMusicPlaying(SCORE)).toBe(false);
  });
});

describe('narration over the score', () => {
  it('does not stop the music when a line starts', () => {
    const audio = new AudioManager();
    audio.playMusic(SCORE);
    const bed = howler.instances[0];
    const stopsAfterStart = bed.stopCalls;

    audio.play('vo-percy-01');

    expect(bed.stopCalls).toBe(stopsAfterStart);
    expect(audio.isMusicPlaying(SCORE)).toBe(true);
  });

  it('still stops the previous line for the next one', () => {
    const audio = new AudioManager();
    audio.play('vo-percy-01');
    const firstLine = howler.instances[0];

    audio.play('vo-percy-02');

    expect(firstLine.stopCalls).toBeGreaterThan(0);
  });

  it('pauses and resumes the bed with the story', () => {
    const audio = new AudioManager();
    audio.playMusic(SCORE);
    const bed = howler.instances[0];

    audio.pause();
    expect(bed.playing()).toBe(false);

    audio.resume();
    expect(bed.playing()).toBe(true);
  });
});
