/**
 * P-04 content status and provenance.
 *
 * The approved script is `docs-base/assets/dialog-perseverance.pdf`, and the
 * narration was recorded from it word for word. The figures the scene prints
 * (45.16 km, 430 football fields, 3 x 2.7 x 2.2 m, 4-7 lions, titanium spokes)
 * are the script's own numbers, so they ship with the copy that speaks them.
 *
 * A number that is *not* in the script stays out of the shipped copy: the rover
 * mass (1,025 kg) is still only recorded here, because no line says it.
 *
 * The `source` strings are release evidence for whoever approves the copy.
 */
export const P04_FACT_IDS = [
  'p04.travel-distance',
  'p04.rover-dimensions',
  'p04.rover-mass',
  'p04.wheels',
  'p04.cameras',
  'p04.microphone',
  'p04.moxie',
  'p04.earth-team',
] as const;

export type P04FactId = (typeof P04_FACT_IDS)[number];

/** Where the text came from and what a release still has to check. */
export interface FactRecord {
  readonly id: P04FactId;
  /** `published` copy is safe to show; `draft-numeric` values wait for checks. */
  readonly status: 'published' | 'draft-numeric';
  readonly summary: string;
  /** Draft figures from the PDF. Recorded, never printed while unverified. */
  readonly draftNumeric?: string;
  /** Alias used by the source documents, not a runtime asset/fact ID. */
  readonly sourceAlias?: string;
  readonly source: string;
  readonly releaseCheck: string;
}

export const P04_FACTS: Readonly<Record<P04FactId, FactRecord>> = {
  'p04.travel-distance': {
    id: 'p04.travel-distance',
    status: 'published',
    summary:
      "Percy has traveled 45.16 kilometers, as long as 430 football fields lined up end to end.",
    sourceAlias: 'FACT-9',
    source: 'docs-base/assets/dialog-perseverance.pdf, page 3 (approved script)',
    releaseCheck: 'Numbers follow the approved script; re-check if the script is revised.',
  },
  'p04.rover-dimensions': {
    id: 'p04.rover-dimensions',
    status: 'published',
    summary:
      'Percy is about 3 meters long, 2.7 meters wide and 2.2 meters tall — as heavy to push as 4 to 7 grown-up male lions, non-stop.',
    sourceAlias: 'FACT-10',
    source: 'docs-base/assets/dialog-perseverance.pdf, page 3 (approved script)',
    releaseCheck: 'Numbers follow the approved script; re-check if the script is revised.',
  },
  'p04.rover-mass': {
    id: 'p04.rover-mass',
    status: 'draft-numeric',
    summary: 'Percy is one heavy explorer.',
    draftNumeric: 'about 1,025 kg',
    sourceAlias: 'FACT-10',
    source: 'docs-base/assets/dialog-perseverance.pdf, page 3',
    releaseCheck: 'Verify the mass and its comparison before publishing.',
  },
  'p04.wheels': {
    id: 'p04.wheels',
    status: 'published',
    summary:
      'Percy has six strong wheels with curved titanium spokes that give them a springy, bouncy support.',
    sourceAlias: 'FACT-11',
    source: 'docs-base/assets/dialog-perseverance.pdf, page 3 (approved script)',
    releaseCheck: 'Spoke material follows the approved script; re-check if the script is revised.',
  },
  'p04.cameras': {
    id: 'p04.cameras',
    status: 'published',
    summary: 'Percy uses his cameras to look around and photograph the landscape.',
    source: 'docs-base/assets/storybook-perseverance.pdf',
    releaseCheck: 'Keep the card description on one named camera group.',
  },
  'p04.microphone': {
    id: 'p04.microphone',
    status: 'published',
    summary: 'Percy carries microphones that can record sounds on Mars.',
    source: 'docs-base/assets/storybook-perseverance.pdf',
    releaseCheck: 'Name the documented microphone mount before showing a recording.',
  },
  'p04.moxie': {
    id: 'p04.moxie',
    status: 'published',
    summary: 'MOXIE showed how oxygen can be made from the carbon dioxide in Martian air.',
    source: 'docs-base/assets/storybook-perseverance.pdf',
    releaseCheck: 'Do not imply MOXIE runs continuously or supplies a crew.',
  },
  'p04.earth-team': {
    id: 'p04.earth-team',
    status: 'published',
    summary: 'Percy works with people on Earth, and messages take time to travel.',
    source: 'docs-base/assets/storybook-perseverance.pdf',
    releaseCheck: 'Keep the Earth-team activity labelled as a simple simulation.',
  },
};

/** Where P-04 copy stands today, so a build cannot claim approved numbers. */
export const p04ContentStatus = {
  /** Copy prints the figures of the approved script, and nothing else. */
  numericCopy: 'approved-script',
  /** One recording per line, mapped in script order. */
  voiceCopy: 'mapped',
  /** No approved Mars recording or camera POV asset was found. */
  marsMedia: 'unavailable',
} as const;

/** True when no P-04 line may print a measured quantity yet. */
export function copyAllowsNumbers(): boolean {
  return Object.values(P04_FACTS).every((fact) => fact.status === 'published');
}
