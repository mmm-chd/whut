import { BOARD_HEIGHT, BOARD_WIDTH, CELL_SIZE, type Cell } from '../grid';
import { cellCenter } from '../mapInput';
import type { Hazard, Preset } from '../map';

interface RouteOverlayProps {
  /** The remaining route, as adjacent cells, or empty. */
  readonly route: readonly Cell[];
  readonly goal: Cell | null;
  readonly cursor: Cell | null;
  readonly showCursor: boolean;
  readonly presets: readonly Preset[];
  readonly showPresets: boolean;
  /** Hazards Percy has found, drawn clearly. Unfound ones stay quiet. */
  readonly found: readonly Hazard[];
  /** Where Percy stands, for the scan rings during assessment. */
  readonly scan: { readonly x: number; readonly y: number; readonly value: number } | null;
}

/** A hand-drawn style target with a little flag: the destination stays visible. */
function GoalMarker({ cell }: { cell: Cell }) {
  const { x, y } = cellCenter(cell);
  return (
    <g className="p07-goal" transform={`translate(${x} ${y})`}>
      <circle r="26" fill="rgba(255, 241, 214, 0.18)" stroke="#fff1d6" strokeWidth="5" strokeDasharray="14 9" />
      <circle r="9" fill="#b95e43" stroke="#fff1d6" strokeWidth="4" />
      <path d="M0 -10V-46" stroke="#fff1d6" strokeWidth="5" strokeLinecap="round" />
      <path d="M2 -46L30 -37L2 -28Z" fill="#b95e43" stroke="#fff1d6" strokeWidth="4" strokeLinejoin="round" />
    </g>
  );
}

function PresetPin({ cell, label }: { cell: Cell; label: string }) {
  const { x, y } = cellCenter(cell);
  return (
    <g transform={`translate(${x} ${y})`} className="p07-pin">
      <title>{label}</title>
      <circle r="21" fill="rgba(255, 241, 214, 0.26)" stroke="#fff1d6" strokeWidth="5" />
      <path d="M0 -6V-32M2 -32L21 -26L2 -20" stroke="#fff1d6" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <text
        x="30"
        y="46"
        fontSize="30"
        fill="#fff1d6"
        stroke="#3b2118"
        strokeWidth="7"
        paintOrder="stroke"
        strokeLinejoin="round"
        fontFamily="'DK Cool Crayon', 'Segoe Print', cursive"
      >
        {label}
      </text>
    </g>
  );
}

/**
 * Everything drawn on top of the picture, in board units. It shares the board's
 * viewBox with the pointer mapping, so what the reader sees under their finger
 * is the cell that gets picked.
 */
export function RouteOverlay({ route, goal, cursor, showCursor, presets, showPresets, found, scan }: RouteOverlayProps) {
  const points = route.map((cell) => {
    const { x, y } = cellCenter(cell);
    return `${x},${y}`;
  });

  return (
    <svg
      className="p07-overlay"
      viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      {showPresets
        ? presets.map((preset) => <PresetPin key={preset.id} cell={preset.cell} label={preset.label} />)
        : null}

      {found.map((hazard) =>
        hazard.rawCells.map((cell) => {
          const { x, y } = cellCenter(cell);
          return (
            <g key={`${hazard.id}-${cell.col}-${cell.row}`} transform={`translate(${x} ${y})`} className="p07-hazard">
              <circle r="38" fill="rgba(185, 94, 67, 0.22)" stroke="#fff1d6" strokeWidth="4" strokeDasharray="10 8" />
              <path d="M0 -17L16 11H-16Z" fill="#ffd9a8" stroke="#3b2118" strokeWidth="3.5" strokeLinejoin="round" />
              <path d="M0 -7V3" stroke="#3b2118" strokeWidth="3.5" strokeLinecap="round" />
              <circle cy="7.5" r="1.8" fill="#3b2118" />
            </g>
          );
        }),
      )}

      {points.length > 1 ? (
        <polyline
          points={points.join(' ')}
          fill="none"
          stroke="#fff1d6"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="4 18"
          opacity="0.95"
        />
      ) : null}

      {showCursor && cursor ? (
        <rect
          x={cursor.col * CELL_SIZE + 3}
          y={cursor.row * CELL_SIZE + 3}
          width={CELL_SIZE - 6}
          height={CELL_SIZE - 6}
          rx="8"
          fill="none"
          stroke="#fff1d6"
          strokeWidth="4"
          strokeDasharray="8 6"
        />
      ) : null}

      {goal ? <GoalMarker cell={goal} /> : null}

      {scan ? (
        <g transform={`translate(${scan.x} ${scan.y})`}>
          {[0.35, 0.7, 1].map((fraction) => (
            <circle
              key={fraction}
              r={34 + fraction * 80 * scan.value}
              fill="none"
              stroke="#fff1d6"
              strokeWidth="4"
              opacity={Math.max(0, 0.85 - scan.value * 0.7) * fraction}
            />
          ))}
        </g>
      ) : null}
    </svg>
  );
}
