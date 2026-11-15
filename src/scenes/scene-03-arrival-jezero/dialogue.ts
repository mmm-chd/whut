import { assetManifest } from '../../assets/manifest';
import type { DialogueLine } from '../../components/dialogue/types';

/**
 * P-03 dialogue. The English scene spec is authoritative; the dialog PDF uses
 * slightly different wording in places. All copy is verbatim from the spec.
 *
 * Two independent settings per line:
 *  - `advance`: `auto` leaves by itself, `manual` waits for Continue.
 *  - `holdsStory`: the next shot waits until the line resolves.
 * Narration over Percy's walk is auto and does not hold, so the walk never
 * stops for text. Lines at stops hold the story, auto or manual.
 *
 * Each line plays its own recording (`p03-vo-*` in the manifest). The last two
 * lines are the transition quote and the final quote, in that order.
 */
export const P03_FINAL_LINE_ID = 'p03-narrator-12';

interface LineSpec {
  id: string;
  label: string;
  speaker: DialogueLine['speaker'];
  text: string;
  advance: DialogueLine['advance'];
  holdsStory: boolean;
  emphasisText?: string;
  placement?: DialogueLine['placement'];
}

const SPECS: readonly LineSpec[] = [
  { id: 'p03-narrator-01', label: 'walk-start', speaker: 'narrator', text: 'Whoop! What a long drive. Percy looks around.', advance: 'auto', holdsStory: false },
  { id: 'p03-narrator-02', label: 'look-around', speaker: 'narrator', text: 'Look here, look there... Hmm, not as smooth as he thought, eh?', advance: 'auto', holdsStory: false },
  { id: 'p03-narrator-03', label: 'inspect-wheels', speaker: 'narrator', text: "Percy inspecting surface his wheel step on. Whoa, its kinda textured here", advance: 'auto', holdsStory: false },
  { id: 'p03-narrator-04', label: 'inspect-rock', speaker: 'narrator', text: 'Jezero, eh?', advance: 'auto', holdsStory: false },
  { id: 'p03-percy-01', label: 'confused-percy-1', speaker: 'percy', text: "Let’s seeee... they say there are... traces of the past around here???", advance: 'manual', holdsStory: true },
  { id: 'p03-narrator-05', label: 'confused-narrator', speaker: 'narrator', text: 'Percy looks confused.', advance: 'auto', holdsStory: false },
  { id: 'p03-percy-02', label: 'confused-percy-2', speaker: 'percy', text: 'Uhh... where is it again?', advance: 'manual', holdsStory: true },
  { id: 'p03-narrator-06', label: 'mission', speaker: 'narrator', text: "Well, that's your mission, little Percy! To find evidence of the ancient past here in Jezero Crater!", advance: 'manual', holdsStory: true, emphasisText: 'Jezero Crater' },
  { id: 'p03-narrator-07', label: 'previous-rovers', speaker: 'narrator', text: 'Percy follows in the wheel tracks of the rovers who came before Sojourner, Spirit, Opportunity, and Curiosity, who all explored the land of Mars too.', advance: 'auto', holdsStory: false },
  { id: 'p03-narrator-08', label: 'samples-home', speaker: 'narrator', text: 'And do you know what, Percy? Everything you collect on this journey will be sent back to Earth!', advance: 'manual', holdsStory: true, emphasisText: 'sent back to Earth' },
  { id: 'p03-narrator-09', label: 'important-job', speaker: 'narrator', text: 'You have an important job. Bringing back answers to the big question about life beyond our planet!', advance: 'manual', holdsStory: true },
  { id: 'p03-narrator-10', label: 'adventure-begins', speaker: 'narrator', text: 'And so, Percy began his adventure, searching for the secrets of Jezero Crater.', advance: 'auto', holdsStory: true, emphasisText: 'Jezero Crater' },
  { id: 'p03-narrator-11', label: 'transition-quote', speaker: 'narrator', text: 'Look! Percy wants to show you what happened here hundreds... no, thousands... oh, even longer ago... billions of years ago!', advance: 'auto', holdsStory: true, emphasisText: 'billions of years ago', placement: 'bottom' },
  { id: P03_FINAL_LINE_ID, label: 'final-quote', speaker: 'narrator', text: 'Percy found it! Traces of ancient water in Jezero Crater! Mars really did have a lake!', advance: 'manual', holdsStory: true },
];

