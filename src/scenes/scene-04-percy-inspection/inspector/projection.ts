import type { ModelAnchor } from './modelConfig';
import { INSPECTOR_VERTICAL_FOV } from './modelConfig';
import { fitInspectorSphere } from './modelMath';
import type { InspectorRotation } from './rotation';

/** The monitor screen's rounded frame, in CSS pixels. */
export const MONITOR_FRAME_PX = 6;

/**
 * The rectangle the canvas draws into, plus the camera that fits it. Both the
 * canvas and the DOM markers use this, so they cannot disagree.
 */
export function monitorViewport(monitor: { width: number; height: number }): MonitorViewport {
  const width = Math.max(1, monitor.width - MONITOR_FRAME_PX * 2);
  const height = Math.max(1, monitor.height - MONITOR_FRAME_PX * 2);
  const fit = fitInspectorSphere(1, width / height, INSPECTOR_VERTICAL_FOV);
  return { width, height, fovDegrees: INSPECTOR_VERTICAL_FOV, distance: fit.distance };
}

/**
 * Projection from model space to monitor pixels.
 *
 * The camera is fixed on the +Z axis at `distance`; the model turns instead.
 * Every point is therefore one rotation plus one perspective divide, which is
 * cheap enough to run on a pointer move and precise enough to share between
 * the canvas and the DOM hotspot layer.
 */

export interface MonitorViewport {
  readonly width: number;
  readonly height: number;
  readonly fovDegrees: number;
  readonly distance: number;
}

export interface ProjectedAnchor {
  /** Monitor-local CSS pixels, from the screen's top-left corner. */
  readonly x: number;
  readonly y: number;
  /** True when the point faces the reader and lands inside the monitor. */
  readonly visible: boolean;
  /** Distance from the camera along the view axis, for depth sorting. */
  readonly depth: number;
}

function rotatePoint(point: ModelAnchor, yaw: number, pitch: number): ModelAnchor {
  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);
  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);

  // Pitch around X, then yaw around Y: a trackball-lite that never rolls.
  const x1 = point.x;
  const y1 = point.y * cosPitch - point.z * sinPitch;
  const z1 = point.y * sinPitch + point.z * cosPitch;

  return {
    x: x1 * cosYaw + z1 * sinYaw,
    y: y1,
    z: -x1 * sinYaw + z1 * cosYaw,
  };
}

export function projectAnchor(
  anchor: ModelAnchor,
  rotation: InspectorRotation,
  viewport: MonitorViewport,
): ProjectedAnchor {
  const width = viewport.width > 0 ? viewport.width : 1;
  const height = viewport.height > 0 ? viewport.height : 1;
  const distance = viewport.distance > 0 ? viewport.distance : 1;
  const turned = rotatePoint(anchor, rotation.yaw, rotation.pitch);

  const depth = distance - turned.z;
  const halfHeight = Math.tan(((viewport.fovDegrees || 35) / 2) * (Math.PI / 180)) * depth;
  const halfWidth = halfHeight * (width / height);

  const x = width / 2 + (turned.x / halfWidth) * (width / 2);
  const y = height / 2 - (turned.y / halfHeight) * (height / 2);
  const visible =
    depth > 0.01 &&
    turned.z < distance &&
    x >= 0 &&
    x <= width &&
    y >= 0 &&
    y <= height;

  return { x, y, visible, depth };
}

/**
 * Which hotspots to draw: inside the monitor, in front of the camera, and not
 * hidden behind the body. When two project onto the same spot the nearer one
 * wins; nothing is ever removed from the external button list.
 */
export function visibleAnchors(
  anchors: Readonly<Record<string, ModelAnchor>>,
  rotation: InspectorRotation,
  viewport: MonitorViewport,
  minimumSeparationPx = 28,
): Array<{ point: string; projection: ProjectedAnchor }> {
  const projected = Object.entries(anchors)
    .map(([point, anchor]) => ({ point, projection: projectAnchor(anchor, rotation, viewport) }))
    .filter((entry) => entry.projection.visible)
    .sort((a, b) => a.projection.depth - b.projection.depth);

  const kept: Array<{ point: string; projection: ProjectedAnchor }> = [];
  for (const entry of projected) {
    const crowded = kept.some(
      (other) =>
        Math.hypot(other.projection.x - entry.projection.x, other.projection.y - entry.projection.y) <
        minimumSeparationPx,
    );
    if (!crowded) {
      kept.push(entry);
    }
  }
  return kept;
}
