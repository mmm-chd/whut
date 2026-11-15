import { useCallback, useEffect, useRef, useState } from 'react';
import { useDialogueStore } from '../../components/dialogue/dialogue.store';
import { useNarrativeController } from '../../engine/useNarrativeController';
import { useStoryStore } from '../../stores/story.store';
import {
  P08_ALL_LINE_IDS,
  P08_FINAL_LINE_ID,
  boundaryOfLine,
  findP08Line,
  linesForSegment,
  segmentOfLine,
  type P08Segment,
} from './dialogue';
import type { P08Layout } from './layout';
import { createP08Nodes, type P08Nodes } from './nodes';
import { P08_SCENE_ID } from './scene.config';
import {
  canAcceptP08Continue,
  canBeginP08Fade,
  canCompleteP08,
  createP08State,
  reduceP08,
  type P08Context,
  type P08Event,
  type P08State,
} from './state';
import { createP08Driver, type P08Driver } from './timeline';

type EventBody<T> = T extends unknown ? Omit<T, 'runId'> : never;

export interface P08SceneApi {
  readonly state: P08State;
  readonly nodes: P08Nodes;
  /** The message-arrived cue is showing (Percy has stopped and the Ding has played). */
  readonly dingVisible: boolean;
  /** Pause for the voice-over and the captions: the store's pause, a hidden tab, or both. */
  readonly presentationPaused: boolean;
  /** DOM that follows the nodes subscribes here; returns the unsubscribe. */
  readonly onFrame: (listener: () => void) => () => void;
}

/**
 * One run of the ending: the state machine, the driver and the caption script
 * wired together. A line only counts when it really leaves the screen by being
 * read; clearing the dialogue is never a resolution, and the run's own symbol
 * keeps a late callback from an old run away from this one.
 */
