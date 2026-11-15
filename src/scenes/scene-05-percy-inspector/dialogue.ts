import type { DialogueLine } from '../../components/dialogue/types';
import { P04_FINAL_QUOTE } from '../scene-04-percy-inspection/dialogue';

/**
 * The close-up's one line.
 *
 * It is the last quote of P-04's approved script — "Excuse me, Percy, just turn
 * around a little…" — and its recording (`P04 - Final Quote.mp3`) belongs to
 * this picture, because this is where Percy turns. The close-up was split out of
 * P-04, so the line moved with the turning, not with the ground.
 *
 * `advance: 'auto'`: the reader should be able to grab the picture immediately,
 * so the line types, plays its recording and leaves on its own instead of
 * holding the story behind a Continue gate. `delay` is the recording's length
 * (3.79 s) plus a moment to finish reading, so the line never leaves while it
 * is still being spoken.
 */
export const p05RotationHintLine: DialogueLine = {
  id: P04_FINAL_QUOTE.lineId,
  speaker: 'narrator',
  text: P04_FINAL_QUOTE.text,
  audioId: P04_FINAL_QUOTE.audioId,
  timelineLabel: 'p05:rotation-hint',
  placement: 'bottom',
  panel: false,
  textAlign: 'center',
  advance: 'auto',
  delay: 4.6,
  holdsStory: false,
  trigger: 'interaction',
  emphasis: true,
  emphasisText: P04_FINAL_QUOTE.emphasisText,
};