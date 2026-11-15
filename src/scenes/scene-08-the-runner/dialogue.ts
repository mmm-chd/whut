import { assetManifest } from '../../assets/manifest';
import type { DialogueLine } from '../../components/dialogue/types';
import { TYPING_SECONDS_PER_CHARACTER, autoHoldSeconds, voiceSeconds } from '../scene-03-arrival-jezero/dialogue';
import { findFact } from './content';

/**
 * P-07 dialogue, from `docs-base/assets/dialog-perseverance.pdf` (page 5).
 *
 * The PDF has four narrator lines and four Percy lines; the recordings are
 * five narrator files and three Percy files. By length they line up this way,
 * which is a candidate mapping until it is checked by ear:
 *   Narrator 1..4        -> narrator lines 1..4
 *   Percy 1, Percy 2     -> Percy lines 1, 2
 *   Narrator 5 (2.4 s)   -> Percy line 3, "Huh? How does that work?"
 *   Percy 3 (10.1 s)     -> Percy line 4, the invitation
 * Percy's third line is recorded as a narrator file, so the speaker label here
 * follows the script and not the file name.
 *
 * The two facts are text-only: no recording exists for them, so their hold is
 * a reading allowance and nothing waits on a missing sound.
 */
export const P07_NARRATOR_LINE_IDS = [
  'p07-narrator-01',
  'p07-narrator-02',
  'p07-narrator-03',
  'p07-narrator-04',
] as const;

export const P07_INVITATION_LINE_ID = 'p07-percy-04';

interface LineSpec {
  readonly id: string;
  readonly speaker: DialogueLine['speaker'];
  readonly text: string;
  readonly emphasisText?: string;
  readonly manual?: boolean;
  readonly placement?: DialogueLine['placement'];
}

const SPECS: readonly LineSpec[] = [
  { id: 'p07-narrator-01', speaker: 'narrator', text: 'Percy has traveled sooooo far!', emphasisText: 'sooooo far' },
  {
    id: 'p07-narrator-02',
    speaker: 'narrator',
    text: "Did you know there's a record that stood for years among the Mars explorers?",
    emphasisText: 'a record',
  },
  {
    id: 'p07-narrator-03',
    speaker: 'narrator',
    text: 'Percy has a big brother rover, Oppy, short for Opportunity who drove 45.16 km over 15 years.',
    emphasisText: '45.16 km',
  },
  {
    id: 'p07-narrator-04',
    speaker: 'narrator',
    text: "And look! Percy has matched that distance in just five and a half years! He's following in Oppy's tracks, exploring a part of Mars full of secrets.",
    emphasisText: 'five and a half years',
  },
  {
    id: 'p07-percy-01',
    speaker: 'percy',
    text: "Hey, I'm not alone, you know! The team on Earth is full of amazing scientists who help me decide which spots to visit!",
    emphasisText: 'team on Earth',
  },
  {
    id: 'p07-percy-02',
    speaker: 'percy',
    text: "Sometimes, choosing by myself can leave me confused, especially since I'm out here all alone... but with the team on Earth, I have friends to talk over which way to go!",
  },
  { id: 'p07-percy-03', speaker: 'percy', text: 'Huh? How does that work?' },
  {
    id: P07_INVITATION_LINE_ID,
    speaker: 'percy',
    text: "Hehe, here's how it goes... hmm, why don't you help me by becoming one of the scientists who picks my next stop?",
    emphasisText: 'picks my next stop',
    manual: true,
  },
];

function voiceIdFor(lineId: string): string {
  return lineId.replace('p07-', 'p07-vo-');
}

function build(spec: LineSpec): DialogueLine {
  const audioId = voiceIdFor(spec.id);
  const hasAudio = Boolean(assetManifest[audioId]);
  const percy = spec.speaker === 'percy';
  const line: DialogueLine = {
    id: spec.id,
    speaker: spec.speaker,
    text: spec.text,
    audioId: hasAudio ? audioId : null,
    timelineLabel: `p07:${spec.id}`,
    placement: spec.placement ?? (percy ? 'percy-top-left' : 'narrator-top-right'),
    panel: false,
    textAlign: 'left',
    advance: spec.manual ? 'manual' : 'auto',
    holdsStory: false,
    trigger: 'timeline',
    emphasis: Boolean(spec.emphasisText),
  };
  if (spec.emphasisText) {
    line.emphasisText = spec.emphasisText;
  }
  if (!spec.manual) {
    line.delay = autoHoldSeconds(spec.text, voiceSeconds(audioId), false) + 0.3;
  }
  return line;
}

export const p07OpeningLines: readonly DialogueLine[] = SPECS.map(build);

/** Every opening line must resolve before the map is revealed. */
export const p07OpeningLineIds: readonly string[] = SPECS.map((spec) => spec.id);

export function findOpeningLine(id: string): DialogueLine | null {
  return p07OpeningLines.find((line) => line.id === id) ?? null;
}

/**
 * Seconds the four narrator lines are on screen: typing plus hold. The opening
 * drive is paced over this, so Percy keeps moving while narration runs and
 * stops about when it ends.
 */
export function narratorSectionSeconds(): number {
  return P07_NARRATOR_LINE_IDS.reduce((total, id) => {
    const line = findOpeningLine(id);
    if (!line) {
      return total;
    }
    return total + line.text.length * TYPING_SECONDS_PER_CHARACTER + (line.delay ?? 0);
  }, 0);
}

export type P07FactLineId = 'p07-fact-signal' | 'p07-fact-autonav';

function factLine(id: P07FactLineId, factId: string, placement: DialogueLine['placement']): DialogueLine {
  const fact = findFact(factId);
  const text = fact ? fact.summary : '';
  return {
    id,
    speaker: 'narrator',
    text,
    audioId: null,
    timelineLabel: `p07:${id}`,
    placement,
    panel: false,
    textAlign: 'left',
    advance: 'auto',
    delay: autoHoldSeconds(text, 0, false) + 1,
    holdsStory: false,
    trigger: 'interaction',
    emphasis: false,
  };
}

/** FACT-17 is cued once on command acceptance, FACT-18 once after it. */
export const p07SignalFactLine: DialogueLine = factLine('p07-fact-signal', 'signal-latency', 'narrator-top-right');
export const p07AutonavFactLine: DialogueLine = factLine('p07-fact-autonav', 'autonav', 'narrator-top-right');
