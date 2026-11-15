import { useCallback, useEffect, useReducer, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { useNarrativeController } from '../../engine/useNarrativeController';
import { DialogueLayer } from '../../components/dialogue/DialogueLayer';
import { useDialogueStore } from '../../components/dialogue/dialogue.store';
import { useStoryStore } from '../../stores/story.store';
import {
  allPointsComplete,
  completedPointIds,
  createInspectionState,
  reduceInspection,
  type InspectionPointId,
} from '../scene-04-percy-inspection/inspectionState';
import { pointFact } from '../scene-04-percy-inspection/components/pointCopy';
import { InspectionCard } from '../scene-04-percy-inspection/components/InspectionCard';
import { MoxieActivity } from '../scene-04-percy-inspection/components/MoxieActivity';
import { EarthTeamActivity } from '../scene-04-percy-inspection/components/EarthTeamActivity';
import { InspectorCanvas } from '../scene-04-percy-inspection/inspector/InspectorCanvas';
import {
  INSPECTOR_BACKGROUND_LIGHT,
  INSPECTOR_ZOOM_MIN,
  INSPECTOR_ZOOM_STEP,
  clampInspectorZoom,
} from '../scene-04-percy-inspection/inspector/modelConfig';
import { InspectorFallback } from '../scene-04-percy-inspection/inspector/InspectorFallback';
import { InspectorToolbar } from '../scene-04-percy-inspection/inspector/InspectorToolbar';
import { monitorViewport } from '../scene-04-percy-inspection/inspector/projection';
import {
  beginDrag,
  continueDrag,
  useInspectorRotation,
} from '../scene-04-percy-inspection/inspector/useInspectorRotation';
import { useInspectorRenderer } from '../scene-04-percy-inspection/inspector/useInspectorRenderer';
import { cursorCss } from '../../components/cursor/cursors';
import { PartChips } from './components/PartChips';
import { p05RotationHintLine } from './dialogue';
import { P05_PANEL_CATEGORY, P05_PANEL_MEDIA } from './panelCopy';
import { layoutP05 } from './layout';
import {
  canExitInspection,
  createInspectorSceneState,
  inspectorInteractive,
  reduceInspectorScene,
  startsTurn,
} from './state';
import './Scene.css';

const EARTH_REPLY_MS = 900;

/**
 * P-05, the close-up.
 *
 * One picture, one WebGL context: the rover story has already handed Percy
 * over, so nothing draws behind this canvas. The four parts live on the model
 * as chips with leader lines, and the only way out is the single exit control
 * in the frame, which waits until every part is read.
 */
export function Scene05PercyInspector() {
  const status = useStoryStore((state) => state.status);
  const isPaused = useStoryStore((state) => state.isPaused);
  const sceneActive = useStoryStore((state) => state.activeSceneId === 'scene-05-percy-inspector');
  const reducedMotion = useStoryStore((state) => state.settings.reducedMotion);
  const controller = useNarrativeController();

  const hostRef = useRef<HTMLElement>(null);
  const [size, setSize] = useState(() => ({
    width: typeof window === 'undefined' ? 1280 : window.innerWidth,
    height: typeof window === 'undefined' ? 720 : window.innerHeight,
  }));
  const [scene, dispatchScene] = useReducer(reduceInspectorScene, undefined, createInspectorSceneState);
  const [inspection, dispatchInspection] = useReducer(reduceInspection, undefined, createInspectionState);
  // On a narrow host the card is a bottom sheet, and an empty sheet would leave
  // the picture a strip: the sheet only exists while a part is open.
  const layout = layoutP05(size.width, size.height, { cardOpen: inspection.activePoint !== null });
  const [hovered, setHovered] = useState<InspectionPointId | null>(null);
  const [origin, setOrigin] = useState<HTMLElement | null>(null);
  const [occluded, setOccluded] = useState<readonly InspectionPointId[]>([]);
  // Only feeds the grabbing cursor: the rotation itself lives in the hook.
  const [turning, setTurning] = useState(false);
  const replyTimer = useRef<number | null>(null);

  const rotation = useInspectorRotation();
  const inspector = useInspectorRenderer({
    active: layout.valid,
    onSettled: (renderer) => dispatchScene({ type: 'MODEL_SETTLED', renderer }),
  });

  const completed = allPointsComplete(inspection);
  const completedIds = completedPointIds(inspection);

  // Host size, measured on the scene's own element; jsdom has no observer, so
  // the window is the fallback instead of leaving the scene unmeasured.
  useEffect(() => {
    const measure = () => {
      const host = hostRef.current;
      const width = host?.clientWidth || window.innerWidth;
      const height = host?.clientHeight || window.innerHeight;
      setSize((previous) =>
        previous.width === Math.floor(width) && previous.height === Math.floor(height)
          ? previous
          : { width: Math.floor(width), height: Math.floor(height) },
      );
    };
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    if (hostRef.current) {
      observer.observe(hostRef.current);
    }
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (replyTimer.current !== null) {
        window.clearTimeout(replyTimer.current);
        replyTimer.current = null;
      }
    };
  }, []);

  // The script's last quote is spoken here, once, as soon as the picture is
  // there: "Excuse me, Percy, just turn around a little...". It advances on its
  // own, so the reader can start turning immediately.
  const hintedRef = useRef(false);
  useEffect(() => {
    if (scene.phase !== 'ready' || hintedRef.current) {
      return;
    }
    hintedRef.current = true;
    useDialogueStore.getState().cue(p05RotationHintLine);
  }, [scene.phase]);

  useEffect(() => {
    return () => {
      useDialogueStore.getState().clear();
    };
  }, []);

  // The reader is asked to wait from the first frame until the picture exists,
  // so the story never ticks on behind a loading card.
  useEffect(() => {
    if (scene.phase === 'exiting') {
      return;
    }
    controller.markWaiting();
  }, [controller, scene.phase]);

  const exitEnabled = canExitInspection({
    status,
    sceneActive,
    paused: isPaused,
    state: scene,
    allPointsComplete: completed,
  });

  const requestExit = useCallback(() => {
    if (!exitEnabled) {
      return;
    }
    dispatchScene({ type: 'EXIT_REQUESTED' });
  }, [exitEnabled]);

  // The scene reports completion only after its own fade has run.
  useEffect(() => {
    if (scene.phase !== 'exiting') {
      return;
    }
    const timer = window.setTimeout(() => {
      dispatchScene({ type: 'EXIT_FINISHED' });
      controller.completeScene();
    }, reducedMotion ? 0 : 520);
    return () => window.clearTimeout(timer);
  }, [controller, reducedMotion, scene.phase]);

  const openPoint = (point: InspectionPointId, control: HTMLElement | null) => {
    setOrigin(control);
    dispatchInspection({ type: 'OPEN_POINT', point });
  };

  const closePoint = () => {
    dispatchInspection({ type: 'CLOSE_POINT' });
    setOrigin(null);
  };

  const sendInstruction = () => {
    dispatchInspection({ type: 'CONFIRM_LOOK_LEFT' });
    if (replyTimer.current !== null) {
      window.clearTimeout(replyTimer.current);
    }
    replyTimer.current = window.setTimeout(() => {
      replyTimer.current = null;
      dispatchInspection({ type: 'COMMAND_FINISHED' });
    }, EARTH_REPLY_MS);
  };

  const cardBody = (point: InspectionPointId) => {
    if (point === 'moxie') {
      return (
        <MoxieActivity
          step={inspection.moxieStep}
          finished={inspection.moxieFinished}
          onNext={() => dispatchInspection({ type: 'MOXIE_NEXT' })}
          onFinish={() => dispatchInspection({ type: 'MOXIE_FINISH' })}
        />
      );
    }
    if (point === 'earth-team') {
      return (
        <EarthTeamActivity
          messageOpened={inspection.messageOpened}
          commandState={inspection.commandState}
          onOpenMessage={() => dispatchInspection({ type: 'OPEN_MESSAGE' })}
          onConfirm={sendInstruction}
        />
      );
    }
    const fact = pointFact(point);
    return (
      <>
        <p className="p04-card-summary">{fact.summary}</p>
        <p className="p04-card-source">Source: {fact.source}</p>
      </>
    );
  };

  const dragRef = useRef<ReturnType<typeof beginDrag> | null>(null);
  const interactive = inspectorInteractive(scene);

  // Zoom walks the camera in; the model and the chips share the projection, so
  // they cannot separate. Zoom is only offered on the 3D picture: the fallback
  // is a still, and its markers do not move.
  const [zoom, setZoom] = useState(INSPECTOR_ZOOM_MIN);
  const zoomed = inspector.renderer === '3d' ? clampInspectorZoom(zoom) : 1;
  const screenRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = screenRef.current;
    if (!element) {
      return;
    }
    // A native listener, because React's `onWheel` is passive and cannot keep
    // the page from scrolling under the pointer while the reader zooms.
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const step = event.deltaY < 0 ? INSPECTOR_ZOOM_STEP : -INSPECTOR_ZOOM_STEP;
      setZoom((current) => clampInspectorZoom(current + step));
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, [interactive]);

  const screen = {
    label:
      'Turn the rover with a drag or the arrow keys. Scroll, or press plus and minus, to zoom.',
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
      // A press on a chip or a button belongs to that control: turning the
      // model here would capture the pointer and swallow the control's click.
      if (event.button !== 0 || !startsTurn(event.target)) {
        return;
      }
      dragRef.current = beginDrag(event.pointerId, event.clientX, event.clientY);
      event.currentTarget.setPointerCapture(event.pointerId);
      setTurning(true);
    },
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
      const session = dragRef.current;
      if (!session || session.pointerId !== event.pointerId) {
        return;
      }
      dragRef.current = continueDrag(session, event.clientX, event.clientY, rotation.rotateBy);
    },
    onPointerUp: (event: PointerEvent<HTMLDivElement>) => {
      dragRef.current = null;
      setTurning(false);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    onPointerCancel: (event: PointerEvent<HTMLDivElement>) => {
      dragRef.current = null;
      setTurning(false);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
      const step = 12;
      const handlers: Record<string, () => void> = {
        ArrowLeft: () => rotation.rotateBy(-step, 0),
        ArrowRight: () => rotation.rotateBy(step, 0),
        ArrowUp: () => rotation.rotateBy(0, -step),
        ArrowDown: () => rotation.rotateBy(0, step),
        // Zoom by keyboard too, or the picture has a feature only a mouse can reach.
        '+': () => setZoom((current) => clampInspectorZoom(current + INSPECTOR_ZOOM_STEP)),
        '=': () => setZoom((current) => clampInspectorZoom(current + INSPECTOR_ZOOM_STEP)),
        '-': () => setZoom((current) => clampInspectorZoom(current - INSPECTOR_ZOOM_STEP)),
        '0': () => setZoom(INSPECTOR_ZOOM_MIN),
      };
      const handler = handlers[event.key];
      if (!handler) {
        return;
      }
      event.preventDefault();
      handler();
    },
  };

  const viewport = monitorViewport(
    { width: layout.picture.width, height: layout.picture.height },
    zoomed,
  );
  // One place decides the pointing devices, so the chips, the picture and the
  // drag share the same four cursor drawings.
  const cursorStyle: CSSProperties = {
    '--cursor-default': cursorCss('default'),
    '--cursor-active': cursorCss('active', 'pointer'),
    '--cursor-grab': cursorCss('grab', 'grab'),
    '--cursor-grabbing': cursorCss('grabbing', 'grabbing'),
  } as CSSProperties;

  // Choosing a part slides the picture aside so the panel has room; the pan is
  // one CSS value shared by the canvas and the chips, so they never separate.
  const panning = inspection.activePoint !== null && !layout.stacked;
  // An overlay panel covers the picture's right side, so the picture steps
  // further aside there; a side column only needs a nudge.
  const panAmount = layout.mode === 'overlay' ? '-14%' : '-7%';
  // The floating panel covers the picture's right side, so the chips keep to
  // the clear part of it. A side column or a sheet covers nothing.
  const chipRightLimit =
    layout.mode === 'overlay' && inspection.activePoint
      ? layout.card.left - layout.picture.left
      : undefined;
  // The drawer takes most of a small picture, so the chips step aside while it
  // is open rather than sit under it and catch presses meant for the panel.
  const chipsStandAside = layout.mode === 'sheet' && inspection.activePoint !== null;
  const frameStyle: CSSProperties = {
    left: `${layout.picture.left}px`,
    top: `${layout.picture.top}px`,
    width: `${layout.picture.width}px`,
    height: `${layout.picture.height}px`,
  };
  const cardStyle: CSSProperties = layout.stacked
    ? {
        left: `${layout.card.left}px`,
        top: `${layout.card.top}px`,
        width: `${layout.card.width}px`,
        height: `${layout.card.height}px`,
      }
    : {
        left: `${layout.card.left}px`,
        top: `${layout.card.top}px`,
        width: `${layout.card.width}px`,
        height: `${layout.card.height}px`,
      };

  const picture =
    inspector.renderer === '3d' && inspector.resource ? (
      <>
        <InspectorCanvas
          resource={inspector.resource}
          rotation={rotation.rotation}
          label="A model of Percy, the rover. Four labelled parts point at his cameras, microphone, MOXIE unit and antenna."
          background={INSPECTOR_BACKGROUND_LIGHT}
          frameloop="always"
          zoom={zoomed}
          toneMapped
          onContextLost={inspector.reportContextLost}
          onOccluded={setOccluded}
          onPainted={() => dispatchScene({ type: 'FIRST_FRAME' })}
        />
        {interactive ? (
          <PartChips
            viewport={viewport}
            rotation={rotation.rotation}
            occluded={occluded}
            activePoint={inspection.activePoint}
            hoveredPoint={hovered}
            completed={completedIds}
            rightLimit={chipRightLimit}
            hidden={chipsStandAside}
            onHover={setHovered}
            onSelect={openPoint}
          />
        ) : null}
      </>
    ) : inspector.renderer === '2d-fallback' ? (
      <>
        <InspectorFallback reason={inspector.reason ?? 'failed'} />
        {interactive ? (
          <PartChips
            viewport={viewport}
            rotation={rotation.rotation}
            occluded={[]}
            activePoint={inspection.activePoint}
            hoveredPoint={hovered}
            completed={completedIds}
            rightLimit={chipRightLimit}
            hidden={chipsStandAside}
            onHover={setHovered}
            onSelect={openPoint}
          />
        ) : null}
      </>
    ) : null;

  return (
    <main
      ref={hostRef}
      className="p05-scene"
      data-scene="scene-05-percy-inspector"
      data-phase={scene.phase}
      data-status={status}
      data-rendered={inspector.renderer}
      data-reason={inspector.reason ?? ''}
      data-reduced-motion={reducedMotion}
      data-fade={scene.phase === 'exiting' ? 'true' : 'false'}
      style={cursorStyle}
    >
      <header className="p05-bar">
        <div className="p05-bar-text">
          <h1 className="p05-heading" tabIndex={-1}>
            Perseverance Inspection
          </h1>
          <p className="p05-progress" aria-live="polite">
            {`${completedIds.length} of 4 parts read`}
          </p>
        </div>
        <button
          type="button"
          className="p05-exit"
          data-exit-inspection
          onClick={requestExit}
          disabled={!exitEnabled}
          aria-describedby={!completed ? 'p05-exit-hint' : undefined}
        >
          Exit inspection
        </button>
        {!completed ? (
          <p className="p05-exit-hint" id="p05-exit-hint">
            Read all four parts to leave.
          </p>
        ) : null}
      </header>

      {layout.valid ? (
        <>
          <div
            className="p05-frame"
            data-picture-frame
            data-panning={panning ? 'true' : 'false'}
            style={{ ...frameStyle, '--p05-pan': panning ? panAmount : '0px' } as CSSProperties}
          >
            <div
              className="p05-screen"
              ref={screenRef}
              data-rotate-surface="true"
              data-zoom={zoomed.toFixed(2)}
              data-dragging={turning ? 'true' : 'false'}
              tabIndex={0}
              role="group"
              aria-label={screen.label}
              onPointerDown={screen.onPointerDown}
              onPointerMove={screen.onPointerMove}
              onPointerUp={screen.onPointerUp}
              onPointerCancel={screen.onPointerCancel}
              onPointerLeave={screen.onPointerCancel}
              onKeyDown={screen.onKeyDown}
            >
              {picture}
            </div>

            {scene.phase === 'loading' ? (
              <div className="p05-loading" data-loading-card role="status">
                <p className="p05-loading-title">Bringing Percy&apos;s parts up close…</p>
                <p className="p05-loading-hint">The picture is on its way.</p>
              </div>
            ) : null}

            <div className="p05-frame-bar">
              <InspectorToolbar rotation={rotation} />
            </div>
          </div>

          {/*
            In `side` mode the column is reserved, so its empty state holds the
            place from the first frame. In `overlay` mode it floats over the
            picture, so it only exists while a part is open: an empty floating
            panel would both cover the rover and swallow its chip.
          */}
          {inspection.activePoint || layout.mode === 'side' ? (
          <div
            className="p05-card-column"
            data-mode={layout.mode}
            data-open={inspection.activePoint !== null ? 'true' : 'false'}
            style={cardStyle}
          >
            {inspection.activePoint ? (
              <InspectionCard
                point={inspection.activePoint}
                title={cardTitle(inspection.activePoint)}
                category={P05_PANEL_CATEGORY[inspection.activePoint]}
                media={P05_PANEL_MEDIA[inspection.activePoint]}
                discovered={completedIds.includes(inspection.activePoint)}
                onClose={closePoint}
                returnFocusTo={origin}
              >
                {cardBody(inspection.activePoint)}
              </InspectionCard>
            ) : (
              <p className="p05-card-empty">
                Choose a part on Percy to read what it does.
              </p>
            )}
          </div>
          ) : null}

          <div
            className="p05-dialogue"
            data-compact={size.height < 480 ? 'true' : 'false'}
            style={frameStyle}
          >
            <DialogueLayer />
          </div>

          <div className="p05-fade" data-visible={scene.phase === 'exiting' ? 'true' : 'false'} aria-hidden="true" />
        </>
      ) : null}
    </main>
  );
}

function cardTitle(point: InspectionPointId): string {
  switch (point) {
    case 'cameras':
      return 'Cameras';
    case 'microphone':
      return 'Microphone';
    case 'moxie':
      return 'MOXIE';
    case 'earth-team':
      return 'Team on Earth';
  }
}
