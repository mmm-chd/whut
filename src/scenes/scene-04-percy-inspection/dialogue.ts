import { assetManifest } from '../../assets/manifest';
import type { DialogueLine } from '../../components/dialogue/types';

/**
 * P-04 dialogue: four manual narration lines, verbatim from
 * `docs-base/assets/dialog-perseverance.pdf` (scene "P-04 — Percy… How Come?").
 *
 * The PDF is the approved script and the recordings follow it word for word, so
 * the copy here is no longer qualitative: the traverse distance, the rover
 * dimensions and the wheel detail are the script's own numbers. Change the text
 * only together with the recording.
 *
 * Voice: one file per line, in script order, at
 * `src/audio/voice-over/perseverance/P04 - Narrator 1..4.mp3`. The scene's final
 * quote ("Excuse me, Percy, just turn around a little…") is recorded too, but it
 * belongs to the close-up: `scene-05-percy-inspector` cues it.
 *
 * Lines are `manual` and hold the story, but the travel loop keeps running
 * underneath them — a dialogue hold is not a presentation pause.
 */
export const P04_INVITATION_LINE_ID = 'p04-narrator-04';

interface LineSpec {
  id: string;
  label: string;
  text: string;
  emphasisText?: string;
  placement?: DialogueLine['placement'];
  textAlign?: DialogueLine['textAlign'];
}

const SPECS: readonly LineSpec[] = [
  {
    id: 'p04-narrator-01',
    label: 'rolling',
    text: 'Percy keeps on rolling, and rolling. His curiosity leads him to explore Jezero Crater even more.',
    emphasisText: 'His curiosity',
  },
  {
    id: 'p04-narrator-02',
    label: 'distance',
    text: "Did you know how far Percy has traveled, even though he's only halfway through his mission? 45.16 kilometers! That's as long as 430 football fields lined up end to end!",
    emphasisText: '45.16 kilometers',
  },
  {
    id: 'p04-narrator-03',
    label: 'dimensions',
    text: "All that traveling hasn't made Percy any lighter, though! Percy is about 3 meters long, 2.7 meters wide, and 2.2 meters tall. Carrying him would be like pushing 4 to 7 grown-up male lions, non-stop! Luckily, Percy has strong wheels! They have curved titanium spokes that give them a springy, bouncy support.",
    emphasisText: 'curved titanium spokes',
  },
  {
    id: P04_INVITATION_LINE_ID,
    label: 'invitation',
    text: 'Oh, how about we take a closer look at Percy?',
    textAlign: 'left',
    placement: 'bottom',
    emphasisText: 'closer look',
  },
];

/** `p04-narrator-01` -> `p04-vo-narrator-01`, the manifest id of its recording. */
function voiceIdFor(lineId: string): string {
  return lineId.replace('p04-', 'p04-vo-');
}

export const p04DialogueLines: readonly DialogueLine[] = SPECS.map((spec): DialogueLine => ({
  id: spec.id,
  speaker: 'narrator',
  text: spec.text,
  audioId: voiceIdFor(spec.id),
  timelineLabel: `p04:${spec.label}`,
  placement: spec.placement ?? 'narrator-top-right',
  panel: false,
  textAlign: spec.textAlign ?? 'right',
  advance: 'manual',
  holdsStory: true,
  trigger: 'timeline',
  emphasis: true,
  emphasisText: spec.emphasisText,
}));

/** Lines that must play before the hand-over can be accepted. */
export const p04IntroLineIds: readonly string[] = [
  'p04-narrator-01',
  'p04-narrator-02',
  'p04-narrator-03',
  P04_INVITATION_LINE_ID,
];

/** Every line the scene waits on, which now is exactly the intro. */
export const p04RequiredLineIds: readonly string[] = [...p04IntroLineIds];

/**
 * How long a line's recording runs, in seconds.
 *
 * The beats are spaced from this, never from a guessed gap: a fixed gap cut
 * the 14 s and 24 s lines off after three seconds once the recordings were
 * mapped. `3.2` is the old fixed beat, kept as the fallback for a line with no
 * recording yet, so an unmapped line still gets room to be read.
 */
export function p04VoiceSeconds(lineId: string): number {
  const entry = assetManifest[voiceIdFor(lineId)];
  return entry?.durationMs ? entry.durationMs / 1000 : 3.2;
}

/** Looks a line up by id, for tests and for the driver's cue table. */
export function findP04Line(id: string): DialogueLine | null {
  return p04DialogueLines.find((line) => line.id === id) ?? null;
}

/** The recording that closes P-04's script; `scene-05` speaks it. */
export const P04_FINAL_QUOTE = {
  lineId: 'p05-narrator-01',
  audioId: 'p05-vo-rotation-hint',
  text: 'Excuse me, Percy, just turn around a little...',
  emphasisText: 'turn around',
} as const;