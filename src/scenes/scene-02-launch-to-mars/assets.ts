import p02SkyUrl from '../../assets/fixed/p02/sky.png';
import p02SeaUrl from '../../assets/fixed/p02/sea.png';
import p02GroundUrl from '../../assets/fixed/p02/ground.png';
import p02TowerBackUrl from '../../assets/fixed/p02/tower-back.png';
import p02TowerFrontUrl from '../../assets/fixed/p02/tower-front.png';
import p02TowerUrl from '../../assets/fixed/p02/tower.png';
import p02RocketHalfUrl from '../../assets/fixed/p02/rocket-half-body.png';
import p02RocketFullUrl from '../../assets/fixed/p02/rocket-full-body.png';
import p02WindowBgUrl from '../../assets/fixed/p02/rocket-window-bg.png';
import p02WindowGlassUrl from '../../assets/fixed/p02/rocket-window-glass.png';
import p02WindowFrameUrl from '../../assets/fixed/p02/rocket-tower-frame.png';
import p02PercyUrl from '../../assets/fixed/p02/percy.png';
import p02GinnyUrl from '../../assets/fixed/p02/ingenuity.png';
import p02SmokeFarUrl from '../../assets/drafts/p02/smoke-far.svg';
import p02SmokeMidUrl from '../../assets/drafts/p02/smoke-mid.svg';
import p02SmokeNearUrl from '../../assets/drafts/p02/smoke-near.svg';
import p02ExhaustUrl from '../../assets/drafts/p02/exhaust.svg';

/**
 * Visual IDs that must be ready before the launch gate can open.
 * `p02-tower-back` stays in the manifest but is not drawn: the references
 * show no floating distant towers.
 */
export const p02CriticalAssetIds: readonly string[] = [
  'p02-bg-sky',
  'p02-sea',
  'p02-ground',
  'p02-tower-front',
  'p02-tower',
  'p02-rocket-half',
  'p02-rocket',
  'p02-window-bg',
  'p02-window-glass',
  'p02-window-frame',
  'p02-percy',
  'p02-ginny',
  'font-crayon',
];

/** Every texture the world draws; uploaded before the stage fades in. */
export const p02WorldTextureIds: readonly string[] = [
  'p02-bg-sky',
  'p02-sea',
  'p02-ground',
  'p02-tower-front',
  'p02-tower',
  'p02-rocket-half',
  'p02-rocket',
  'p02-window-bg',
  'p02-window-glass',
  'p02-window-frame',
  'p02-percy',
  'p02-ginny',
  'p02-smoke-far',
  'p02-smoke-mid',
  'p02-smoke-near',
  'p02-exhaust',
];

/** Effects and optional audio may stay silent/draft without blocking the story. */
export const p02DeferredAssetIds: readonly string[] = [
  'p02-smoke-far',
  'p02-smoke-mid',
  'p02-smoke-near',
  'p02-exhaust',
  'music-perseverance',
  'p02-vo-narrator-01',
  'p02-vo-narrator-02',
  'p02-vo-narrator-03',
  'p02-vo-narrator-04',
  'p02-sfx-window-pop',
  'p02-sfx-countdown',
  'p02-sfx-liftoff',
  'p02-amb-launch-site',
];

/**
 * Direct scaffold URLs. The manifest stays the normal runtime path; this map
 * lets the stage keep recognizable art if a manifest entry is temporarily
 * missing or still points at a placeholder.
 */
export const p02FallbackUrls: Readonly<Record<string, string>> = {
  'p02-bg-sky': p02SkyUrl,
  'p02-sea': p02SeaUrl,
  'p02-ground': p02GroundUrl,
  'p02-tower-back': p02TowerBackUrl,
  'p02-tower-front': p02TowerFrontUrl,
  'p02-tower': p02TowerUrl,
  'p02-rocket-half': p02RocketHalfUrl,
  'p02-rocket': p02RocketFullUrl,
  'p02-window-bg': p02WindowBgUrl,
  'p02-window-glass': p02WindowGlassUrl,
  'p02-window-frame': p02WindowFrameUrl,
  'p02-percy': p02PercyUrl,
  'p02-ginny': p02GinnyUrl,
  'p02-smoke-far': p02SmokeFarUrl,
  'p02-smoke-mid': p02SmokeMidUrl,
  'p02-smoke-near': p02SmokeNearUrl,
  'p02-exhaust': p02ExhaustUrl,
};

export const cruiseCriticalAssetIds: readonly string[] = ['cruise-bg-space'];
