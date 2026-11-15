/**
 * Facts and ending copy for P-08 (story "The Waiting Sample").
 *
 * Every number carries its source, the date the page said it was current and the
 * date it was read. `null` means unknown, never zero. The recorded script has
 * wording that the sources do not support; those issues are listed in
 * `unresolvedScriptIssues`, and a release check fails while any remain, so the
 * mismatch is a visible to-do instead of a silent edit of recorded audio.
 */
export type ReviewStatus = 'draft' | 'verified';

export interface P08Source {
  readonly title: string;
  readonly url: string;
  /** ISO date the page was read. */
  readonly retrievedOn: string;
  readonly supportedClaim: string;
  readonly review: ReviewStatus;
}

export interface SampleSnapshot {
  /** ISO date the source says its count was current. */
  readonly asOf: string;
  readonly periodLabel: string;
  readonly countDefinition: string;
  readonly scienceSampleTubes: number | null;
  readonly witnessTubes: number | null;
  readonly onboardTubes: number | null;
  readonly depotTubes: number | null;
  readonly source: P08Source;
}

export interface ReturnSnapshot {
  readonly asOf: string;
  readonly planLabel: string;
  readonly architectureSummary: string | null;
  readonly statusSummary: string;
  /** Only an explicitly supported reason; null when no source states one. */
  readonly approvedReason: string | null;
  readonly source: P08Source;
}

export interface P08Content {
  readonly samples: SampleSnapshot;
  readonly sampleReturn: ReturnSnapshot;
  readonly endingTitle: string;
  readonly endingBody: string;
  /** Places where the approved script says more than the sources support. */
  readonly unresolvedScriptIssues: readonly string[];
}

export const P08_CONTENT: P08Content = {
  samples: {
    asOf: '2026-06-20',
    periodLabel: 'Since Percy landed in 2021',
    countDefinition:
      'Percy has filled 30 of his 38 sample tubes and sealed 3 of his 5 witness tubes. Witness tubes are extra tubes, not rock samples.',
    scienceSampleTubes: 30,
    witnessTubes: 3,
    onboardTubes: null,
    depotTubes: null,
    source: {
      title: 'NASA Science: Mars rock samples',
      url: 'https://science.nasa.gov/mission/mars-2020-perseverance/mars-rock-samples',
      retrievedOn: '2026-11-15',
      supportedClaim:
        '30 of 38 sample tubes collected and 3 of 5 witness tubes sealed; the page was last updated 20 June 2026 and lists no return date.',
      review: 'verified',
    },
  },
  sampleReturn: {
    asOf: '2026-09-17',
    planLabel: 'Mars Sample Return, a campaign proposed by NASA and ESA',
    architectureSummary:
      'A Sample Retrieval Lander would have landed near Percy’s landing site in Jezero Crater.',
    statusSummary:
      'NASA now describes Mars Sample Return as a plan that was proposed. Percy’s sealed samples are still on Mars.',
    approvedReason: null,
    source: {
      title: 'NASA Science: Mars Sample Return',
      url: 'https://science.nasa.gov/mission/mars-sample-return/',
      retrievedOn: '2026-11-15',
      supportedClaim:
        'Mars Sample Return “was a proposed multi-mission campaign by NASA and ESA”; the page, last updated 17 September 2026, names the Sample Retrieval Lander and states no reasons.',
      review: 'verified',
    },
  },
  endingTitle: 'The journey continues',
  endingBody: 'Percy keeps exploring Mars. His sealed samples are still there, waiting for a way home.',
  unresolvedScriptIssues: [
    'Narration 1 says Percy collected 30 sample tubes and 3 witness tubes "in his very first year". NASA lists those numbers as the total so far (page updated 20 June 2026), not a first-year count.',
    'Narration 2 describes the return as a lander, a Mars Ascent Vehicle and an orbiter. NASA now calls Mars Sample Return a plan that "was" proposed and names only the lander, so the sequence is an old proposal told as the way it will work.',
    'The message from Earth says bringing the samples home costs too much and money must be gathered. The NASA page states no reasons, so this explanation is not supported by the cited sources.',
    'Percy says "WOW!" in the same breath as the bad news, and the recording called Narrator 11 (0.9 s) is unmatched to any script line.',
  ],
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u;

function validCount(value: number | null): boolean {
  return value === null || (Number.isInteger(value) && value >= 0);
}

function validDate(value: string): boolean {
  return ISO_DATE.test(value) && !Number.isNaN(Date.parse(value));
}

/**
 * Every problem with the content. Development mode checks the data's shape;
 * release mode also demands verified sources and no unresolved script issue.
 */
export function validateP08Content(content: P08Content, mode: 'development' | 'release'): readonly string[] {
  const problems: string[] = [];
  const { samples, sampleReturn } = content;

  for (const [name, value] of [
    ['science sample tubes', samples.scienceSampleTubes],
    ['witness tubes', samples.witnessTubes],
    ['onboard tubes', samples.onboardTubes],
    ['depot tubes', samples.depotTubes],
  ] as const) {
    if (!validCount(value)) {
      problems.push(`The ${name} count must be a whole number or unknown.`);
    }
  }
  for (const [name, date] of [
    ['sample count', samples.asOf],
    ['return status', sampleReturn.asOf],
    ['sample source', samples.source.retrievedOn],
    ['return source', sampleReturn.source.retrievedOn],
  ] as const) {
    if (!validDate(date)) {
      problems.push(`The ${name} date is not a real date.`);
    }
  }
  if (samples.countDefinition.trim().length === 0) {
    problems.push('The sample count has no definition.');
  }
  if (!/^https:\/\//u.test(samples.source.url) || !/^https:\/\//u.test(sampleReturn.source.url)) {
    problems.push('Every source needs an https link.');
  }

  if (mode === 'release') {
    if (samples.scienceSampleTubes === null) {
      problems.push('Release needs the sample tube count.');
    }
    if (samples.source.review !== 'verified' || sampleReturn.source.review !== 'verified') {
      problems.push('Release needs verified sources.');
    }
    for (const issue of content.unresolvedScriptIssues) {
      problems.push(`Unresolved script issue: ${issue}`);
    }
  }
  return problems;
}
