import { describe, expect, it } from 'vitest';
import {
  backdropOffset,
  backdropScale,
  landscapeTileIndexes,
  tileStep,
  worldCameraTransform,
} from './marsViewMath';

/**
 * The shared Mars landscape must be bounded and seamless: a fixed tile count
 * for any travel distance, and a ring derived from the camera rather than from
 * accumulated world position.
 */

describe('tile ring', () => {
  it('keeps a fixed tile count however long the walk is', () => {
    const near = landscapeTileIndexes({ viewportWidth: 1280, maxCameraPx: 3200, tileWidth: 1920 });
    const far = landscapeTileIndexes({ viewportWidth: 1280, maxCameraPx: 900_000, tileWidth: 1920 });
    expect(near.length).toBe(6);
    expect(far.length).toBeLessThan(1000);
    // Tile count depends on camera reach, not on elapsed time.
    expect(landscapeTileIndexes({ viewportWidth: 1280, maxCameraPx: 900_000, tileWidth: 1920 })).toEqual(far);
  });

  it('starts one tile to the left so the left edge is covered', () => {
    const indexes = landscapeTileIndexes({ viewportWidth: 800, maxCameraPx: 0, tileWidth: 800 });
    expect(indexes[0]).toBe(-1);
    expect(indexes).toContain(0);
    expect(indexes).toContain(2);
  });

  it('never places two tiles on the same origin', () => {
    const step = tileStep(1920, 3);
    expect(step).toBe(1917);
    const indexes = landscapeTileIndexes({ viewportWidth: 1920, maxCameraPx: 4000, tileWidth: 1917 });
    const origins = indexes.map((index) => index * step);
    expect(new Set(origins).size).toBe(origins.length);
  });

  it('overlaps neighbours even when the caller asks for too much overlap', () => {
    expect(tileStep(100, 400)).toBe(1);
    expect(tileStep(0)).toBe(1);
  });
});

describe('backdrop layers', () => {
  it('drifts with the world zoom at a share of it', () => {
    expect(backdropScale(1, 0.25)).toBe(1);
    expect(backdropScale(2, 0.25)).toBeCloseTo(1.25);
    expect(backdropScale(3, 0.25)).toBeCloseTo(1.5);
  });

  it('ignores a non-finite or negative zoom', () => {
    expect(backdropScale(Number.NaN, 0.25)).toBe(1);
    expect(backdropScale(0, 0.25)).toBe(1);
  });

  it('pins the layer to the view centre while panning it by the factor', () => {
    const centred = backdropOffset({
      width: 1000,
      height: 600,
      cameraX: 0,
      unit: 1,
      factor: 0.2,
      scale: 1,
    });
    expect(centred).toEqual({ x: 0, y: -0 });

    const panned = backdropOffset({
      width: 1000,
      height: 600,
      cameraX: 500,
      unit: 1,
      factor: 0.2,
      scale: 1,
    });
    expect(panned.x).toBe(-100);
  });
});

describe('world camera', () => {
  it('aims the camera at the requested x and lift', () => {
    const t = worldCameraTransform({
      width: 1000,
      height: 600,
      camera: { x: 100, lift: 50, scale: 1 },
      unit: 1,
    });
    // (100, 50) design units maps to the view centre (500, 300), which is
    // (-250) in world units below the group origin.
    expect(t.x).toBe(400);
    expect(t.y).toBe(-50);
    expect(t.scale).toBe(1);
  });

  it('scales about the view centre', () => {
    const t = worldCameraTransform({
      width: 1000,
      height: 600,
      camera: { x: 100, lift: 50, scale: 2 },
      unit: 1,
    });
    expect(t.scale).toBe(2);
    expect(t.x).toBe(500 - 2 * 100);
    expect(t.y).toBe(-300 + 2 * 250);
  });

  it('falls back to a unit scale for a broken zoom', () => {
    const t = worldCameraTransform({
      width: 1000,
      height: 600,
      camera: { x: 0, lift: 0, scale: 0 },
      unit: 1,
    });
    expect(t.scale).toBe(1);
  });
});
