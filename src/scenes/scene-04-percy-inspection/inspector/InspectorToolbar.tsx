import type { InspectorRotationApi } from './useInspectorRotation';

/**
 * Native controls for the same rotation the pointer writes.
 *
 * They live outside the canvas, so keyboard and switch users never have to
 * drag, and arrow keys pressed on the canvas never steal keys from a card.
 */
export interface InspectorToolbarProps {
  readonly rotation: InspectorRotationApi;
}

export function InspectorToolbar({ rotation }: InspectorToolbarProps) {
  return (
    <div className="p04-rotate" data-inspector-toolbar role="group" aria-label="Turn the rover">
      <button type="button" className="p04-rotate-button" onClick={rotation.rotateLeft}>
        Rotate left
      </button>
      <button type="button" className="p04-rotate-button" onClick={rotation.rotateRight}>
        Rotate right
      </button>
      <button type="button" className="p04-rotate-button" onClick={rotation.tiltUp}>
        Tilt up
      </button>
      <button type="button" className="p04-rotate-button" onClick={rotation.tiltDown}>
        Tilt down
      </button>
      <button type="button" className="p04-rotate-button" onClick={rotation.reset}>
        Reset view
      </button>
    </div>
  );
}
