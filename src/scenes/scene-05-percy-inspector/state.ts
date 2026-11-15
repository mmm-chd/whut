import type { SceneStatus } from '../../engine/types';

/**
 * P-05, the close-up inspection.
 *
 * This scene exists so the inspector owns the only WebGL context on the page:
 * P-04 keeps the Mars story and ends by handing Percy over, and nothing here
 * draws a second scene behind the model.
 *
 * The phase is scene-local; the engine only ever sees `idle`, `playing`,
 * `waiting` and `completed`. `loading` is a real phase, not a spinner over a
 * black rectangle: the reader sees the loading card until the first frame of
 * the model (or the 2D fallback) is actually on screen.
 */
export type InspectorScenePhase = 'loading' | 'ready' | 'exiting' | 'done';

export type InspectorSceneEvent =
  | { readonly type: 'MODEL_SETTLED'; readonly renderer: '3d' | '2d-fallback' }
  | { readonly type: 'FIRST_FRAME' }
  | { readonly type: 'EXIT_REQUESTED' }
  | { readonly type: 'EXIT_FINISHED' };

export interface InspectorSceneState {
  readonly phase: InspectorScenePhase;
  /** What settled: a drawn model or the 2D fallback. */
  readonly renderer: '3d' | '2d-fallback' | null;
  /** False while a settled 3D model has not painted a frame yet. */
  readonly painted: boolean;
}

export function createInspectorSceneState(): InspectorSceneState {
  return { phase: 'loading', renderer: null, painted: false };
}

export function reduceInspectorScene(
  state: InspectorSceneState,
  event: InspectorSceneEvent,
): InspectorSceneState {
  switch (event.type) {
    case 'MODEL_SETTLED':
      if (state.phase !== 'loading' || state.renderer !== null) {
        return state;
      }
      // The fallback is a picture; the 3D view waits for its first frame.
      return event.renderer === '2d-fallback'
        ? { ...state, phase: 'ready', renderer: '2d-fallback', painted: false }
        : { ...state, renderer: '3d' };

    case 'FIRST_FRAME':
      if (state.renderer !== '3d' || state.phase !== 'loading') {
        return state;
      }
      return { ...state, phase: 'ready', painted: true };

    case 'EXIT_REQUESTED':
      if (state.phase !== 'ready') {
        return state;
      }
      return { ...state, phase: 'exiting' };

    case 'EXIT_FINISHED':
      if (state.phase !== 'exiting') {
        return state;
      }
      return { ...state, phase: 'done' };
  }
}

/** The picture is usable: markers and cards may be interactive. */
export function inspectorInteractive(state: InspectorSceneState): boolean {
  return state.phase === 'ready' || state.phase === 'exiting';
}

/**
 * Whether a press on `target` may start turning the model.
 *
 * A press that lands on a control must not: the screen takes pointer capture,
 * and a captured pointer re-targets the `click` to the screen, so the chip's
 * own press would be swallowed and no part could ever be opened.
 */
export function startsTurn(target: EventTarget | null): boolean {
  if (!target || typeof (target as Element).closest !== 'function') {
    return true;
  }
  return (target as Element).closest('button, a[href], input, select, textarea, [role="button"]') === null;
}

/** One exit control, disabled until every part is read. */
export function canExitInspection(input: {
  readonly status: SceneStatus;
  readonly sceneActive: boolean;
  readonly paused: boolean;
  readonly state: InspectorSceneState;
  readonly allPointsComplete: boolean;
}): boolean {
  return (
    input.sceneActive &&
    !input.paused &&
    input.status === 'waiting' &&
    input.state.phase === 'ready' &&
    input.allPointsComplete
  );
}

/** Completion happens in `exiting`, after the fade, and never twice. */
export function canCompleteInspection(input: {
  readonly status: SceneStatus;
  readonly sceneActive: boolean;
  readonly paused: boolean;
  readonly state: InspectorSceneState;
  readonly allPointsComplete: boolean;
  readonly fadeFinished: boolean;
}): boolean {
  return (
    canExitInspection(input) === false &&
    input.sceneActive &&
    !input.paused &&
    input.status === 'waiting' &&
    input.state.phase === 'exiting' &&
    input.allPointsComplete &&
    input.fadeFinished
  );
}
