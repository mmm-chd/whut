import { useCallback, useEffect, useMemo, useReducer, useState, type CSSProperties } from 'react';
import { useNarrativeController } from '../../engine/useNarrativeController';
import { useStoryStore } from '../../stores/story.store';
import { WebGLStage } from '../../three/WebGLStage';
import { hasWebGL2 } from '../scene-04-percy-inspection/inspector/useInspectorRenderer';
import { InfoCardStack } from './components/InfoCardStack';
import { P06_COPY, type P06Card } from './content';
import {
  P06_SCENE_ID,
  canAcceptP06Continue,
  canCompleteP06,
  canStartReveal,
  createP06State,
  isIntroPhase,
  p06Reducer,
  type P06Context,
  type P06IntroBeat,
} from './state';
import { useP06Intro } from './useP06Intro';
import { P06World } from './World';
import './P06.css';

/** How long the closing line is left on screen before the fade starts. */
export const P06_FINAL_HOLD_MS = 2600;
/** The fade to black that ends the chapter. */
export const P06_EXIT_FADE_MS = 700;

/**
 * P-06 — Cheyava Falls.
 *
 * The chapter opens on the Mars journey, leaves the picture entirely, blacks out
 * for THREE YEARS LATER, and comes back on the ancient-river valley. Only then
 * does the deck of five cards appear. The intro is a picture: which card is open
 * is the reader's, and nothing here starts the story playing again.
 */
