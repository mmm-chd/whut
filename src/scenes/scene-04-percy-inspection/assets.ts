/**
 * Every texture the P-04 world draws. The landscape and the rock are the P-01
 * art, the rig parts come from `src/assets/fixed/percy`. The inspector model is
 * not an image: it is fetched separately by the inspector, so it must never be
 * added to this preload list.
 */
export const p04WorldTextureIds: readonly string[] = [
  'bg-space',
  'bg-cloud-1',
  'bg-cloud-2',
  'bg-ridge-far',
  'bg-ridge-near',
  'bg-ground',
  'rock-a',
  'percy-body',
  'percy-arm',
  'percy-back-panel',
  'percy-camera',
  'percy-camera-neck',
  'percy-generator-back',
  'percy-chassis',
  'percy-tire-rear',
  'percy-tire-front-1',
  'percy-tire-front-2',
  'percy-tire-front-3',
];

export const p04CriticalAssetIds: readonly string[] = [...p04WorldTextureIds, 'font-crayon'];

/** The score and the optional media may arrive late without blocking the story. */
export const p04DeferredAssetIds: readonly string[] = ['music-perseverance'];
