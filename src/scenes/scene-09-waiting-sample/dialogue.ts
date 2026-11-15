import { assetManifest } from '../../assets/manifest';
import { gateDelaySeconds } from '../../components/dialogue/narrationReadiness';
import type { DialogueLine } from '../../components/dialogue/types';

/**
 * P-08 dialogue, from `docs-base/assets/dialog-perseverance.pdf` (pages 5 to 7).
 *
 * The 22 recordings (16 narrator, 6 Percy) line up with the script by length and
 * order, which is a candidate mapping until it is checked by ear:
 *   Narrator 1-8      lines 1-8
 *   Percy 1           "Oh, a message from Earth just arrived."
 *   Narrator 9        "What does it say?"
 *   Percy 2           the costly-return news
 *   Narrator 10       "Oh... really? I didn't expect that."
 *   Narrator 11       0.9 s, the script's "..." (unbound: the pause is silence)
 *   Narrator 12       "Percy?"
 *   Percy 3           "WOW! Well, that's not what we planned..."
 *   Narrator 13-14    "Yeah, I guess..." and "So that means..."
 *   Percy 4, 5, 6     "Oh, you're right!", the decision, and "Let's go!"
 *   Narrator 15, 16   the final narration and "Maybe that someone is you!"
 *
 * Manual (Continue) lines: only the three phase boundaries. Every other line is
 * auto. Nothing here changes recorded wording; where the sources disagree with
 * it, `content.ts` lists the issue and the release check fails.
 */
export type P08Boundary = 'samples' | 'hope' | 'message';

export const P08_BOUNDARY_LINE = {
  samples: 'p08-samples-purpose',
  hope: 'p08-earth-message-notice',
  message: 'p08-percy-keep-exploring',
} as const satisfies Record<P08Boundary, string>;

export type P08Segment =
  | 'samples'
  | 'hope-travel'
  | 'hope-notice'
  | 'message-news'
  | 'message-after'
  | 'departure'
  | 'final';

interface LineSpec {
  readonly id: string;
  readonly segment: P08Segment;
  readonly speaker: DialogueLine['speaker'];
  readonly text: string;
  readonly audioId: string | null;
  readonly emphasisText?: string;
}

const N = (n: number) => `p08-vo-narrator-${String(n).padStart(2, '0')}`;
const P = (n: number) => `p08-vo-percy-${String(n).padStart(2, '0')}`;

