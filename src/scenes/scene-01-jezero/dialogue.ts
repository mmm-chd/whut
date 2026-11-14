import type { DialogueLine } from '../../components/dialogue/types';

export type {
  DialogueAdvance,
  DialogueLine,
  DialoguePlacement,
  DialogueTextAlign,
  DialogueTrigger,
  Speaker,
} from '../../components/dialogue/types';

// Text is copied verbatim from docs/assets/dialog.pdf. Do not copy-edit.
// FAKTA-1: 18 February 2021 (verified in docs/facts.md).
export const dialogueLines: readonly DialogueLine[] = [
  {
    id: 'narrator-01',
    speaker: 'narrator',
    text: "Far deep in the Jezero Crater, in the quietness of Mars, you'll find an explorer who never stops rounding round his gear on the rocky surface of Mars.",
    audioId: 'vo-narrator-01',
    timelineLabel: 'descend',
    placement: 'narrator-top-right',
    advance: 'manual',
    holdsStory: true,
    panel: false,
    textAlign: 'right',
    emphasis: false,
  },
  {
    id: 'narrator-02',
    speaker: 'narrator',
    text: "He's been on a long journey since the first time he got there on 18 February 2021.",
    audioId: 'vo-narrator-02',
    timelineLabel: 'narrator1',
    placement: 'narrator-top-right',
    advance: 'manual',
    holdsStory: true,
    panel: false,
    textAlign: 'right',
    emphasis: true,
    emphasisText: '18 February 2021',
  },
  {
    id: 'percy-01',
    speaker: 'percy',
    text: "Hey, HEY! My name is Perseverance, yep, rhymes with Persistence. Well, I'd be more happy if you call me Percy, though! The Persistence Percy!",
    audioId: 'vo-percy-01',
    timelineLabel: 'percyIntro',
    placement: 'percy-top-left',
    advance: 'manual',
    holdsStory: true,
    textAlign: 'left',
    panel: false,
    emphasis: false,
  },
  {
    id: 'percy-02',
    speaker: 'percy',
    text: 'Today I found... interesting things! Oh look! We almost stumbled on it, The Rocks!',
    audioId: 'vo-percy-02',
    timelineLabel: 'percyLine',
    placement: 'percy-top-left',
    advance: 'manual',
    panel: false,
    emphasis: false,
  },
  {
    id: 'percy-03',
    speaker: 'percy',
    text: 'Look, look! We have three of them, which one would you inspect first?',
    audioId: 'vo-percy-03',
    timelineLabel: 'prompt',
    placement: 'prompt-right',
    advance: 'manual',
    holdsStory: true,
    panel: false,
    emphasis: false,
  },
  {
    id: 'card-closing',
    speaker: 'percy',
    text: "Every rock has a story. Let's check the others!",
    // No recording exists for this line yet; it stays silent.
    audioId: null,
    timelineLabel: 'waiting',
    placement: 'prompt-right',
    advance: 'auto',
    delay: 2.5,
    textAlign:"right",
    panel: false,
    emphasis: false,
    trigger: 'interaction',
  },
];

export function getTimelineDialogue(label: string): DialogueLine | undefined {
  return dialogueLines.find(
    (line) => (line.trigger ?? 'timeline') === 'timeline' && line.timelineLabel === label,
  );
}

/**
 * Timeline lines whose gate pauses the scene until the line resolves. This is
 * the one intentional link between the scene and dialogue: the timeline needs
 * to know *where* to wait, while the dialogue system owns everything about
 * the text itself (visibility, typing, dismissal).
 */
export const storyHoldingLineIds: readonly string[] = dialogueLines
  .filter((line) => (line.trigger ?? 'timeline') === 'timeline' && line.holdsStory === true)
  .map((line) => line.id);
