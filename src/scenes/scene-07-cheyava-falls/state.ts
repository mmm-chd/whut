import { P06_CARD_IDS, isP06CardId, type P06CardId } from './content';

/**
 * P-06's presentation state.
 *
 * One machine owns the whole chapter: the journey, the black time skip, the
 * intro narration, the card deck and the ending. It is scene-local on purpose —
 * the engine only ever sees `waiting` for the card screen, so nothing here can
 * accidentally complete the scene.
 *
 * Two kinds of input are kept apart. Reader input (revealing a card, Continue)
 * must arrive through `canStartReveal` / `canAcceptP06Continue`, which check the
 * live run, the scene, the global status, pause and visibility. Internal
 * settling (a flip finishing, media released, a fade ending) may land while the
 * page is paused, because it finishes work already under way; it still cannot
 * start narration or completion.
 */
export const P06_SCENE_ID = 'scene-07-cheyava-falls';

export type P06Phase =
  | 'journey'
  | 'exit-frame'
  | 'time-skip'
  | 'intro'
  | 'cards'
  | 'releasing-media'
  | 'final'
  | 'exit'
  | 'done';

export interface P06State {
  readonly run: symbol;
  readonly phase: P06Phase;
  readonly openedCards: readonly P06CardId[];
  readonly flippingCard: P06CardId | null;
  readonly introResolved: boolean;
  readonly continueAccepted: boolean;
  readonly mediaReleased: boolean;
  readonly finalResolved: boolean;
  readonly fadeFinished: boolean;
}

/** What the outside world looks like right now. */
export interface P06Context {
  readonly run: symbol;
  readonly activeSceneId: string | null;
  readonly status: 'idle' | 'playing' | 'waiting' | 'completed';
  readonly paused: boolean;
  readonly visible: boolean;
}

/** The three global interactions this chapter finishes. */
export const P06_INTERACTION_IDS = [
  'p06-continue-accepted',
  'p06-final-narration-read',
  'p06-exit-fade-finished',
] as const;

export type P06InteractionId = (typeof P06_INTERACTION_IDS)[number];

/** The intro beat the picture has reached, in the order they happen. */
export const P06_INTRO_BEATS = ['journey', 'exit-frame', 'time-skip', 'intro'] as const;

export type P06IntroBeat = (typeof P06_INTRO_BEATS)[number];

export type P06Event =
  | { readonly type: 'INTRO_BEAT'; readonly run: symbol; readonly beat: P06IntroBeat }
  | { readonly type: 'INTRO_RESOLVED'; readonly run: symbol }
  | { readonly type: 'REVEAL_STARTED'; readonly run: symbol; readonly cardId: P06CardId }
  | { readonly type: 'REVEAL_FINISHED'; readonly run: symbol; readonly cardId: P06CardId }
  | { readonly type: 'REVEAL_ABANDONED'; readonly run: symbol; readonly cardId: P06CardId }
  | { readonly type: 'CONTINUE_ACCEPTED'; readonly run: symbol }
  | { readonly type: 'MEDIA_RELEASED'; readonly run: symbol }
  | { readonly type: 'FINAL_RESOLVED'; readonly run: symbol }
  | { readonly type: 'EXIT_FADE_FINISHED'; readonly run: symbol }
  | { readonly type: 'COMPLETED'; readonly run: symbol };

export function createP06State(run: symbol, phase: P06Phase = 'journey'): P06State {
  return {
    run,
    phase,
    openedCards: [],
    flippingCard: null,
    introResolved: false,
    continueAccepted: false,
    mediaReleased: false,
    finalResolved: false,
    fadeFinished: false,
  };
}

export function isIntroPhase(phase: P06Phase): phase is P06IntroBeat {
  return (P06_INTRO_BEATS as readonly string[]).includes(phase);
}

/** Reader input is only legal on a live, visible, unpaused run in `cards`. */
function hasLiveInput(state: P06State, context: P06Context): boolean {
  return (
    state.run === context.run &&
    context.activeSceneId === P06_SCENE_ID &&
    context.status === 'waiting' &&
    !context.paused &&
    context.visible
  );
}

