import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import percySpriteUrl from '../../../assets/fixed/p02/percy.png';
import { cursorCss, cursorDataUri } from '../../../components/cursor/cursors';
import type { Rect } from '../layout';
import { autoDragFrame, type AutoDragFrame, type AutoDragPath } from './autoDrag';
import {
  DRAG_THRESHOLD_PX,
  clampToHost,
  dropAccepted,
  normalizedDrop,
  shouldStartDrag,
  type Point,
} from './transferMath';

/**
 * Percy's hand-off: the scripted carry, and the manual drag as a spare.
 *
 * The scene runs `auto` on its own, so nobody has to drag anything to finish
 * P-04. A reader with a pointer can still grab him instead, and the drop target
 * is the frame's content rectangle either way. The sprite and the hand are
 * decorative: the `Inspect Percy` button runs the same guarded entry.
 */
export interface PercyTransferProps {
  readonly host: Rect;
  readonly monitor: Rect;
  readonly anchor: Point;
  /** The scripted path; `null` leaves only the manual drag. */
  readonly auto: AutoDragPath | null;
  readonly disabled: boolean;
  readonly onDrop: (result: { inside: boolean; normalized: Point }) => void;
}

const SPRITE_RADIUS = 26;

export function PercyTransfer({
  host,
  monitor,
  anchor,
  auto,
  disabled,
  onDrop,
}: PercyTransferProps) {
  const spriteRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<Point | null>(null);
  const pointRef = useRef<Point>(anchor);
  const draggingRef = useRef(false);
  const dropRef = useRef(onDrop);
  useEffect(() => {
    dropRef.current = onDrop;
  }, [onDrop]);
  // The drop rectangle is read once, at the end of the carry; keeping it in a
  // ref means a re-render with an equal rectangle never restarts the animation.
  const monitorRef = useRef(monitor);
  useEffect(() => {
    monitorRef.current = monitor;
  }, [monitor]);
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [position, setPosition] = useState<Point>(anchor);
  const grabbingCursor = cursorCss('grabbing', 'grabbing');
  const grabCursor = cursorCss('grab', 'grab');
  const [scripted, setScripted] = useState<AutoDragFrame | null>(null);

  // The scripted carry: one animation frame at a time, from a pure timeline, so
  // the same path can be asserted in a test.
  useEffect(() => {
    if (!auto || disabled) {
      return;
    }
    let handle = 0;
    const start = performance.now();
    const step = () => {
      const frame = autoDragFrame(performance.now() - start, auto);
      setScripted(frame);
      if (frame.done) {
        dropRef.current({ inside: true, normalized: normalizedDrop(auto.to, monitorRef.current) });
        return;
      }
      handle = requestAnimationFrame(step);
    };
    handle = requestAnimationFrame(step);
    return () => cancelAnimationFrame(handle);
  }, [auto, disabled]);

  const release = (element: HTMLElement | null, pointerId?: number) => {
    if (element && pointerId !== undefined && typeof element.releasePointerCapture === 'function') {
      try {
        element.releasePointerCapture(pointerId);
      } catch {
        // Capture is already gone (pointercancel); nothing to undo.
      }
    }
  };

  const reset = (element: HTMLElement | null, pointerId?: number) => {
    release(element, pointerId);
    startRef.current = null;
    pointRef.current = anchor;
    draggingRef.current = false;
    setPosition(anchor);
    setDragging(false);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled || event.isPrimary === false) {
      return;
    }
    const element = spriteRef.current;
    const pointerId = typeof event.pointerId === 'number' ? event.pointerId : undefined;
    if (element && pointerId !== undefined && typeof element.setPointerCapture === 'function') {
      try {
        element.setPointerCapture(pointerId);
      } catch {
        // Older engines: a drag still works without capture.
      }
    }
    startRef.current = { x: event.clientX, y: event.clientY };
    pointRef.current = clampToHost({ x: event.clientX, y: event.clientY }, host, SPRITE_RADIUS);
    draggingRef.current = false;
    setPosition(pointRef.current);
    setDragging(false);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = startRef.current;
    if (disabled || !start) {
      return;
    }
    const next = clampToHost({ x: event.clientX, y: event.clientY }, host, SPRITE_RADIUS);
    pointRef.current = next;
    setPosition(next);
    if (!draggingRef.current && shouldStartDrag(start, next, DRAG_THRESHOLD_PX)) {
      draggingRef.current = true;
      setDragging(true);
    }
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const element = spriteRef.current;
    const pointerId = typeof event.pointerId === 'number' ? event.pointerId : undefined;
    if (disabled || !startRef.current) {
      reset(element, pointerId);
      return;
    }
    const wasDragging = draggingRef.current;
    const inside = wasDragging && dropAccepted(pointRef.current, monitor);
    const normalized = normalizedDrop(pointRef.current, monitor);
    reset(element, pointerId);
    if (wasDragging) {
      onDrop({ inside, normalized });
    }
  };

  const onPointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    reset(spriteRef.current, typeof event.pointerId === 'number' ? event.pointerId : undefined);
  };

  // Before the first animation frame there is no measured carry yet, so the
  // hand is drawn from the start of the path: it is on screen from the first
  // paint, and the sprite never jumps in from nowhere.
  const live = auto && !disabled ? auto : null;
  const active = live ? (scripted ?? autoDragFrame(0, live)) : null;
  const place = active ? active.sprite : position;
  const gripping = active ? active.gripping : dragging;

  return (
    <>
      <div
        ref={spriteRef}
        className="p04-transfer"
        data-transfer
        data-dragging={gripping ? 'true' : 'false'}
        data-auto-stage={active ? active.stage : 'manual'}
        data-disabled={disabled ? 'true' : 'false'}
        data-hover={hovered ? 'true' : 'false'}
        style={{
          left: `${place.x}px`,
          top: `${place.y}px`,
          touchAction: 'none',
          pointerEvents: disabled || active ? 'none' : 'auto',
          cursor: gripping ? grabbingCursor : grabCursor,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onLostPointerCapture={onPointerCancel}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <span className="p04-transfer-glow" aria-hidden="true" />
        <img
          className="p04-transfer-art"
          src={percySpriteUrl}
          alt=""
          draggable={false}
          aria-hidden="true"
        />
      </div>
      {active ? <HandCursor at={active.cursor} gripping={active.gripping} /> : null}
    </>
  );
}

/**
 * The hand that carries Percy: the same closed-hand art the cursor uses, drawn
 * inside the picture so the carry reads even on a touch screen.
 */
function HandCursor({ at, gripping }: { at: Point; gripping: boolean }) {
  const art = cursorDataUri(gripping ? 'grabbing' : 'grab');
  return (
    <div
      className="p04-hand"
      data-hand
      data-gripping={gripping ? 'true' : 'false'}
      aria-hidden="true"
      style={{
        left: `${at.x}px`,
        top: `${at.y}px`,
        backgroundImage: `url("${art}")`,
      }}
    />
  );
}