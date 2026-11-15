import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { cursorCss } from '../../components/cursor/cursors';
import { DialogueLayer } from '../../components/dialogue/DialogueLayer';
import { PlaybackControls } from '../../components/story-controls/PlaybackControls';
import { useNarrativeController } from '../../engine/useNarrativeController';
import { useStoryStore } from '../../stores/story.store';
import { WebGLStage, hasWebGL2 } from '../../three/WebGLStage';
import { useHostSize } from '../shared/useHostSize';
import { p08WorldTextureIds } from './assets';
import { EndingFallback } from './components/EndingFallback';
import { FactCard } from './components/FactCard';
import { ReturnPlanDiagram } from './components/ReturnPlanDiagram';
import { SampleCollection } from './components/SampleCollection';
import { P08_CONTENT } from './content';
import { hopeBudgetMs } from './dialogue';
import { layoutP08, type P08Layout } from './layout';
import { P08_SCENE_ID } from './scene.config';
import { useP08Scene } from './useP08Scene';
import { P08World } from './World';
import './Scene.css';

/**
 * P-08 (story "The Waiting Sample"): the ending. Percy's sealed samples, the
 * hope of a ride home, a message from Earth that does not bring good news, and
 * Percy rolling on regardless. No game: three Continues, then the scene fades
 * out by itself into the end screen.
 *
 * The outer component owns the run number: replay bumps it, which remounts the
 * run and rebuilds the state, driver and caption script from scratch.
 */
export function Scene09WaitingSample() {
  const [run, setRun] = useState(1);
  const controller = useNarrativeController();
  const controllerRef = useRef(controller);
  useEffect(() => {
    controllerRef.current = controller;
  }, [controller]);

  useEffect(() => {
    controllerRef.current.attachTimeline({
      play: () => {},
      pause: () => {},
      resume: () => {},
      restart: () => setRun((value) => value + 1),
      isRunning: () => false,
    });
    return () => controllerRef.current.attachTimeline(null);
  }, []);

  return <EndingFrame key={run} />;
}

function EndingFrame() {
  const status = useStoryStore((store) => store.status);
  const reducedMotion = useStoryStore((store) => store.settings.reducedMotion);
  const hostRef = useRef<HTMLElement>(null);
  const size = useHostSize(hostRef);
  const budget = useMemo(() => hopeBudgetMs(), []);
  const layout = useMemo(() => layoutP08(size.width, size.height, budget), [size.width, size.height, budget]);

  const cursorStyle: CSSProperties = {
    '--cursor-default': cursorCss('default'),
    '--cursor-active': cursorCss('active', 'pointer'),
    '--cursor-grab': cursorCss('grab', 'grab'),
    '--cursor-grabbing': cursorCss('grabbing', 'grabbing'),
  } as CSSProperties;

  return (
    <main
      ref={hostRef}
      className="p08-scene"
      data-scene={P08_SCENE_ID}
      data-status={status}
      data-reduced-motion={reducedMotion}
      style={cursorStyle}
    >
      {layout ? <EndingRun layout={layout} budgetMs={budget} /> : null}
    </main>
  );
}

function EndingRun({ layout, budgetMs }: { readonly layout: P08Layout; readonly budgetMs: number }) {
  const api = useP08Scene(layout);
  const { state, nodes } = api;
  const webgl = useMemo(() => hasWebGL2(), []);
  const trayRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);

  // DOM that follows the nodes writes its style directly: no React render per frame.
  useEffect(() => {
    const apply = () => {
      const tray = trayRef.current;
      if (tray) {
        const reveal = nodes.sampleReveal.opacity;
        tray.style.opacity = String(reveal);
        tray.style.transform = `translateY(${(1 - reveal) * 14}px)`;
        tray.style.visibility = reveal > 0.001 ? 'visible' : 'hidden';
      }
      if (coverRef.current) {
        coverRef.current.style.opacity = String(nodes.cover.opacity);
      }
    };
    apply();
    return api.onFrame(apply);
  }, [api, nodes]);

  const { phase } = state;
  const samplesVisible = phase === 'loading' || phase === 'samples' || phase === 'hope-transition';
  const planVisible = phase === 'hope' || phase === 'hope-transition';
  const { samples, sampleReturn } = P08_CONTENT;

  return (
    <>
      <div className="p08-stage" data-p08-stage data-phase={phase}>
        {webgl ? (
          <WebGLStage
            label="Percy the rover on the Martian ground at dusk, with tracks behind him."
            background="#2b1a16"
            preload={p08WorldTextureIds}
          >
            <P08World nodes={nodes} budgetMs={budgetMs} />
          </WebGLStage>
        ) : (
          <EndingFallback phase={phase} />
        )}
      </div>
      <div className="p08-dusk" data-phase={phase} aria-hidden="true" />

      <h1 className="p08-heading" tabIndex={-1}>
        The Waiting Sample
      </h1>

      <div ref={trayRef} className="p08-samples" data-visible={samplesVisible ? 'true' : 'false'} style={{ opacity: 0 }}>
        {samplesVisible ? (
          <>
            <SampleCollection />
            <FactCard
              title="Percy’s samples so far"
              body={samples.countDefinition}
              asOf={samples.asOf}
              source={samples.source}
            />
          </>
        ) : null}
      </div>

      {planVisible ? (
        <aside className="p08-plan-panel" aria-label="The return idea">
          <ReturnPlanDiagram />
          <FactCard
            title="Where things stand"
            body={sampleReturn.statusSummary}
            asOf={sampleReturn.asOf}
            source={sampleReturn.source}
          />
        </aside>
      ) : null}

      {phase === 'hope' && !state.percyStopped && !api.dingVisible ? (
        <div className="p08-ding p08-ding--waiting" role="status" aria-live="polite">
          <svg viewBox="0 0 40 28" className="p08-ding-icon" aria-hidden="true" focusable="false">
            <rect x="3" y="3" width="34" height="22" rx="4" fill="#fff6e2" stroke="#3b2118" strokeWidth="3" />
            <path d="M5 6 L20 17 L35 6" fill="none" stroke="#3b2118" strokeWidth="3" strokeLinejoin="round" />
          </svg>
          <span>
            Waiting for a message from Earth
            <span className="p08-wait-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </span>
        </div>
      ) : null}

      {api.dingVisible ? (
        <div className="p08-ding" role="status" aria-live="polite">
          <svg viewBox="0 0 40 28" className="p08-ding-icon" aria-hidden="true" focusable="false">
            <rect x="3" y="3" width="34" height="22" rx="4" fill="#fff6e2" stroke="#3b2118" strokeWidth="3" />
            <path d="M5 6 L20 17 L35 6" fill="none" stroke="#3b2118" strokeWidth="3" strokeLinejoin="round" />
          </svg>
          <span>A message from Earth</span>
        </div>
      ) : null}

      <div className="p08-dialogue">
        <DialogueLayer presentationPaused={api.presentationPaused} />
      </div>

      <div ref={coverRef} className="p08-cover" aria-hidden="true" />
      <PlaybackControls allowPauseWhileWaiting />
    </>
  );
}
