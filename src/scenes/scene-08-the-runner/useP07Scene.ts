import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDialogueStore } from '../../components/dialogue/dialogue.store';
import { useNarrativeController } from '../../engine/useNarrativeController';
import { useStoryStore } from '../../stores/story.store';
import { P07_NARRATOR_LINE_IDS, narratorSectionSeconds, p07AutonavFactLine, p07OpeningLineIds, p07OpeningLines, p07SignalFactLine } from './dialogue';
import { sameCell, type Cell } from './grid';
import { OPENING_ROUTE, defaultMap, hazardAt, knownGridWith, validateNavigationMap } from './map';
import { stepCell, type ArrowKey } from './mapInput';
import { createRunnerNodes, type RunnerNodes } from './nodes';
import { findGridPath } from './pathfinding';
import { RUNNER_SCENE_ID } from './scene.config';
import {
  canAcceptArrived,
  canCompleteP07,
  canSelectDestination,
  canSendCommand,
  createP07State,
  reduceP07,
  type CommandSnapshot,
  type P07Context,
  type P07Event,
  type P07State,
  type RoutePlan,
} from './state';
import { createRunnerDriver, type DriverKind, type RunnerDriver } from './timeline';

type EventBody<T> = T extends unknown ? Omit<T, 'runId'> : never;
export type P07EventBody = EventBody<P07Event>;

export interface BeatProgress {
  readonly kind: DriverKind;
  readonly value: number;
}

export interface P07SceneApi {
  readonly state: P07State;
  readonly nodes: RunnerNodes;
  readonly mapProblems: readonly string[];
  readonly beat: BeatProgress | null;
  readonly notice: string | null;
  readonly cursor: Cell;
  readonly canSelect: boolean;
  readonly canSend: boolean;
  readonly canArrive: boolean;
  readonly comparisonShown: boolean;
  readonly selectCell: (cell: Cell) => void;
  readonly moveCursor: (key: ArrowKey) => void;
  readonly activateCursor: () => void;
  readonly sendCommand: () => void;
  readonly recover: () => void;
  readonly acceptArrived: () => void;
  /** Overlays that follow Percy subscribe here; returns the unsubscribe. */
  readonly onFrame: (listener: () => void) => () => void;
}

/**
 * One run of the Runner: the state machine, the driver, the planner and the
 * narration gates, wired together. Guards read refs, so a stale render can
 * never accept a second command; every callback is checked against the live
 * run, command and route revision before it changes anything.
 */
