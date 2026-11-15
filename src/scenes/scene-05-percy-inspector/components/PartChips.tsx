import { useMemo } from 'react';
import type { InspectionPointId } from '../../scene-04-percy-inspection/inspectionState';
import {
  P04_POINT_HINTS,
  P04_POINT_LABELS,
} from '../../scene-04-percy-inspection/components/pointCopy';
import type { MonitorViewport } from '../../scene-04-percy-inspection/inspector/projection';
import type { InspectorRotation } from '../../scene-04-percy-inspection/inspector/rotation';
import { chipLayout } from './chipLayout';

/**
 * The four parts, spoken from the picture.
 *
 * Each chip is a real button in a fixed DOM order, floating outside the model
 * on the ray that runs through its own part, with a leader line back to the
 * exact spot. Rotation moves the chip and the line together; the tab order
 * never moves.
 *
 * A part turned away from the camera hides its chip *visually* but keeps the
 * button mounted, so keyboard access never depends on how the model is turned
 * — focus brings the chip back into view.
 */
export interface PartChipsProps {
  readonly viewport: MonitorViewport;
  readonly rotation: InspectorRotation;
  readonly occluded: readonly InspectionPointId[];
  readonly activePoint: InspectionPointId | null;
  readonly hoveredPoint: InspectionPointId | null;
  readonly completed: readonly InspectionPointId[];
  readonly onHover: (point: InspectionPointId | null) => void;
  readonly onSelect: (point: InspectionPointId, control: HTMLElement | null) => void;
}

export function PartChips(props: PartChipsProps) {
  const chips = useMemo(
    () =>
      chipLayout({
        viewport: props.viewport,
        rotation: props.rotation,
        occluded: props.occluded,
        activePoint: props.activePoint,
        hoveredPoint: props.hoveredPoint,
        completed: props.completed,
      }),
    [
      props.completed,
      props.occluded,
      props.activePoint,
      props.hoveredPoint,
      props.rotation,
      props.viewport,
    ],
  );

  return (
    <div className="p05-chips" data-part-chips>
      <svg
        className="p05-leaders"
        viewBox={`0 0 ${props.viewport.width} ${props.viewport.height}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {chips
          .filter((chip) => chip.state !== 'hidden' && chip.leader.visible)
          .map((chip) => (
            <g key={chip.point} data-leader={chip.point} data-state={chip.state}>
              <line
                x1={chip.leader.from.x}
                y1={chip.leader.from.y}
                x2={chip.leader.to.x}
                y2={chip.leader.to.y}
              />
              <circle cx={chip.leader.to.x} cy={chip.leader.to.y} r={3.5} />
            </g>
          ))}
      </svg>

      {chips.map((chip) => (
        <button
          key={chip.point}
          type="button"
          className="p05-chip"
          data-chip={chip.point}
          data-state={chip.state}
          data-side={chip.side}
          style={{ left: `${chip.anchor.x}px`, top: `${chip.anchor.y}px` }}
          aria-pressed={props.activePoint === chip.point}
          aria-describedby={`p05-chip-hint-${chip.point}`}
          onPointerEnter={() => props.onHover(chip.point)}
          onPointerLeave={() => props.onHover(null)}
          onFocus={() => props.onHover(chip.point)}
          onBlur={() => props.onHover(null)}
          onClick={(event) => props.onSelect(chip.point, event.currentTarget)}
        >
          <span className="p05-chip-label">{P04_POINT_LABELS[chip.point]}</span>
          <span className="p05-chip-hint" id={`p05-chip-hint-${chip.point}`}>
            {P04_POINT_HINTS[chip.point]}
          </span>
        </button>
      ))}
    </div>
  );
}
