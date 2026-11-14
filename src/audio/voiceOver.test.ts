import { describe, expect, it } from 'vitest';
import { assetManifest } from '../assets/manifest';
import { dialogueLines } from '../scenes/scene-01-jezero/dialogue';
import { p02DialogueLines } from '../scenes/scene-02-launch-to-mars/dialogue';

const voiced = [...dialogueLines, ...p02DialogueLines].filter((line) => line.audioId);

describe('voice-over wiring', () => {
  it('gives every voiced P-01 and P-02 line a real audio file', () => {
    expect(voiced.length).toBe(9);
    for (const line of voiced) {
      const entry = assetManifest[line.audioId as string];
      expect(entry?.type, line.id).toBe('audio');
      expect(entry?.path, line.id).toBeTruthy();
      expect(entry?.status, line.id).toBe('final');
    }
  });

  it('never shares one recording between two lines except through sprites', () => {
    const plain = voiced
      .map((line) => assetManifest[line.audioId as string])
      .filter((entry) => !entry.sprite)
      .map((entry) => entry.path);
    expect(new Set(plain).size).toBe(plain.length);
  });

  it('splits the shared P-01 narrator file into two non-overlapping slices', () => {
    const first = assetManifest['vo-narrator-01'];
    const second = assetManifest['vo-narrator-02'];
    expect(first.path).toBe(second.path);
    const [start1, length1] = first.sprite as readonly [number, number];
    const [start2] = second.sprite as readonly [number, number];
    expect(start1).toBe(0);
    expect(start1 + length1).toBeLessThanOrEqual(start2);
  });

  it('leaves the line without a recording silent', () => {
    expect(dialogueLines.find((line) => line.id === 'card-closing')?.audioId).toBeNull();
  });
});
