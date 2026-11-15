import { describe, expect, it } from 'vitest';
import { P08_CONTENT, validateP08Content, type P08Content } from './content';

describe('P-08 content', () => {
  it('is well formed for development', () => {
    expect(validateP08Content(P08_CONTENT, 'development')).toEqual([]);
  });

  it('cannot be released while the script says more than the sources support', () => {
    const problems = validateP08Content(P08_CONTENT, 'release');
    expect(problems.length).toBe(P08_CONTENT.unresolvedScriptIssues.length);
    expect(problems.some((problem) => /very first year/u.test(problem))).toBe(true);
  });

  it('releases once those issues are resolved', () => {
    expect(validateP08Content({ ...P08_CONTENT, unresolvedScriptIssues: [] }, 'release')).toEqual([]);
  });

  it('rejects bad counts, dates and missing definitions', () => {
    const bad: P08Content = {
      ...P08_CONTENT,
      samples: {
        ...P08_CONTENT.samples,
        scienceSampleTubes: -1,
        witnessTubes: 2.5,
        asOf: 'last spring',
        countDefinition: '  ',
      },
    };
    const problems = validateP08Content(bad, 'development');
    expect(problems.length).toBeGreaterThanOrEqual(4);
  });

  it('treats unknown as unknown, never zero', () => {
    const unknown: P08Content = {
      ...P08_CONTENT,
      samples: { ...P08_CONTENT.samples, scienceSampleTubes: null },
    };
    expect(validateP08Content(unknown, 'development')).toEqual([]);
    expect(validateP08Content({ ...unknown, unresolvedScriptIssues: [] }, 'release')).toContain(
      'Release needs the sample tube count.',
    );
  });

  it('requires verified sources for release', () => {
    const draft: P08Content = {
      ...P08_CONTENT,
      unresolvedScriptIssues: [],
      sampleReturn: {
        ...P08_CONTENT.sampleReturn,
        source: { ...P08_CONTENT.sampleReturn.source, review: 'draft' },
      },
    };
    expect(validateP08Content(draft, 'release')).toContain('Release needs verified sources.');
  });

  it('keeps the samples on Mars and states no invented reason', () => {
    expect(P08_CONTENT.sampleReturn.statusSummary).toMatch(/still on Mars/u);
    expect(P08_CONTENT.sampleReturn.approvedReason).toBeNull();
    expect(P08_CONTENT.endingBody).not.toMatch(/mission accomplished|congratulations|returned/iu);
  });
});
