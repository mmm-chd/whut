import type { SceneConfig } from '../../engine/types';
import { p07CriticalAssetIds, p07DeferredAssetIds } from './assets';
import { P07_INTERACTION_IDS } from './state';

export const RUNNER_SCENE_ID = 'scene-08-the-runner';

export const runnerConfig: SceneConfig = {
  id: RUNNER_SCENE_ID,
  title: 'The Runner',
  requiredInteractions: [...P07_INTERACTION_IDS],
  assets: {
    critical: [...p07CriticalAssetIds],
    deferred: [...p07DeferredAssetIds],
  },
};
