import { useCallback, useEffect, useRef, useState } from 'react';
import { useAudioManager } from '../../audio/useAudioManager';
import { useDialogueStore } from '../../components/dialogue/dialogue.store';
import { useNarrativeController } from '../../engine/useNarrativeController';
import { useStoryStore } from '../../stores/story.store';
import {
  P02_DESIGN_HEIGHT,
  P02_DESIGN_WIDTH,
  isP02RocketOffscreen,
  type P02Bounds,
} from './camera';
import { getP02NodeBounds, resetP02Nodes, type P02Nodes } from './nodes';
import { getP02TimelineDialogue, p02DialogueLines, p02StoryHoldingLineIds } from './dialogue';
import { scene02Config } from './scene.config';
import {
  canAcceptP02Launch,
  canCompleteP02,
  type P02GuardSnapshot,
  type P02Phase,
} from './state';
import { createP02Timeline, type P02Timeline } from './timeline';

export interface P02SceneApi {
  phase: P02Phase;
  countdown: 3 | 2 | 1 | 'GO!' | null;
  launch: () => void;
}

const DESIGN_FRAME: P02Bounds = {
  left: 0,
  top: 0,
  right: P02_DESIGN_WIDTH,
  bottom: P02_DESIGN_HEIGHT,
};
/** The rocket must clear the frame top by this many design pixels. */
const OFFSCREEN_MARGIN = 24;

/**
 * The rocket counts as gone when its bounds (rocket plus exhaust, from node
 * state and the camera pose) have cleared the top of the design frame. It is
 * pure math, so it does not depend on the host size or on a layout pass.
 */
function measureRocketOffscreen(nodes: P02Nodes): boolean {
  return isP02RocketOffscreen(getP02NodeBounds(nodes), DESIGN_FRAME, OFFSCREEN_MARGIN);
}

/**
 * Owns one P-02 run: token, local flags, timeline attachment, dialogue
 * releases, the guarded Launch action, and teardown. React state is only a
 * view of the run; guards always read the mutable refs at event time.
 */
export function useP02Scene(nodes: P02Nodes): P02SceneApi {
  const controller = useNarrativeController();
  const controllerRef = useRef(controller);
  controllerRef.current = controller;

  const cueAudio = useAudioManager();
  const audioRef = useRef({ cueAudio });
  audioRef.current = { cueAudio };

  const reducedMotion = useStoryStore((state) => state.settings.reducedMotion);

  const [phase, setPhase] = useState<P02Phase>('flashback');
  const [countdown, setCountdown] = useState<3 | 2 | 1 | 'GO!' | null>(null);

  const tokenRef = useRef<symbol | null>(null);
  const driverRef = useRef<P02Timeline | null>(null);
  const phaseRef = useRef<P02Phase>('flashback');
  const launchAcceptedRef = useRef(false);
  const countdownFinishedRef = useRef(false);
  const rocketOffscreenRef = useRef(false);
  const resolvedRef = useRef<Set<string>>(new Set());
  const startRunRef = useRef<() => void>(() => {});

  const startRun = useCallback(() => {
    driverRef.current?.dispose();
    driverRef.current = null;
    useDialogueStore.getState().clear();

    // A fresh run begins from the cue sheet's first frame.
    resetP02Nodes(nodes, useStoryStore.getState().settings.reducedMotion);

    const token = Symbol('p02-run');
    tokenRef.current = token;
    launchAcceptedRef.current = false;
    countdownFinishedRef.current = false;
    rocketOffscreenRef.current = false;
    resolvedRef.current = new Set();
    phaseRef.current = 'flashback';
    setPhase('flashback');
    setCountdown(null);

    const isCurrent = () => tokenRef.current === token;

    const driver = createP02Timeline({
      nodes,
      reducedMotion: useStoryStore.getState().settings.reducedMotion,
      holdLineIds: p02StoryHoldingLineIds,
      onPhase: (next) => {
        if (!isCurrent()) {
          return;
        }
        phaseRef.current = next;
        setPhase(next);
        if (next === 'awaiting-launch') {
          const state = useStoryStore.getState();
          if (state.status === 'playing') {
            controllerRef.current.markWaiting();
          }
        }
      },
      onLabel: (label) => {
        if (!isCurrent()) {
          return;
        }
        const line = getP02TimelineDialogue(label);
        if (line) {
          useDialogueStore.getState().cue(line);
        }
      },
      onGate: (gate) => {
        if (!isCurrent() || gate.kind !== 'dialogue') {
          return;
        }
        useDialogueStore.getState().holdStory(gate.lineId, () => {
          if (!isCurrent()) {
            return;
          }
          resolvedRef.current.add(gate.lineId);
          driverRef.current?.releaseDialogue(gate.lineId);
        });
      },
      onCountdown: (value) => {
        if (!isCurrent()) {
          return;
        }
        setCountdown(value);
        if (value === 'GO!') {
          countdownFinishedRef.current = true;
        }
      },
      isDialogueResolved: (lineId) => resolvedRef.current.has(lineId),
      isRocketOffscreen: () => {
        const value = measureRocketOffscreen(nodes);
        rocketOffscreenRef.current = value;
        return value;
      },
      onComplete: () => {
        if (!isCurrent()) {
          return;
        }
        const state = useStoryStore.getState();
        const snapshot: P02GuardSnapshot = {
          phase: phaseRef.current,
          status: state.status,
          paused: state.isPaused,
          currentRun: true,
          sceneActive: state.activeSceneId === scene02Config.id,
          dialogueResolved: p02DialogueLines.every((line) =>
            resolvedRef.current.has(line.id),
          ),
          launchAccepted: launchAcceptedRef.current,
          countdownFinished: countdownFinishedRef.current,
          rocketOffscreen: rocketOffscreenRef.current,
        };

        if (!canCompleteP02(snapshot)) {
          return;
        }

        phaseRef.current = 'done';
        setPhase('done');
        controllerRef.current.completeScene();
      },
    });

    driverRef.current = driver;
    controllerRef.current.attachTimeline({
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
    });
    driver.play(0);
  }, [nodes]);

  startRunRef.current = startRun;

  useEffect(() => {
    startRun();

    return () => {
      tokenRef.current = null;
      driverRef.current?.dispose();
      driverRef.current = null;
      controllerRef.current.attachTimeline(null);
      useDialogueStore.getState().clear();
      audioRef.current.cueAudio.stop('p02-sfx-liftoff');
      audioRef.current.cueAudio.stop('p02-sfx-countdown');
    };
  }, [startRun]);

  useEffect(() => {
    driverRef.current?.setReducedMotion(reducedMotion);
  }, [reducedMotion]);

  const launch = useCallback(() => {
    const driver = driverRef.current;
    if (!driver) {
      return;
    }

    const state = useStoryStore.getState();
    const snapshot: P02GuardSnapshot = {
      phase: phaseRef.current,
      status: state.status,
      paused: state.isPaused,
      currentRun: tokenRef.current !== null,
      sceneActive: state.activeSceneId === scene02Config.id,
      dialogueResolved: p02DialogueLines.every((line) => resolvedRef.current.has(line.id)),
      launchAccepted: launchAcceptedRef.current,
      countdownFinished: countdownFinishedRef.current,
      rocketOffscreen: rocketOffscreenRef.current,
    };

    if (!canAcceptP02Launch(snapshot)) {
      return;
    }
    if (!driver.launch()) {
      return;
    }

    launchAcceptedRef.current = true;
    phaseRef.current = 'countdown';
    setPhase('countdown');
    state.markInteractionComplete('launch-button');
  }, []);

  return { phase, countdown, launch };
}
