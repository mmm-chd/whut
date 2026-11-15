import { useCallback, useEffect, useRef, useState } from 'react';
import { useDialogueStore } from '../../components/dialogue/dialogue.store';
import type { PausableTimeline } from '../../engine/narrativeControllerContext';
import { useNarrativeController } from '../../engine/useNarrativeController';
import { useStoryStore } from '../../stores/story.store';
import { findP04Line, p04RequiredLineIds } from './dialogue';
import type { P04Layout } from './layout';
import { resetP04Nodes, type P04Nodes } from './nodes';
import { scene04Config } from './scene.config';
import type { P04GuardSnapshot, P04Phase } from './state';
import { canCompleteP04, canEnterP04 } from './state';
import { createP04Driver, type P04Driver } from './timeline';

/**
 * One P-04 run.
 *
 * The hook owns the run token, the accepted-entry latch, the dialogue
 * resolutions and the driver. Views read React state; every guard reads mutable
 * refs, so a stale render can never accept a second hand-over.
 *
 * The driver is attached to the narrative controller so the shared pause/resume
 * and the playback bar control this scene like P-01 and P-03.
 */
export interface P04SceneApi {
  readonly phase: P04Phase;
  /** The hand-over is running; nothing else may be started. */
  readonly busy: boolean;
  /** True when the hand-over would be accepted right now. */
  readonly canEnter: boolean;
  /**
   * Carry Percy into the close-up. P-04 calls this itself when the scripted
   * drag lands; the skip button calls the same guarded path.
   */
  enterInspection: () => void;
}

const ENTRY_INTERACTION = 'p04-inspect-entry';