export function useP08Scene(layout: P08Layout): P08SceneApi {
  const controller = useNarrativeController();
  const controllerRef = useRef(controller);
  useEffect(() => {
    controllerRef.current = controller;
  }, [controller]);

  const status = useStoryStore((store) => store.status);
  const paused = useStoryStore((store) => store.isPaused);
  const sceneActive = useStoryStore((store) => store.activeSceneId === P08_SCENE_ID);
  const reducedMotion = useStoryStore((store) => store.settings.reducedMotion);
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || !document.hidden);

  const [runId] = useState(() => Symbol('p08-run'));
  const [state, setState] = useState<P08State>(() => createP08State(runId));
  const stateRef = useRef(state);
  const send = useCallback(
    (body: EventBody<P08Event>) => {
      const next = reduceP08(stateRef.current, { runId, ...body } as P08Event);
      if (next !== stateRef.current) {
        stateRef.current = next;
        setState(next);
      }
      return next;
    },
    [runId],
  );

  const [nodes] = useState(() => createP08Nodes(layout, reducedMotion));
  const [dingVisible, setDingVisible] = useState(false);
  const driverRef = useRef<P08Driver | null>(null);
  const frameListeners = useRef(new Set<() => void>());
  const layoutRef = useRef(layout);
  const flags = useRef({ letsGoResolved: false, exited: false, finalCued: false, fadeStarted: false, completed: false });

  const effectivePaused = paused || !visible;
  const ctxRef = useRef<P08Context>({
    runId,
    sceneActive,
    paused: effectivePaused,
    visible,
    status,
    activeLineId: null,
  });
  useEffect(() => {
    ctxRef.current = { runId, sceneActive, paused, visible, status, activeLineId: null };
  }, [paused, runId, sceneActive, status, visible]);

  useEffect(() => {
    const onVisibility = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const mark = useCallback((id: string) => {
    useStoryStore.getState().markInteractionComplete(id);
  }, []);

  /** Cue the line after `afterId` in a segment (or its first). False when there is none. */
  const cueFrom = useCallback((segment: P08Segment, afterId?: string): boolean => {
    const lines = linesForSegment(segment);
    const index = afterId === undefined ? 0 : lines.findIndex((line) => line.id === afterId) + 1;
    const line = lines[index];
    if (!line) {
      return false;
    }
    useDialogueStore.getState().cue(line);
    return true;
  }, []);

  const tryFade = useCallback(() => {
    const driver = driverRef.current;
    const context = { ...ctxRef.current, paused: ctxRef.current.paused, activeLineId: null };
    if (!driver || flags.current.fadeStarted || !canBeginP08Fade(stateRef.current, context)) {
      return;
    }
    flags.current.fadeStarted = true;
    send({ type: 'FADE_STARTED' });
    driver.beginFade();
  }, [send]);

  const maybeCueFinal = useCallback(() => {
    if (flags.current.finalCued || !flags.current.exited || !flags.current.letsGoResolved) {
      return;
    }
    flags.current.finalCued = true;
    cueFrom('final');
  }, [cueFrom]);

  // ----- the driver --------------------------------------------------------
  useEffect(() => {
    const driver = createP08Driver({
      nodes,
      layout: layoutRef.current,
      reducedMotion: useStoryStore.getState().settings.reducedMotion,
      callbacks: {
        onEntryFinished: () => {
          send({ type: 'READY' });
          if (useStoryStore.getState().status === 'playing') {
            controllerRef.current.markWaiting();
          }
          cueFrom('samples');
        },
        onHopeTransitionFinished: () => {
          send({ type: 'HOPE_TRANSITION_FINISHED' });
          driver.beginTravel();
          cueFrom('hope-travel');
        },
        onPercyStopped: () => {
          send({ type: 'PERCY_STOPPED' });
          setDingVisible(true);
          driver.beginDing();
        },
        onDingSettled: () => {
          send({ type: 'DING_SETTLED' });
          cueFrom('hope-notice');
        },
        onCloseupFinished: () => {
          send({ type: 'CLOSEUP_FINISHED' });
          cueFrom('message-news');
        },
        onReactionPauseFinished: () => {
          send({ type: 'REACTION_PAUSE_FINISHED' });
          driver.liftMast();
          cueFrom('message-after');
        },
        onPercyExited: () => {
          send({ type: 'PERCY_EXITED' });
          mark('p08-percy-exited');
          flags.current.exited = true;
          maybeCueFinal();
        },
        onTracksSettled: () => {
          send({ type: 'TRACKS_SETTLED' });
          tryFade();
        },
        onFadeFinished: () => {
          send({ type: 'FADE_FINISHED' });
          mark('p08-ending-fade-finished');
          const context = ctxRef.current;
          if (!flags.current.completed && canCompleteP08(stateRef.current, context)) {
            flags.current.completed = true;
            controllerRef.current.completeScene();
            send({ type: 'COMPLETED' });
          }
        },
        onFrame: () => {
          for (const listener of frameListeners.current) {
            listener();
          }
        },
      },
    });
    driverRef.current = driver;
    return () => {
      driver.dispose();
      if (driverRef.current === driver) {
        driverRef.current = null;
      }
    };
  }, [cueFrom, mark, maybeCueFinal, nodes, send, tryFade]);

  useEffect(() => {
    layoutRef.current = layout;
    driverRef.current?.setLayout(layout);
  }, [layout]);

  useEffect(() => {
    driverRef.current?.setPaused(effectivePaused);
  }, [effectivePaused]);

  useEffect(() => {
    driverRef.current?.setReducedMotion(reducedMotion);
  }, [reducedMotion]);

  // ----- the caption script: what happens after each line is really read -----
  useEffect(() => {
    // Only a fresh run cues the opening: a refreshed module must not replay it.
    if (stateRef.current.phase !== 'loading') {
      return;
    }
    useDialogueStore.getState().clear();
    driverRef.current?.beginEntry();

    const unsubscribe = useDialogueStore.subscribe((next, previous) => {
      const left = previous.active?.line;
      if (!left || next.active?.line.id === left.id || !P08_ALL_LINE_IDS.includes(left.id)) {
        return;
      }
      const driver = driverRef.current;
      if (!driver) {
        return;
      }

      const boundary = boundaryOfLine(left.id);
      if (boundary) {
        const context = { ...ctxRef.current, activeLineId: left.id };
        // A Continue pressed in a state that cannot take it (paused, hidden, wrong
        // phase) must not be lost: the line comes back instead of vanishing.
        if (!canAcceptP08Continue(stateRef.current, context, boundary)) {
          const again = findP08Line(left.id);
          if (again) {
            useDialogueStore.getState().cue(again);
          }
          return;
        }
        send({ type: 'BOUNDARY_ACCEPTED', boundary });
        if (boundary === 'samples') {
          mark('p08-samples-continued');
          driver.beginHopeTransition();
        } else if (boundary === 'hope') {
          mark('p08-return-hope-continued');
          setDingVisible(false);
          driver.beginCloseup();
        } else {
          mark('p08-earth-message-continued');
          driver.beginDeparture();
          cueFrom('departure');
        }
        return;
      }

      send({ type: 'LINE_RESOLVED', lineId: left.id });
      const segment = segmentOfLine(left.id);
      if (segment === 'samples') {
        cueFrom('samples', left.id);
      } else if (segment === 'hope-travel') {
        if (!cueFrom('hope-travel', left.id)) {
          // The last auto caption is read: Percy eases to a stop, then the Ding.
          driver.beginStop();
        }
      } else if (segment === 'message-news') {
        if (!cueFrom('message-news', left.id)) {
          send({ type: 'REACTION_PAUSE_STARTED' });
          driver.beginReactionPause();
        }
      } else if (segment === 'message-after') {
        cueFrom('message-after', left.id);
      } else if (segment === 'departure') {
        flags.current.letsGoResolved = true;
        maybeCueFinal();
      } else if (segment === 'final') {
        if (left.id === P08_FINAL_LINE_ID) {
          mark('p08-final-narration-read');
          tryFade();
        } else {
          cueFrom('final', left.id);
        }
      }
    });

    return () => {
      // Unsubscribe first: clearing the dialogue on the way out is not a reading.
      unsubscribe();
      useDialogueStore.getState().clear();
    };
  }, [cueFrom, mark, maybeCueFinal, send, tryFade]);

  // The fade is also tried whenever the state, the pause or the status changes, so
  // a pause at the wrong moment delays it instead of losing it.
  useEffect(() => {
    tryFade();
  }, [state, effectivePaused, status, tryFade]);

  const onFrame = useCallback((listener: () => void) => {
    frameListeners.current.add(listener);
    return () => {
      frameListeners.current.delete(listener);
    };
  }, []);

  return { state, nodes, dingVisible, presentationPaused: effectivePaused, onFrame };
}
