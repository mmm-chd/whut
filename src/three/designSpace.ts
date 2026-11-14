/**
 * Design-space helpers shared by every WebGL scene.
 *
 * Scene config stays in design pixels with the y axis pointing down, exactly
 * like the CSS-era numbers. Three.js uses y up, so the renderer negates y at
 * one place only (`toWorldY`). Everything here is pure and runs in jsdom.
 */
export const DESIGN_WIDTH = 1920;
export const DESIGN_HEIGHT = 1080;

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type FitMode = 'fill' | 'contain' | 'cover';

/** Design y (down) -> three.js world y (up). */
export function toWorldY(designY: number): number {
  return -designY;
}

/**
 * Scale that fits the 1920x1080 frame inside a host (the CSS `contain`
 * rule). Returns 0 for an unusable host so callers can skip the frame.
 */
export function fitScale(width: number, height: number): number {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return 0;
  }
  return Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
}

/**
 * Maps a box coordinate (0..1, origin top-left) to an image-local coordinate:
 * `local = box * scale + offset`. A local value outside 0..1 is not covered
 * by the image and the shader discards it (that is how `contain` leaves the
 * box edges transparent and how `cover` crops).
 */
export interface SpriteFit {
  scaleX: number;
  scaleY: number;
  offsetX: number;
  offsetY: number;
}

/**
 * The CSS `object-fit` and `object-position` rules for a box and an image
 * (or a crop of one). `posX`/`posY` are 0 (start) to 1 (end), 0.5 = centre.
 */
export function computeSpriteFit(
  boxW: number,
  boxH: number,
  imageW: number,
  imageH: number,
  mode: FitMode = 'fill',
  posX = 0.5,
  posY = 0.5,
): SpriteFit {
  if (mode === 'fill' || imageW <= 0 || imageH <= 0 || boxW <= 0 || boxH <= 0) {
    return { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 };
  }

  const factor =
    mode === 'contain'
      ? Math.min(boxW / imageW, boxH / imageH)
      : Math.max(boxW / imageW, boxH / imageH);
  // Drawn image size as a fraction of the box.
  const fracW = (imageW * factor) / boxW;
  const fracH = (imageH * factor) / boxH;
  const startX = (1 - fracW) * posX;
  const startY = (1 - fracH) * posY;

  return {
    scaleX: 1 / fracW,
    scaleY: 1 / fracH,
    offsetX: -startX / fracW,
    offsetY: -startY / fracH,
  };
}

export interface SpriteRect {
  /** Anchor point in parent design coordinates (y down). */
  x: number;
  y: number;
  w: number;
  /** Omitted: derived from the texture aspect ratio. */
  h?: number;
  /** Which point of the sprite sits on (x, y): 0 = left/top, 1 = right/bottom. */
  originX?: number;
  originY?: number;
}

/** Centre and size of a sprite rect in three.js world coordinates. */
export function spriteTransform(
  rect: SpriteRect,
  aspect: number,
): { cx: number; cy: number; w: number; h: number } {
  const h = rect.h ?? (aspect > 0 ? rect.w / aspect : rect.w);
  const originX = rect.originX ?? 0;
  const originY = rect.originY ?? 0;
  return {
    cx: rect.x + rect.w * (0.5 - originX),
    cy: toWorldY(rect.y + h * (0.5 - originY)),
    w: rect.w,
    h,
  };
}

export interface ScreenBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** A source-pixel crop as normalised top-left UV (x, y, w, h). */
export function normaliseCrop(
  crop: Box | undefined,
  imageW: number,
  imageH: number,
): [number, number, number, number] {
  if (!crop || imageW <= 0 || imageH <= 0) {
    return [0, 0, 1, 1];
  }
  return [crop.x / imageW, crop.y / imageH, crop.w / imageW, crop.h / imageH];
}
