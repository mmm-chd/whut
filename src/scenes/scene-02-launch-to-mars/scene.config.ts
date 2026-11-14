import type { SceneConfig } from '../../engine/types';
import { p02CriticalAssetIds, p02DeferredAssetIds } from './assets';

export const scene02Config: SceneConfig = {
  id: 'scene-02-launch-to-mars',
  title: 'The Journey to Mars',
  requiredInteractions: ['launch-button'],
  assets: {
    critical: [...p02CriticalAssetIds],
    deferred: [...p02DeferredAssetIds],
  },
};
