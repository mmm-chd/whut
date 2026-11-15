import { useCallback, useEffect, useMemo, useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { brushRadiusFor, type BrushCoverage, type Point } from '../brushCoverage';
import type { RockTarget, SampleSite, ToolMode } from '../content';
import {
  CANVAS_H,
  CANVAS_W,
  createDustLayer,
  paintBase,
  paintDust,
  paintOverlay,
  rockOutline,
} from '../rockArt';

/** How far the view may pan, in picture widths. */
export const PAN_LIMIT = 0.05;
const PAN_STEP = 0.015;

export interface Pan {
  readonly x: number;
  readonly y: number;
}

interface RockPOVProps {
  readonly rock: RockTarget;
  readonly site: SampleSite;
  readonly coverage: BrushCoverage;
  /** Changes whenever the coverage grid changed; drives the redraw. */
  readonly version: number;
  readonly mode: ToolMode;
  /** Brush strokes are accepted (brush phase, not paused). */
  readonly brushing: boolean;
  /** The cleaned rock may be clicked to inspect it. */
  readonly inspectable: boolean;
  readonly drilling: boolean;
  readonly depleted: boolean;
  readonly cleaned: boolean;
  readonly pan: Pan;
  readonly label: string;
  readonly onPan: (pan: Pan) => void;
  readonly onStroke: (from: Point | null, to: Point) => void;
  readonly onStrokeEnd: () => void;
  readonly onInspect: () => void;
}

const clamp = (value: number) => Math.max(-PAN_LIMIT, Math.min(PAN_LIMIT, value));

/**
 * The rock close-up: one Canvas2D surface plus pointer and keyboard input.
 *
 * Brush and Move view are separate modes, so one drag never does both. Only
 * the primary pointer's left button counts, and anything that ends a drag
 * (cancel, lost capture, blur) clears the previous point so the next press
 * cannot draw a line across the rock.
 */
export function RockPOV(props: RockPOVProps) {
  const {
    rock,
    site,
    coverage,
    version,
    mode,
    brushing,
    inspectable,
    drilling,
    depleted,
    cleaned,
    pan,
    label,
    onPan,
    onStroke,
    onStrokeEnd,
    onInspect,
  } = props;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const dragRef = useRef<{ id: number; last: Point; lastRaw: Point; startRaw: Point; moved: boolean } | null>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  /** Per-rock cached ground and rock bitmaps; only the overlay repaints. */
  const baseCache = useRef(new Map<string, HTMLCanvasElement>());
  const dustLayer = useRef<HTMLCanvasElement | null>(null);
  const outline = useMemo(() => rockOutline(rock), [rock]);
  const argsRef = useRef({ rock, site, coverage, pan, drilling, depleted, cleaned, outline });

  useEffect(() => {
    argsRef.current = { rock, site, coverage, pan, drilling, depleted, cleaned, outline };
  });

  const paint = useCallback(() => {
    frameRef.current = null;
    const canvas = canvasRef.current;
    const args = argsRef.current;
    const ctx = canvas?.getContext('2d') ?? null;
    if (!canvas || !args || !ctx) {
      return;
    }

    let base = baseCache.current.get(args.rock.id);
    if (!base) {
      base = document.createElement('canvas');
      base.width = CANVAS_W;
      base.height = CANVAS_H;
      const baseCtx = base.getContext('2d');
      if (baseCtx) {
        paintBase(baseCtx, args.rock);
      }
      baseCache.current.set(args.rock.id, base);
    }
    if (!dustLayer.current) {
      dustLayer.current = createDustLayer();
    }
    if (dustLayer.current) {
      paintDust(dustLayer.current, args.coverage, args.rock.id.length);
    }

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.save();
    ctx.translate(args.pan.x * CANVAS_W, args.pan.y * CANVAS_H);
    ctx.drawImage(base, 0, 0);
    paintOverlay(ctx, {
      site: args.site,
      dust: dustLayer.current,
      outline: args.outline,
      drilling: args.drilling,
      depleted: args.depleted,
      cleaned: args.cleaned,
      time: args.drilling ? performance.now() : 0,
    });
    ctx.restore();
  }, []);

  // One redraw per frame, however many strokes arrived.
  useEffect(() => {
    if (frameRef.current === null) {
      frameRef.current = window.requestAnimationFrame(paint);
    }
  }, [paint, version, rock, site, pan, drilling, depleted, cleaned]);

  // While the drill runs the bit jitters, so the picture repaints each frame.
  useEffect(() => {
    if (!drilling) {
      return;
    }
    let id = 0;
    const loop = () => {
      paint();
      id = window.requestAnimationFrame(loop);
    };
    id = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(id);
  }, [drilling, paint]);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, []);

  const toLocal = useCallback(
    (clientX: number, clientY: number): Point | null => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect || rect.width <= 0 || rect.height <= 0) {
        return null;
      }
      const u = (clientX - rect.left) / rect.width - pan.x;
      const v = (clientY - rect.top) / rect.height - pan.y;
      return Number.isFinite(u) && Number.isFinite(v) ? { u, v } : null;
    },
    [pan.x, pan.y],
  );

  /** The picture's own 0..1 coordinates, before the pan offset is removed. */
  const toRaw = useCallback((clientX: number, clientY: number): Point | null => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) {
      return null;
    }
    const u = (clientX - rect.left) / rect.width;
    const v = (clientY - rect.top) / rect.height;
    return Number.isFinite(u) && Number.isFinite(v) ? { u, v } : null;
  }, []);

  const endDrag = useCallback(
    (element: HTMLElement | null, pointerId?: number) => {
      const drag = dragRef.current;
      dragRef.current = null;
      if (drag && element && pointerId !== undefined && element.hasPointerCapture?.(pointerId)) {
        element.releasePointerCapture(pointerId);
      }
      if (drag) {
        onStrokeEnd();
      }
    },
    [onStrokeEnd],
  );

  // A lost window or hidden tab ends the stroke, so no long jump on return.
  useEffect(() => {
    const cancel = () => endDrag(null);
    window.addEventListener('blur', cancel);
    document.addEventListener('visibilitychange', cancel);
    return () => {
      window.removeEventListener('blur', cancel);
      document.removeEventListener('visibilitychange', cancel);
    };
  }, [endDrag]);

  // Pause (or leaving the brush phase) ends any stroke in progress.
  useEffect(() => {
    if (!brushing && dragRef.current) {
      endDrag(canvasRef.current);
    }
  }, [brushing, endDrag]);

  const interactive = brushing || inspectable;

  const down = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!interactive || event.button !== 0 || !event.isPrimary) {
      return;
    }
    const point = toLocal(event.clientX, event.clientY);
    const raw = toRaw(event.clientX, event.clientY);
    if (!point || !raw) {
      return;
    }
    dragRef.current = { id: event.pointerId, last: point, lastRaw: raw, startRaw: raw, moved: false };
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {
      // A synthetic or already-ended pointer cannot be captured; the stroke still works.
    }
    if (brushing && mode === 'brush') {
      onStroke(null, point);
    }
  };

  /** The brush ring follows the pointer by writing its transform directly. */
  const moveRing = (event: PointerEvent<HTMLCanvasElement>) => {
    const ring = ringRef.current;
    const canvas = canvasRef.current;
    const holder = canvas?.parentElement;
    if (!ring || !canvas || !holder) {
      return;
    }
    if (!(brushing && mode === 'brush')) {
      ring.style.opacity = '0';
      return;
    }
    const canvasRect = canvas.getBoundingClientRect();
    const holderRect = holder.getBoundingClientRect();
    const size = brushRadiusFor(rock.shape) * 2 * canvasRect.width;
    ring.style.width = `${size}px`;
    ring.style.height = `${size}px`;
    ring.style.transform = `translate(${event.clientX - holderRect.left - size / 2}px, ${event.clientY - holderRect.top - size / 2}px)`;
    ring.style.opacity = '1';
  };

  const hideRing = () => {
    if (ringRef.current) {
      ringRef.current.style.opacity = '0';
    }
  };

  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    moveRing(event);
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) {
      return;
    }
    const point = toLocal(event.clientX, event.clientY);
    const raw = toRaw(event.clientX, event.clientY);
    if (!point || !raw) {
      return;
    }
    if (Math.hypot(raw.u - drag.startRaw.u, raw.v - drag.startRaw.v) > 0.01) {
      drag.moved = true;
    }
    if (brushing && mode === 'brush') {
      onStroke(drag.last, point);
      drag.last = point;
    } else if (brushing && mode === 'pan') {
      onPan({ x: clamp(pan.x + (raw.u - drag.lastRaw.u)), y: clamp(pan.y + (raw.v - drag.lastRaw.v)) });
    }
    drag.lastRaw = raw;
  };

  const up = (event: PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) {
      return;
    }
    const wasTap = !drag.moved;
    endDrag(event.currentTarget, event.pointerId);
    if (wasTap && inspectable) {
      onInspect();
    }
  };

  const cancel = (event: PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) {
      return;
    }
    endDrag(event.currentTarget, event.pointerId);
  };

  const key = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (!brushing) {
      return;
    }
    const steps: Record<string, Pan> = {
      ArrowLeft: { x: pan.x + PAN_STEP, y: pan.y },
      ArrowRight: { x: pan.x - PAN_STEP, y: pan.y },
      ArrowUp: { x: pan.x, y: pan.y + PAN_STEP },
      ArrowDown: { x: pan.x, y: pan.y - PAN_STEP },
    };
    const next = steps[event.key];
    if (!next) {
      return;
    }
    event.preventDefault();
    onPan({ x: clamp(next.x), y: clamp(next.y) });
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        className="p05s-pov"
        width={CANVAS_W}
        height={CANVAS_H}
        data-mode={mode}
        data-interactive={interactive ? 'true' : 'false'}
        tabIndex={0}
        role="img"
        aria-label={label}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={cancel}
        onPointerLeave={hideRing}
        onLostPointerCapture={cancel}
        onKeyDown={key}
      />
      <div ref={ringRef} className="p05s-brush-ring" aria-hidden="true" />
    </>
  );
}
