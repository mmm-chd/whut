import { useScoreTrack } from './useScoreTrack';

/** The score that runs under the whole Perseverance story (P-01 … P-03). */
export const STORY_SCORE_ID = 'music-perseverance';

/**
 * One score for every Perseverance story scene.
 *
 * Mounted by the story shell, which stays alive from the take-off to the last
 * card, so the track loops through the whole run instead of restarting at every
 * scene swap.
 */
export function useStoryScore(enabled = true): void {
  useScoreTrack(STORY_SCORE_ID, enabled);
}
