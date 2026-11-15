import { describe, expect, it } from 'vitest';
import { assetManifest } from '../../assets/manifest';
import { p05RotationHintLine } from './dialogue';

/**
 * The close-up speaks one line: the last quote of P-04's approved script, with
 * its own recording. A line whose `audioId` is not in the manifest would be
 * silent without anyone noticing, so the pairing is asserted here.
 */

describe('p05 rotation hint', () => {
  it('carries the script text and its recording', () => {
    expect(p05RotationHintLine.text).toBe('Excuse me, Percy, just turn around a little...');
    expect(p05RotationHintLine.emphasisText).toBe('turn around');
    expect(p05RotationHintLine.audioId).toBe('p05-vo-rotation-hint');
  });

  it('points at a real, measured recording', () => {
    const entry = assetManifest['p05-vo-rotation-hint'];
    expect(entry).toBeDefined();
    expect(entry.type).toBe('audio');
    // The bundler percent-encodes the URL, so the name is decoded first.
    expect(decodeURIComponent(entry.path)).toContain('P04 - Final Quote');
    // Long enough to be the spoken quote, not a stub.
    expect(entry.durationMs).toBeGreaterThan(2000);
  });

  it('does not hold the story behind a gate: it advances on its own', () => {
    expect(p05RotationHintLine.advance).toBe('auto');
    expect(p05RotationHintLine.holdsStory).toBe(false);
  });

  it('stays longer than its own recording, so it never leaves mid-sentence', () => {
    const seconds = p05RotationHintLine.delay ?? 0;
    const durationMs = assetManifest['p05-vo-rotation-hint'].durationMs ?? 0;
    expect(seconds * 1000).toBeGreaterThan(durationMs);
  });
});