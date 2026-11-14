/**
 * Every texture the P-03 world draws. The stage uploads them before it fades
 * in. The landscape and rock come from P-01, the rocket and smoke from P-02,
 * the rig parts from `src/assets/fixed/percy`.
 */
export const p03WorldTextureIds: readonly string[] = [
  'bg-space',
  'bg-cloud-1',
  'bg-cloud-2',
  'bg-ridge-far',
  'bg-ridge-near',
  'bg-ground',
  'rock-a',
  'p02-rocket',
  'p02-smoke-mid',
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

export const p03CriticalAssetIds: readonly string[] = [...p03WorldTextureIds, 'font-crayon'];

/** Cards and music may arrive late without blocking the story. */
export const p03DeferredAssetIds: readonly string[] = [
  'p03-card-sojourner',
  'p03-card-spirit',
  'p03-card-opportunity',
  'p03-card-curiosity',
  'music-kindred-spirits',
];
