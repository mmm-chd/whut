import type { DialogueLine } from '../../components/dialogue/types';
import { assetManifest } from '../../assets/manifest';
import { autoHoldSeconds, voiceSeconds } from '../scene-03-arrival-jezero/dialogue';

/**
 * The sampling game's opening, from `docs-base/assets/dialog-perseverance.pdf`
 * (scene P-05).
 *
 * The six recordings are mapped to the six lines by file name, which is a
 * candidate mapping, not an ear check: listen before treating the pairing as
 * final. The PDF writes the last line "ready to be Percy's assistant"; the
 * storyboard writes "become". The recording is what the reader hears, so this
 * copy follows the PDF and the difference is recorded here, not hidden.
 *
 * Lines 1-5 move on by themselves (after the recording and a reading moment);
 * the ready quote waits for the reader. None of them is a story hold: the
 * Mars picture is static, so nothing runs on underneath.
 */
export const P05_SAMPLE_READY_LINE_ID = 'p05-sample-intro-ready';

interface LineSpec {
  readonly id: string;
  readonly text: string;
  readonly emphasisText?: string;
  readonly manual?: boolean;
}

const SPECS: readonly LineSpec[] = [
  { id: 'p05-sample-narrator-01', text: "Hey, we're watching Percy do his job!", emphasisText: 'Percy' },
  {
    id: 'p05-sample-narrator-02',
    text: "Ah, so Percy isn't just rolling around on Mars for fun, after all!",
    emphasisText: 'for fun',
  },
  {
    id: 'p05-sample-narrator-03',
    text: 'Just imagine: Percy brought 43 sample tubes all the way from Earth, ready to be filled with special discoveries from the Martian ground!',
    emphasisText: '43 sample tubes',
  },
  { id: 'p05-sample-narrator-04', text: 'Hmm, does everything go into a tube?', emphasisText: 'everything' },
  {
    id: 'p05-sample-narrator-05',
    text: 'Oh, no, not quite! Look over to the right! There are 4 steps we need to follow before we can store our discovery in a tube.',
    emphasisText: '4 steps',
  },
  {
    id: P05_SAMPLE_READY_LINE_ID,
    text: "Now, are you ready to be Percy's assistant?",
    emphasisText: 'Percy’s assistant',
    manual: true,
  },
];

function voiceIdFor(lineId: string): string {
  return lineId.replace('p05-sample-', 'p05-sample-vo-');
}

export const p05SampleOpeningLines: readonly DialogueLine[] = SPECS.map((spec): DialogueLine => {
  const audioId = voiceIdFor(spec.id);
  const seconds = voiceSeconds(audioId);
  return {
    id: spec.id,
    speaker: 'narrator',
    text: spec.text,
    audioId: assetManifest[audioId] ? audioId : null,
    timelineLabel: `p05-sample:${spec.id}`,
    placement: spec.manual ? 'bottom' : 'narrator-top-right',
    panel: false,
    textAlign: spec.manual ? 'center' : 'right',
    advance: spec.manual ? 'manual' : 'auto',
    delay: spec.manual ? undefined : autoHoldSeconds(spec.text, seconds, false) + 0.3,
    holdsStory: false,
    trigger: 'timeline',
    emphasis: true,
    emphasisText: spec.emphasisText,
  };
});

/** Every opening line must resolve before the start button appears. */
export const p05SampleOpeningLineIds: readonly string[] = SPECS.map((spec) => spec.id);

/** Game copy that has no recording yet, kept as text only. */
export const P05_SAMPLE_COPY = {
  intro: 'Try it yourself!',
  coreFound: "We found a solid core! Let's keep it safe in a tube.",
  crumbled:
    'The rock crumbled, so we did not collect a core. A tube can still hold Martian atmosphere.',
  suggestSolid: 'Now let’s find a solid rock for a core.',
  completion: 'All the sample tubes are filled! Great job, little astronaut!',
} as const;

export function completionClarifier(tubeCount: number): string {
  return `All ${tubeCount} tubes for this mission are filled.`;
}
