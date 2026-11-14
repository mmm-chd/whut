import type { SceneConfig } from '../../engine/types';
import { cruiseCriticalAssetIds } from '../scene-02-launch-to-mars/assets';

export const cruiseSceneConfig: SceneConfig = {
  id: 'filler-scene-01-cruise',
  title: "Sit Tight, It's Gonna Take a While~",
  requiredInteractions: [],
  assets: {
    critical: [...cruiseCriticalAssetIds],
    deferred: [],
  },
};
