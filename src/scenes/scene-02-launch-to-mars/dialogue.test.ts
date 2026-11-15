import { describe, expect, it } from 'vitest';
import {
  getP02TimelineDialogue,
  p02DialogueLines,
  p02StoryHoldingLineIds,
} from './dialogue';

/**
 * Mirrors `dialogue.ts` exactly. The spoken script is the source of truth, so a
 * copy change updates both files together and this test keeps them locked.
 */
const exactCopy = [
  'It all started on July 30, 2020. Percy being carried by Atlas V 541 zooming out to sky from Cape Canaveral Air Force Station, Florida',
  "A journey that excites Percy,  he's been told to land on Jazero, a crater in Mars that has been standing since its planet's old age. Waaaaa, faaaaar older than Percy",
  "Oh! look! Percy isn't alone in this journey. He’s going with his brother, Ginny! well, we’ll hear more about The Dynamic Duo and their journey up there",
  'Lets join Percy and Ginny in this Nasa Mission!',
];

describe('p02DialogueLines', () => {
  it('keeps the four approved passages verbatim', () => {
    expect(p02DialogueLines.map((line) => line.text)).toEqual(exactCopy);
  });

  it('uses unique ids and timeline labels', () => {
    const ids = p02DialogueLines.map((line) => line.id);
    const labels = p02DialogueLines.map((line) => line.timelineLabel);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('keeps every line narrated, voiced, manual, bare, and right aligned', () => {
    for (const line of p02DialogueLines) {
      expect(line.speaker).toBe('narrator');
      expect(line.audioId).toBe(`p02-vo-${line.id.replace('p02-', '')}`);
      expect(line.advance).toBe('manual');
      expect(line.delay).toBeUndefined();
      expect(line.holdsStory).toBe(true);
      expect(line.trigger).toBe('timeline');
      expect(line.panel).toBe(false);
      expect(line.textSize).toBe('normal');
      expect(line.textAlign).toBe('right');
    }
  });

  it('marks the intended emphasis phrases only', () => {
    expect(p02DialogueLines[0]).toMatchObject({
      emphasis: true,
      emphasisText: 'July 30, 2020',
    });
    expect(p02DialogueLines[1]).toMatchObject({
      emphasis: true,
      emphasisText: 'Jazero',
    });
    expect(p02DialogueLines[2]).toMatchObject({
      emphasis: true,
      emphasisText: 'The Dynamic Duo',
    });
    expect(p02DialogueLines[3]).toMatchObject({ emphasis: false });
    expect(p02DialogueLines[3].emphasisText).toBeUndefined();
  });
});

describe('P-02 dialogue lookup', () => {
  it('returns only timeline lines by label', () => {
    expect(getP02TimelineDialogue('rocket-establishing-shot')?.id).toBe('p02-narrator-01');
    expect(getP02TimelineDialogue('percy-dialogue')?.id).toBe('p02-narrator-02');
    expect(getP02TimelineDialogue('ginny-dialogue')?.id).toBe('p02-narrator-03');
    expect(getP02TimelineDialogue('launch-invitation')?.id).toBe('p02-narrator-04');
    expect(getP02TimelineDialogue('unknown')).toBeUndefined();
  });

  it('exports every holding line id', () => {
    expect(p02StoryHoldingLineIds).toEqual([
      'p02-narrator-01',
      'p02-narrator-02',
      'p02-narrator-03',
      'p02-narrator-04',
    ]);
  });
});
