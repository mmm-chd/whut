/**
 * Pure timing for a caption that must not be dismissed too early.
 *
 * A Continue gate that shows the moment typing ends lets a reader cut off the
 * voice-over. These helpers say how long, in active time after typing, a gate
 * should stay hidden: long enough to read the words (120 wpm for children) and
 * to let the recording finish, plus a short tail.
 */
const TYPING_SECONDS_PER_CHARACTER = 0.024;
const READING_WORDS_PER_MINUTE = 120;
const MIN_READING_MS = 2000;

/** Time to read `text` at a child's pace, never less than two seconds. */
export function readingBudgetMs(text: string): number {
  const words = text.trim().split(/\s+/u).filter(Boolean).length;
  return Math.max(MIN_READING_MS, Math.ceil((words * 60000) / READING_WORDS_PER_MINUTE));
}

/**
 * Seconds after typing ends before the Continue gate may appear: the longer of
 * the reading budget and what is left of the recording, plus `tailMs`. Typing
 * time counts toward both, so a short line over a long recording waits for the
 * voice and a long line over a short recording waits for the reading.
 */
export function gateDelaySeconds(
  text: string,
  voiceSeconds: number,
  options: { readonly reducedMotion?: boolean; readonly tailMs?: number } = {},
): number {
  const typingMs = options.reducedMotion ? 0 : text.length * TYPING_SECONDS_PER_CHARACTER * 1000;
  const tailMs = options.tailMs ?? 300;
  const voiceMs = Number.isFinite(voiceSeconds) && voiceSeconds > 0 ? voiceSeconds * 1000 : 0;
  const waitMs = Math.max(readingBudgetMs(text) - typingMs, voiceMs - typingMs, 0) + tailMs;
  return Math.max(0, waitMs / 1000);
}
