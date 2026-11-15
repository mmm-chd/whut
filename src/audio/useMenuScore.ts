import { useScoreTrack } from './useScoreTrack';

/**
 * The bed for everything that is not the story: the splash, the launchpad and
 * the character journal. It is the same track on all three, so walking from the
 * homepage to `/characters` never cuts the music.
 */
export const MENU_SCORE_ID = 'music-main';

export function useMenuScore(enabled = true): void {
  useScoreTrack(MENU_SCORE_ID, enabled);
}
