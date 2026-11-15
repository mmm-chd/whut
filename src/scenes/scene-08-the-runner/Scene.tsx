import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { cursorCss } from '../../components/cursor/cursors';
import { DialogueLayer } from '../../components/dialogue/DialogueLayer';
import { PlaybackControls } from '../../components/story-controls/PlaybackControls';
import { useNarrativeController } from '../../engine/useNarrativeController';
import { useStoryStore } from '../../stores/story.store';
import { WebGLStage, hasWebGL2 } from '../../three/WebGLStage';
import { InfographicCard, InfographicViewer } from './components/Infographic';
import { CommandStatus } from './components/CommandStatus';
import { MapControls } from './components/MapControls';
import { RouteOverlay } from './components/RouteOverlay';
import { findFact } from './content';
import { BOARD_HEIGHT, BOARD_WIDTH, CELL_SIZE, type Cell } from './grid';
import { layoutRunner } from './layout';
import { defaultMap } from './map';
import { clientToCell, transformFromRect } from './mapInput';
import { arrivalWaitingOnFacts } from './state';
import { RUNNER_SCENE_ID } from './scene.config';
import { useHostSize } from '../shared/useHostSize';
import { useP07Scene } from './useP07Scene';
import { RunnerWorld } from './World';
import './Scene.css';

/**
 * P-07 (story "The Runner"): a top-down board where the reader picks Percy's
 * next stop, sends a command, waits out the (shortened) signal and watches him
 * drive there himself.
 *
 * The outer component only owns the run number: replay bumps it, which remounts
 * the run and rebuilds the state, planner, driver and cues from scratch.
 */
export function Scene08TheRunner() {
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

  return <RunnerRun key={run} runId={run} />;
}

function FallbackBoard() {
  return (
    <svg
      className="p07-fallback"
      viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect width={BOARD_WIDTH} height={BOARD_HEIGHT} fill="#b04a35" />
      {defaultMap.blockers.map((blocker) => {
        const cols = blocker.rawCells.map((cell) => cell.col);
        const rows = blocker.rawCells.map((cell) => cell.row);
        const x = Math.min(...cols) * CELL_SIZE;
        const y = Math.min(...rows) * CELL_SIZE;
        const w = (Math.max(...cols) - Math.min(...cols) + 1) * CELL_SIZE;
        const h = (Math.max(...rows) - Math.min(...rows) + 1) * CELL_SIZE;
        return blocker.kind === 'pit' ? (
          <ellipse key={blocker.id} cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} fill="#2a1510" />
        ) : (
          <rect key={blocker.id} x={x + 6} y={y + 6} width={w - 12} height={h - 12} rx="26" fill="#6b2f26" stroke="#2a1510" strokeWidth="4" />
        );
      })}
    </svg>
  );
}

