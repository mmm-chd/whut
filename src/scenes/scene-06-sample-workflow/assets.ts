/**
 * The sampling scene draws its rocks and tubes itself (Canvas2D and DOM), so
 * its critical list is only what the Mars backdrop and the crayon face need.
 * Nothing here loads the inspector's GLB: that belongs to the previous scene.
 */
import { p04WorldTextureIds } from '../scene-04-percy-inspection/assets';

/** The Mars ground, the rock and the Percy rig: the same textures as P-04. */
export const p05SampleWorldTextureIds: readonly string[] = p04WorldTextureIds;

export const p05SampleCriticalAssetIds: readonly string[] = [...p05SampleWorldTextureIds, 'font-crayon'];

/** The recordings may arrive late; the text carries the story meanwhile. */
export const p05SampleDeferredAssetIds: readonly string[] = [
  'music-perseverance',
  'p05-sample-vo-narrator-01',
  'p05-sample-vo-narrator-02',
  'p05-sample-vo-narrator-03',
  'p05-sample-vo-narrator-04',
  'p05-sample-vo-narrator-05',
  'p05-sample-vo-intro-ready',
];
