import { describe, expect, it } from 'vitest';
import { assetManifest } from '../../assets/manifest';
import {
  P03_FINAL_LINE_ID,
  TYPING_SECONDS_PER_CHARACTER,
  autoHoldSeconds,
  getP03TimelineDialogue,
  lineDisplaySeconds,
  p03DialogueLines,
  p03StoryHoldingLineIds,
  readingHoldSeconds,
  typingSeconds,
  voiceSeconds,
} from './dialogue';

describe('P-03 dialogue', () => {
  it('has the fourteen lines in story order with unique ids and labels', () => {
    expect(p03DialogueLines).toHaveLength(14);
    expect(new Set(p03DialogueLines.map((line) => line.id)).size).toBe(14);
    expect(new Set(p03DialogueLines.map((line) => line.timelineLabel)).size).toBe(14);
    expect(p03DialogueLines[0].text).toBe('Whoop! What a long drive. Percy looks around.');
    expect(p03DialogueLines.at(-1)?.id).toBe(P03_FINAL_LINE_ID);
    // The transition quote comes first, then the final quote.
    expect(p03DialogueLines.at(-2)?.text).toBe(
      'Look! Percy wants to show you what happened here hundreds... no, thousands... oh, even longer ago... billions of years ago!',
    );
    expect(p03DialogueLines.at(-1)?.text).toBe(
      'Percy found it! Traces of ancient water in Jezero Crater! Mars really did have a lake!',
    );
  });

  it('uses Percy only for his two lines, on the left', () => {
    const percy = p03DialogueLines.filter((line) => line.speaker === 'percy');
    expect(percy.map((line) => line.id)).toEqual(['p03-percy-01', 'p03-percy-02']);
    for (const line of percy) {
      expect(line.placement).toBe('percy-top-left');
      expect(line.textAlign).toBe('left');
    }
  });

  it('keeps advance and holdsStory independent', () => {
    const byId = (id: string) => p03DialogueLines.find((line) => line.id === id)!;
    // Narration over the walk: auto, never holds.
    for (const id of ['p03-narrator-01', 'p03-narrator-02', 'p03-narrator-03', 'p03-narrator-04']) {
      expect(byId(id).advance).toBe('auto');
      expect(byId(id).holdsStory).toBe(false);
    }
    // Before the hop, and the transition quote: auto and holding together.
    for (const id of ['p03-narrator-10', 'p03-narrator-11']) {
      expect(byId(id).advance).toBe('auto');
      expect(byId(id).holdsStory).toBe(true);
    }
    // Only the final quote waits for the reader's Continue at the end.
    expect(byId(P03_FINAL_LINE_ID).advance).toBe('manual');
    // Manual lines at stops hold the story.
    expect(byId('p03-narrator-06').advance).toBe('manual');
    expect(byId('p03-narrator-06').holdsStory).toBe(true);
    expect(p03StoryHoldingLineIds).toContain('p03-narrator-10');
    expect(p03StoryHoldingLineIds).not.toContain('p03-narrator-01');
  });

  it('gives every line its own recording in the manifest', () => {
    for (const line of p03DialogueLines) {
      expect(line.audioId, line.id).toBe(line.id.replace('p03-', 'p03-vo-'));
      const entry = assetManifest[line.audioId as string];
      expect(entry?.type, line.id).toBe('audio');
      expect(entry?.path, line.id).toBeTruthy();
      expect(entry?.durationMs, line.id).toBeGreaterThan(0);
    }
  });

  it('splits the shared Narrator 8 file into two slices that do not overlap', () => {
    const first = assetManifest['p03-vo-narrator-08'];
    const second = assetManifest['p03-vo-narrator-09'];
    expect(first.path).toBe(second.path);
    const [start1, length1] = first.sprite as readonly [number, number];
    const [start2, length2] = second.sprite as readonly [number, number];
    expect(start1).toBe(0);
    expect(start1 + length1).toBeLessThanOrEqual(start2);
    // The slices stay inside the 11.86 s recording.
    expect(start2 + length2).toBeLessThanOrEqual(11_860 + 10);
  });

  it('shares no other recording between two lines', () => {
    const plain = p03DialogueLines
      .map((line) => assetManifest[line.audioId as string])
      .filter((entry) => !entry.sprite)
      .map((entry) => entry.path);
    expect(new Set(plain).size).toBe(plain.length);
  });

  it('marks the emphasis texts that appear in their line', () => {
    for (const line of p03DialogueLines.filter((item) => item.emphasis)) {
      expect(line.emphasisText).toBeTruthy();
      expect(line.text).toContain(line.emphasisText as string);
    }
  });

  it('looks lines up by label', () => {
    expect(getP03TimelineDialogue('inspect-rock')?.id).toBe('p03-narrator-04');
    expect(getP03TimelineDialogue('nope')).toBeUndefined();
  });
});

describe('reading and typing time', () => {
  it('holds at least two seconds and then reads at 140 words a minute', () => {
    expect(readingHoldSeconds('Jezero, eh?')).toBe(2);
    expect(readingHoldSeconds(Array.from({ length: 28 }, () => 'word').join(' '))).toBeCloseTo(12);
  });

  it('counts no typing time in reduced motion', () => {
    expect(typingSeconds('Hello there', true)).toBe(0);
    expect(typingSeconds('Hello there', false)).toBeCloseTo(11 * TYPING_SECONDS_PER_CHARACTER);
  });

  it('keeps an auto line on screen at least as long as its recording, in both modes', () => {
    for (const reduced of [false, true]) {
      for (const [text, audio] of [
        ['Jezero, eh?', 1.25],
        ['Percy looks confused.', 1.73],
        ["Percy inspects the surface beneath his wheels. Whoa, it's kinda textured here!", 5.83],
        ['A very short line.', 9],
      ] as const) {
        const hold = autoHoldSeconds(text, audio, reduced);
        expect(typingSeconds(text, reduced) + hold).toBeGreaterThanOrEqual(audio);
      }
    }
  });

  it('keeps every real auto line on screen at least as long as its recording, in both modes', () => {
    for (const line of p03DialogueLines.filter((item) => item.advance === 'auto')) {
      const audio = voiceSeconds(line.audioId);
      expect(audio, line.id).toBeGreaterThan(0);
      for (const reduced of [false, true]) {
        const hold = autoHoldSeconds(line.text, audio, reduced);
        expect(typingSeconds(line.text, reduced) + hold, line.id).toBeGreaterThanOrEqual(audio);
      }
      expect((line.delay ?? 0) + typingSeconds(line.text, false), line.id).toBeGreaterThanOrEqual(audio);
    }
  });

  it('gives every auto line a delay and lets a recording lengthen it', () => {
    for (const line of p03DialogueLines.filter((item) => item.advance === 'auto')) {
      expect(line.delay, line.id).toBeGreaterThanOrEqual(2);
    }
    expect(autoHoldSeconds('Hi.', 9)).toBeGreaterThan(autoHoldSeconds('Hi.'));
  });

  it('plans less screen time in reduced motion', () => {
    const line = p03DialogueLines[1];
    expect(lineDisplaySeconds(line, true)).toBeLessThan(lineDisplaySeconds(line, false));
  });
});
