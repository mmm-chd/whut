import { describe, expect, it } from 'vitest';
import { fitInspectorSphere, monitorAspect, normalizeModelBox } from './modelMath';

describe('fitInspectorSphere', () => {
  it('moves a sphere farther away in a narrow viewport', () => {
    const wide = fitInspectorSphere(1, 16 / 9, 35);
    const narrow = fitInspectorSphere(1, 0.7, 35);
    expect(narrow.distance).toBeGreaterThan(wide.distance);
    expect(narrow.near).toBeGreaterThan(0);
    expect(narrow.far).toBeGreaterThan(narrow.distance + 1);
  });

  it('keeps the sphere inside the vertical cone on wide screens', () => {
    const fit = fitInspectorSphere(1, 3, 35);
    const halfHeightAtModel = fit.distance * Math.tan((35 / 2) * (Math.PI / 180));
    expect(halfHeightAtModel).toBeGreaterThan(1);
  });

  it('keeps the sphere inside the horizontal cone on tall screens', () => {
    const fit = fitInspectorSphere(1, 0.5, 35);
    const halfWidthAtModel = fit.distance * Math.tan(Math.atan(Math.tan((17.5 * Math.PI) / 180) * 0.5));
    expect(halfWidthAtModel).toBeGreaterThan(1);
  });

  it('places the near plane in front of the camera, never behind it', () => {
    for (const aspect of [0.4, 1, 1.77, 5]) {
      const fit = fitInspectorSphere(1, aspect, 35);
      expect(fit.near).toBeGreaterThan(0);
      expect(fit.near).toBeLessThan(fit.distance);
      expect(fit.far).toBeGreaterThan(fit.distance);
    }
  });

  it('falls back to sane defaults for nonsense input', () => {
    const fit = fitInspectorSphere(Number.NaN, 0, Number.POSITIVE_INFINITY);
    expect(Number.isFinite(fit.distance)).toBe(true);
    expect(Number.isFinite(fit.near)).toBe(true);
    expect(Number.isFinite(fit.far)).toBe(true);
    expect(fit.distance).toBeGreaterThan(0);
    expect(fit.near).toBeGreaterThan(0);
    expect(fit.far).toBeGreaterThan(fit.distance);
  });

  it('scales with the radius', () => {
    const small = fitInspectorSphere(0.5, 1.5, 35);
    const large = fitInspectorSphere(2, 1.5, 35);
    expect(large.distance / small.distance).toBeCloseTo(4, 5);
  });
});

describe('normalizeModelBox', () => {
  it('scales the longest axis to the target radius', () => {
    const transform = normalizeModelBox({ x: 6, y: 2, z: 4 }, { x: 0, y: 0, z: 0 });
    expect(transform.scale).toBeCloseTo(1 / 3, 6);
  });

  it('centres an off-origin model on the origin', () => {
    const transform = normalizeModelBox({ x: 2, y: 2, z: 2 }, { x: 5, y: -3, z: 8 });
    expect(transform.scale).toBe(1);
    expect(transform.offset).toEqual({ x: -5, y: 3, z: -8 });
  });

  it('moves the scaled centre to the origin', () => {
    const size = { x: 4, y: 3, z: 2 };
    const center = { x: 1.5, y: 0.75, z: -2 };
    const { scale, offset } = normalizeModelBox(size, center);
    for (const axis of ['x', 'y', 'z'] as const) {
      expect(center[axis] * scale + offset[axis]).toBeCloseTo(0, 10);
    }
  });

  it('survives a degenerate box', () => {
    const transform = normalizeModelBox({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 });
    expect(Number.isFinite(transform.scale)).toBe(true);
    expect(transform.scale).toBeGreaterThan(0);
  });
});

describe('monitorAspect', () => {
  it('divides width by height', () => {
    expect(monitorAspect(912, 528)).toBeCloseTo(912 / 528, 6);
  });

  it('survives a zero-height rectangle', () => {
    expect(Number.isFinite(monitorAspect(300, 0))).toBe(true);
  });
});
