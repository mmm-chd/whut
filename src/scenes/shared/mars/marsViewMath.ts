/**
 * Camera-relative math for the shared Mars landscape.
 *
 * Two things must stay true however far Percy rolls: the number of landscape
 * tiles is fixed (memory cannot grow with travel), and the visible tile ring
 * is always derived from the camera, never from accumulated world position.
 */

export interface TileRingConfig {
  /** Host width of the viewport. */
  readonly viewportWidth: number;
  /** Furthest camera x in host pixels; sets how many tiles the ring needs. */
  readonly maxCameraPx: number;
  /** Tile width in host pixels. */
  readonly tileWidth: number;
  /** Pixels two neighbouring tiles share, so filtering never leaves a seam. */
  readonly overlap?: number;
}

/** Tile indices for a fixed ring centred on the origin: -1, 0, 1, ... */
export function landscapeTileIndexes(config: TileRingConfig): readonly number[] {
  const step = Math.max(1, config.tileWidth);
  const last = Math.ceil((config.maxCameraPx + config.viewportWidth) / step) + 1;
  return Array.from({ length: last + 2 }, (_, index) => index - 1);
}

/** Distance between two tile origins; a non-positive step would overlap backwards. */
export function tileStep(tileWidth: number, overlap = 0): number {
  return Math.max(1, tileWidth - overlap);
}

/** Far layers zoom at a share of the world zoom, so they drift, not jitter. */
export function backdropScale(cameraScale: number, share: number): number {
  if (!Number.isFinite(cameraScale) || cameraScale <= 0) {
    return 1;
  }
  const scale = 1 + (cameraScale - 1) * share;
  return scale > 0 ? scale : 1;
}

export interface BackdropOffset {
  readonly x: number;
  readonly y: number;
}

/** Offset that pins a backdrop layer to the view centre while panning it. */
export function backdropOffset(input: {
  readonly width: number;
  readonly height: number;
  readonly cameraX: number;
  readonly unit: number;
  readonly factor: number;
  readonly scale: number;
}): BackdropOffset {
  const { width, height, cameraX, unit, factor, scale } = input;
  return {
    x: (width / 2) * (1 - scale) - cameraX * unit * factor,
    y: -(height / 2) * (1 - scale),
  };
}

export interface CameraTransform {
  readonly scale: number;
  readonly x: number;
  readonly y: number;
}

/** World camera: zoom about the view centre, aimed at (x, lift) in design units. */
export function worldCameraTransform(input: {
  readonly width: number;
  readonly height: number;
  readonly camera: { readonly x: number; readonly lift: number; readonly scale: number };
  readonly unit: number;
}): CameraTransform {
  const { width, height, camera, unit } = input;
  const scale = Number.isFinite(camera.scale) && camera.scale > 0 ? camera.scale : 1;
  const camX = camera.x * unit;
  const camY = height / 2 - camera.lift * unit;
  return {
    scale,
    x: width / 2 - scale * camX,
    y: -height / 2 + scale * camY,
  };
}
