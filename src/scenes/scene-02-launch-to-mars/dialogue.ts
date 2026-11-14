import type { DialogueLine } from '../../components/dialogue/types';

/**
 * P-02 dialogue.
 *
 * The English scene spec is authoritative. The dialog PDF and storybook keep
 * older wording ("brother, Ginny", "Jazero", ...), so do not copy those files
 * into this table. All four lines are narrated; Ginny is introduced by the
 * narrator rather than given a second speaker type. Every line waits for the
 * player's Continue gate, as in P-01, so no line leaves on a timer.
 */
const COPY_01 =
  'It all started on July 30, 2020 (July thirtieth, twenty twenty), when Percy was carried aboard an Atlas V 541 rocket, launching from Cape Canaveral Air Force Station, Florida.';
const COPY_02 =
  "A journey that excited Percy! He was heading to Jezero Crater, a place on Mars that holds clues about a very ancient past. Waaaaa! That's faaaaar older than Percy!";
const COPY_03 =
  "Oh! Look! Percy isn't alone on this journey. He's going with his little buddy, Ginny! Well, we'll hear more about The Dynamic Duo, Perseverance and Ingenuity, and their adventures up there!";
const COPY_04 = "Let's join Percy and Ginny on this NASA mission!";

export const p02DialogueLines: readonly DialogueLine[] = [
  {
    id: 'p02-narrator-01',
    speaker: 'narrator',
    text: COPY_01,
    audioId: null,
    timelineLabel: 'rocket-establishing-shot',
    placement: 'narrator-top-right',
    panel: false,
    textSize: 'normal',
    textAlign: 'right',
    advance: 'manual',
    holdsStory: true,
    emphasis: true,
    emphasisText: 'July 30, 2020',
    trigger: 'timeline',
  },
  {
    id: 'p02-narrator-02',
    speaker: 'narrator',
    text: COPY_02,
    audioId: null,
    timelineLabel: 'percy-dialogue',
    placement: 'narrator-top-right',
    panel: false,
    textSize: 'normal',
    textAlign: 'right',
    advance: 'manual',
    holdsStory: true,
    emphasis: true,
    emphasisText: 'Jezero Crater',
    trigger: 'timeline',
  },
  {
    id: 'p02-narrator-03',
    speaker: 'narrator',
    text: COPY_03,
    audioId: null,
    timelineLabel: 'ginny-dialogue',
    placement: 'narrator-top-right',
    panel: false,
    textSize: 'normal',
    textAlign: 'right',
    advance: 'manual',
    holdsStory: true,
    emphasis: true,
    emphasisText: 'The Dynamic Duo',
    trigger: 'timeline',
  },
  {
    id: 'p02-narrator-04',
    speaker: 'narrator',
    text: COPY_04,
    audioId: null,
    timelineLabel: 'launch-invitation',
    placement: 'bottom',
    panel: false,
    textSize: 'normal',
    textAlign: 'right',
    advance: 'manual',
    holdsStory: true,
    emphasis: false,
    trigger: 'timeline',
  },
];

export function getP02TimelineDialogue(label: string): DialogueLine | undefined {
  return p02DialogueLines.find(
    (line) => (line.trigger ?? 'timeline') === 'timeline' && line.timelineLabel === label,
  );
}

export const p02StoryHoldingLineIds: readonly string[] = p02DialogueLines
  .filter((line) => (line.trigger ?? 'timeline') === 'timeline' && line.holdsStory === true)
  .map((line) => line.id);
