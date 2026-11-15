import { useCallback, useEffect, useRef, useState } from 'react';
import { useDialogueStore } from '../../components/dialogue/dialogue.store';
import { useNarrativeController } from '../../engine/useNarrativeController';
import { useStoryStore } from '../../stores/story.store';
import {
  P03_FINAL_LINE_ID,
  getP03TimelineDialogue,
  p03DialogueLines,
  p03StoryHoldingLineIds,
} from './dialogue';
import { layoutP03 } from './layout';
import { resetP03Nodes, type P03Nodes } from './nodes';
import { scene03Config } from './scene.config';
import {
  canAcceptP03Continue,
  canCompleteP03,
  type P03GuardSnapshot,
  type P03Phase,
} from './state';
import { createP03Timeline, type P03Timeline } from './timeline';

export interface P03SceneApi {
  phase: P03Phase;
  cardsShown: number;
}

const INTERACTION_ID = 'p03-continue';
const ALL_LINE_IDS = p03DialogueLines.map((line) => line.id);

/** Layout for the current host. Poses are fixed when a run starts. */
function currentLayout() {
  return layoutP03(window.innerWidth || 1920, window.innerHeight || 1080);
}

/**
 * Owns one P-03 run: token, flags, timeline attachment, dialogue releases, the
 * guarded final Continue, and teardown. React state is only a view of the
 * run; guards read the mutable refs at event time.
 */
export function useP03Scene(nodes: P03Nodes): P03SceneApi {
  const controller = useNarrativeController();
  const controllerRef = useRef(controller);
  controllerRef.current = controller;



  const reducedMotion = useStoryStore((state) => state.settings.reducedMotion);

  const [phase, setPhase] = useState<P03Phase>('landing');
  const [cardsShown, setCardsShown] = useState(0);

  const tokenRef = useRef<symbol | null>(null);
  const driverRef = useRef<P03Timeline | null>(null);
  const phaseRef = useRef<P03Phase>('landing');
  const resolvedRef = useRef<Set<string>>(new Set());
  const percyExitedRef = useRef(false);
  const cardsRef = useRef(0);
  const excitedRef = useRef(false);
  const continueAcceptedRef = useRef(false);
  const startRunRef = useRef<() => void>(() => {});

  const snapshot = useCallback((): P03GuardSnapshot => {
    const state = useStoryStore.getState();
    const resolved = resolvedRef.current;
    return {
      phase: phaseRef.current,
      status: state.status,
      paused: state.isPaused,
      currentRun: tokenRef.current !== null,
      sceneActive: state.activeSceneId === scene03Config.id,
      precedingDialogueResolved: ALL_LINE_IDS.filter((id) => id !== P03_FINAL_LINE_ID).every(
        (id) => resolved.has(id),
      ),
      allDialogueResolved: ALL_LINE_IDS.every((id) => resolved.has(id)),
      percyExited: percyExitedRef.current,
      roversShown: cardsRef.current,
      excitedPlayed: excitedRef.current,
      continueAccepted: continueAcceptedRef.current,
      fadeFinished: false,
    };
  }, []);

  const startRun = useCallback(() => {
    driverRef.current?.dispose();
    driverRef.current = null;
    useDialogueStore.getState().clear();

    const token = Symbol('p03-run');
    tokenRef.current = token;
    resolvedRef.current = new Set();
    percyExitedRef.current = false;
    cardsRef.current = 0;
    excitedRef.current = false;
    continueAcceptedRef.current = false;
    phaseRef.current = 'landing';
    setPhase('landing');
    setCardsShown(0);

    const layout = currentLayout();
    const reduced = useStoryStore.getState().settings.reducedMotion;
    resetP03Nodes(nodes, layout, reduced);

    const isCurrent = () => tokenRef.current === token;

    const driver = createP03Timeline({
      nodes,
      layout,
      reducedMotion: reduced,
      holdLineIds: p03StoryHoldingLineIds,
      onPhase: (next) => {
        if (!isCurrent()) {
          return;
        }
        phaseRef.current = next;
        setPhase(next);
        if (next === 'final-quote' && useStoryStore.getState().status === 'playing') {
          controllerRef.current.markWaiting();
        }
      },
      onLabel: (label) => {
        if (!isCurrent()) {
          return;
        }
        const line = getP03TimelineDialogue(label);
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
          if (gate.lineId === P03_FINAL_LINE_ID) {
            // The reader's Continue on the last line is the scene's one input.
            // Check it before the line counts as resolved, then latch it.
            if (canAcceptP03Continue(snapshot())) {
              continueAcceptedRef.current = true;
              useStoryStore.getState().markInteractionComplete(INTERACTION_ID);
            }
          }
          resolvedRef.current.add(gate.lineId);
          driverRef.current?.releaseDialogue(gate.lineId);
        });
      },
      onCards: (shown) => {
        if (!isCurrent()) {
          return;
        }
        cardsRef.current = shown;
        setCardsShown(shown);
      },
      onPercyExit: () => {
        if (isCurrent()) {
          percyExitedRef.current = true;
        }
      },
      onExcited: () => {
        if (isCurrent()) {
          excitedRef.current = true;
        }
      },
      isDialogueResolved: (lineId) => resolvedRef.current.has(lineId),
      onComplete: () => {
        if (!isCurrent()) {
          return;
        }
        // Every line the player saw resolves through the store; the auto lines
        // are recorded here too so the completion predicate sees all of them.
        const done = { ...snapshot(), fadeFinished: true };
        if (!canCompleteP03(done)) {
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
  }, [nodes, snapshot]);

  startRunRef.current = startRun;

  // Auto lines resolve without a gate; record every line the dialogue store
  // finishes so "all dialogue resolved" is true when the scene ends.
  useEffect(() => {
    return useDialogueStore.subscribe((state, previous) => {
      const left = previous.active?.line;
      if (left && state.active?.line.id !== left.id) {
        resolvedRef.current.add(left.id);
      }
    });
  }, []);

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

  return { phase, cardsShown };
}
