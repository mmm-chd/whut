import { describe, expect, it } from 'vitest';
import { assetManifest } from '../../assets/manifest';
import {
  P08_ALL_LINE_IDS,
  P08_BOUNDARY_LINE,
  P08_FINAL_LINE_ID,
  boundaryOfLine,
  findP08Line,
  linesForSegment,
  p08Lines,
  p08VoiceBindings,
  validateP08Dialogue,
  type P08VoiceBinding,
} from './dialogue';

describe('P-08 dialogue', () => {
  it('has exactly three manual lines, at the phase boundaries', () => {
    const manual = p08Lines.filter((line) => line.advance === 'manual').map((line) => line.id);
    expect(manual.sort()).toEqual(Object.values(P08_BOUNDARY_LINE).sort());
    for (const line of p08Lines) {
      expect(line.holdsStory).toBe(false);
    }
  });

  it('uses every narrator and Percy recording once, except the unbound ellipsis', () => {
    const used = p08Lines.map((line) => line.audioId).filter((id): id is string => id !== null);
    expect(new Set(used).size).toBe(used.length);
    expect(used).toHaveLength(21);
    expect(used).not.toContain('p08-vo-narrator-11');
    for (const id of used) {
      expect(assetManifest[id]?.durationMs ?? 0).toBeGreaterThan(500);
    }
  });

  it('orders the ending: samples, hope, news, after the news, departure, final', () => {
    const order = [
      'samples',
      'hope-travel',
      'hope-notice',
      'message-news',
      'message-after',
      'departure',
      'final',
    ] as const;
    const flat = order.flatMap((segment) => linesForSegment(segment).map((line) => line.id));
    expect(flat).toEqual([...P08_ALL_LINE_IDS]);
  });

  it('ends each of the first three phases on its boundary line', () => {
    expect(linesForSegment('samples').at(-1)?.id).toBe(P08_BOUNDARY_LINE.samples);
    expect(linesForSegment('hope-notice').at(-1)?.id).toBe(P08_BOUNDARY_LINE.hope);
    expect(linesForSegment('message-after').at(-1)?.id).toBe(P08_BOUNDARY_LINE.message);
    expect(boundaryOfLine(P08_BOUNDARY_LINE.hope)).toBe('hope');
    expect(boundaryOfLine('p08-percy-lets-go')).toBeNull();
  });

  it('makes the last final chunk the final line', () => {
    expect(P08_ALL_LINE_IDS.at(-1)).toBe(P08_FINAL_LINE_ID);
    expect(linesForSegment('final')).toHaveLength(2);
  });

  it('waits out each recording before a gate or an auto line leaves', () => {
    for (const line of p08Lines) {
      const voice = (assetManifest[line.audioId as string]?.durationMs ?? 0) / 1000;
      const wait = line.advance === 'manual' ? (line.gateDelay ?? 0) : (line.delay ?? 0);
      expect(line.text.length * 0.024 + wait).toBeGreaterThanOrEqual(voice);
    }
  });

  it('does not invent lines: Percy and the narrator keep the scripted speaker', () => {
    expect(findP08Line('p08-percy-response')?.speaker).toBe('percy');
    expect(findP08Line('p08-companionship')?.speaker).toBe('narrator');
  });
});

describe('validateP08Dialogue', () => {
  it('passes for development as built', () => {
    expect(validateP08Dialogue(p08Lines, p08VoiceBindings, 'development')).toEqual([]);
  });

  it('fails release until every recording is checked against its caption', () => {
    const problems = validateP08Dialogue(p08Lines, p08VoiceBindings, 'release');
    expect(problems.length).toBe(p08VoiceBindings.filter((binding) => binding.audioId !== null).length);
  });

  it('accepts a verified matching transcription and rejects a different one', () => {
    const line = p08Lines[2];
    const base: P08VoiceBinding = { ...p08VoiceBindings[2], review: 'verified', transcribedText: line.text };
    const good = validateP08Dialogue([line], [base], 'release');
    expect(good).toEqual(expect.not.arrayContaining([expect.stringContaining('does not say')]));
    const bad = validateP08Dialogue([line], [{ ...base, transcribedText: 'Something else entirely' }], 'release');
    expect(bad.some((problem) => /does not say/u.test(problem))).toBe(true);
  });

  it('rejects a bad duration, a missing boundary, a wrong advance mode and duplicates', () => {
    const noDuration: P08VoiceBinding = { ...p08VoiceBindings[0], durationMs: 0 };
    expect(validateP08Dialogue(p08Lines, [noDuration], 'development').length).toBeGreaterThan(0);
    const withoutBoundary = p08Lines.filter((line) => line.id !== P08_BOUNDARY_LINE.hope);
    expect(validateP08Dialogue(withoutBoundary, [], 'development').join(' ')).toMatch(/Missing boundary/u);
    const manualInner = p08Lines.map((line) => (line.id === 'p08-narrator-concern' ? { ...line, advance: 'manual' as const } : line));
    expect(validateP08Dialogue(manualInner, [], 'development').join(' ')).toMatch(/Only boundary lines/u);
    expect(validateP08Dialogue([...p08Lines, p08Lines[0]], [], 'development').join(' ')).toMatch(/Duplicate/u);
  });
});
