import { P07_COPY } from '../content';
import type { P07Phase } from '../state';

interface CommandStatusProps {
  readonly phase: P07Phase;
  /** 0..1 progress of the signal beat. */
  readonly signal: number;
  readonly stepsToGo: number;
  readonly rerouted: boolean;
  readonly notice: string | null;
  readonly onRecover: () => void;
}

/** Earth, Mars and a message on its way. The message rides the progress. */
function SignalPicture({ progress }: { progress: number }) {
  const x = 38 + (222 - 38) * Math.min(1, Math.max(0, progress));
  return (
    <svg className="p07-signal" viewBox="0 0 260 64" role="img" aria-label="A message travels from Earth to Mars.">
      <circle cx="26" cy="32" r="18" fill="#4c7ba5" stroke="#3b2118" strokeWidth="2.5" />
      <path d="M14 26c4-5 10-4 12 0s-2 7-6 7-9-2-6-7ZM27 38c3-1 7 0 7 4-3 2-7 1-7-4Z" fill="#f3e6ca" />
      <circle cx="234" cy="32" r="14" fill="#b95e43" stroke="#3b2118" strokeWidth="2.5" />
      <circle cx="229" cy="28" r="3" fill="#8e3a2b" />
      <circle cx="238" cy="37" r="2" fill="#8e3a2b" />
      <path d="M46 32H220" stroke="#7b4636" strokeWidth="2.5" strokeDasharray="3 8" strokeLinecap="round" />
      <g transform={`translate(${x} 32)`}>
        <rect x="-10" y="-7" width="20" height="14" rx="2.5" fill="#fff6e2" stroke="#3b2118" strokeWidth="2" />
        <path d="M-10 -6L0 2L10 -6" fill="none" stroke="#3b2118" strokeWidth="2" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

/** The bottom-right panel: one short line for what is happening now. */
export function CommandStatus({ phase, signal, stepsToGo, rerouted, notice, onRecover }: CommandStatusProps) {
  if (phase === 'loading' || phase === 'intro-moving' || phase === 'intro-speaking' || phase === 'map-reveal') {
    return null;
  }

  let title: string;
  let body: string | null = null;
  switch (phase) {
    case 'choosing':
      title = notice ?? P07_COPY.choose;
      break;
    case 'signal':
      title = P07_COPY.signalTitle;
      body = P07_COPY.signalNote;
      break;
    case 'navigating':
      title = rerouted ? P07_COPY.rerouted : P07_COPY.navigating;
      body = stepsToGo > 0 ? `${stepsToGo} ${stepsToGo === 1 ? 'step' : 'steps'} to go` : null;
      break;
    case 'assessing':
    case 'replanning':
      title = P07_COPY.assessing;
      break;
    case 'route-error':
      title = P07_COPY.routeError;
      break;
    default:
      title = P07_COPY.arrived;
  }

  return (
    <aside className="p07-status" data-phase={phase} role="status" aria-live="polite">
      <p className="p07-status-title">{title}</p>
      {phase === 'signal' ? <SignalPicture progress={signal} /> : null}
      {body ? <p className="p07-status-body">{body}</p> : null}
      {phase === 'route-error' ? (
        <button type="button" className="p07-button" data-recover onClick={onRecover}>
          Choose another destination
        </button>
      ) : null}
    </aside>
  );
}
