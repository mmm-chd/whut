import type { SceneConfig } from '../../engine/types';
import { P06_INTERACTION_IDS, P06_SCENE_ID } from './state';

/**
 * The engine only needs to know which interactions finish this chapter. All
 * three are part of the ending; no card is ever a required interaction, because
 * the cards are reading, not a task.
 */
export const cheyavaFallsConfig: SceneConfig = {
  id: P06_SCENE_ID,
  title: 'Cheyava Falls',
  requiredInteractions: [...P06_INTERACTION_IDS],
  assets: {
    critical: [],
    deferred: [],
  },
};
