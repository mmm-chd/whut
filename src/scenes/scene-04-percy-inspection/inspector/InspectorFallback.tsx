import percyPortraitUrl from '../../../assets/fixed/p02/percy.png';
import { P04_POINT_IDS } from '../inspectionState';
import { P04_POINT_LABELS } from '../components/pointCopy';
import { P04_FALLBACK_ANCHORS } from './modelConfig';
import type { InspectorFallbackReason } from './useInspectorRenderer';

/**
 * The picture the monitor shows when the model cannot.
 *
 * It is a static portrait with fixed anchors and the same four names: no
 * download, no GL context, no animation. The four buttons live outside the
 * monitor, so everything readable here is also reachable without it.
 */
export interface InspectorFallbackProps {
  readonly reason: InspectorFallbackReason;
}

const REASON_COPY: Record<InspectorFallbackReason, string> = {
  'no-webgl': 'This browser cannot show the turning model, so here is a still picture.',
  timeout: 'The model is taking too long to arrive, so here is a still picture.',
  failed: 'The model could not be loaded, so here is a still picture.',
  'context-lost': 'The picture paused, so here is a still picture.',
};

export function InspectorFallback({ reason }: InspectorFallbackProps) {
  return (
    <div className="p04-fallback" data-inspector-fallback data-fallback-reason={reason}>
      <img className="p04-fallback-photo" src={percyPortraitUrl} alt="" draggable={false} />
      <ul className="p04-fallback-marks" aria-hidden="true">
        {P04_POINT_IDS.map((point) => {
          const anchor = P04_FALLBACK_ANCHORS[point];
          return (
            <li
              key={point}
              className="p04-fallback-mark"
              data-fallback-anchor={point}
              style={{ left: `${anchor.x * 100}%`, top: `${anchor.y * 100}%` }}
            >
              {P04_POINT_LABELS[point]}
            </li>
          );
        })}
      </ul>
      <p className="p04-fallback-note">{REASON_COPY[reason]}</p>
    </div>
  );
}
