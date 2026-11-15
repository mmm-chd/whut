import type { SceneConfig } from '../../engine/types';
import { p08CriticalAssetIds, p08DeferredAssetIds } from './assets';
import { P08_INTERACTION_IDS } from './state';

export const P08_SCENE_ID = 'scene-09-waiting-sample';

export const waitingSampleConfig: SceneConfig = {
  id: P08_SCENE_ID,
  title: 'The Waiting Sample',
  requiredInteractions: [...P08_INTERACTION_IDS],
  assets: {
    critical: [...p08CriticalAssetIds],
    deferred: [...p08DeferredAssetIds],
  },
};