export function canStartReveal(
  state: P06State,
  context: P06Context,
  cardId: unknown,
): boolean {
  return (
    hasLiveInput(state, context) &&
    state.phase === 'cards' &&
    state.introResolved &&
    state.flippingCard === null &&
    isP06CardId(cardId) &&
    !state.openedCards.includes(cardId)
  );
}

/** Every card has been turned over at least once. */
export function allCardsOpened(state: P06State): boolean {
  return P06_CARD_IDS.every((cardId) => state.openedCards.includes(cardId));
}

/**
 * Continue is offered only once all five cards have been opened. This is a
 * reader decision, not a scientific one: the cards stay reading, and none of
 * them is scored.
 */
export function canAcceptP06Continue(state: P06State, context: P06Context): boolean {
  return (
    hasLiveInput(state, context) &&
    state.phase === 'cards' &&
    state.introResolved &&
    state.flippingCard === null &&
    allCardsOpened(state) &&
    !state.continueAccepted
  );
}

export function canCompleteP06(state: P06State, context: P06Context): boolean {
  return (
    hasLiveInput(state, context) &&
    state.phase === 'exit' &&
    state.introResolved &&
    state.continueAccepted &&
    state.mediaReleased &&
    state.finalResolved &&
    state.fadeFinished
  );
}

/**
 * Applies one event. Everything that would need live reader input is checked
 * here again, so a stale callback cannot slip past a guard that was true when it
 * was scheduled.
 */
export function p06Reducer(state: P06State, event: P06Event): P06State {
  if (event.run !== state.run) {
    return state;
  }
  switch (event.type) {
    case 'INTRO_BEAT': {
      if (state.introResolved || state.phase === 'done') {
        return state;
      }
      const at = P06_INTRO_BEATS.indexOf(state.phase as P06IntroBeat);
      const next = P06_INTRO_BEATS.indexOf(event.beat);
      // Beats only move forward, so a late callback cannot rewind the chapter.
      return next <= at ? state : { ...state, phase: event.beat };
    }
    case 'INTRO_RESOLVED':
      // Any intro beat may resolve the intro: with no WebGL there are no beats
      // at all, and the deck still has to open.
      if (state.introResolved || !isIntroPhase(state.phase)) {
        return state;
      }
      return { ...state, introResolved: true, phase: 'cards' };
    case 'REVEAL_STARTED':
      if (
        state.phase !== 'cards' ||
        !isP06CardId(event.cardId) ||
        state.flippingCard !== null ||
        state.openedCards.includes(event.cardId)
      ) {
        return state;
      }
      return { ...state, flippingCard: event.cardId };
    case 'REVEAL_FINISHED':
      if (state.flippingCard !== event.cardId) {
        return state;
      }
      return {
        ...state,
        flippingCard: null,
        openedCards: state.openedCards.includes(event.cardId)
          ? state.openedCards
          : [...state.openedCards, event.cardId],
      };
    case 'REVEAL_ABANDONED':
      return state.flippingCard === event.cardId ? { ...state, flippingCard: null } : state;
    case 'CONTINUE_ACCEPTED':
      if (state.phase !== 'cards' || state.continueAccepted) {
        return state;
      }
      return { ...state, continueAccepted: true, phase: 'releasing-media' };
    case 'MEDIA_RELEASED':
      if (state.phase !== 'releasing-media' || state.mediaReleased) {
        return state;
      }
      return { ...state, mediaReleased: true, phase: 'final' };
    case 'FINAL_RESOLVED':
      if (state.phase !== 'final' || state.finalResolved) {
        return state;
      }
      return { ...state, finalResolved: true, phase: 'exit' };
    case 'EXIT_FADE_FINISHED':
      if (state.phase !== 'exit' || state.fadeFinished) {
        return state;
      }
      return { ...state, fadeFinished: true };
    case 'COMPLETED':
      return state.phase === 'exit' ? { ...state, phase: 'done' } : state;
    default:
      return state;
  }
}

/** Card IDs the deck shows, in the fixed reading order. */
export function isOpened(state: P06State, cardId: P06CardId): boolean {
  return state.openedCards.includes(cardId);
}

/** Every card, in order, with the one bit the view needs. */
export function deckView(
  state: P06State,
): readonly { readonly cardId: P06CardId; readonly opened: boolean }[] {
  return P06_CARD_IDS.map((cardId) => ({ cardId, opened: state.openedCards.includes(cardId) }));
}
