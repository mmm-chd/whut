import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { cursorCss } from '../../components/cursor/cursors';
import { DialogueLayer } from '../../components/dialogue/DialogueLayer';
import { useDialogueStore } from '../../components/dialogue/dialogue.store';
import { PlaybackControls } from '../../components/story-controls/PlaybackControls';
import { useNarrativeController } from '../../engine/useNarrativeController';
import { useStoryStore } from '../../stores/story.store';
import { WebGLStage } from '../../three/WebGLStage';
import {
  applyBrushSweep,
  brushRadiusFor,
  coverageRatio,
  createBrushCoverage,
  finishClearing,
  nextUnclearedSweep,
  type BrushCoverage,
  type Point,
} from './brushCoverage';
import { CompletionPanel } from './components/CompletionPanel';
import { MissionPanel } from './components/MissionPanel';
import { RockPOV, type Pan } from './components/RockPOV';
import { SampleTransfer } from './components/SampleTransfer';
import {
  P05_SAMPLE_ROCKS,
  P05_SAMPLE_SESSION,
  drillMsForRock,
  findFact,
  findRock,
  findSite,
  type RockId,
  type ToolMode,
} from './content';
import { P05_SAMPLE_COPY, p05SampleOpeningLineIds, p05SampleOpeningLines } from './dialogue';
import {
  advanceDrillHold,
  beginDrillHold,
  cancelDrillHold,
  createDrillHold,
  drillProgress,
  type DrillHold,
  type DrillSource,
} from './drillHold';
import { finishesScene, type NextExperience } from './nextExperience';
import {
  backupSite,
  canAcceptNextChoice,
  canSelectForDrill,
  canSealSample,
  canStartDrill,
  createSamplingState,
  reduceSampling,
  suggestedRock,
  type SamplingEvent,
  type SamplingState,
} from './samplingState';
import { p05SampleWorldTextureIds } from './assets';
import { layoutSample } from './layout';
import { createSampleNodes } from './nodes';
import { SAMPLE_SCENE_ID } from './scene.config';
import { useHostSize } from '../shared/useHostSize';
import { usePercyPose } from './usePercyPose';
import { usePhaseTimer } from './usePhaseTimer';
import { SampleWorld } from './World';
import './Scene.css';

const TRANSFER_MS = { transfer: 650, seal: 450, store: 650 } as const;
const REDUCED_MS = 120;

/**
 * P-05 (story) as the sampling game.
 *
 * The outer component only owns the run number: replay bumps it, which remounts
 * the run and so rebuilds every mask, the ledger and the reward flags. The run
 * itself is `SampleRun`.
 */
export function Scene06SampleWorkflow() {
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

  return <SampleRun key={run} runId={run} />;
}

