import fgBandWideUrl from './generated/fg-band-wide.webp';
import fgBandUrl from './generated/fg-band.webp';
import cloud1Url from './generated/cloud-1.webp';
import cloud2Url from './generated/cloud-2.webp';
import cloud3Url from './generated/cloud-3.webp';
import groundUrl from './generated/ground.webp';
import ridgeFarUrl from './generated/ridge-far.webp';
import ridgeNearUrl from './generated/ridge-near.webp';
import roverShadowUrl from './generated/rover-shadow.webp';
import roverUrl from './generated/rover.webp';
import spaceUrl from './generated/space.svg';
import rockAUrl from './fixed/p01/rock1.png';
import rockBUrl from './fixed/p01/rock2.png';
import rockCUrl from './fixed/p01/rock3.png';
import p02SkyUrl from './fixed/p02/sky.png';
import p02SeaUrl from './fixed/p02/sea.png';
import p02GroundUrl from './fixed/p02/ground.png';
import p02TowerBackUrl from './fixed/p02/tower-back.png';
import p02TowerFrontUrl from './fixed/p02/tower-front.png';
import p02TowerUrl from './fixed/p02/tower.png';
import p02RocketHalfUrl from './fixed/p02/rocket-half-body.png';
import p02RocketFullUrl from './fixed/p02/rocket-full-body.png';
import p02WindowBgUrl from './fixed/p02/rocket-window-bg.png';
import p02WindowGlassUrl from './fixed/p02/rocket-window-glass.png';
import p02WindowFrameUrl from './fixed/p02/rocket-tower-frame.png';
import p02PercyUrl from './fixed/p02/percy.png';
import p02GinnyUrl from './fixed/p02/ingenuity.png';
import p02SmokeFarUrl from './drafts/p02/smoke-far.svg';
import p02SmokeMidUrl from './drafts/p02/smoke-mid.svg';
import p02SmokeNearUrl from './drafts/p02/smoke-near.svg';
import p02ExhaustUrl from './drafts/p02/exhaust.svg';
import cruiseSpaceUrl from './fixed/space-filler.png';
import crayonFontUrl from './fonts/DK Cool Crayon.ttf';
import kindredSpiritsUrl from '../audio/bgm/Kindred Spirits - Howard Harper-Barnes.mp3';
import p02Narrator1Url from '../audio/voice-over/perseverance/P02 - Narrator 1.mp3';
import p02Narrator3Url from '../audio/voice-over/perseverance/P02 - Narrator 3.mp3';
import p02TransitionUrl from '../audio/voice-over/perseverance/P02 - Transisi Quote.mp3';
import placeholderUrl from './placeholder.svg';

export type AssetStatus = 'placeholder' | 'draft' | 'final';
export type AssetType = 'image' | 'audio' | 'font' | 'effect';

export interface AssetEntry {
  id: string;
  type: AssetType;
  path: string;
  status: AssetStatus;
  alt?: string;
}

function imageAsset(id: string, alt: string): AssetEntry {
  return {
    id,
    type: 'image',
    path: placeholderUrl,
    status: 'placeholder',
    alt,
  };
}

function draftImage(id: string, path: string, alt: string): AssetEntry {
  return {
    id,
    type: 'image',
    path,
    status: 'draft',
    alt,
  };
}

function finalAsset(id: string, type: AssetType, path: string, alt?: string): AssetEntry {
  return { id, type, path, status: 'final', alt };
}

function deferredAsset(id: string, type: AssetType): AssetEntry {
  return {
    id,
    type,
    path: '',
    status: 'placeholder',
  };
}

