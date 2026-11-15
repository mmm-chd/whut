import type { SceneConfig } from '../../engine/types';
import { p04CriticalAssetIds, p04DeferredAssetIds } from './assets';
import { P04_INTERACTION_IDS } from './state';

export const scene04Config: SceneConfig = {
  id: 'scene-04-percy-inspection',
  title: 'A Closer Look at Percy',
  requiredInteractions: [...P04_INTERACTION_IDS],
  assets: {
    critical: [...p04CriticalAssetIds],
    deferred: [...p04DeferredAssetIds],
  },
};
