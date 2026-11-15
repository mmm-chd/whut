import { useCallback, useState } from 'react';
import {
  dragRotation,
  INITIAL_ROTATION,
  isDrag,
  nudgePitch,
  nudgeYaw,
  pointerDistance,
  type InspectorRotation,
} from './rotation';

/**
 * The reader's view of the rover.
 *
 * Every input — drag, toolbar, keyboard — writes the same rotation, so the
 * model and the projected markers can never disagree. Rotation is applied
 * immediately: there is no momentum to smooth and nothing to keep animating
 * when the reader stops.
 */
export interface InspectorRotationApi {
  readonly rotation: InspectorRotation;
  rotateBy: (dx: number, dy: number) => void;
  rotateLeft: () => void;
  rotateRight: () => void;
  tiltUp: () => void;
  tiltDown: () => void;
  reset: () => void;
}

export function useInspectorRotation(): InspectorRotationApi {
  const [rotation, setRotation] = useState<InspectorRotation>(INITIAL_ROTATION);

  const rotateBy = useCallback((dx: number, dy: number) => {
    setRotation((current) => dragRotation(current, dx, dy));
  }, []);

  return {
    rotation,
    rotateBy,
    rotateLeft: useCallback(() => setRotation((current) => nudgeYaw(current, -1)), []),
    rotateRight: useCallback(() => setRotation((current) => nudgeYaw(current, 1)), []),
    tiltUp: useCallback(() => setRotation((current) => nudgePitch(current, -1)), []),
    tiltDown: useCallback(() => setRotation((current) => nudgePitch(current, 1)), []),
    reset: useCallback(() => setRotation(INITIAL_ROTATION), []),
  };
}

export interface DragSession {
  readonly startX: number;
  readonly startY: number;
  readonly pointerId: number;
  dragging: boolean;
}

export function beginDrag(pointerId: number, x: number, y: number): DragSession {
  return { startX: x, startY: y, pointerId, dragging: false };
}

/** Returns the rotation delta once the press has become a drag. */
export function continueDrag(
  session: DragSession,
  x: number,
  y: number,
  apply: (dx: number, dy: number) => void,
): DragSession {
  if (!isDrag(pointerDistance({ x: session.startX, y: session.startY }, { x, y }))) {
    return session;
  }
  const dx = Number.isFinite(x - session.startX) ? x - session.startX : 0;
  const dy = Number.isFinite(y - session.startY) ? y - session.startY : 0;
  apply(dx, dy);
  return { ...session, startX: x, startY: y, dragging: true };
}
