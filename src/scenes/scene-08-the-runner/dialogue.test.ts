import { describe, expect, it } from 'vitest';
import { assetManifest } from '../../assets/manifest';
import { DISTANCE_SNAPSHOT, P07_FACTS, fieldIcons } from './content';
import {
  P07_INVITATION_LINE_ID,
  p07AutonavFactLine,
  p07OpeningLineIds,
  p07OpeningLines,
  p07SignalFactLine,
  narratorSectionSeconds,
} from './dialogue';

describe('opening dialogue', () => {
  it('has the eight script lines in order, narrator first and Percy after', () => {
    expect(p07OpeningLineIds).toEqual([
      'p07-narrator-01',
      'p07-narrator-02',
      'p07-narrator-03',
      'p07-narrator-04',
      'p07-percy-01',
      'p07-percy-02',
      'p07-percy-03',
      'p07-percy-04',
    ]);
    expect(p07OpeningLines.slice(0, 4).every((line) => line.speaker === 'narrator')).toBe(true);
    expect(p07OpeningLines.slice(4).every((line) => line.speaker === 'percy')).toBe(true);
  });

  it('gives every line a recording with a measured length', () => {
    for (const line of p07OpeningLines) {
      expect(line.audioId).not.toBeNull();
      expect(assetManifest[line.audioId as string]?.durationMs ?? 0).toBeGreaterThan(1000);
    }
  });

  it('keeps each auto line on screen longer than its recording and holds only the invitation', () => {
    for (const line of p07OpeningLines) {
      if (line.id === P07_INVITATION_LINE_ID) {
        expect(line.advance).toBe('manual');
        continue;
      }
      const voice = (assetManifest[line.audioId as string]?.durationMs ?? 0) / 1000;
      expect(line.advance).toBe('auto');
      expect(line.text.length * 0.024 + (line.delay ?? 0)).toBeGreaterThanOrEqual(voice);
      expect(line.holdsStory).toBe(false);
    }
  });

  it("maps Percy's short third line to the shortest file", () => {
    expect(assetManifest['p07-vo-percy-03']?.durationMs).toBeLessThan(3000);
  });

  it('paces the opening drive over a believable narration length', () => {
    expect(narratorSectionSeconds()).toBeGreaterThan(20);
    expect(narratorSectionSeconds()).toBeLessThan(60);
  });

  it('shows the two facts as text-only, non-holding lines', () => {
    for (const line of [p07SignalFactLine, p07AutonavFactLine]) {
      expect(line.audioId).toBeNull();
      expect(line.text.length).toBeGreaterThan(40);
      expect(line.holdsStory).toBe(false);
    }
  });
});

describe('facts and comparison', () => {
  it('draws Oppy and Percy as the same number of tiles because the distances match', () => {
    expect(fieldIcons(DISTANCE_SNAPSHOT.opportunityKm)).toBe(43);
    expect(fieldIcons(DISTANCE_SNAPSHOT.perseveranceKm ?? 0)).toBe(43);
  });

  it('marks only the fact that was not read in full as draft', () => {
    const drafts = P07_FACTS.filter((fact) => fact.status === 'draft').map((fact) => fact.id);
    expect(drafts).toEqual(['signal-latency']);
    for (const fact of P07_FACTS) {
      expect(fact.url).toMatch(/^https:\/\//);
      expect(fact.retrieved).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('never invents a Percy distance without a date', () => {
    expect(DISTANCE_SNAPSHOT.perseveranceKm).not.toBeNull();
    expect(DISTANCE_SNAPSHOT.perseveranceAsOf).not.toBeNull();
  });
});
