import type { P04Phase } from './state';

/**
 * The three Part A annotations, one per stop of the rolling half.
 *
 * Copy stays qualitative: the PDF numbers for distance and dimensions are not
 * approved (see `content.ts`), so no annotation prints a figure. `x` is the
 * design-unit position where the rover passes the annotation's subject.
 */
export type AnnotationId = Extract<P04Phase, 'distance' | 'dimensions' | 'wheels'>;

export interface P04Annotation {
  readonly id: AnnotationId;
  /** Short on-screen label, above the caption. */
  readonly label: string;
  /** One sentence the narrator is also saying, in the same register. */
  readonly caption: string;
  /** Design-unit x where the rover reaches this stop. */
  readonly x: number;
}

export const P04_ANNOTATIONS: readonly P04Annotation[] = [
  {
    id: 'distance',
    label: 'A long way from home',
    caption: 'Percy has already rolled a long way, and every stretch brings something new.',
    x: 230,
  },
  {
    id: 'dimensions',
    label: 'A big, sturdy rover',
    caption: 'Tall enough to see over the rocks, and built to carry his instruments safely.',
    x: 470,
  },
  {
    id: 'wheels',
    label: 'Six strong wheels',
    caption: 'Every wheel can turn on its own, so Percy can cross rough ground.',
    x: 700,
  },
];

/** Where the rover stops for the invitation, just short of the return rock. */
export const P04_INVITATION_X = 860;

export function findAnnotation(id: AnnotationId): P04Annotation {
  const found = P04_ANNOTATIONS.find((annotation) => annotation.id === id);
  if (!found) {
    throw new Error(`Unknown P-04 annotation: ${id}`);
  }
  return found;
}

/** The annotation a phase shows, if that phase has one. */
export function annotationForPhase(phase: P04Phase): P04Annotation | null {
  return P04_ANNOTATIONS.find((annotation) => annotation.id === phase) ?? null;
}
