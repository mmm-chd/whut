import { assetManifest } from '../../../assets/manifest';
import type { P08Phase } from '../state';
import { TRACK_COUNT } from '../tracks';

/**
 * The ending's picture when WebGL is not available: a flat dusk ground, the
 * rover as one image, and the row of tracks as plain marks. The story, the
 * captions and every real gate run on the same state and the same exit
 * geometry, so this only stands in for the drawing; it never decides that
 * Percy has gone.
 */
export function EndingFallback({ phase }: { readonly phase: P08Phase }) {
  const rover = assetManifest.rover?.path;
  const gone = phase === 'tracks' || phase === 'fade' || phase === 'done';
  const rolling = phase === 'departing';
  const showWorld = phase !== 'loading' && phase !== 'samples' && phase !== 'hope-transition';
  return (
    <div className="p08-fallback" data-phase={phase} aria-hidden="true">
      {showWorld ? (
        <>
          <div className="p08-fallback-ground" />
          {rover && !gone ? (
            <img
              className="p08-fallback-rover"
              data-rolling={rolling ? 'true' : 'false'}
              src={rover}
              alt=""
              draggable={false}
            />
          ) : null}
          {gone ? (
            <div className="p08-fallback-tracks">
              {Array.from({ length: TRACK_COUNT }, (_, index) => (
                <span key={index} />
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
