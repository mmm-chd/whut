import { CanvasTexture } from 'three';
import type { LoadedTexture } from '../../three/textures';

/**
 * One tread-pair stamp: two parallel rows of short cleat marks, pressed into the
 * dust. It is the only new picture the ending's world needs; the twelve stamps
 * on the ground all draw this one texture. Painted at mount, disposed with it.
 */
export const TRACK_ART = { width: 64, height: 22, scale: 3 } as const;

function paintTread(ctx: CanvasRenderingContext2D, y: number): void {
  const { scale } = TRACK_ART;
  for (let x = 4; x < TRACK_ART.width - 2; x += 6) {
    // A dark dent with a lit lip beside it: a cleat pressed into soft ground.
    ctx.fillStyle = 'rgba(44, 16, 12, 0.8)';
    ctx.fillRect(x * scale, y * scale, 4 * scale, 5 * scale);
    ctx.fillStyle = 'rgba(244, 196, 156, 0.5)';
    ctx.fillRect(x * scale, (y + 5) * scale, 4 * scale, 1 * scale);
  }
}

export interface TrackTexture {
  readonly texture: LoadedTexture;
  dispose(): void;
}

/** Null where there is no 2D canvas (tests, a failed context). */
export function createTrackTexture(): TrackTexture | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const canvas = document.createElement('canvas');
  canvas.width = TRACK_ART.width * TRACK_ART.scale;
  canvas.height = TRACK_ART.height * TRACK_ART.scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return null;
  }
  paintTread(ctx, 2);
  paintTread(ctx, 13);
  const texture = new CanvasTexture(canvas);
  texture.premultiplyAlpha = true;
  const loaded: LoadedTexture = { texture, width: canvas.width, height: canvas.height, placeholder: false };
  return { texture: loaded, dispose: () => texture.dispose() };
}
