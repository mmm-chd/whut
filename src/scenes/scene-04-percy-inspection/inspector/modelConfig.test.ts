import { describe, expect, it } from 'vitest';
import { copyAllowsNumbers } from '../content';
import { P04_POINT_IDS } from '../inspectionState';
import { P04_POINT_LABELS } from '../components/pointCopy';
import {
  anchorForPoint,
  hasCompleteAnchorSet,
  INSPECTOR_LOAD_DEADLINE_MS,
  INSPECTOR_VERTICAL_FOV,
  P04_FALLBACK_ANCHORS,
  P04_MODEL_ANCHORS,
} from './modelConfig';

describe('inspector anchors', () => {
  it('configures exactly the four points, with labels from one source', () => {
    expect(Object.keys(P04_MODEL_ANCHORS).sort()).toEqual([...P04_POINT_IDS].sort());
    for (const point of P04_POINT_IDS) {
      expect(P04_MODEL_ANCHORS[point].point).toBe(point);
      expect(P04_MODEL_ANCHORS[point].label).toBe(P04_POINT_LABELS[point]);
    }
    expect(hasCompleteAnchorSet()).toBe(true);
  });

  it('keeps every 3D anchor inside the normalised model box', () => {
    for (const point of P04_POINT_IDS) {
      const { x, y, z } = P04_MODEL_ANCHORS[point].position;
      for (const value of [x, y, z]) {
        expect(Math.abs(value)).toBeLessThanOrEqual(1);
      }
    }
  });

  it('keeps every fallback anchor on the monitor picture and distinct', () => {
    const seen = new Set<string>();
    for (const point of P04_POINT_IDS) {
      const { x, y } = P04_FALLBACK_ANCHORS[point];
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(1);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(1);
      seen.add(`${x},${y}`);
    }
    expect(seen.size).toBe(P04_POINT_IDS.length);
  });

  it('serves a flat anchor for the fallback and a 3D anchor for the model', () => {
    const flat = anchorForPoint('cameras', '2d-fallback');
    expect(flat).toEqual({ ...P04_FALLBACK_ANCHORS.cameras, z: 0 });
    expect(anchorForPoint('cameras', '3d')).toEqual(P04_MODEL_ANCHORS.cameras.position);
  });

  it('marks MOXIE as interior and the other three as surface parts', () => {
    expect(P04_MODEL_ANCHORS.moxie.interior).toBe(true);
    for (const point of P04_POINT_IDS) {
      if (point !== 'moxie') {
        expect(P04_MODEL_ANCHORS[point].interior).toBe(false);
      }
    }
  });

  it('describes every part without printing a figure', () => {
    expect(copyAllowsNumbers()).toBe(false);
    for (const point of P04_POINT_IDS) {
      const note = P04_MODEL_ANCHORS[point].note;
      expect(note.length).toBeGreaterThan(10);
      expect(note).not.toMatch(/\d/u);
    }
  });

  it('loads well inside the story, with a sane near plane budget', () => {
    expect(INSPECTOR_LOAD_DEADLINE_MS).toBe(10_000);
    expect(INSPECTOR_VERTICAL_FOV).toBeGreaterThan(20);
    expect(INSPECTOR_VERTICAL_FOV).toBeLessThan(60);
  });
});