const SPECS: readonly LineSpec[] = [
  {
    id: 'p08-samples-count',
    segment: 'samples',
    speaker: 'narrator',
    text: 'Wow, look at that! Percy’s tubes are holding so many samples! In his very first year, he collected 30 sample tubes and 3 witness tubes.',
    audioId: N(1),
    emphasisText: 'so many samples',
  },
  {
    id: 'p08-samples-purpose',
    segment: 'samples',
    speaker: 'narrator',
    text: 'All these Mars samples will be super useful for studying whether Mars could one day be a space destination.',
    audioId: N(2),
    emphasisText: 'space destination',
  },
  {
    id: 'p08-return-intro',
    segment: 'hope-travel',
    speaker: 'narrator',
    text: 'Percy can hardly wait! They say his samples’ ride home will work like this.. ehem',
    audioId: N(3),
  },
  {
    id: 'p08-return-architecture',
    segment: 'hope-travel',
    speaker: 'narrator',
    text: 'Another lander will arrive with a special system to pick up the samples. The samples will be moved into a small rocket called the Mars Ascent Vehicle. That rocket will launch the samples from the surface of Mars up into orbit. Then an orbiter will catch the sample container and carry it back to Earth.',
    audioId: N(4),
    emphasisText: 'Mars Ascent Vehicle',
  },
  {
    id: 'p08-return-agencies',
    segment: 'hope-travel',
    speaker: 'narrator',
    text: 'This plan is a mission idea developed by NASA together with the European Space Agency (ESA).',
    audioId: N(5),
    emphasisText: 'mission idea',
  },
  {
    id: 'p08-learning-connection',
    segment: 'hope-travel',
    speaker: 'narrator',
    text: 'The samples from Percy’s long journey could add to what you learn in school. They might even show up in your textbook one day! Percy is proud to be part of your learning journey, just like you’ve been part of his journey on Mars.',
    audioId: N(6),
  },
  {
    id: 'p08-earth-message-notice',
    segment: 'hope-notice',
    speaker: 'narrator',
    text: 'Oh! A message from the team on Earth!',
    audioId: N(7),
    emphasisText: 'message',
  },
  {
    id: 'p08-narrator-concern',
    segment: 'message-news',
    speaker: 'narrator',
    text: 'Percy? What’s wrong?',
    audioId: N(8),
  },
  {
    id: 'p08-percy-message',
    segment: 'message-news',
    speaker: 'percy',
    text: 'Oh, a message from Earth just arrived.',
    audioId: P(1),
  },
  {
    id: 'p08-narrator-question',
    segment: 'message-news',
    speaker: 'narrator',
    text: 'What does it say?',
    audioId: N(9),
  },
  {
    id: 'p08-percy-return-news',
    segment: 'message-news',
    speaker: 'percy',
    text: 'Ummm... it says... bringing my samples home costs too much, and it will take time to gather the money...',
    audioId: P(2),
  },
  {
    id: 'p08-narrator-reaction',
    segment: 'message-news',
    speaker: 'narrator',
    text: 'Oh... really? I didn’t expect that.',
    audioId: N(10),
  },
  {
    id: 'p08-narrator-check-in',
    segment: 'message-after',
    speaker: 'narrator',
    text: 'Percy?',
    audioId: N(12),
  },
  {
    id: 'p08-percy-response',
    segment: 'message-after',
    speaker: 'percy',
    text: 'WOW! Well, that’s not what we planned, but... who could have guessed it, right?',
    audioId: P(3),
  },
  {
    id: 'p08-narrator-response',
    segment: 'message-after',
    speaker: 'narrator',
    text: 'Yeah, I guess...',
    audioId: N(13),
  },
  {
    id: 'p08-companionship',
    segment: 'message-after',
    speaker: 'narrator',
    text: 'So that means... you can still keep me company while I explore Mars!',
    audioId: N(14),
  },
  {
    id: 'p08-percy-agreement',
    segment: 'message-after',
    speaker: 'percy',
    text: 'Oh, you’re right!',
    audioId: P(4),
  },
  {
    id: 'p08-percy-keep-exploring',
    segment: 'message-after',
    speaker: 'percy',
    text: 'Yes! While my scientist friends on Earth gather the funds, I’ll keep exploring and finding unique things on Mars!',
    audioId: P(5),
    emphasisText: 'keep exploring',
  },
  {
    id: 'p08-percy-lets-go',
    segment: 'departure',
    speaker: 'percy',
    text: 'Let’s go!',
    audioId: P(6),
  },
  {
    id: 'p08-final-narration-1',
    segment: 'final',
    speaker: 'narrator',
    text: 'Wow, Percy is so full of energy! Even though he didn’t expect the samples’ trip home to be delayed, he’s still excited to explore the crater and find even more clues while he waits for someone to come and get them.',
    audioId: N(15),
    emphasisText: 'explore the crater',
  },
  {
    id: 'p08-final-narration',
    segment: 'final',
    speaker: 'narrator',
    text: 'Maybe that someone is you!',
    audioId: N(16),
    emphasisText: 'you',
  },
];

const BOUNDARY_IDS: readonly string[] = Object.values(P08_BOUNDARY_LINE);

function voiceSeconds(audioId: string | null): number {
  return audioId ? (assetManifest[audioId]?.durationMs ?? 0) / 1000 : 0;
}

function build(spec: LineSpec): DialogueLine {
  const manual = BOUNDARY_IDS.includes(spec.id);
  const percy = spec.speaker === 'percy';
  const wait = gateDelaySeconds(spec.text, voiceSeconds(spec.audioId));
  const line: DialogueLine = {
    id: spec.id,
    speaker: spec.speaker,
    text: spec.text,
    audioId: spec.audioId && assetManifest[spec.audioId] ? spec.audioId : null,
    timelineLabel: `p08:${spec.id}`,
    placement: percy ? 'percy-top-left' : 'narrator-top-right',
    panel: false,
    textAlign: 'left',
    advance: manual ? 'manual' : 'auto',
    holdsStory: false,
    trigger: 'timeline',
    emphasis: Boolean(spec.emphasisText),
  };
  if (spec.emphasisText) {
    line.emphasisText = spec.emphasisText;
  }
  if (manual) {
    line.gateDelay = wait;
  } else {
    line.delay = wait;
  }
  return line;
}

