import { describe, expect, it } from 'vitest';
import {
  P04_ANNOTATIONS,
  P04_INVITATION_X,
  annotationForPhase,
  findAnnotation,
} from './annotations';

/**
 * Annotation copy ships to readers, so it must stay free of the unapproved
 * numbers, and the stops must be ordered along the walk rather than stacked.
 */

describe('annotation copy', () => {
  it('prints no digits in reader-facing copy', () => {
    for (const annotation of P04_ANNOTATIONS) {
      expect(annotation.label).not.toMatch(/\d/);
      expect(annotation.caption).not.toMatch(/\d/);
      expect(annotation.label.length).toBeGreaterThan(3);
      expect(annotation.caption.length).toBeGreaterThan(20);
    }
  });

  it('gives every annotation a unique id and label', () => {
    const ids = P04_ANNOTATIONS.map((annotation) => annotation.id);
    expect(new Set(ids).size).toBe(ids.length);
    const labels = P04_ANNOTATIONS.map((annotation) => annotation.label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe('stops along the walk', () => {
  it('places the stops in order, each after the previous one', () => {
    const xs = P04_ANNOTATIONS.map((annotation) => annotation.x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    for (let index = 1; index < xs.length; index += 1) {
      expect(xs[index] - xs[index - 1]).toBeGreaterThan(100);
    }
  });

  it('stops before the invitation, which is short of the return rock', () => {
    const last = P04_ANNOTATIONS[P04_ANNOTATIONS.length - 1];
    expect(last.x).toBeLessThan(P04_INVITATION_X);
  });
});

describe('phase mapping', () => {
  it('resolves an annotation for each annotation phase', () => {
    for (const annotation of P04_ANNOTATIONS) {
      expect(findAnnotation(annotation.id)).toBe(annotation);
      expect(annotationForPhase(annotation.id)).toBe(annotation);
    }
  });

  it('returns null for phases without an annotation', () => {
    expect(annotationForPhase('entry')).toBeNull();
    expect(annotationForPhase('invitation')).toBeNull();
    expect(annotationForPhase('awaiting-inspection')).toBeNull();
    expect(annotationForPhase('handoff')).toBeNull();
  });
});
