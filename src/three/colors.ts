import { Color, LinearSRGBColorSpace } from 'three';

/**
 * A raw hex colour for `setClearColor`.
 *
 * `setClearColor` treats its string as sRGB and converts it, which turns a
 * backdrop almost black under a linear output colour space. Building the raw
 * colour keeps the hex on screen unchanged.
 */
export function rawClearColor(hex: string): Color {
  const value = hex.replace('#', '');
  return new Color().setRGB(
    parseInt(value.slice(0, 2), 16) / 255,
    parseInt(value.slice(2, 4), 16) / 255,
    parseInt(value.slice(4, 6), 16) / 255,
    LinearSRGBColorSpace,
  );
}
