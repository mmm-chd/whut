import type { SceneStatus } from '../../engine/types';
import { P08_BOUNDARY_LINE, P08_FINAL_LINE_ID, linesForSegment, type P08Boundary } from './dialogue';

/**
 * The ending's local state machine.
 *
 * The engine only sees `idle | playing | waiting | completed`. These phases stay
 * in the scene, and the scene stays `waiting` from its first caption to its last.
 * Every event carries the run; a boundary can only be accepted once its own
 * prerequisites hold, and the scene completes only after Percy has really left,
 * the final narration has really been read and the fade has really finished.
 * Clearing the dialogue (a replay, an unmount) is never a resolution.
 */
export type P08RunId = symbol;

export type P08Phase =
  | 'loading'
  | 'samples'
  | 'hope-transition'
  | 'hope'
  | 'message-transition'
  | 'message'
  | 'emotional-pause'
  | 'departing'
  | 'tracks'
  | 'fade'
  | 'done';

export interface P08State {
  readonly runId: P08RunId;
  readonly phase: P08Phase;
  readonly resolvedLineIds: readonly string[];
  readonly acceptedBoundaries: readonly P08Boundary[];
  readonly dingSettled: boolean;
  readonly percyStopped: boolean;
  readonly closeupFinished: boolean;
  readonly reactionPauseFinished: boolean;
  readonly percyExited: boolean;
  readonly tracksSettled: boolean;
  readonly finalNarrationResolved: boolean;
  readonly fadeFinished: boolean;
}

export interface P08Context {
  readonly runId: P08RunId;
  readonly sceneActive: boolean;
  readonly paused: boolean;
  readonly visible: boolean;
  readonly status: SceneStatus;
  /** The caption on screen right now, if any. */
  readonly activeLineId: string | null;
}

export type P08Event = { readonly runId: P08RunId } & (
  | { readonly type: 'READY' | 'HOPE_TRANSITION_FINISHED' }
  | { readonly type: 'LINE_RESOLVED'; readonly lineId: string }
  | { readonly type: 'BOUNDARY_ACCEPTED'; readonly boundary: P08Boundary }
  | { readonly type: 'DING_SETTLED' | 'PERCY_STOPPED' | 'CLOSEUP_FINISHED' }
  | { readonly type: 'REACTION_PAUSE_STARTED' | 'REACTION_PAUSE_FINISHED' }
  | { readonly type: 'PERCY_EXITED' | 'TRACKS_SETTLED' | 'FADE_STARTED' | 'FADE_FINISHED' | 'COMPLETED' }
);

export function createP08State(runId: P08RunId): P08State {
  return {
    runId,
    phase: 'loading',
    resolvedLineIds: [],
    acceptedBoundaries: [],
    dingSettled: false,
    percyStopped: false,
    closeupFinished: false,
    reactionPauseFinished: false,
    percyExited: false,
    tracksSettled: false,
    finalNarrationResolved: false,
    fadeFinished: false,
  };
}

/** The lines that must be resolved before each boundary's own line. */
function priorLineIds(boundary: P08Boundary): readonly string[] {
  switch (boundary) {
    case 'samples':
      return linesForSegment('samples')
        .map((line) => line.id)
        .filter((id) => id !== P08_BOUNDARY_LINE.samples);
    case 'hope':
      return [
        ...linesForSegment('samples').map((line) => line.id),
        ...linesForSegment('hope-travel').map((line) => line.id),
      ];
    case 'message':
      return [
        ...linesForSegment('message-news').map((line) => line.id),
        ...linesForSegment('message-after')
          .map((line) => line.id)
          .filter((id) => id !== P08_BOUNDARY_LINE.message),
      ];
  }
}

function resolvedAll(state: P08State, ids: readonly string[]): boolean {
  return ids.every((id) => state.resolvedLineIds.includes(id));
}

const FINAL_CHUNKS = linesForSegment('final').map((line) => line.id);