export const assetManifest: Record<string, AssetEntry> = {
  // Stage layers (draft art from src/assets/fixed, optimized to WebP)
  // The sky is one unified asset: space above, warm orange Mars sky below.
  'bg-space': draftImage('bg-space', spaceUrl, 'Unified sky: space above Mars'),
  'bg-cloud-1': draftImage('bg-cloud-1', cloud1Url, 'Cloud layer'),
  'bg-cloud-2': draftImage('bg-cloud-2', cloud2Url, 'Cloud layer'),
  'bg-cloud-3': draftImage('bg-cloud-3', cloud3Url, 'Cloud layer'),
  'bg-ridge-far': draftImage('bg-ridge-far', ridgeFarUrl, 'Hazy distant ridge'),
  'bg-ridge-near': draftImage('bg-ridge-near', ridgeNearUrl, 'Layered cliffs and spires'),
  'bg-ground': draftImage('bg-ground', groundUrl, 'Crater floor'),
  'fg-band': draftImage('fg-band', fgBandUrl, 'Foreground rocks'),
  'fg-band-wide': draftImage('fg-band-wide', fgBandWideUrl, 'Foreground rocks, wide'),

  // Characters
  rover: draftImage('rover', roverUrl, 'Percy the rover'),
  'rover-shadow': draftImage('rover-shadow', roverShadowUrl, 'Percy contact shadow'),

  // P-02 stage layers (pulled final art: 1670 x 942 sky, 724 x 2172 rocket)
  'p02-bg-sky': finalAsset('p02-bg-sky', 'image', p02SkyUrl, 'Blue Cape Canaveral sky'),
  'p02-sea': finalAsset('p02-sea', 'image', p02SeaUrl, 'Atlantic horizon'),
  'p02-ground': finalAsset('p02-ground', 'image', p02GroundUrl, 'Launch site ground and road'),
  'p02-tower-back': finalAsset('p02-tower-back', 'image', p02TowerBackUrl, 'Distant launch towers'),
  'p02-tower-front': finalAsset('p02-tower-front', 'image', p02TowerFrontUrl, 'Foreground launch towers'),
  'p02-tower': finalAsset('p02-tower', 'image', p02TowerUrl, 'Launch service tower'),
  'p02-rocket-half': finalAsset(
    'p02-rocket-half',
    'image',
    p02RocketHalfUrl,
    'Atlas V upper body',
  ),
  'p02-rocket': finalAsset('p02-rocket', 'image', p02RocketFullUrl, 'Atlas V 541 rocket'),
  'p02-window-bg': finalAsset(
    'p02-window-bg',
    'image',
    p02WindowBgUrl,
    'Dark rocket window interior',
  ),
  'p02-window-glass': finalAsset(
    'p02-window-glass',
    'image',
    p02WindowGlassUrl,
    'Rocket window glass',
  ),
  'p02-window-frame': finalAsset(
    'p02-window-frame',
    'image',
    p02WindowFrameUrl,
    'Cream circular window frame',
  ),
  'p02-percy': finalAsset('p02-percy', 'image', p02PercyUrl, 'Percy inside the rocket window'),
  'p02-ginny': finalAsset('p02-ginny', 'image', p02GinnyUrl, 'Ginny beside Percy'),

  // P-02 launch effects (scaffold drafts until final smoke art arrives)
  'p02-smoke-far': draftImage('p02-smoke-far', p02SmokeFarUrl, 'Faint launch smoke'),
  'p02-smoke-mid': draftImage('p02-smoke-mid', p02SmokeMidUrl, 'Middle launch smoke'),
  'p02-smoke-near': draftImage('p02-smoke-near', p02SmokeNearUrl, 'Foreground launch smoke'),
  'p02-exhaust': draftImage('p02-exhaust', p02ExhaustUrl, 'Rocket exhaust flame'),

  // Cruise entry (pulled space backdrop)
  'cruise-bg-space': finalAsset(
    'cruise-bg-space',
    'image',
    cruiseSpaceUrl,
    'Deep space with stars',
  ),

  // Interactive rocks (draft, replaced in R04)
  'rock-a': draftImage('rock-a', rockAUrl, 'A jagged rust-red rock'),
  'rock-b': draftImage('rock-b', rockBUrl, 'A rounded ochre rock'),
  'rock-c': draftImage('rock-c', rockCUrl, 'A tall grey rock with blue veins'),

  // UI
  'ui-card-frame': imageAsset('ui-card-frame', 'Fact card frame'),
  'ui-hand': imageAsset('ui-hand', 'Tap hint hand'),

  // Effects
  'rock-a-glow': deferredAsset('rock-a-glow', 'effect'),
  'rock-b-glow': deferredAsset('rock-b-glow', 'effect'),
  'rock-c-glow': deferredAsset('rock-c-glow', 'effect'),
  'dust-particles': deferredAsset('dust-particles', 'effect'),

  // Audio
  'vo-narrator-01': deferredAsset('vo-narrator-01', 'audio'),
  'vo-narrator-02': deferredAsset('vo-narrator-02', 'audio'),
  'vo-percy-01': deferredAsset('vo-percy-01', 'audio'),
  'vo-percy-02': deferredAsset('vo-percy-02', 'audio'),
  'vo-percy-03': deferredAsset('vo-percy-03', 'audio'),
  'vo-percy-closing': deferredAsset('vo-percy-closing', 'audio'),
  'sfx-slide-in': deferredAsset('sfx-slide-in', 'audio'),
  'sfx-card-open': deferredAsset('sfx-card-open', 'audio'),
  'sfx-card-close': deferredAsset('sfx-card-close', 'audio'),
  'sfx-rock-tap': deferredAsset('sfx-rock-tap', 'audio'),
  'sfx-unlock': deferredAsset('sfx-unlock', 'audio'),
  'amb-mars-wind': deferredAsset('amb-mars-wind', 'audio'),
  'music-kindred-spirits': finalAsset('music-kindred-spirits', 'audio', kindredSpiritsUrl),

  // P-02 voice-over (only the lines that were delivered with the P-02 pull)
  'p02-vo-narrator-01': finalAsset('p02-vo-narrator-01', 'audio', p02Narrator1Url),
  'p02-vo-narrator-03': finalAsset('p02-vo-narrator-03', 'audio', p02Narrator3Url),
  'p02-vo-transition': finalAsset('p02-vo-transition', 'audio', p02TransitionUrl),
  'p02-vo-narrator-02': deferredAsset('p02-vo-narrator-02', 'audio'),
  'p02-vo-narrator-04': deferredAsset('p02-vo-narrator-04', 'audio'),
  'p02-sfx-window-pop': deferredAsset('p02-sfx-window-pop', 'audio'),
  'p02-sfx-countdown': deferredAsset('p02-sfx-countdown', 'audio'),
  'p02-sfx-liftoff': deferredAsset('p02-sfx-liftoff', 'audio'),
  'p02-amb-launch-site': deferredAsset('p02-amb-launch-site', 'audio'),

  // Font
  'font-crayon': finalAsset('font-crayon', 'font', crayonFontUrl),
};