/** Typewriter speed of the dialogue layer, seconds per character. */
export const TYPING_SECONDS_PER_CHARACTER = 0.024;
const READING_WORDS_PER_MINUTE = 140;

/** Recording length in seconds for a voice entry, or 0 when there is none. */
export function voiceSeconds(audioId: string | null): number {
  if (!audioId) {
    return 0;
  }
  return (assetManifest[audioId]?.durationMs ?? 0) / 1000;
}

export function typingSeconds(text: string, reduced: boolean): number {
  return reduced ? 0 : text.length * TYPING_SECONDS_PER_CHARACTER;
}

/** Reading allowance after typing: at least two seconds, then 140 words a minute. */
export function readingHoldSeconds(text: string): number {
  const words = text.trim().split(/\s+/u).length;
  return Math.max(2, (words * 60) / READING_WORDS_PER_MINUTE);
}

/**
 * How long an auto line stays after it finishes typing. With a recording it
 * must also outlast the audio: typing + hold >= audio, in the current mode.
 */
export function autoHoldSeconds(text: string, audioSeconds = 0, reduced = false): number {
  return Math.max(readingHoldSeconds(text), audioSeconds - typingSeconds(text, reduced));
}

/** `p03-narrator-05` -> `p03-vo-narrator-05`; `p03-percy-01` -> `p03-vo-percy-01`. */
function voiceIdFor(lineId: string): string {
  return lineId.replace('p03-', 'p03-vo-');
}

export const p03DialogueLines: readonly DialogueLine[] = SPECS.map((spec): DialogueLine => {
  const placement =
    spec.placement ?? (spec.speaker === 'percy' ? 'percy-top-left' : 'narrator-top-right');
  const audioId = voiceIdFor(spec.id);
  const base: DialogueLine = {
    id: spec.id,
    speaker: spec.speaker,
    text: spec.text,
    audioId,
    timelineLabel: spec.label,
    placement,
    panel: false,
    textSize: 'normal',
    textAlign: spec.speaker === 'percy' ? 'left' : 'right',
    advance: spec.advance,
    holdsStory: spec.holdsStory,
    emphasis: Boolean(spec.emphasisText),
    trigger: 'timeline',
  };
  if (spec.emphasisText) {
    base.emphasisText = spec.emphasisText;
  }
  if (spec.advance === 'auto') {
    // The line outlasts its recording, so the voice is never cut off.
    base.delay = autoHoldSeconds(spec.text, voiceSeconds(audioId));
  }
  return base;
});

export function getP03Line(id: string): DialogueLine {
  const line = p03DialogueLines.find((item) => item.id === id);
  if (!line) {
    throw new Error(`Unknown P-03 line: ${id}`);
  }
  return line;
}

/**
 * Seconds a line occupies the screen: typing plus its hold. Manual lines wait
 * for Continue, so this is only a planning figure for them.
 */
export function lineDisplaySeconds(line: DialogueLine, reduced: boolean): number {
  const hold = line.advance === 'auto' ? (line.delay ?? 0) : readingHoldSeconds(line.text);
  return typingSeconds(line.text, reduced) + hold;
}

export function getP03TimelineDialogue(label: string): DialogueLine | undefined {
  return p03DialogueLines.find(
    (line) => (line.trigger ?? 'timeline') === 'timeline' && line.timelineLabel === label,
  );
}

export const p03StoryHoldingLineIds: readonly string[] = p03DialogueLines
  .filter((line) => (line.trigger ?? 'timeline') === 'timeline' && line.holdsStory === true)
  .map((line) => line.id);
