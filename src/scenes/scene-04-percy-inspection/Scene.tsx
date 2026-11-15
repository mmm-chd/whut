import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { DialogueLayer } from '../../components/dialogue/DialogueLayer';
import { PlaybackControls } from '../../components/story-controls/PlaybackControls';
import { useStoryStore } from '../../stores/story.store';
import { WebGLStage } from '../../three/WebGLStage';
import { annotationForPhase } from './annotations';
import { p04WorldTextureIds } from './assets';
import { cursorCss } from '../../components/cursor/cursors';
import { autoDragPath } from './components/autoDrag';
import { PercyTransfer } from './components/PercyTransfer';
import { createP04Nodes } from './nodes';
import { scene04Config } from './scene.config';
import { useHostLayout } from './useHostLayout';
import { useP04Scene } from './useP04Scene';
import { P04World } from './World';
import './Scene.css';

/**
 * P-04 shell.
 *
 * The ground picture is WebGL; the hand-over sprite, the invitation and the
 * controls are DOM, positioned from `layoutP04`. The scene's own state lives in
 * `useP04Scene`; this file only renders it and forwards reader input.
 *
 * The scene ends by itself: once the invitation is read, a scripted hand
 * carries Percy into the frame, the picture fades, and the story moves on to
 * `scene-05-percy-inspector`.
 */
export function Scene04PercyInspection() {
  const reducedMotion = useStoryStore((state) => state.settings.reducedMotion);
  const status = useStoryStore((state) => state.status);

  const hostRef = useRef<HTMLElement>(null);
  const layout = useHostLayout(hostRef);
  const [nodes] = useState(() => createP04Nodes(layout, reducedMotion));
  const api = useP04Scene(nodes, layout);

  const annotation = annotationForPhase(api.phase);
  const awaiting = api.phase === 'awaiting-inspection';
  const anchorX = layout.width / 2;
  const anchorY = layout.groundY - 48;
  const anchor = useMemo(() => ({ x: anchorX, y: anchorY }), [anchorX, anchorY]);
  // The scripted carry is built once per layout, so a re-render mid-carry never
  // restarts it. Reduced motion keeps the manual drag only and the scene hands
  // over immediately instead.
  const { valid: layoutValid, width: hostWidth, height: hostHeight, monitor } = layout;
  const auto = useMemo(() => {
    if (!layoutValid || reducedMotion || !awaiting) {
      return null;
    }
    return autoDragPath(
      anchor,
      { x: monitor.left + monitor.width / 2, y: monitor.top + monitor.height / 2 },
      hostWidth,
      hostHeight,
    );
  }, [anchor, awaiting, hostHeight, hostWidth, layoutValid, monitor, reducedMotion]);

  // Reduced motion: no travel, no hand. The hand-over happens at once, which is
  // the same guarded path the animation ends in.
  useEffect(() => {
    if (!reducedMotion || !api.canEnter) {
      return;
    }
    api.enterInspection();
  }, [api, reducedMotion]);

  // One place decides the pointing devices for this scene too.
  const cursorStyle: CSSProperties = {
    '--cursor-default': cursorCss('default'),
    '--cursor-active': cursorCss('active', 'pointer'),
    '--cursor-grab': cursorCss('grab', 'grab'),
    '--cursor-grabbing': cursorCss('grabbing', 'grabbing'),
  } as CSSProperties;

  return (
    <main
      ref={hostRef}
      className="p04-scene"
      data-scene={scene04Config.id}
      data-phase={api.phase}
      data-status={status}
      data-reduced-motion={reducedMotion}
      data-speech-band={layout.speech ? 'true' : 'false'}
      style={{
        ...cursorStyle,
        ...(layout.speech
          ? {
              '--p04-speech-top': `${layout.speech.top}px`,
              '--p04-speech-height': `${layout.speech.height}px`,
            }
          : {}),
      } as CSSProperties}
    >
      {layout.valid ? (
        <div className="p04-stage" data-p04-stage>
          <WebGLStage
            label="Percy the rover rolls across the Mars ground, then the picture fades and a close-up of him begins."
            background="#2b1a16"
            preload={p04WorldTextureIds}
          >
            <P04World nodes={nodes} />
          </WebGLStage>
        </div>
      ) : null}

      <h1 className="p04-heading" tabIndex={-1}>
        {scene04Config.title}
      </h1>

      {annotation ? (
        <aside className="p04-annotation" data-annotation={annotation.id}>
          <p className="p04-annotation-label">{annotation.label}</p>
          <p className="p04-annotation-caption">{annotation.caption}</p>
        </aside>
      ) : null}

      {layout.valid && awaiting ? (
        <>
          <PercyTransfer
            host={{ left: 0, top: 0, width: layout.width, height: layout.height }}
            monitor={layout.monitor}
            anchor={anchor}
            auto={auto}
            disabled={!api.canEnter}
            onDrop={(result) => {
              if (result.inside) {
                api.enterInspection();
              }
            }}
          />
          <div className="p04-invitation">
            <p className="p04-invitation-text">Taking a closer look at Percy…</p>
            <button
              type="button"
              className="p04-control-button p04-entry"
              data-inspect-entry
              onClick={() => api.enterInspection()}
              disabled={!api.canEnter}
            >
              {reducedMotion ? 'Bring Percy in' : 'Skip the hand-over'}
            </button>
          </div>
        </>
      ) : null}

      <div className="p04-dialogue">
        <DialogueLayer />
      </div>

      <PlaybackControls />

      <div className="p04-cover" aria-hidden="true" />
      <div
        className="p04-fade"
        aria-hidden="true"
        data-fade
        data-visible={api.phase === 'exit' ? 'true' : 'false'}
      />
    </main>
  );
}