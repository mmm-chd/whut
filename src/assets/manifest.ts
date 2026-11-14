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
import crayonFontUrl from './fonts/DK Cool Crayon.ttf';
import kindredSpiritsUrl from '../audio/bgm/Kindred Spirits - Howard Harper-Barnes.mp3';
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

  // Font
  'font-crayon': finalAsset('font-crayon', 'font', crayonFontUrl),
};
