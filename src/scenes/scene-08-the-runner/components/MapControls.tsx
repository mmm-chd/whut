import { sameCell, type Cell } from '../grid';
import type { Preset } from '../map';
import { P07_COPY } from '../content';
import type { P07Phase } from '../state';

interface MapControlsProps {
  readonly phase: P07Phase;
  readonly presets: readonly Preset[];
  readonly selected: Cell | null;
  readonly canSelect: boolean;
  readonly canSend: boolean;
  readonly canArrive: boolean;
  /** Arrival is reached but a fact is still being read. */
  readonly waitingOnFacts: boolean;
  readonly onPreset: (cell: Cell) => void;
  readonly onSend: () => void;
  readonly onArrived: () => void;
}

/**
 * The reader's whole control surface under the map: three named destinations
 * (big touch targets, and the keyboard-friendly way to play), the one command
 * button, and Arrived!, which only exists after Percy is really there.
 */
export function MapControls({
  phase,
  presets,
  selected,
  canSelect,
  canSend,
  canArrive,
  waitingOnFacts,
  onPreset,
  onSend,
  onArrived,
}: MapControlsProps) {
  const ready = phase === 'choosing' || phase === 'signal' || phase === 'navigating' || phase === 'assessing' || phase === 'replanning';
  const arrived = phase === 'arrived' || phase === 'exit';
  if (!ready && !arrived && phase !== 'route-error') {
    return null;
  }

  return (
    <div className="p07-controls" data-phase={phase}>
      <div className="p07-presets" role="group" aria-label="Pick a destination">
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className="p07-button"
            data-preset={preset.id}
            aria-pressed={sameCell(selected, preset.cell)}
            disabled={!canSelect}
            onClick={() => onPreset(preset.cell)}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {arrived ? (
        <div className="p07-primary">
          <button
            type="button"
            className="p07-button"
            data-primary
            data-arrived
            disabled={!canArrive || phase === 'exit'}
            aria-describedby={waitingOnFacts ? 'p07-arrived-hint' : undefined}
            onClick={onArrived}
          >
            Arrived!
          </button>
          {waitingOnFacts ? (
            <p className="p07-hint" id="p07-arrived-hint">
              {P07_COPY.arrivedWaiting}
            </p>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          className="p07-button"
          data-primary
          data-send
          disabled={!canSend}
          onClick={onSend}
        >
          {phase === 'choosing' ? 'Send Command' : 'Command sent'}
        </button>
      )}
    </div>
  );
}