export function useP04Scene(nodes: P04Nodes, layout: P04Layout): P04SceneApi {
  const controller = useNarrativeController();
  const controllerRef = useRef(controller);
  useEffect(() => {
    controllerRef.current = controller;
  }, [controller]);

  const status = useStoryStore((state) => state.status);
  const paused = useStoryStore((state) => state.isPaused);
  const reducedMotion = useStoryStore((state) => state.settings.reducedMotion);

  const [phase, setPhase] = useState<P04Phase>('entry');
  const [busy, setBusy] = useState(false);
  // Resolutions are also mirrored into state: guards read the ref
  // synchronously, while the chrome reads state so a late resolution cannot
  // leave a control disabled.
  const [resolvedIds, setResolvedIds] = useState<readonly string[]>([]);

  const tokenRef = useRef<symbol | null>(null);
  const driverRef = useRef<P04Driver | null>(null);
  const phaseRef = useRef<P04Phase>('entry');
  const resolvedRef = useRef<Set<string>>(new Set());
  const entryAcceptedRef = useRef(false);
  const fadeFinishedRef = useRef(false);
  const completionAcceptedRef = useRef(false);
  const startRunRef = useRef<() => void>(() => {});
  // A resize must not restart the run, so the layout is read at start time
  // through a ref rather than being a dependency of `startRun`.
  const layoutRef = useRef(layout);
  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  const snapshot = useCallback((): P04GuardSnapshot => {
    const store = useStoryStore.getState();
    const resolved = resolvedRef.current;
    return {
      phase: phaseRef.current,
      status: store.status,
      currentRun: tokenRef.current !== null,
      sceneActive: store.activeSceneId === scene04Config.id,
      paused: store.isPaused,
      introResolved: p04RequiredLineIds.every((id) => resolved.has(id)),
      entryAccepted: entryAcceptedRef.current,
      fadeFinished: fadeFinishedRef.current,
      completionAccepted: completionAcceptedRef.current,
    };
  }, []);

  const noteResolved = useCallback((lineId: string) => {
    if (resolvedRef.current.has(lineId)) {
      return;
    }
    resolvedRef.current.add(lineId);
    setResolvedIds((ids) => (ids.includes(lineId) ? ids : [...ids, lineId]));
  }, []);

  const startRun = useCallback(() => {
    driverRef.current?.dispose();
    driverRef.current = null;
    useDialogueStore.getState().clear();

    const token = Symbol('p04-run');
    tokenRef.current = token;

    resolvedRef.current = new Set();
    setResolvedIds([]);
    entryAcceptedRef.current = false;
    fadeFinishedRef.current = false;
    completionAcceptedRef.current = false;
    phaseRef.current = 'entry';
    setPhase('entry');
    setBusy(false);

    const reduced = useStoryStore.getState().settings.reducedMotion;
    resetP04Nodes(nodes, layoutRef.current, reduced);

    const isCurrent = () => tokenRef.current === token;

    const driver = createP04Driver({
      nodes,
      reducedMotion: reduced,
      onPhase: (next) => {
        if (!isCurrent()) {
          return;
        }
        phaseRef.current = next;
        setPhase(next);
        setBusy(next === 'handoff' || next === 'exit');
        if (next === 'awaiting-inspection' && useStoryStore.getState().status === 'playing') {
          // The walk is over; the scene now waits for the hand-over.
          controllerRef.current.markWaiting();
        }
      },
      onCue: (lineId) => {
        if (!isCurrent()) {
          return;
        }
        const line = findP04Line(lineId);
        if (line) {
          useDialogueStore.getState().cue(line);
        }
      },
      onGate: (gate) => {
        if (!isCurrent()) {
          return;
        }
        useDialogueStore.getState().holdStory(gate.lineId, () => {
          if (!isCurrent()) {
            return;
          }
          noteResolved(gate.lineId);
          driverRef.current?.releaseDialogue(gate.lineId);
        });
      },
      onExitFadeFinished: () => {
        if (!isCurrent()) {
          return;
        }
        fadeFinishedRef.current = true;
        const done = snapshot();
        // Evaluate while still in `exit`: completion is an exit-only guard.
        if (!canCompleteP04(done)) {
          return;
        }
        completionAcceptedRef.current = true;
        phaseRef.current = 'done';
        setPhase('done');
        controllerRef.current.completeScene();
      },
      isDialogueResolved: (lineId) => resolvedRef.current.has(lineId),
    });

    driverRef.current = driver;
    const timeline: PausableTimeline = {
      play: () => driver.play(),
      pause: () => {
        driver.setPresentationPaused(true);
        driver.pause();
      },
      resume: () => {
        driver.setPresentationPaused(false);
        driver.resume();
      },
      restart: () => startRunRef.current(),
      isRunning: () => driver.isRunning(),
    };
    controllerRef.current.attachTimeline(timeline);
    driver.play();
  }, [nodes, snapshot, noteResolved]);

  useEffect(() => {
    startRunRef.current = startRun;
  }, [startRun]);

  // Every line that leaves the screen counts as resolved: the invitation holds
  // the story, so the dialog's release and the line leaving are the same beat.
  useEffect(() => {
    return useDialogueStore.subscribe((next, previous) => {
      const left = previous.active?.line;
      if (left && next.active?.line.id !== left.id) {
        noteResolved(left.id);
      }
    });
  }, [noteResolved]);

  useEffect(() => {
    startRun();
    return () => {
      tokenRef.current = null;
      driverRef.current?.dispose();
      driverRef.current = null;
      controllerRef.current.attachTimeline(null);
      useDialogueStore.getState().clear();
    };
  }, [startRun]);

  useEffect(() => {
    driverRef.current?.setReducedMotion(reducedMotion);
  }, [reducedMotion]);

  const enterInspection = useCallback(() => {
    const current = driverRef.current;
    if (!current || !canEnterP04(snapshot())) {
      return;
    }
    if (!current.beginHandoff()) {
      return;
    }
    entryAcceptedRef.current = true;
    useStoryStore.getState().markInteractionComplete(ENTRY_INTERACTION);
    setBusy(true);
  }, [snapshot]);

  const canEnter =
    status === 'waiting' &&
    phase === 'awaiting-inspection' &&
    !paused &&
    p04RequiredLineIds.every((id) => resolvedIds.includes(id));

  return { phase, busy, canEnter, enterInspection };
}