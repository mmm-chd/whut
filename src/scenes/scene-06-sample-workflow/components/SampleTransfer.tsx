import type { SamplingPhase } from '../samplingState';
import type { SampleKind } from '../content';

interface SampleTransferProps {
  readonly phase: SamplingPhase;
  readonly kind: SampleKind | null;
}

/**
 * The transfer / seal / store picture: one tube that takes the sample, gets
 * its cap and slides to Percy's illustrated storage. It shows what was
 * actually collected: a rock core, or air for the atmosphere sample.
 */
export function SampleTransfer({ phase, kind }: SampleTransferProps) {
  const visible =
    phase === 'result-core' ||
    phase === 'result-atmosphere' ||
    phase === 'transfer' ||
    phase === 'seal' ||
    phase === 'store';
  if (!visible || !kind) {
    return null;
  }
  const stage = phase === 'transfer' ? 'transfer' : phase === 'seal' ? 'seal' : phase === 'store' ? 'store' : 'ready';
  return (
    <div className="p05s-transfer" data-stage={stage} data-kind={kind} aria-hidden="true">
      <div className="p05s-tube">
        <div className="p05s-tube-cap" />
        <div className="p05s-tube-body">
          <div className="p05s-tube-fill" />
        </div>
      </div>
      <div className="p05s-transfer-label">{kind === 'core' ? 'Rock core' : 'Martian air'}</div>
    </div>
  );
}
