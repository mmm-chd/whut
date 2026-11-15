import { describe, expect, it } from 'vitest';
import { copyAllowsNumbers, P04_FACTS, p04ContentStatus } from './content';
import {
  P04_FINAL_QUOTE,
  P04_INVITATION_LINE_ID,
  findP04Line,
  p04DialogueLines,
  p04IntroLineIds,
  p04RequiredLineIds,
} from './dialogue';

/**
 * P-04 copy follows the approved script (`dialog-perseverance.pdf`) word for
 * word, because the recordings were made from it: a number the script does not
 * carry is still a bug, a number it does carry is the line's own text.
 */

describe('P-04 lines', () => {
  it('has four unique lines, in script order', () => {
    expect(p04DialogueLines.map((line) => line.id)).toEqual([
      'p04-narrator-01',
      'p04-narrator-02',
      'p04-narrator-03',
      'p04-narrator-04',
    ]);
    const labels = new Set(p04DialogueLines.map((line) => line.timelineLabel));
    expect(labels.size).toBe(4);
  });

  it('is narratable as manual narration that holds the story', () => {
    for (const line of p04DialogueLines) {
      expect(line.speaker).toBe('narrator');
      expect(line.advance).toBe('manual');
      expect(line.holdsStory).toBe(true);
      expect(line.trigger).toBe('timeline');
      expect(line.panel).toBe(false);
      // The invitation speaks from the bottom band, where the hand-over asks
      // for it, so it never competes with the annotation card.
      expect(line.placement).toBe(
        line.id === P04_INVITATION_LINE_ID ? 'bottom' : 'narrator-top-right',
      );
      // The invitation speaks left-aligned from the bottom band; the rest keep
      // the narrator's right alignment.
      expect(line.textAlign).toBe(line.id === P04_INVITATION_LINE_ID ? 'left' : 'right');
    }
  });

  it('prints the script numbers and nothing else', () => {
    // The copy prints the approved script's figures; the one figure no line
    // speaks (the rover mass) is still withheld, which is why the overall guard
    // stays false.
    expect(p04ContentStatus.numericCopy).toBe('approved-script');
    expect(copyAllowsNumbers()).toBe(false);
    const figures = p04DialogueLines
      .flatMap((line) => line.text.match(/\d+(?:[.,]\d+)?/gu) ?? []);
    // 45.16 km, 430 fields, 3 x 2.7 x 2.2 m, 4 to 7 lions.
    expect([...new Set(figures)].sort()).toEqual(
      ['2.2', '2.7', '3', '4', '430', '45.16', '7'].sort(),
    );
  });

  it('maps one recording per line, in script order', () => {
    expect(p04DialogueLines.map((line) => line.audioId)).toEqual([
      'p04-vo-narrator-01',
      'p04-vo-narrator-02',
      'p04-vo-narrator-03',
      'p04-vo-narrator-04',
    ]);
  });

  it('emphasises one short phrase per line, not the whole sentence', () => {
    for (const line of p04DialogueLines) {
      expect(line.emphasis).toBe(true);
      expect(line.emphasisText).toBeTruthy();
      expect(line.text.includes(line.emphasisText as string)).toBe(true);
      expect((line.emphasisText as string).length).toBeLessThan(line.text.length);
    }
  });
});

describe('line sets', () => {
  it('waits on exactly the intro, which now ends the scene', () => {
    expect(p04IntroLineIds).toHaveLength(4);
    expect(p04RequiredLineIds).toHaveLength(4);
    expect(p04IntroLineIds).toContain(P04_INVITATION_LINE_ID);
    // The script's final quote speaks in the close-up, so P-04 does not wait
    // on it; it is exported with its recording for scene-05.
    expect(P04_FINAL_QUOTE.audioId).toBe('p05-vo-rotation-hint');
    expect(p04DialogueLines.some((line) => line.id === P04_FINAL_QUOTE.lineId)).toBe(false);
  });

  it('looks lines up by id', () => {
    expect(findP04Line(P04_INVITATION_LINE_ID)?.timelineLabel).toBe('p04:invitation');
    expect(findP04Line('p04-nope')).toBeNull();
  });
});

describe('facts', () => {
  it('records the script numbers as published, and the mass as still unspoken', () => {
    const distance = P04_FACTS['p04.travel-distance'];
    expect(distance.status).toBe('published');
    expect(distance.summary).toContain('45.16');
    expect(distance.sourceAlias).toBe('FACT-9');
    // No line says the mass, so it stays out of the shipped copy.
    expect(P04_FACTS['p04.rover-mass'].status).toBe('draft-numeric');

    const wheels = P04_FACTS['p04.wheels'];
    expect(wheels.status).toBe('published');
    expect(wheels.summary).toContain('titanium spokes');
  });

  it('uses scene-scoped fact ids so P-02/P-03 aliases cannot collide', () => {
    for (const id of Object.keys(P04_FACTS)) {
      expect(id.startsWith('p04.')).toBe(true);
    }
  });
});