export function useP07Scene(runId: number): P07SceneApi {
  const map = defaultMap;
  const controller = useNarrativeController();
  const controllerRef = useRef(controller);
  useEffect(() => {
    controllerRef.current = controller;
  }, [controller]);

  const status = useStoryStore((store) => store.status);
  const paused = useStoryStore((store) => store.isPaused);
  const sceneActive = useStoryStore((store) => store.activeSceneId === RUNNER_SCENE_ID);
  const reducedMotion = useStoryStore((store) => store.settings.reducedMotion);
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || !document.hidden);

  const mapProblems = useMemo(() => validateNavigationMap(map), [map]);

  const [state, setState] = useState<P07State>(() => createP07State(runId, map.start));
  const stateRef = useRef(state);
  const send = useCallback(
    (body: P07EventBody) => {
      const next = reduceP07(stateRef.current, { runId, ...body } as P07Event, map);
      if (next !== stateRef.current) {
        stateRef.current = next;
        setState(next);
      }
      return next;
    },
    [map, runId],
  );

  const [nodes] = useState(() => createRunnerNodes(map.start, reducedMotion));
  const [beat, setBeat] = useState<BeatProgress | null>(null);
  const [localNotice, setLocalNotice] = useState<string | null>(null);
  const [cursor, setCursor] = useState<Cell>(map.start);
  const [comparisonShown, setComparisonShown] = useState(false);

  const driverRef = useRef<RunnerDriver | null>(null);
  const frameListeners = useRef(new Set<() => void>());
  const startedRouteKey = useRef<string | null>(null);
  const factCued = useRef({ signal: false, autonav: false });
  const completedRef = useRef(false);

  const ctxRef = useRef<P07Context>({ runId, sceneActive, paused, visible, status });
  useEffect(() => {
    ctxRef.current = { runId, sceneActive, paused, visible, status };
  }, [paused, runId, sceneActive, status, visible]);

  useEffect(() => {
    const onVisibility = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const mark = useCallback((interactionId: string) => {
    useStoryStore.getState().markInteractionComplete(interactionId);
  }, []);

  // ----- opening gates ------------------------------------------------------
  const openingStopped = useRef(false);
  const narratorDone = useRef(false);
  const percyCued = useRef(false);
  const resolvedRef = useRef(new Set<string>());

  const maybeCuePercy = useCallback(() => {
    if (percyCued.current || !openingStopped.current || !narratorDone.current) {
      return;
    }
    percyCued.current = true;
    for (const line of p07OpeningLines) {
      if (!P07_NARRATOR_LINE_IDS.includes(line.id as (typeof P07_NARRATOR_LINE_IDS)[number])) {
        useDialogueStore.getState().cue(line);
      }
    }
  }, []);

  // ----- the driver -------------------------------------------------------
  useEffect(() => {
    let lastBucket = -1;
    const driver = createRunnerDriver({
      nodes,
      map,
      reducedMotion: useStoryStore.getState().settings.reducedMotion,
      callbacks: {
        onOpeningArrived: () => {
          send({ type: 'OPENING_STOPPED', cell: map.start });
          openingStopped.current = true;
          maybeCuePercy();
        },
        onSignalFinished: (commandId) => {
          send({ type: 'SIGNAL_FINISHED', commandId });
          setBeat(null);
        },
        onWaypoint: (commandId, revision, index) => send({ type: 'WAYPOINT_REACHED', commandId, revision, index }),
        onBlocked: (commandId, revision, cell) => {
          const hazard = hazardAt(map, cell);
          if (hazard) {
            const next = send({ type: 'OBSTACLE_DETECTED', commandId, revision, hazardId: hazard.id });
            // The driver has stopped. If the state did not take the sighting (a second
            // patch, or one already known), the reader still gets a way out.
            if (next.phase !== 'assessing') {
              send({ type: 'ROUTE_ERROR', commandId, reason: 'invalid' });
            }
          } else {
            send({ type: 'ROUTE_ERROR', commandId, reason: 'invalid' });
          }
        },
        onGoal: (commandId, revision) => send({ type: 'GOAL_REACHED', commandId, revision }),
        onAssessmentFinished: (commandId, revision) => {
          send({ type: 'ASSESSMENT_FINISHED', commandId, revision });
          setBeat(null);
        },
        onExitFinished: (commandId) => {
          setBeat({ kind: 'exit', value: 1 });
          send({ type: 'EXIT_FINISHED', commandId });
          const current = stateRef.current;
          if (!completedRef.current && canCompleteP07(current, ctxRef.current)) {
            completedRef.current = true;
            controllerRef.current.completeScene();
            send({ type: 'SCENE_COMPLETED', commandId });
          }
        },
        onProgress: (kind, value) => {
          // At most forty published steps per beat, however fast frames run.
          const bucket = Math.floor(value * 40);
          if (bucket !== lastBucket) {
            lastBucket = bucket;
            setBeat({ kind, value });
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
  }, [map, maybeCuePercy, nodes, send]);

  useEffect(() => {
    driverRef.current?.setPaused(paused || !visible);
  }, [paused, visible]);
  useEffect(() => {
    driverRef.current?.setReducedMotion(reducedMotion);
    nodes.flags.reducedMotion = reducedMotion;
  }, [nodes, reducedMotion]);

  // ----- the opening ------------------------------------------------------
  useEffect(() => {
    // Only the opening cues the opening: a refreshed module must not replay it
    // over a game in progress.
    const phase = stateRef.current.phase;
    if (phase !== 'loading' && phase !== 'intro-moving') {
      return;
    }
    useDialogueStore.getState().clear();
    send({ type: 'SCENE_READY' });

    const unsubscribe = useDialogueStore.subscribe((next, previous) => {
      const left = previous.active?.line;
      const entered = next.active?.line;
      if (entered && entered.id !== left?.id && entered.id === 'p07-narrator-03') {
        setComparisonShown(true);
      }
      if (!left || entered?.id === left.id) {
        return;
      }
      resolvedRef.current.add(left.id);

      if (left.id === 'p07-narrator-04') {
        narratorDone.current = true;
        maybeCuePercy();
      }
      if (p07OpeningLineIds.every((id) => resolvedRef.current.has(id))) {
        send({ type: 'INTRO_RESOLVED' });
      }
      if (left.id === p07SignalFactLine.id) {
        send({ type: 'FACT_RESOLVED', factId: 'signal-latency' });
        mark('p07-fact-signal-read');
      }
      if (left.id === p07AutonavFactLine.id) {
        send({ type: 'FACT_RESOLVED', factId: 'autonav' });
        mark('p07-fact-autonav-read');
      }
    });

    for (const line of p07OpeningLines) {
      if (P07_NARRATOR_LINE_IDS.includes(line.id as (typeof P07_NARRATOR_LINE_IDS)[number])) {
        useDialogueStore.getState().cue(line);
      }
    }
    driverRef.current?.startOpening(OPENING_ROUTE, Math.max(6, narratorSectionSeconds()) * 1000);

    return () => {
      unsubscribe();
      useDialogueStore.getState().clear();
    };
  }, [mark, maybeCuePercy, send]);

  // The dim into map mode is its own short beat; the map opens when it ends.
  useEffect(() => {
    if (state.phase !== 'map-reveal') {
      return;
    }
    if (paused || !visible) {
      return;
    }
    const timer = window.setTimeout(() => {
      send({ type: 'MAP_READY' });
      if (useStoryStore.getState().status === 'playing') {
        controllerRef.current.markWaiting();
      }
    }, reducedMotion ? 120 : 900);
    return () => window.clearTimeout(timer);
  }, [paused, reducedMotion, send, state.phase, visible]);

  // ----- phase effects: one place that starts each beat ---------------------
  const { phase, command, route, discoveredHazards, currentCell, waypointIndex } = state;
  useEffect(() => {
    const driver = driverRef.current;
    if (!driver) {
      return;
    }
    if (phase === 'signal' && command) {
      mark('p07-command-sent');
      if (!factCued.current.signal) {
        factCued.current.signal = true;
        useDialogueStore.getState().cue(p07SignalFactLine);
      }
      driver.beginSignal(command.commandId);
      startedRouteKey.current = null;
    }
    if (phase === 'navigating' && command && route) {
      mark('p07-signal-received');
      if (!factCued.current.autonav) {
        factCued.current.autonav = true;
        useDialogueStore.getState().cue(p07AutonavFactLine);
      }
      const key = `${command.commandId}:${route.revision}`;
      if (startedRouteKey.current !== key) {
        startedRouteKey.current = key;
        driver.beginRoute(command.commandId, route.revision, route.cells.slice(waypointIndex));
      }
    }
    if (phase === 'assessing' && command && route) {
      driver.beginAssessment(command.commandId, route.revision);
    }
    if (phase === 'replanning' && command && route) {
      const grid = knownGridWith(map, discoveredHazards);
      const found = findGridPath(grid, currentCell, command.goal);
      if (found.kind === 'found') {
        const plan: RoutePlan = { commandId: command.commandId, revision: route.revision + 1, cells: found.cells };
        const next = send({ type: 'ROUTE_REPLACED', commandId: command.commandId, route: plan });
        if (next.phase === 'replanning') {
          send({ type: 'ROUTE_ERROR', commandId: command.commandId, reason: 'invalid' });
        }
      } else {
        send({ type: 'ROUTE_ERROR', commandId: command.commandId, reason: found.kind });
      }
    }
    if (phase === 'arrived') {
      mark('p07-goal-reached');
    }
    if (phase === 'exit' && command) {
      mark('p07-arrived-accepted');
      driver.beginExit(command.commandId);
    }
  }, [command, currentCell, discoveredHazards, map, mark, phase, route, send, waypointIndex]);

  // ----- guards and actions ------------------------------------------------
  const ctx: P07Context = { runId, sceneActive, paused, visible, status };
  const canSelect = canSelectDestination(state, ctx);
  const canSend = canSendCommand(state, ctx, map);
  const canArrive = canAcceptArrived(state, ctx);

  const selectCell = useCallback(
    (cell: Cell) => {
      const live = stateRef.current;
      if (!canSelectDestination(live, ctxRef.current)) {
        return;
      }
      setCursor(cell);
      const next = send({ type: 'DESTINATION_SELECTED', cell });
      setLocalNotice(next.selectedCell && sameCell(next.selectedCell, cell) ? null : (next.notice ?? null));
    },
    [send],
  );

  const moveCursor = useCallback((key: ArrowKey) => {
    setCursor((current) => stepCell(current, key));
  }, []);

  const activateCursor = useCallback(() => {
    selectCell(cursor);
  }, [cursor, selectCell]);

  const sendCommand = useCallback(() => {
    const live = stateRef.current;
    if (!canSendCommand(live, ctxRef.current, map) || live.selectedCell === null) {
      return;
    }
    const goal = live.selectedCell;
    const snapshot: CommandSnapshot = {
      runId,
      commandId: live.commandCounter + 1,
      start: live.currentCell,
      goal,
    };
    const found = findGridPath(map.known, snapshot.start, goal);
    if (found.kind !== 'found') {
      setLocalNotice('Percy needs another safe destination.');
      return;
    }
    send({
      type: 'COMMAND_ACCEPTED',
      command: snapshot,
      route: { commandId: snapshot.commandId, revision: 0, cells: found.cells },
    });
    setLocalNotice(null);
  }, [map, runId, send]);

  const recover = useCallback(() => {
    send({ type: 'RECOVERY_REQUESTED' });
    setLocalNotice(null);
  }, [send]);

  const acceptArrived = useCallback(() => {
    const live = stateRef.current;
    if (!live.command || !canAcceptArrived(live, ctxRef.current)) {
      return;
    }
    send({ type: 'ARRIVED_ACCEPTED', commandId: live.command.commandId });
  }, [send]);

  const onFrame = useCallback((listener: () => void) => {
    frameListeners.current.add(listener);
    return () => {
      frameListeners.current.delete(listener);
    };
  }, []);

  return {
    state,
    nodes,
    mapProblems,
    beat,
    notice: localNotice ?? state.notice,
    cursor,
    canSelect,
    canSend,
    canArrive,
    comparisonShown,
    selectCell,
    moveCursor,
    activateCursor,
    sendCommand,
    recover,
    acceptArrived,
    onFrame,
  };
}
