import percyInspectorModelUrl from '../../../assets/fixed/p04/percy-inspector.glb?url';
import type { InspectionPointId } from '../inspectionState';
import { P04_POINT_IDS } from '../inspectionState';
import { P04_POINT_LABELS } from '../components/pointCopy';

/**
 * Where the four parts sit on the rover.
 *
 * Positions are model-local and normalised after fitting: the model is centred
 * on the origin and scaled so its largest half-extent is 1. They are derived
 * from the bounding box, not from named mesh nodes — the GLB names its meshes
 * by part number, so no node name is a reliable anatomical landmark.
 *
 * `calibrated` stays false until the projected markers have been compared
 * against the rendered model; Task 5 owns that visual pass. Nothing here is
 * allowed to guess at runtime: a point uses its configured anchor or the 2D
 * fallback anchor, never a mesh-node index.
 */

export interface ModelAnchor {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface PointAnchor {
  readonly point: InspectionPointId;
  readonly label: string;
  /** Normalised model-local position, each axis within [-1, 1]. */
  readonly position: ModelAnchor;
  /**
   * True when the part is inside the chassis, so occlusion hides it while the
   * external button list still reaches it.
   */
  readonly interior: boolean;
  /** Visible, digit-free explanation of what the marker points at. */
  readonly note: string;
  /** Set once the marker has been matched to the rendered model. */
  readonly calibrated: boolean;
}

export const INSPECTOR_MODEL_URL: string = percyInspectorModelUrl;
export const INSPECTOR_VERTICAL_FOV = 35;
export const INSPECTOR_LOAD_DEADLINE_MS = 10_000;
/** Clear colour of the monitor screen, matching the frame around it. */
export const INSPECTOR_BACKGROUND = '#102b32';

export const P04_MODEL_ANCHORS: Record<InspectionPointId, PointAnchor> = {
  cameras: {
    point: 'cameras',
    label: P04_POINT_LABELS.cameras,
    position: { x: 0, y: 0.58, z: 0.74 },
    interior: false,
    note: 'The camera head on top of the mast.',
    calibrated: false,
  },
  microphone: {
    point: 'microphone',
    label: P04_POINT_LABELS.microphone,
    position: { x: 0.16, y: 0.42, z: 0.62 },
    interior: false,
    note: 'The small microphone on the mast, beside the cameras.',
    calibrated: false,
  },
  moxie: {
    point: 'moxie',
    label: P04_POINT_LABELS.moxie,
    position: { x: -0.34, y: -0.2, z: -0.28 },
    interior: true,
    note: 'Inside the body, on the right-hand side of the chassis.',
    calibrated: false,
  },
  'earth-team': {
    point: 'earth-team',
    label: P04_POINT_LABELS['earth-team'],
    position: { x: 0.3, y: 0.36, z: -0.62 },
    interior: false,
    note: 'The high-gain antenna at the back of the deck.',
    calibrated: false,
  },
};

/** Monitor-local normalised anchors for the 2D fallback picture. */
export const P04_FALLBACK_ANCHORS: Record<InspectionPointId, { x: number; y: number }> = {
  cameras: { x: 0.5, y: 0.24 },
  microphone: { x: 0.62, y: 0.34 },
  moxie: { x: 0.38, y: 0.6 },
  'earth-team': { x: 0.72, y: 0.66 },
};

export function anchorForPoint(point: InspectionPointId, renderer: '3d' | '2d-fallback'): ModelAnchor {
  if (renderer === '2d-fallback') {
    const flat = P04_FALLBACK_ANCHORS[point];
    return { x: flat.x, y: flat.y, z: 0 };
  }
  return P04_MODEL_ANCHORS[point].position;
}

/** Every point must have an anchor; a partial config is a bug, not a fallback. */
export function hasCompleteAnchorSet(): boolean {
  return P04_POINT_IDS.every((point) => {
    const anchor = P04_MODEL_ANCHORS[point];
    const flat = P04_FALLBACK_ANCHORS[point];
    return (
      anchor !== undefined &&
      anchor.point === point &&
      Number.isFinite(anchor.position.x) &&
      Number.isFinite(anchor.position.y) &&
      Number.isFinite(anchor.position.z) &&
      Number.isFinite(flat.x) &&
      Number.isFinite(flat.y)
    );
  });
}

/** Just the positions, keyed by point: what projection and the canvas consume. */
export function modelAnchors(): Record<InspectionPointId, ModelAnchor> {
  const anchors = {} as Record<InspectionPointId, ModelAnchor>;
  for (const point of P04_POINT_IDS) {
    anchors[point] = P04_MODEL_ANCHORS[point].position;
  }
  return anchors;
}
