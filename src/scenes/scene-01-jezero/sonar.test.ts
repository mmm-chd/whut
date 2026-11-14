import { describe, expect, it } from 'vitest';
import { getSonarMode } from './sonar';

const base = { status: 'waiting' as const, inspected: false, paused: false, cardOpen: false };

describe('getSonarMode', () => {
  it('runs while the rock can be inspected', () => {
    expect(getSonarMode(base)).toBe('run');
  });

  it('is off before the scene is waiting', () => {
    expect(getSonarMode({ ...base, status: 'playing' })).toBe('off');
    expect(getSonarMode({ ...base, status: 'idle' })).toBe('off');
    expect(getSonarMode({ ...base, status: 'completed' })).toBe('off');
  });

  it('stops for an inspected rock', () => {
    expect(getSonarMode({ ...base, inspected: true })).toBe('off');
  });

  it('pauses while playback is paused', () => {
    expect(getSonarMode({ ...base, paused: true })).toBe('paused');
  });

  it('pauses while a fact card is open', () => {
    expect(getSonarMode({ ...base, cardOpen: true })).toBe('paused');
  });

  it('prefers off over paused when the rock is inspected', () => {
    expect(getSonarMode({ ...base, inspected: true, paused: true })).toBe('off');
  });
});
