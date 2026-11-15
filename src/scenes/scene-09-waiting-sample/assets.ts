import { p04WorldTextureIds } from '../scene-04-percy-inspection/assets';

/**
 * The ending reuses the Mars ground, sky and Percy rig (the same textures as
 * P-04). The sample tray, the return diagram and the tracks are painted here
 * (SVG and canvas), so no new image is preloaded. A Ding recording, if one is
 * added, belongs in the deferred list; without it the beat is visual.
 */
export const p08WorldTextureIds: readonly string[] = p04WorldTextureIds;

export const p08CriticalAssetIds: readonly string[] = [...p08WorldTextureIds, 'font-crayon'];

/** The recordings may arrive late; the captions carry the story meanwhile. */
export const p08DeferredAssetIds: readonly string[] = [
  'music-perseverance',
  ...Array.from({ length: 16 }, (_, index) => `p08-vo-narrator-${String(index + 1).padStart(2, '0')}`),
  ...Array.from({ length: 6 }, (_, index) => `p08-vo-percy-${String(index + 1).padStart(2, '0')}`),
];