export function reduceP08(state: P08State, event: P08Event): P08State {
  if (event.runId !== state.runId) {
    return state;
  }

  switch (event.type) {
    case 'READY':
      return state.phase === 'loading' ? { ...state, phase: 'samples' } : state;

    case 'LINE_RESOLVED': {
      if (state.phase === 'loading' || state.phase === 'done') {
        return state;
      }
      const { lineId } = event;
      if (state.resolvedLineIds.includes(lineId)) {
        return state;
      }
      const next = { ...state, resolvedLineIds: [...state.resolvedLineIds, lineId] };
      // The final caption only counts once every earlier chunk was read.
      if (lineId === P08_FINAL_LINE_ID) {
        const earlier = FINAL_CHUNKS.filter((id) => id !== P08_FINAL_LINE_ID);
        return resolvedAll(state, earlier) ? { ...next, finalNarrationResolved: true } : state;
      }
      return next;
    }

    case 'BOUNDARY_ACCEPTED': {
      const { boundary } = event;
      if (state.acceptedBoundaries.includes(boundary)) {
        return state;
      }
      const accepted = [...state.acceptedBoundaries, boundary];
      // A boundary is accepted by resolving its own line, so that line is resolved with it.
      const resolved = state.resolvedLineIds.includes(P08_BOUNDARY_LINE[boundary])
        ? state.resolvedLineIds
        : [...state.resolvedLineIds, P08_BOUNDARY_LINE[boundary]];
      const prior = resolvedAll(state, priorLineIds(boundary));

      if (boundary === 'samples' && state.phase === 'samples' && prior) {
        return { ...state, phase: 'hope-transition', acceptedBoundaries: accepted, resolvedLineIds: resolved };
      }
      if (
        boundary === 'hope' &&
        state.phase === 'hope' &&
        state.acceptedBoundaries.includes('samples') &&
        prior &&
        state.dingSettled &&
        state.percyStopped
      ) {
        return { ...state, phase: 'message-transition', acceptedBoundaries: accepted, resolvedLineIds: resolved };
      }
      if (
        boundary === 'message' &&
        state.phase === 'message' &&
        state.acceptedBoundaries.includes('hope') &&
        prior &&
        state.closeupFinished &&
        state.reactionPauseFinished
      ) {
        return { ...state, phase: 'departing', acceptedBoundaries: accepted, resolvedLineIds: resolved };
      }
      return state;
    }

    case 'HOPE_TRANSITION_FINISHED':
      return state.phase === 'hope-transition' ? { ...state, phase: 'hope' } : state;

    case 'DING_SETTLED':
      return state.phase === 'hope' ? { ...state, dingSettled: true } : state;

    case 'PERCY_STOPPED':
      return state.phase === 'hope' ? { ...state, percyStopped: true } : state;

    case 'CLOSEUP_FINISHED':
      return state.phase === 'message-transition' ? { ...state, phase: 'message', closeupFinished: true } : state;

    case 'REACTION_PAUSE_STARTED':
      return state.phase === 'message' &&
        !state.reactionPauseFinished &&
        resolvedAll(state, linesForSegment('message-news').map((line) => line.id))
        ? { ...state, phase: 'emotional-pause' }
        : state;

    case 'REACTION_PAUSE_FINISHED':
      return state.phase === 'emotional-pause'
        ? { ...state, phase: 'message', reactionPauseFinished: true }
        : state;

    case 'PERCY_EXITED':
      return state.phase === 'departing' ? { ...state, phase: 'tracks', percyExited: true } : state;

    case 'TRACKS_SETTLED':
      return state.phase === 'tracks' ? { ...state, tracksSettled: true } : state;

    case 'FADE_STARTED':
      return state.phase === 'tracks' && fadeReady(state) ? { ...state, phase: 'fade' } : state;

    case 'FADE_FINISHED':
      return state.phase === 'fade' ? { ...state, fadeFinished: true } : state;

    case 'COMPLETED':
      return state.phase === 'fade' && state.fadeFinished ? { ...state, phase: 'done' } : state;
  }
}

function fadeReady(s: P08State): boolean {
  return (
    s.acceptedBoundaries.length === 3 &&
    s.dingSettled &&
    s.percyStopped &&
    s.closeupFinished &&
    s.reactionPauseFinished &&
    s.percyExited &&
    s.tracksSettled &&
    s.finalNarrationResolved
  );
}

function live(s: P08State, c: P08Context): boolean {
  return s.runId === c.runId && c.sceneActive && !c.paused && c.visible && c.status === 'waiting';
}

/** The reader may press Continue on a boundary line that is on screen and ready. */
export function canAcceptP08Continue(state: P08State, context: P08Context, boundary: P08Boundary): boolean {
  if (!live(state, context) || state.acceptedBoundaries.includes(boundary)) {
    return false;
  }
  if (context.activeLineId !== P08_BOUNDARY_LINE[boundary]) {
    return false;
  }
  switch (boundary) {
    case 'samples':
      return state.phase === 'samples' && resolvedAll(state, priorLineIds('samples'));
    case 'hope':
      return (
        state.phase === 'hope' &&
        state.dingSettled &&
        state.percyStopped &&
        resolvedAll(state, priorLineIds('hope'))
      );
    case 'message':
      return (
        state.phase === 'message' &&
        state.closeupFinished &&
        state.reactionPauseFinished &&
        resolvedAll(state, priorLineIds('message'))
      );
  }
}

export function canBeginP08Fade(state: P08State, context: P08Context): boolean {
  return live(state, context) && state.phase === 'tracks' && fadeReady(state);
}

/** Checks the fade directly; it must not reuse an input guard with a narrower phase. */
export function canCompleteP08(state: P08State, context: P08Context): boolean {
  return live(state, context) && state.phase === 'fade' && fadeReady(state) && state.fadeFinished;
}

export const P08_INTERACTION_IDS = [
  'p08-samples-continued',
  'p08-return-hope-continued',
  'p08-earth-message-continued',
  'p08-final-narration-read',
  'p08-percy-exited',
  'p08-ending-fade-finished',
] as const;
