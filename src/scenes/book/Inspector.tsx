import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { CharacterNode, CharacterSpread } from './characters';
import { ModelViewer, type OrbitRotation } from './ModelViewer';

/**
 * Stage 05 - the 3D inspector (concept 11): the model fills a monitor-shaped
 * panel, the reader drags to rotate it, and hotspots explain the parts. Only
 * here do nodes and direct rotation appear; the book page stays passive.
 */

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  start: OrbitRotation;
}

export interface InspectorProps {
  spread: CharacterSpread;
  reducedMotion: boolean;
  onClose: () => void;
}

export function Inspector({ spread, reducedMotion, onClose }: InspectorProps) {
  const rotationRef = useRef<OrbitRotation>({ x: -0.12, y: 0.85 });
  const dragRef = useRef<DragState | null>(null);
  const [selected, setSelected] = useState<CharacterNode | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      start: { ...rotationRef.current },
    };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    rotationRef.current = {
      y: drag.start.y + (event.clientX - drag.startX) * 0.012,
      x: Math.min(0.85, Math.max(-0.85, drag.start.x + (event.clientY - drag.startY) * 0.008)),
    };
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) {
      return;
    }
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    dragRef.current = null;
  };

  return (
    <div
      className="inspector"
      role="dialog"
      aria-modal="true"
      aria-label={`3D inspector: ${spread.name}, ${spread.headline}`}
    >
      <div className="inspector__scrim" onClick={onClose} aria-hidden="true" />

      <div className="inspector__panel">
        <header className="inspector__bar">
          <span className="inspector__eyebrow">3D INSPECTOR</span>
          <span className="inspector__name">
            {spread.name} · {spread.headline}
          </span>
          <button type="button" ref={closeRef} className="inspector__close" onClick={onClose}>
            <span aria-hidden="true">✕</span> Back to the book
          </button>
        </header>

        <div
          className="inspector__viewer"
          data-selected={selected ? 'true' : 'false'}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <ModelViewer
            model={spread.model}
            portrait={spread.portrait}
            label={`3D model of ${spread.name}, drag to rotate.`}
            variant="inspector"
            interactive
            rotationRef={rotationRef}
            reducedMotion={reducedMotion}
          />

          <div className="inspector__nodes" aria-label={`Parts of ${spread.name}`}>
            {spread.nodes.map((node) => (
              <button
                key={node.id}
                type="button"
                className="inspector__node"
                data-active={selected?.id === node.id ? 'true' : 'false'}
                style={{ left: `${node.x}%`, top: `${node.y}%` }}
                aria-pressed={selected?.id === node.id}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => setSelected(node)}
              >
                <span className="inspector__node-dot" aria-hidden="true" />
                {node.label}
              </button>
            ))}
          </div>

          <p className="inspector__hint">Drag to rotate · Tap a tag to learn more</p>

          {selected ? (
            <aside className="inspector__card">
              <p className="inspector__card-tag">{selected.label}</p>
              <h2 className="inspector__card-title">{selected.title}</h2>
              <p className="inspector__card-body">{selected.body}</p>
              <button
                type="button"
                className="inspector__card-close"
                onClick={() => setSelected(null)}
                aria-label="Close tag"
              >
                <span aria-hidden="true">✕</span>
              </button>
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  );
}
