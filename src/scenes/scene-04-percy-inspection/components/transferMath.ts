import { monitorContentRect } from '../layout';
import type { Rect } from '../layout';

export { monitorContentRect };

/**
 * Drag geometry for the transfer sprite, kept pure so the thresholds and the
 * drop area are testable without a pointer device.
 *
 * The drop target is the monitor's inset content rectangle, never its
 * decorative frame: a drop on the border is a miss, not a near-miss.
 */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Movement that separates a click from a drag. */
export const DRAG_THRESHOLD_PX = 8;
/** The decorative frame the monitor content is inset by. */
export const MONITOR_FRAME_PX = 6;

/**
 * A drag starts only after the pointer has moved far enough in either axis.
 * Below the threshold the press is still a click, so a point control under the
 * pointer keeps working.
 */
export function shouldStartDrag(
  start: Point,
  current: Point,
  threshold = DRAG_THRESHOLD_PX,
): boolean {
  const dx = current.x - start.x;
  const dy = current.y - start.y;
  return Number.isFinite(dx) && Number.isFinite(dy) && Math.hypot(dx, dy) >= threshold;
}

/** Keep the dragged sprite inside the host, whichever way the pointer leaves. */
export function clampToHost(point: Point, host: Rect, radius = 0): Point {
  const minX = host.left + radius;
  const maxX = host.left + host.width - radius;
  const minY = host.top + radius;
  const maxY = host.top + host.height - radius;
  const x = Number.isFinite(point.x) ? point.x : minX;
  const y = Number.isFinite(point.y) ? point.y : minY;
  return {
    x: Math.min(Math.max(x, minX), Math.max(minX, maxX)),
    y: Math.min(Math.max(y, minY), Math.max(minY, maxY)),
  };
}

// The monitor's content rectangle comes from the layout module: one definition
// decides where the frame ends and the screen begins.

export function dropAccepted(
  point: Point,
  monitor: Rect,
  frame = MONITOR_FRAME_PX,
): boolean {
  const rect = monitorContentRect(monitor, frame);
  return (
    point.x >= rect.left &&
    point.x <= rect.left + rect.width &&
    point.y >= rect.top &&
    point.y <= rect.top + rect.height
  );
}

/**
 * Drop position as a fraction of the content rectangle, so a layout change
 * between the drop and the transfer cannot send the sprite to stale pixels.
 */
export function normalizedDrop(point: Point, monitor: Rect, frame = MONITOR_FRAME_PX): Point {
  const rect = monitorContentRect(monitor, frame);
  const clamp01 = (value: number) => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.5);
  return {
    x: clamp01(rect.width > 0 ? (point.x - rect.left) / rect.width : 0.5),
    y: clamp01(rect.height > 0 ? (point.y - rect.top) / rect.height : 0.5),
  };
}

/** Back to the anchor after a miss: one place that decides where "home" is. */
export function resetToAnchor(anchor: Point): Point {
  return { x: anchor.x, y: anchor.y };
}