function SampleRun({ runId }: { readonly runId: number }) {
  const status = useStoryStore((store) => store.status);
  const paused = useStoryStore((store) => store.isPaused);
  const sceneActive = useStoryStore((store) => store.activeSceneId === SAMPLE_SCENE_ID);
  const reducedMotion = useStoryStore((store) => store.settings.reducedMotion);
  const controller = useNarrativeController();
  const spokenId = useDialogueStore((store) => store.active?.line.id ?? null);

  const hostRef = useRef<HTMLElement>(null);
  const hostSize = useHostSize(hostRef);
  const layout = useMemo(() => layoutSample(hostSize.width, hostSize.height), [hostSize.width, hostSize.height]);
  const [nodes] = useState(() => createSampleNodes(layout, reducedMotion));
  // A resize moves the camera, never the run.
  useEffect(() => {
    nodes.camera.x = layout.cameraX;
  }, [layout.cameraX, nodes]);

  // The semantic state lives in a ref as well as in React: guards in timers and
  // pointer handlers must read the latest state, never a stale render's.
  const [state, setState] = useState<SamplingState>(() => createSamplingState(runId, P05_SAMPLE_SESSION));
  const stateRef = useRef(state);
  const send = useCallback((event: SamplingEvent) => {
    const next = reduceSampling(stateRef.current, event);
    if (next !== stateRef.current) {
      stateRef.current = next;
      setState(next);
    }
  }, []);

  const pausedRef = useRef(paused);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const [mode, setMode] = useState<ToolMode>('brush');
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 });
  const [version, setVersion] = useState(0);
  const [inspected, setInspected] = useState(false);
  const [drillValue, setDrillValue] = useState(0);
  const [gameplayMarked, setGameplayMarked] = useState(false);
  const [endingMarked, setEndingMarked] = useState(false);
  const [announce, setAnnounce] = useState('');

  const coverages = useRef(new Map<string, BrushCoverage>());
  const completeRef = useRef(false);

  const cycle = state.cycle;
  const rock = cycle ? findRock(cycle.rockId) : P05_SAMPLE_ROCKS[0];
  const site = (cycle ? findSite(cycle.siteId) : null) ?? rock.sites[0];

  const coverageFor = useCallback((siteId: string, rockId: RockId): BrushCoverage => {
    let coverage = coverages.current.get(siteId);
    if (!coverage) {
      coverage = createBrushCoverage(findRock(rockId).shape);
      coverages.current.set(siteId, coverage);
    }
    return coverage;
  }, []);
  const coverage = coverageFor(site.id, rock.id);

  // ----- redraw coalescing ----------------------------------------------
  const bumpFrame = useRef<number | null>(null);
  const bump = useCallback(() => {
    if (bumpFrame.current !== null) {
      return;
    }
    bumpFrame.current = window.requestAnimationFrame(() => {
      bumpFrame.current = null;
      setVersion((value) => value + 1);
    });
  }, []);
  useEffect(() => {
    return () => {
      if (bumpFrame.current !== null) {
        window.cancelAnimationFrame(bumpFrame.current);
      }
    };
  }, []);

  // ----- opening ----------------------------------------------------------
  const resolvedRef = useRef(new Set<string>());
  useEffect(() => {
    // Only the opening cues the opening: a refreshed module must not replay it
    // over a game in progress.
    const opening = stateRef.current.phase;
    if (opening !== 'loading' && opening !== 'opening') {
      return;
    }
    useDialogueStore.getState().clear();
    send({ type: 'SCENE_READY' });
    for (const line of p05SampleOpeningLines) {
      useDialogueStore.getState().cue(line);
    }
    const unsubscribe = useDialogueStore.subscribe((next, previous) => {
      const left = previous.active?.line;
      if (!left || next.active?.line.id === left.id) {
        return;
      }
      resolvedRef.current.add(left.id);
      if (p05SampleOpeningLineIds.every((id) => resolvedRef.current.has(id))) {
        send({ type: 'FACT_SEEN', factId: 'fact-12' });
        send({ type: 'OPENING_READ' });
      }
    });
    return () => {
      unsubscribe();
      useDialogueStore.getState().clear();
    };
  }, [send]);

  const start = useCallback(() => {
    if (stateRef.current.phase !== 'intro') {
      return;
    }
    send({ type: 'START' });
    send({ type: 'FACT_SEEN', factId: 'fact-13' });
    // From here the reader drives; the story waits through play and rewards.
    controller.markWaiting();
  }, [controller, send]);

  // ----- brush ------------------------------------------------------------
  const brushing = state.phase === 'brush' && !paused && state.setupError === null;
  const threshold = state.config.brushThreshold;

  const settleBrush = useCallback(() => {
    const current = stateRef.current;
    const live = current.cycle;
    if (current.phase !== 'brush' || !live) {
      return;
    }
    const found = coverages.current.get(live.siteId);
    if (!found || coverageRatio(found) < current.config.brushThreshold) {
      return;
    }
    // Past the threshold the thin remaining dust is wiped so Inspect is readable.
    finishClearing(found);
    send({ type: 'BRUSH_COMPLETE', attemptId: live.attemptId, siteId: live.siteId });
    setAnnounce('The rock is clean. You can inspect it now.');
    bump();
  }, [bump, send]);

  const onStroke = useCallback(
    (from: Point | null, to: Point) => {
      const current = stateRef.current;
      const live = current.cycle;
      if (current.phase !== 'brush' || !live || pausedRef.current) {
        return;
      }
      const target = findRock(live.rockId);
      const cover = coverageFor(live.siteId, live.rockId);
      applyBrushSweep(cover, from ?? to, to, brushRadiusFor(target.shape));
      bump();
      settleBrush();
    },
    [bump, coverageFor, settleBrush],
  );

  const brushNextArea = useCallback(() => {
    const current = stateRef.current;
    const live = current.cycle;
    if (current.phase !== 'brush' || !live || pausedRef.current) {
      return;
    }
    const cover = coverageFor(live.siteId, live.rockId);
    const sweep = nextUnclearedSweep(cover);
    if (!sweep) {
      return;
    }
    applyBrushSweep(cover, sweep.from, sweep.to, brushRadiusFor(findRock(live.rockId).shape));
    bump();
    settleBrush();
  }, [bump, coverageFor, settleBrush]);

  const percent = Math.round(coverageRatio(coverage) * 100);
  // Discrete polite progress: a quarter at a time, never every stroke.
  const quarter = Math.floor(percent / 25) * 25;
  useEffect(() => {
    if (state.phase === 'brush' && quarter > 0) {
      setAnnounce(`${quarter} percent cleaned.`);
    }
  }, [quarter, state.phase]);

  // ----- inspect ----------------------------------------------------------
  useEffect(() => {
    setInspected(false);
    setPan({ x: 0, y: 0 });
  }, [cycle?.attemptId]);

  const verdict = useMemo(
    () => (cycle ? canSelectForDrill(state, cycle.siteId) : { ok: false, reason: null }),
    [cycle, state],
  );

  const acceptSite = useCallback(() => {
    const current = stateRef.current;
    const live = current.cycle;
    if (!live || current.phase !== 'inspect') {
      return;
    }
    send({ type: 'ACCEPT_SITE', attemptId: live.attemptId, siteId: live.siteId });
  }, [send]);

  // ----- drill ------------------------------------------------------------
  const drillRef = useRef<{ attemptId: number; hold: DrillHold } | null>(null);
  const drillFrame = useRef<number | null>(null);

  const stopDrillLoop = useCallback(() => {
    if (drillFrame.current !== null) {
      window.cancelAnimationFrame(drillFrame.current);
      drillFrame.current = null;
    }
  }, []);

  const releaseDrill = useCallback(() => {
    stopDrillLoop();
    const drill = drillRef.current;
    if (!drill) {
      return;
    }
    drill.hold = cancelDrillHold(drill.hold);
    const current = stateRef.current;
    if (current.phase === 'drilling' && current.cycle?.attemptId === drill.attemptId) {
      send({ type: 'DRILL_RELEASED', attemptId: drill.attemptId });
    }
  }, [send, stopDrillLoop]);

  const beginDrill = useCallback(
    (source: DrillSource) => {
      const current = stateRef.current;
      const live = current.cycle;
      if (!live || pausedRef.current || document.hidden || !canStartDrill(current)) {
        return;
      }
      let drill = drillRef.current;
      if (!drill || drill.attemptId !== live.attemptId) {
        drill = {
          attemptId: live.attemptId,
          hold: createDrillHold(drillMsForRock(current.config, live.rockId)),
        };
        drillRef.current = drill;
      }
      drill.hold = beginDrillHold(drill.hold, performance.now(), source);
      if (!drill.hold.holding) {
        return;
      }
      send({ type: 'DRILL_STARTED', attemptId: live.attemptId });

      const tick = () => {
        const active = drillRef.current;
        const now = stateRef.current;
        if (!active || now.phase !== 'drilling' || now.cycle?.attemptId !== active.attemptId) {
          drillFrame.current = null;
          return;
        }
        active.hold = advanceDrillHold(active.hold, performance.now());
        setDrillValue(drillProgress(active.hold));
        if (active.hold.done) {
          drillFrame.current = null;
          // One outcome, derived from the rock, never from this animation.
          send({ type: 'DRILL_FINISHED', attemptId: active.attemptId, siteId: now.cycle.siteId });
          return;
        }
        drillFrame.current = window.requestAnimationFrame(tick);
      };
      stopDrillLoop();
      drillFrame.current = window.requestAnimationFrame(tick);
    },
    [send, stopDrillLoop],
  );

  // A new attempt starts a fresh drill total.
  useEffect(() => {
    drillRef.current = null;
    setDrillValue(0);
  }, [cycle?.attemptId]);

  // Pause, a hidden tab and a lost window all stop the drill; resuming needs a
  // fresh press, so nothing drills on its own.
  useEffect(() => {
    if (paused) {
      releaseDrill();
    }
  }, [paused, releaseDrill]);
  useEffect(() => {
    const cancel = () => releaseDrill();
    window.addEventListener('blur', cancel);
    document.addEventListener('visibilitychange', cancel);
    return () => {
      window.removeEventListener('blur', cancel);
      document.removeEventListener('visibilitychange', cancel);
      stopDrillLoop();
    };
  }, [releaseDrill, stopDrillLoop]);

  // ----- seal and store --------------------------------------------------
  const sealStore = useCallback(() => {
    const current = stateRef.current;
    const live = current.cycle;
    if (live && canSealSample(current)) {
      send({ type: 'SEAL_STORE_REQUESTED', attemptId: live.attemptId });
    }
  }, [send]);

  const beatKey =
    cycle && (state.phase === 'transfer' || state.phase === 'seal' || state.phase === 'store')
      ? `${cycle.attemptId}:${state.phase}`
      : null;
  const beatMs =
    state.phase === 'transfer' || state.phase === 'seal' || state.phase === 'store'
      ? reducedMotion
        ? REDUCED_MS
        : TRANSFER_MS[state.phase]
      : 0;
  usePhaseTimer(beatKey, beatMs, paused, () => {
    const current = stateRef.current;
    const live = current.cycle;
    if (!live) {
      return;
    }
    if (current.phase === 'transfer') {
      send({ type: 'TRANSFER_FINISHED', attemptId: live.attemptId });
    } else if (current.phase === 'seal') {
      send({ type: 'SEAL_FINISHED', attemptId: live.attemptId });
    } else if (current.phase === 'store') {
      send({ type: 'STORE_FINISHED', attemptId: live.attemptId });
    }
  });

  // ----- completion and rewards ------------------------------------------
  useEffect(() => {
    if (state.phase === 'mission-complete' && !completeRef.current) {
      completeRef.current = true;
      useStoryStore.getState().markInteractionComplete('p05-sample-gameplay-complete');
      setGameplayMarked(true);
    }
  }, [state.phase]);

  const endingRead = useCallback(() => {
    if (stateRef.current.phase !== 'mission-complete') {
      return;
    }
    useStoryStore.getState().markInteractionComplete('p05-sample-ending-read');
    setEndingMarked(true);
    send({ type: 'ENDING_READ' });
  }, [send]);

  const choiceEnabled = canAcceptNextChoice({
    status,
    sceneActive,
    paused,
    state,
    gameplayCompleteMarked: gameplayMarked,
    endingReadMarked: endingMarked,
  });

  const choose = useCallback(
    (experience: NextExperience) => {
      if (!finishesScene(experience)) {
        return;
      }
      const store = useStoryStore.getState();
      const allowed = canAcceptNextChoice({
        status: store.status,
        sceneActive: store.activeSceneId === SAMPLE_SCENE_ID,
        paused: store.isPaused,
        state: stateRef.current,
        gameplayCompleteMarked: gameplayMarked,
        endingReadMarked: endingMarked,
      });
      if (!allowed) {
        return;
      }
      store.markInteractionComplete('p05-sample-next-choice');
      send({ type: 'NEXT_CHOSEN' });
      controller.completeScene();
    },
    [controller, endingMarked, gameplayMarked, send],
  );

  // ----- derived view data -----------------------------------------------
  const backup = backupSite(state);
  const nextRock = suggestedRock(state);
  const cursorStyle: CSSProperties = {
    '--cursor-default': cursorCss('default'),
    '--cursor-active': cursorCss('active', 'pointer'),
    '--cursor-grab': cursorCss('grab', 'grab'),
    '--cursor-grabbing': cursorCss('grabbing', 'grabbing'),
  } as CSSProperties;

  const phase = state.phase;
  usePercyPose(nodes, phase, reducedMotion, paused);
  const gameplay =
    phase !== 'loading' && phase !== 'opening' && phase !== 'intro' && cycle !== null && state.setupError === null;
  const canChooseRock = phase === 'brush' || phase === 'inspect' || phase === 'drill-ready';
  const latestFact = state.factsSeen.length ? findFact(state.factsSeen[state.factsSeen.length - 1]) : null;
  // The four steps light up while narrator 05 points at them, and stay lit at the intro.
  const stepsHighlighted =
    (phase === 'opening' && spokenId === 'p05-sample-narrator-05') || phase === 'intro';

  return (
    <main
      ref={hostRef}
      className="p05s-scene"
      data-scene={SAMPLE_SCENE_ID}
      data-phase={phase}
      data-status={status}
      data-reduced-motion={reducedMotion}
      style={cursorStyle}
    >
      {layout.valid ? (
        <div className="p05s-stage" data-sample-stage>
          <WebGLStage
            label="Percy the rover stands beside a rock on the Mars ground, ready to collect a sample."
            background="#2b1a16"
            preload={p05SampleWorldTextureIds}
          >
            <SampleWorld nodes={nodes} />
          </WebGLStage>
        </div>
      ) : null}

      <h1 className="p05s-heading" tabIndex={-1}>
        Percy, the Sample Collector
      </h1>

      {state.setupError ? (
        <div className="p05s-setup" role="alert">
          <p>The sampling game could not start: {state.setupError}</p>
        </div>
      ) : null}

      <div className="p05s-main">
        {phase === 'intro' ? (
          <div className="p05s-intro">
            <button type="button" className="p05s-button" data-primary data-start onClick={start} autoFocus>
              {P05_SAMPLE_COPY.intro}
            </button>
          </div>
        ) : null}
        <section className="p05s-pov-column" aria-label="Rock close-up">
          <figure className="p05s-photo" data-dim={gameplay ? 'false' : 'true'}>
          <div className="p05s-pov-wrap">
            <RockPOV
              rock={rock}
              site={site}
              coverage={coverage}
              version={version}
              mode={mode}
              brushing={brushing}
              inspectable={phase === 'inspect' && !inspected}
              drilling={phase === 'drilling'}
              depleted={Boolean(state.sites[site.id]?.depleted)}
              cleaned={Boolean(state.sites[site.id]?.cleaned)}
              pan={pan}
              label={`${rock.label}. ${rock.description}`}
              onPan={setPan}
              onStroke={onStroke}
              onStrokeEnd={() => {}}
              onInspect={() => setInspected(true)}
            />
            <SampleTransfer phase={phase} kind={cycle?.drillOutcome ?? null} />
          </div>
          <figcaption className="p05s-photo-caption">Percy&apos;s camera: {rock.label}</figcaption>
          </figure>

          <div className="p05s-actions">
          <div className="p05s-controls" data-phase={phase}>
            {phase === 'brush' ? (
              <>
                <div className="p05s-modes" role="radiogroup" aria-label="Tool">
                  {(['brush', 'pan'] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={mode === option}
                      className="p05s-button"
                      data-active={mode === option}
                      onClick={() => setMode(option)}
                    >
                      {option === 'brush' ? 'Brush' : 'Move view'}
                    </button>
                  ))}
                </div>
                <button type="button" className="p05s-button" data-brush-next onClick={brushNextArea} disabled={paused}>
                  Brush next area
                </button>
                <p className="p05s-meter" data-meter>
                  Cleaned {percent}% <span aria-hidden="true">(need {Math.round(threshold * 100)}%)</span>
                </p>
              </>
            ) : null}

            {phase === 'inspect' ? (
              <>
                <button
                  type="button"
                  className="p05s-button"
                  data-inspect
                  onClick={() => setInspected(true)}
                  autoFocus
                >
                  Inspect rock
                </button>
                <button
                  type="button"
                  className="p05s-button"
                  data-primary
                  data-accept
                  onClick={acceptSite}
                  disabled={!inspected || !verdict.ok}
                >
                  Drill this site
                </button>
              </>
            ) : null}

            {phase === 'drill-ready' || phase === 'drilling' ? (
              <>
                <button
                  type="button"
                  className="p05s-button"
                  data-primary
                  data-drill-hold
                  onPointerDown={(event) => {
                    if (event.button === 0) {
                      event.currentTarget.setPointerCapture?.(event.pointerId);
                      beginDrill('pointer');
                    }
                  }}
                  onPointerUp={releaseDrill}
                  onPointerCancel={releaseDrill}
                  onLostPointerCapture={releaseDrill}
                  onKeyDown={(event) => {
                    if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
                      event.preventDefault();
                      beginDrill('keyboard');
                    }
                  }}
                  onKeyUp={(event) => {
                    if (event.key === ' ' || event.key === 'Enter') {
                      releaseDrill();
                    }
                  }}
                  onBlur={releaseDrill}
                  disabled={paused}
                >
                  Hold to drill
                </button>
                <button
                  type="button"
                  className="p05s-button"
                  data-drill-assist
                  onClick={() => (phase === 'drilling' ? releaseDrill() : beginDrill('assist'))}
                  disabled={paused}
                >
                  {phase === 'drilling' ? 'Stop assisted drill' : 'Run assisted drill'}
                </button>
                <div
                  className="p05s-progress"
                  role="progressbar"
                  aria-label="Drilling"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(drillValue * 100)}
                >
                  <span style={{ width: `${Math.round(drillValue * 100)}%` }} />
                </div>
              </>
            ) : null}

            {phase === 'result-core' || phase === 'result-atmosphere' ? (
              <button type="button" className="p05s-button" data-primary data-seal onClick={sealStore} autoFocus>
                {phase === 'result-core' ? 'Seal & Store' : 'Seal & Store atmosphere'}
              </button>
            ) : null}

            {phase === 'transfer' || phase === 'seal' || phase === 'store' ? (
              <p className="p05s-meter" role="status">
                {phase === 'transfer' ? 'Moving the sample into a tube…' : phase === 'seal' ? 'Sealing the tube…' : 'Storing the tube…'}
              </p>
            ) : null}

            {phase === 'cycle-complete' ? (
              <>
                {nextRock ? (
                  <button
                    type="button"
                    className="p05s-button"
                    data-primary
                    data-next-site
                    onClick={() => send({ type: 'NEXT_SITE' })}
                    autoFocus
                  >
                    Next: {findRock(nextRock).label}
                  </button>
                ) : null}
                {backup ? (
                  <button
                    type="button"
                    className="p05s-button"
                    data-backup
                    onClick={() => send({ type: 'COLLECT_BACKUP' })}
                  >
                    Collect an adjacent backup
                  </button>
                ) : null}
              </>
            ) : null}
          </div>

          {canChooseRock ? (
            <div className="p05s-rocks" role="group" aria-label="Choose another rock">
              <span className="p05s-rocks-label">Choose another rock:</span>
              {P05_SAMPLE_ROCKS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="p05s-button p05s-rock-button"
                  data-rock={option.id}
                  aria-pressed={option.id === rock.id}
                  disabled={option.id === rock.id}
                  onClick={() => send({ type: 'CHOOSE_ROCK', rockId: option.id })}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}
          </div>
        </section>

        <MissionPanel state={state} highlightAll={stepsHighlighted}>
          {phase === 'inspect' && inspected ? (
            <p className="p05s-info" data-description>
              {rock.description}
            </p>
          ) : null}
          {phase === 'result-core' ? <p className="p05s-info">{P05_SAMPLE_COPY.coreFound}</p> : null}
          {phase === 'result-atmosphere' ? <p className="p05s-info">{P05_SAMPLE_COPY.crumbled}</p> : null}
          {phase === 'cycle-complete' && latestFact ? (
            <p className="p05s-info">
              <strong>{latestFact.title}.</strong> {latestFact.summary}
            </p>
          ) : null}
          {state.notice ? (
            <p className="p05s-info" role="status" data-notice>
              {state.notice}
            </p>
          ) : null}
        </MissionPanel>
      </div>

      <p className="p05s-sr" aria-live="polite">
        {announce}
      </p>

      <div className="p05s-dialogue">
        <DialogueLayer />
      </div>

      <CompletionPanel
        phase={phase}
        tubeCount={state.config.targetTubeCount}
        choiceEnabled={choiceEnabled}
        onEndingRead={endingRead}
        onAchievementSeen={() => send({ type: 'ACHIEVEMENT_SEEN' })}
        onChoose={choose}
      />

      <PlaybackControls />
    </main>
  );
}