export function Scene07CheyavaFalls() {
  const controller = useNarrativeController();
  const status = useStoryStore((store) => store.status);
  const paused = useStoryStore((store) => store.isPaused);
  const activeSceneId = useStoryStore((store) => store.activeSceneId);
  const reducedMotion = useStoryStore((store) => store.settings.reducedMotion);

  // One token per mount: a callback from an earlier run cannot match it.
  const [run] = useState(() => Symbol('p06'));
  const [state, dispatch] = useReducer(p06Reducer, run, (token) => createP06State(token));

  const onBeat = useCallback(
    (beat: P06IntroBeat) => {
      dispatch({ type: 'INTRO_BEAT', run, beat });
    },
    [run],
  );
  const onIntroDone = useCallback(() => {
    dispatch({ type: 'INTRO_RESOLVED', run });
  }, [run]);
  const { nodes, timeSkipVisible } = useP06Intro(onBeat, onIntroDone);
  const webgl = useMemo(() => hasWebGL2(), []);

  // Read fresh from the store at the moment of the press instead of carrying a
  // snapshot that could be a render behind.
  const visible =
    typeof document === 'undefined' || document.visibilityState !== 'hidden';
  const readContext = useCallback((): P06Context => {
    const store = useStoryStore.getState();
    return {
      run,
      activeSceneId: store.activeSceneId,
      status: store.status,
      paused: store.isPaused,
      visible: typeof document === 'undefined' || document.visibilityState !== 'hidden',
    };
  }, [run]);

  const markWaiting = controller.markWaiting;
  const completeScene = controller.completeScene;

  // The card screen holds the engine at `waiting`: it is not a narrative
  // sequence, so nothing here may keep the story `playing`. The intro travels,
  // so the engine stays `playing` until the deck is on screen.
  useEffect(() => {
    if (state.phase === 'cards') {
      markWaiting();
    }
  }, [markWaiting, state.phase]);

  // Without WebGL there is no journey to watch. The beats are the picture, and
  // with no picture the deck opens at once rather than waiting for one.
  useEffect(() => {
    if (!webgl && isIntroPhase(state.phase)) {
      dispatch({ type: 'INTRO_RESOLVED', run });
    }
  }, [run, state.phase, webgl]);

  const reveal = useCallback(
    (card: P06Card) => {
      if (!canStartReveal(state, readContext(), card.id)) {
        return;
      }
      dispatch({ type: 'REVEAL_STARTED', run, cardId: card.id });
    },
    [readContext, run, state],
  );

  const flipSettled = useCallback(
    (card: P06Card) => {
      dispatch({ type: 'REVEAL_FINISHED', run, cardId: card.id });
    },
    [run],
  );

  const continueStory = useCallback(() => {
    if (!canAcceptP06Continue(state, readContext())) {
      return;
    }
    useStoryStore.getState().markInteractionComplete('p06-continue-accepted');
    dispatch({ type: 'CONTINUE_ACCEPTED', run });
  }, [readContext, run, state]);

  // Media release settles at once today: there is no player to destroy until
  // the optional video task lands. The step exists so the ending has one path.
  useEffect(() => {
    if (state.phase !== 'releasing-media') {
      return;
    }
    const frame = requestAnimationFrame(() => {
      dispatch({ type: 'MEDIA_RELEASED', run });
    });
    return () => cancelAnimationFrame(frame);
  }, [run, state.phase]);

  // The closing line is read for a fixed, readable hold. Text-only, so it can
  // never wait for an `ended` event that will not fire.
  useEffect(() => {
    if (state.phase !== 'final') {
      return;
    }
    const timer = window.setTimeout(() => {
      useStoryStore.getState().markInteractionComplete('p06-final-narration-read');
      dispatch({ type: 'FINAL_RESOLVED', run });
    }, P06_FINAL_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [run, state.phase]);

  useEffect(() => {
    if (state.phase !== 'exit') {
      return;
    }
    const timer = window.setTimeout(() => {
      useStoryStore.getState().markInteractionComplete('p06-exit-fade-finished');
      dispatch({ type: 'EXIT_FADE_FINISHED', run });
    }, P06_EXIT_FADE_MS);
    return () => window.clearTimeout(timer);
  }, [run, state.phase]);

  const context = { run, activeSceneId, status, paused, visible };
  useEffect(() => {
    if (state.phase !== 'exit' || !canCompleteP06(state, context)) {
      return;
    }
    dispatch({ type: 'COMPLETED', run });
    completeScene();
  }, [activeSceneId, completeScene, paused, run, state, status, visible]);

  const inputLive =
    status === 'waiting' && !paused && activeSceneId === P06_SCENE_ID && context.visible;
  const cursorStyle = {
    '--cursor-active': 'pointer',
  } as CSSProperties;

  // The deck stays mounted through the closing line so it can fade out; the
  // player inside it is torn down by `leaving` the moment Continue is accepted.
  const showDeck =
    state.phase === 'cards' || state.phase === 'final' || state.phase === 'exit';
  const leaving = state.phase !== 'cards';

  return (
    <div
      className="p06-scene"
      data-scene={P06_SCENE_ID}
      data-phase={state.phase}
      data-motion={state.phase === 'journey' ? 'journey' : undefined}
      style={cursorStyle}
    >
      {webgl ? (
        <div className="p06-stage" data-p06-stage>
          <WebGLStage
            label="Percy the rover rolls across Mars, and three years later a valley of rocks stands where he stops."
            background="#4d2a23"
          >
            <P06World nodes={nodes} />
          </WebGLStage>
        </div>
      ) : null}

      {timeSkipVisible ? (
        <div className="p06-time-skip" data-time-skip role="status">
          <p>Three years later...</p>
        </div>
      ) : null}

      {showDeck ? <div className="p06-scrim" data-scrim data-leaving={leaving ? 'true' : 'false'} /> : null}
      {showDeck ? (
        <div className="p06-deck" data-deck>
          <p className="p06-invite">{P06_COPY.invite}</p>
          <InfoCardStack
            state={state}
            inputLive={inputLive}
            onReveal={reveal}
            onFlipSettled={flipSettled}
            onContinue={continueStory}
            reducedMotion={reducedMotion}
            leaving={leaving}
          />
        </div>
      ) : null}
      {state.phase === 'final' || state.phase === 'exit' ? (
        <div className="p06-closing" data-closing role="status">
          <p>
            Cheyava Falls holds intriguing clues. Scientists need more evidence to understand
            what they mean. The Sapphire Canyon core is waiting for closer study in laboratories
            on Earth.
          </p>
        </div>
      ) : null}
      {state.phase === 'exit' ? <div className="p06-fade" data-exit-fade /> : null}
    </div>
  );
}
