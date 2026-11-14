import { describe, expect, it } from 'vitest';
import {
  computeSpriteFit,
  fitScale,
  normaliseCrop,
  spriteTransform,
  toWorldY,
} from './designSpace';

describe('fitScale', () => {
  it('contains the 16:9 frame in any host', () => {
    expect(fitScale(1920, 1080)).toBe(1);
    expect(fitScale(960, 540)).toBe(0.5);
    // 4:3 host: width limits.
    expect(fitScale(1600, 1200)).toBeCloseTo(1600 / 1920);
    // Ultra wide host: height limits.
    expect(fitScale(3000, 900)).toBeCloseTo(900 / 1080);
  });

  it('returns 0 for an unusable host', () => {
    expect(fitScale(0, 100)).toBe(0);
    expect(fitScale(Number.NaN, 100)).toBe(0);
  });
});

describe('computeSpriteFit', () => {
  it('fill maps the box to the whole image', () => {
    expect(computeSpriteFit(100, 50, 400, 400, 'fill')).toEqual({
      scaleX: 1,
      scaleY: 1,
      offsetX: 0,
      offsetY: 0,
    });
  });

  it('contain leaves the short axis uncovered, centred', () => {
    // 565x610 frame in a square 100 box: height limits, width is 92.6%.
    const fit = computeSpriteFit(100, 100, 565, 610, 'contain');
    const fracW = 565 / 610;
    expect(fit.scaleY).toBeCloseTo(1);
    expect(fit.scaleX).toBeCloseTo(1 / fracW);
    const startX = (1 - fracW) / 2;
    expect(startX * fit.scaleX + fit.offsetX).toBeCloseTo(0);
    expect((startX + fracW) * fit.scaleX + fit.offsetX).toBeCloseTo(1);
  });

  it('cover crops the long axis and honours object-position', () => {
    // Wide image in a tall box, anchored to the top.
    const fit = computeSpriteFit(100, 200, 400, 100, 'cover', 0.5, 0);
    // The image is drawn 800 wide, so the box shows 100/800 of it.
    expect(fit.scaleX).toBeCloseTo(100 / 800);
    expect(fit.scaleY).toBeCloseTo(1);
    expect(fit.offsetY).toBeCloseTo(0);
    // The box centre lands on the image centre.
    expect(0.5 * fit.scaleX + fit.offsetX).toBeCloseTo(0.5);
  });

  it('bottom position aligns the image bottom with the box bottom', () => {
    const fit = computeSpriteFit(100, 100, 100, 50, 'contain', 0.5, 1);
    // The image covers the lower half of the box.
    expect(0.5 * fit.scaleY + fit.offsetY).toBeCloseTo(0);
    expect(1 * fit.scaleY + fit.offsetY).toBeCloseTo(1);
  });
});

describe('spriteTransform', () => {
  it('places a top-left anchored rect with y flipped', () => {
    const t = spriteTransform({ x: 100, y: 50, w: 200, h: 100 }, 2);
    expect(t).toEqual({ cx: 200, cy: toWorldY(100), w: 200, h: 100 });
  });

  it('derives the height from the aspect ratio and anchors at the bottom centre', () => {
    const t = spriteTransform({ x: 960, y: 1000, w: 300, originX: 0.5, originY: 1 }, 3);
    expect(t.h).toBe(100);
    expect(t.cx).toBe(960);
    expect(t.cy).toBe(toWorldY(950));
  });
});

describe('normaliseCrop', () => {
  it('turns a source-pixel crop into UV fractions', () => {
    expect(normaliseCrop({ x: 764, y: 182, w: 171, h: 751 }, 1034, 942)).toEqual([
      764 / 1034,
      182 / 942,
      171 / 1034,
      751 / 942,
    ]);
    expect(normaliseCrop(undefined, 10, 10)).toEqual([0, 0, 1, 1]);
  });
});
