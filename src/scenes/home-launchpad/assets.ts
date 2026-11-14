/** Every texture the launchpad draws; uploaded before the stage fades in. */
export const homeWorldTextureIds: readonly string[] = [
  'home-rocket',
  'home-flame',
  'home-smoke-deep',
  'home-smoke-mid',
  'home-smoke-near',
  'home-crowd-a',
  'home-crowd-b',
  'home-moon',
  'home-ship',
  'home-tower',
];

/** Warmable during the splash screen (HTTP cache only, no WebGL). */
export const homeSplashAssetIds: readonly string[] = homeWorldTextureIds;
