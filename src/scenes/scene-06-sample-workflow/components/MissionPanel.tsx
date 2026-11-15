import { findFact } from '../content';
import { remainingSlots, type SamplingState } from '../samplingState';

type StepState = 'pending' | 'current' | 'done';

interface Step {
  readonly id: string;
  readonly label: string;
  readonly state: StepState;
  readonly detail: string | null;
}

const GLYPH: Record<StepState, string> = { pending: '○', current: '◐', done: '✓' };
const WORD: Record<StepState, string> = { pending: 'to do', current: 'now', done: 'done' };

export function stepsFor(state: SamplingState): readonly Step[] {
  const cycle = state.cycle;
  const phase = state.phase;
  const sealing = phase === 'transfer' || phase === 'seal' || phase === 'store';
  const resulted = phase === 'result-core' || phase === 'result-atmosphere';

  const brushDone = Boolean(cycle?.brushComplete);
  const inspectDone = Boolean(cycle?.inspectionAccepted);
  const drillDone = cycle?.drillOutcome != null;
  const storeDone = cycle?.stage === 'done';

  const pick = (done: boolean, current: boolean): StepState => (done ? 'done' : current ? 'current' : 'pending');

  let drillDetail: string | null = null;
  if (cycle?.drillOutcome === 'core') {
    drillDetail = 'Core recovered';
  } else if (cycle?.drillOutcome === 'atmosphere') {
    drillDetail = 'Atmosphere collected — no core';
  }

  return [
    { id: 'brush', label: 'Brush', state: pick(brushDone, cycle?.stage === 'brush'), detail: null },
    { id: 'inspect', label: 'Inspect', state: pick(inspectDone, cycle?.stage === 'inspect'), detail: null },
    {
      id: 'drill',
      label: 'Drill',
      state: pick(drillDone, phase === 'drill-ready' || phase === 'drilling'),
      detail: drillDetail,
    },
    { id: 'store', label: 'Seal & Store', state: pick(storeDone, resulted || sealing), detail: null },
  ];
}

interface MissionPanelProps {
  readonly state: SamplingState;
  /** The four steps are all lit during the opening so the reader can find them. */
  readonly highlightAll: boolean;
  readonly children?: React.ReactNode;
}

/**
 * The right-hand mission rail: the four steps, the tube slots and a drawer of
 * facts already seen. States use a glyph and a word as well as colour.
 */
export function MissionPanel({ state, highlightAll, children }: MissionPanelProps) {
  const steps = stepsFor(state);
  const slots = Array.from({ length: state.config.targetTubeCount }, (_, index) => state.stored[index] ?? null);
  const seen = state.factsSeen.map((id) => findFact(id)).filter((fact) => fact !== null);

  return (
    <aside className="p05s-panel" aria-label="Mission" data-highlight={highlightAll ? 'true' : 'false'}>
      <h2 className="p05s-panel-title">4 steps to a tube</h2>
      <ol className="p05s-steps">
        {steps.map((step, index) => (
          <li
            key={step.id}
            className="p05s-step"
            data-step={step.id}
            data-state={highlightAll ? 'current' : step.state}
          >
            <span className="p05s-step-glyph" aria-hidden="true">
              {GLYPH[highlightAll ? 'current' : step.state]}
            </span>
            <span className="p05s-step-label">
              {index + 1}. {step.label}
            </span>
            <span className="p05s-step-word">{WORD[highlightAll ? 'current' : step.state]}</span>
            {step.detail ? <span className="p05s-step-detail">{step.detail}</span> : null}
          </li>
        ))}
      </ol>

      <h3 className="p05s-subtitle">
        Tubes {state.stored.length} of {state.config.targetTubeCount}
      </h3>
      <ul className="p05s-slots">
        {slots.map((sample, index) => (
          <li key={index} className="p05s-slot" data-kind={sample?.kind ?? 'empty'}>
            <span className="p05s-tube-icon" data-kind={sample?.kind ?? 'empty'}>
              <span className="p05s-slot-number">{index + 1}</span>
            </span>
            <span>{sample ? (sample.kind === 'core' ? 'Core' : 'Atmosphere') : 'Empty'}</span>
          </li>
        ))}
      </ul>
      {remainingSlots(state) === 0 ? null : (
        <p className="p05s-note">
          These are tubes for this game. Percy carries many more.
        </p>
      )}

      {children}

      {seen.length > 0 ? (
        <details className="p05s-facts">
          <summary>Facts so far ({seen.length})</summary>
          <ul>
            {seen.map((fact) => (
              <li key={fact.id}>
                <strong>{fact.title}.</strong> {fact.summary}
                {fact.status === 'draft' ? <em className="p05s-draft"> (source to be checked)</em> : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </aside>
  );
}
