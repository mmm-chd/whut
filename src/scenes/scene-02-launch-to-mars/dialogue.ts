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
  'It all started on July 30, 2020. Percy being carried by Atlas V 541 zooming out to sky from Cape Canaveral Air Force Station, Florida';
const COPY_02 =
  "A journey that excites Percy,  he's been told to land on Jazero, a crater in Mars that has been standing since its planet's old age. Waaaaa, faaaaar older than Percy";
const COPY_03 =
  "Oh! look! Percy isn't alone in this journey. He’s going with his brother, Ginny! well, we’ll hear more about The Dynamic Duo and their journey up there";
const COPY_04 = "Lets join Percy and Ginny in this Nasa Mission!";

export const p02DialogueLines: readonly DialogueLine[] = [
  {
    id: 'p02-narrator-01',
    speaker: 'narrator',
    text: COPY_01,
    audioId: 'p02-vo-narrator-01',
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
    audioId: 'p02-vo-narrator-02',
    timelineLabel: 'percy-dialogue',
    placement: 'narrator-top-right',
    panel: false,
    textSize: 'normal',
    textAlign: 'right',
    advance: 'manual',
    holdsStory: true,
    emphasis: true,
    emphasisText: 'Jazero',
    trigger: 'timeline',
  },
  {
    id: 'p02-narrator-03',
    speaker: 'narrator',
    text: COPY_03,
    audioId: 'p02-vo-narrator-03',
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
    audioId: 'p02-vo-narrator-04',
    timelineLabel: 'launch-invitation',
    placement: 'narrator-top-right',
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
