import type { SceneConfig } from '../../engine/types';
import { p03CriticalAssetIds, p03DeferredAssetIds } from './assets';

export const scene03Config: SceneConfig = {
  id: 'scene-03-arrival-jezero',
  title: 'Finally... Jezero?',
  requiredInteractions: ['p03-continue'],
  assets: {
    critical: [...p03CriticalAssetIds],
    deferred: [...p03DeferredAssetIds],
  },
};
