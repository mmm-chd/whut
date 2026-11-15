/**
 * Shared dialogue contract.
 *
 * The scene owns *when* a line is cued; this module owns the shape of that
 * line. P-01 keeps re-exporting these types so existing imports stay valid
 * while P-02 and future scenes consume the shared module directly.
 */
export type Speaker = 'narrator' | 'percy';
export type DialogueTrigger = 'timeline' | 'interaction';
export type DialogueTextAlign = 'left' | 'center' | 'right';
export type DialogueAdvance = 'auto' | 'manual';
export type DialoguePlacement = 'narrator-top-right' | 'percy-top-left' | 'prompt-right' | 'bottom';

export interface DialogueLine {
  id: string;
  speaker: Speaker;
  text: string;
  audioId: string | null;
  timelineLabel: string;
  placement: DialoguePlacement;
  /**
   * Seconds an `advance: 'auto'` line stays on screen after typing finishes
   * before it resolves itself (queue advances, text leaves). Omitted or zero
   * resolves immediately. `manual` lines always wait for Continue, so this
   * only matters next to `advance: 'auto'`.
   */
  delay?: number;
  /**
   * Seconds the Continue gate stays closed after the line appears, even when
   * the text has finished typing. A narrated line sets this to its own
   * recording length so the reader cannot advance early and cut the voice —
   * and so the pause before the next line is a breath, not a second copy of
   * the recording. Omitted means "as soon as the typing ends", the old
   * behaviour for every line that does not narrate.
   */
  gateAfter?: number;
  /**
   * Paper panel behind the text. When false the line floats directly on the
   * scene as white crayon handwriting (see docs/pics reference frames).
   */
  panel?: boolean;
  /** Handwriting scale; "normal" is the storybook default size. */
  textSize?: 'small' | 'normal' | 'large';
  /** Overrides the alignment supplied by the placement preset. */
  textAlign?: DialogueTextAlign;
  /**
   * What happens when the line has finished typing. `manual` shows Continue
   * and the line stays until the player presses it; `auto` resolves the line
   * by itself. This is a dialogue-lifecycle setting: it never pauses the
   * scene on its own (see `holdsStory`).
   */
  advance: DialogueAdvance;
  /**
   * The scene timeline pauses at this line's cue gate until the line
   * resolves (story pacing). Independent of `advance`: a line may stay on
   * screen until Continue without holding the story (percy-02 mid-pan).
   */
  holdsStory?: boolean;
  /**
   * Seconds, counted in active time after typing ends, before a `manual` line's
   * Continue gate appears. Omitted or zero shows it at once (the default). A
   * scene sets it from the recording's length so Continue cannot cut off a voice.
   */
  gateDelay?: number;
  emphasis: boolean;
  emphasisText?: string;
  trigger?: DialogueTrigger;
}