export const p08Lines: readonly DialogueLine[] = SPECS.map(build);

/** Every caption of the ending; excludes the Ding and the quiet pause, which are not captions. */
export const P08_ALL_LINE_IDS: readonly string[] = SPECS.map((spec) => spec.id);

/** The last caption of the ending. Earlier final chunks must resolve before it. */
export const P08_FINAL_LINE_ID = 'p08-final-narration';

export function linesForSegment(segment: P08Segment): readonly DialogueLine[] {
  return SPECS.filter((spec) => spec.segment === segment).map((spec) => {
    const line = p08Lines.find((candidate) => candidate.id === spec.id);
    if (!line) {
      throw new Error(`Missing P-08 line ${spec.id}`);
    }
    return line;
  });
}

export function segmentOfLine(lineId: string): P08Segment | null {
  return SPECS.find((spec) => spec.id === lineId)?.segment ?? null;
}

/**
 * How long Percy may roll in the hope phase: the on-screen time of its auto
 * captions (typing plus hold) plus an allowance for audio to start. It is a
 * finite budget, so the landscape he rolls over is finite too.
 */
export function hopeBudgetMs(): number {
  const captions = linesForSegment('hope-travel').reduce(
    (total, line) => total + (line.text.length * 0.024 + (line.delay ?? 0)) * 1000,
    0,
  );
  return Math.ceil(captions) + 4000;
}

export function findP08Line(id: string): DialogueLine | null {
  return p08Lines.find((line) => line.id === id) ?? null;
}

export function boundaryOfLine(lineId: string): P08Boundary | null {
  for (const boundary of Object.keys(P08_BOUNDARY_LINE) as P08Boundary[]) {
    if (P08_BOUNDARY_LINE[boundary] === lineId) {
      return boundary;
    }
  }
  return null;
}

export interface P08VoiceBinding {
  readonly lineId: string;
  readonly audioId: string | null;
  readonly durationMs: number | null;
  readonly transcribedText: string | null;
  readonly review: 'draft' | 'verified';
}

/** Where each recording is bound and how well that binding has been checked. */
export const p08VoiceBindings: readonly P08VoiceBinding[] = SPECS.map((spec) => ({
  lineId: spec.id,
  audioId: spec.audioId,
  durationMs: spec.audioId ? (assetManifest[spec.audioId]?.durationMs ?? null) : null,
  transcribedText: null,
  review: 'draft',
}));

const normalise = (text: string) =>
  text
    .toLowerCase()
    .replace(/[’']/gu, "'")
    .replace(/[^a-z0-9' ]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();

/**
 * Cue and recording coherence. Development checks the structure; release also
 * needs every used recording verified against a transcription of its caption.
 */
export function validateP08Dialogue(
  lines: readonly DialogueLine[],
  bindings: readonly P08VoiceBinding[],
  mode: 'development' | 'release',
): readonly string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const line of lines) {
    if (ids.has(line.id)) {
      problems.push(`Duplicate line ${line.id}.`);
    }
    ids.add(line.id);
  }
  for (const boundary of Object.keys(P08_BOUNDARY_LINE) as P08Boundary[]) {
    const lineId = P08_BOUNDARY_LINE[boundary];
    const line = lines.find((candidate) => candidate.id === lineId);
    if (!line) {
      problems.push(`Missing boundary line ${lineId}.`);
    } else if (line.advance !== 'manual') {
      problems.push(`Boundary line ${lineId} must be manual.`);
    }
  }
  for (const line of lines) {
    if (!BOUNDARY_IDS.includes(line.id) && line.advance !== 'auto') {
      problems.push(`Only boundary lines may be manual, not ${line.id}.`);
    }
  }
  for (const binding of bindings) {
    if (binding.audioId === null) {
      continue;
    }
    if (binding.durationMs === null || !Number.isFinite(binding.durationMs) || binding.durationMs <= 0) {
      problems.push(`Recording ${binding.audioId} has no measured length.`);
    }
    if (mode === 'release') {
      const line = lines.find((candidate) => candidate.id === binding.lineId);
      if (binding.review !== 'verified' || binding.transcribedText === null) {
        problems.push(`Recording ${binding.audioId} has not been checked against its caption.`);
      } else if (line && normalise(binding.transcribedText) !== normalise(line.text)) {
        problems.push(`Recording ${binding.audioId} does not say what ${line.id} shows.`);
      }
    }
  }
  return problems;
}
