import type { SceneConfig } from '../../engine/types';
import { p05SampleCriticalAssetIds, p05SampleDeferredAssetIds } from './assets';
import { P05_SAMPLE_INTERACTION_IDS } from './content';

export const SAMPLE_SCENE_ID = 'scene-06-sample-workflow';

export const sampleWorkflowConfig: SceneConfig = {
  id: SAMPLE_SCENE_ID,
  title: 'Percy, the Sample Collector',
  requiredInteractions: [...P05_SAMPLE_INTERACTION_IDS],
  assets: {
    critical: [...p05SampleCriticalAssetIds],
    deferred: [...p05SampleDeferredAssetIds],
  },
};