function RunnerRun({ runId }: { readonly runId: number }) {
  const status = useStoryStore((store) => store.status);
  const reducedMotion = useStoryStore((store) => store.settings.reducedMotion);
  const paused = useStoryStore((store) => store.isPaused);

  const hostRef = useRef<HTMLElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<SVGGElement>(null);
  const size = useHostSize(hostRef);
  const layout = useMemo(() => layoutRunner(size.width, size.height), [size.width, size.height]);

  const api = useP07Scene(runId);
  const { state, nodes, beat } = api;
  const [focused, setFocused] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const infoTrigger = useRef<HTMLButtonElement>(null);
  const closeViewer = useCallback(() => setViewerOpen(false), []);
  const webgl = useMemo(() => hasWebGL2(), []);

  // The flat fallback marker follows Percy by writing its transform directly.
  const placeMarker = useCallback(() => {
    const marker = markerRef.current;
    if (!marker) {
      return;
    }
    const { x, y, rotation, opacity } = nodes.percy;
    marker.setAttribute('transform', `translate(${x} ${y}) rotate(${rotation})`);
    marker.setAttribute('opacity', String(opacity));
  }, [nodes]);
  useEffect(() => {
    placeMarker();
    return api.onFrame(placeMarker);
  }, [api, placeMarker]);

  // ----- pointer and keyboard on the board ---------------------------------
  const pointerId = useRef<number | null>(null);

  const pick = useCallback(
    (clientX: number, clientY: number) => {
      const rect = boardRef.current?.getBoundingClientRect();
      const transform = rect ? transformFromRect(rect) : null;
      const cell = transform ? clientToCell(clientX, clientY, transform) : null;
      if (cell) {
        api.selectCell(cell);
      }
    },
    [api],
  );

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !event.isPrimary) {
      return;
    }
    pointerId.current = event.pointerId;
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (pointerId.current !== event.pointerId) {
      return;
    }
    pointerId.current = null;
    pick(event.clientX, event.clientY);
  };
  const onPointerCancel = () => {
    pointerId.current = null;
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key.startsWith('Arrow')) {
      event.preventDefault();
      api.moveCursor(event.key as 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight');
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      api.activateCursor();
    }
  };

  // ----- derived view data ---------------------------------------------------
  const { phase, route, waypointIndex, command, selectedCell } = state;
  const showRoute = phase === 'signal' || phase === 'navigating' || phase === 'assessing' || phase === 'replanning';
  const remaining: readonly Cell[] = showRoute && route ? route.cells.slice(waypointIndex) : [];
  const goal = command?.goal ?? selectedCell;
  const stepsToGo = route ? Math.max(0, route.cells.length - 1 - waypointIndex) : 0;
  const found = defaultMap.hazards.filter((hazard) => state.discoveredHazards.includes(hazard.id));
  const scan =
    beat?.kind === 'assess' && (phase === 'assessing' || phase === 'replanning')
      ? { x: nodes.percy.x, y: nodes.percy.y, value: beat.value }
      : null;
  const exitValue = phase === 'exit' ? (beat?.kind === 'exit' ? beat.value : 0) : 0;
  const choosing = phase === 'choosing';
  const mapOpen = choosing || showRoute || phase === 'arrived' || phase === 'exit' || phase === 'route-error';

  const signalFact = findFact('signal-latency');
  const autonavFact = findFact('autonav');
  const facts = [
    { fact: signalFact, shown: state.resolvedFacts.includes('signal-latency'), read: true },
    { fact: autonavFact, shown: state.resolvedFacts.includes('autonav'), read: true },
  ];

  const cursorStyle: CSSProperties = {
    '--cursor-default': cursorCss('default'),
    '--cursor-active': cursorCss('active', 'pointer'),
    '--cursor-grab': cursorCss('grab', 'grab'),
    '--cursor-grabbing': cursorCss('grabbing', 'grabbing'),
  } as CSSProperties;

  const frameStyle: CSSProperties = layout.valid
    ? {
        left: `${layout.board.left - layout.frame}px`,
        top: `${layout.board.top - layout.frame}px`,
        width: `${layout.board.width}px`,
        height: `${layout.board.height}px`,
      }
    : {};
  const boardStyle: CSSProperties = layout.valid
    ? { width: `${layout.board.width}px`, height: `${layout.board.height}px` }
    : {};
  const copyStyle: CSSProperties = layout.valid
    ? {
        left: `${layout.narration.left}px`,
        top: `${layout.narration.top}px`,
        width: `${layout.narration.width}px`,
        height: `${layout.narration.height}px`,
      }
    : {};
  const controlsStyle: CSSProperties = layout.valid
    ? {
        left: `${layout.controls.left}px`,
        top: `${layout.controls.top}px`,
        width: `${layout.controls.width}px`,
        minHeight: `${layout.controls.height}px`,
      }
    : {};

  return (
    <main
      ref={hostRef}
      className="p07-scene"
      data-scene={RUNNER_SCENE_ID}
      data-phase={phase}
      data-status={status}
      data-reduced-motion={reducedMotion}
      data-compact={layout.compact ? 'true' : 'false'}
      data-paused={paused ? 'true' : 'false'}
      style={cursorStyle}
    >
      <h1 className="p07-heading" tabIndex={-1}>
        The Runner
      </h1>

      {api.mapProblems.length > 0 ? (
        <div className="p07-setup" role="alert">
          <p>The map could not start: {api.mapProblems[0]}</p>
        </div>
      ) : null}

      {layout.valid ? (
        <>
          <section className="p07-copy" style={copyStyle} aria-label="Story">
            <div className="p07-dialogue">
              <DialogueLayer />
            </div>
            <div className="p07-cards">
              {api.comparisonShown && !(layout.compact && facts.some((entry) => entry.shown)) ? (
                <InfographicCard triggerRef={infoTrigger} onOpen={() => setViewerOpen(true)} />
              ) : null}
              {facts.map(({ fact, shown, read }) =>
                fact && shown ? (
                  <article key={fact.id} className="p07-fact" data-fact={fact.id} data-read={read}>
                    <h2 className="p07-card-title">{fact.title}</h2>
                    <p>{fact.summary}</p>
                    {fact.status === 'draft' ? <p className="p07-draft">Source still to be checked.</p> : null}
                  </article>
                ) : null,
              )}
            </div>
          </section>

          <div className="p07-frame" style={frameStyle}>
            <div ref={boardRef} className="p07-board" style={boardStyle} data-open={mapOpen ? 'true' : 'false'}>
              {webgl ? (
                <div className="p07-stage" data-p07-stage>
                  <WebGLStage
                    label="A top-down view of rocky Mars ground with Percy the rover."
                    background="#a14030"
                    preload={[]}
                  >
                    <RunnerWorld nodes={nodes} />
                  </WebGLStage>
                </div>
              ) : (
                <>
                  <FallbackBoard />
                  <svg
                    className="p07-fallback p07-fallback--rover"
                    viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
                    preserveAspectRatio="none"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <g ref={markerRef}>
                      <rect x="-17" y="-24" width="34" height="48" rx="7" fill="#f3e6ca" stroke="#2a2420" strokeWidth="3" />
                      <rect x="-9" y="-30" width="18" height="12" rx="4" fill="#4e6b72" stroke="#2a2420" strokeWidth="3" />
                    </g>
                  </svg>
                </>
              )}

              <RouteOverlay
                route={remaining}
                goal={goal}
                cursor={api.cursor}
                showCursor={focused && choosing}
                presets={defaultMap.presets}
                showPresets={choosing}
                found={found}
                scan={scan}
              />

              <div
                className="p07-surface"
                data-interactive={api.canSelect ? 'true' : 'false'}
                tabIndex={mapOpen ? 0 : -1}
                role="group"
                aria-label="Map. Use the arrow keys to move the cursor and Enter to choose a spot, or pick a place with the buttons below."
                onPointerDown={onPointerDown}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerCancel}
                onKeyDown={onKeyDown}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
              />

              <CommandStatus
                phase={phase}
                signal={beat?.kind === 'signal' ? beat.value : 0}
                stepsToGo={stepsToGo}
                rerouted={(route?.revision ?? 0) > 0}
                notice={api.notice}
                onRecover={api.recover}
              />

              {phase === 'map-reveal' ? <div className="p07-dim" aria-hidden="true" /> : null}
            </div>
          </div>

          <div className="p07-controls-wrap" style={controlsStyle}>
            <MapControls
              phase={phase}
              presets={defaultMap.presets}
              selected={selectedCell}
              canSelect={api.canSelect}
              canSend={api.canSend}
              canArrive={api.canArrive}
              waitingOnFacts={arrivalWaitingOnFacts(state)}
              onPreset={api.selectCell}
              onSend={api.sendCommand}
              onArrived={api.acceptArrived}
            />
          </div>
        </>
      ) : null}

      {viewerOpen ? <InfographicViewer onClose={closeViewer} returnFocusTo={infoTrigger} /> : null}

      <div className="p07-exit-fade" style={{ opacity: exitValue }} aria-hidden="true" />
      <PlaybackControls />
    </main>
  );
}

