import { describe, expect, it } from 'vitest';
import { P06_CARD_IDS } from './content';
import {
  P06_INTRO_BEATS,
  P06_SCENE_ID,
  canAcceptP06Continue,
  canCompleteP06,
  canStartReveal,
  createP06State,
  deckView,
  isIntroPhase,
  p06Reducer,
  type P06Context,
  type P06State,
} from './state';

const run = Symbol('run');

function liveContext(overrides: Partial<P06Context> = {}): P06Context {
  return {
    run,
    activeSceneId: P06_SCENE_ID,
    status: 'waiting',
    paused: false,
    visible: true,
    ...overrides,
  };
}

function cardsOpen(): P06State {
  const intro = p06Reducer(createP06State(run, 'intro'), { type: 'INTRO_RESOLVED', run });
  return intro;
}

function reveal(state: P06State, cardId: (typeof P06_CARD_IDS)[number]): P06State {
  const started = p06Reducer(state, { type: 'REVEAL_STARTED', run, cardId });
  return p06Reducer(started, { type: 'REVEAL_FINISHED', run, cardId });
}

function revealed(cardId: (typeof P06_CARD_IDS)[number]): P06State {
  return reveal(cardsOpen(), cardId);
}

describe('P-06 reader input', () => {
  it('offers Continue only once all five cards have been opened', () => {
    let state = cardsOpen();
    expect(canAcceptP06Continue(state, liveContext())).toBe(false);
    for (const cardId of P06_CARD_IDS.slice(0, -1)) {
      state = reveal(state, cardId);
      // Four cards open is still not five.
      expect(canAcceptP06Continue(state, liveContext())).toBe(false);
    }
    state = reveal(state, P06_CARD_IDS[P06_CARD_IDS.length - 1]);
    expect(canAcceptP06Continue(state, liveContext())).toBe(true);
  });

  it('counts a card that is open, not a card that is turning', () => {
    let state = cardsOpen();
    for (const cardId of P06_CARD_IDS) {
      state = reveal(state, cardId);
    }
    const turning = p06Reducer(state, { type: 'REVEAL_STARTED', run, cardId: 'life-clues' });
    // Already opened, so nothing is turning; the button stays available.
    expect(turning.flippingCard).toBeNull();
    expect(canAcceptP06Continue(turning, liveContext())).toBe(true);
  });

  it('refuses Continue before the intro resolves or outside the cards phase', () => {
    const intro = createP06State(run, 'intro');
    expect(canAcceptP06Continue(intro, liveContext())).toBe(false);
    expect(canAcceptP06Continue(createP06State(run, 'journey'), liveContext())).toBe(false);
  });

  it('refuses input when paused, hidden, elsewhere, or from another run', () => {
    const state = cardsOpen();
    expect(canAcceptP06Continue(state, liveContext({ paused: true }))).toBe(false);
    expect(canAcceptP06Continue(state, liveContext({ visible: false }))).toBe(false);
    expect(canAcceptP06Continue(state, liveContext({ activeSceneId: 'p01-jezero' }))).toBe(false);
    expect(canAcceptP06Continue(state, liveContext({ status: 'playing' }))).toBe(false);
    expect(canAcceptP06Continue(state, liveContext({ run: Symbol('other') }))).toBe(false);
  });

  it('lets any card be opened first, in any order', () => {
    let state = cardsOpen();
    for (const cardId of ['life-clues', 'different-rock', 'ancient-river'] as const) {
      expect(canStartReveal(state, liveContext(), cardId)).toBe(true);
      state = reveal(state, cardId);
    }
    expect(state.openedCards).toEqual(['life-clues', 'different-rock', 'ancient-river']);
  });

  it('rejects an unknown card id and an already opened card', () => {
    const state = revealed('leopard-spots');
    expect(canStartReveal(state, liveContext(), 'video')).toBe(false);
    expect(canStartReveal(state, liveContext(), 'leopard-spots')).toBe(false);
  });

  it('allows only one flip at a time and ignores a second start', () => {
    const started = p06Reducer(cardsOpen(), { type: 'REVEAL_STARTED', run, cardId: 'different-rock' });
    expect(canStartReveal(started, liveContext(), 'ancient-river')).toBe(false);
    // The second request changes nothing.
    const ignored = p06Reducer(started, { type: 'REVEAL_STARTED', run, cardId: 'ancient-river' });
    expect(ignored).toBe(started);
    expect(ignored.flippingCard).toBe('different-rock');
  });

  it('adds a card once, and never twice', () => {
    const once = revealed('sapphire-canyon');
    const twice = p06Reducer(once, { type: 'REVEAL_FINISHED', run, cardId: 'sapphire-canyon' });
    expect(twice.openedCards).toEqual(['sapphire-canyon']);
    expect(twice.flippingCard).toBeNull();
  });

  it('reports the deck in its fixed order with its opened flags', () => {
    const view = deckView(revealed('ancient-river'));
    expect(view.map((entry) => entry.cardId)).toEqual([...P06_CARD_IDS]);
    expect(view.filter((entry) => entry.opened).map((entry) => entry.cardId)).toEqual([
      'ancient-river',
    ]);
  });

  it('keeps five distinct cards at most', () => {
    let state = cardsOpen();
    for (const cardId of P06_CARD_IDS) {
      state = reveal(state, cardId);
    }
    expect(state.openedCards).toHaveLength(5);
    expect(new Set(state.openedCards).size).toBe(5);
  });
});

describe('P-06 endings', () => {
  function accepted(): P06State {
    let state = cardsOpen();
    for (const cardId of P06_CARD_IDS) {
      state = reveal(state, cardId);
    }
    return p06Reducer(state, { type: 'CONTINUE_ACCEPTED', run });
  }

  it('walks Continue through media release, final narration, fade and completion', () => {
    let state = accepted();
    expect(state.phase).toBe('releasing-media');
    expect(canCompleteP06(state, liveContext())).toBe(false);

    state = p06Reducer(state, { type: 'MEDIA_RELEASED', run });
    expect(state.phase).toBe('final');
    state = p06Reducer(state, { type: 'FINAL_RESOLVED', run });
    // The fade has not finished, so completion is still refused.
    expect(canCompleteP06(state, liveContext())).toBe(false);

    state = p06Reducer(state, { type: 'EXIT_FADE_FINISHED', run });
    expect(canCompleteP06(state, liveContext())).toBe(true);

    state = p06Reducer(state, { type: 'COMPLETED', run });
    expect(state.phase).toBe('done');
  });

  it('settles internal work while paused, but never completes', () => {
    const paused = liveContext({ paused: true });
    let state = accepted();
    state = p06Reducer(state, { type: 'MEDIA_RELEASED', run });
    state = p06Reducer(state, { type: 'FINAL_RESOLVED', run });
    state = p06Reducer(state, { type: 'EXIT_FADE_FINISHED', run });
    expect(state.fadeFinished).toBe(true);
    expect(canCompleteP06(state, paused)).toBe(false);
  });

  it('ignores events from a previous run', () => {
    const state = accepted();
    const other = Symbol('previous');
    expect(p06Reducer(state, { type: 'MEDIA_RELEASED', run: other })).toBe(state);
    expect(p06Reducer(state, { type: 'FINAL_RESOLVED', run: other })).toBe(state);
  });

  it('cannot accept Continue twice', () => {
    const state = accepted();
    expect(p06Reducer(state, { type: 'CONTINUE_ACCEPTED', run })).toBe(state);
    expect(canAcceptP06Continue(state, liveContext())).toBe(false);
  });

  it('starts a fresh run with no memory of the last one', () => {
    let state = revealed('different-rock');
    state = p06Reducer(state, { type: 'CONTINUE_ACCEPTED', run });
    const fresh = createP06State(Symbol('replay'));
    expect(fresh.openedCards).toEqual([]);
    expect(fresh.continueAccepted).toBe(false);
    expect(fresh.phase).toBe('journey');
  });
});

describe('the intro beats', () => {
  it('walks journey, black, valley and intro in that order', () => {
    let state: P06State = createP06State(run);
    const reached = [];
    for (const beat of P06_INTRO_BEATS) {
      state = p06Reducer(state, { type: 'INTRO_BEAT', run, beat });
      reached.push(state.phase);
    }
    expect(reached).toEqual(['journey', 'exit-frame', 'time-skip', 'intro']);
    expect(isIntroPhase(state.phase)).toBe(true);
  });

  it('never rewinds, so a late callback cannot reopen the journey', () => {
    let state: P06State = createP06State(run);
    state = p06Reducer(state, { type: 'INTRO_BEAT', run, beat: 'time-skip' });
    const back = p06Reducer(state, { type: 'INTRO_BEAT', run, beat: 'journey' });
    expect(back).toBe(state);
  });

  it('opens the deck from any intro beat, including with no picture at all', () => {
    for (const beat of P06_INTRO_BEATS) {
      const during = p06Reducer(createP06State(run), { type: 'INTRO_BEAT', run, beat });
      const done = p06Reducer(during, { type: 'INTRO_RESOLVED', run });
      expect(done.phase).toBe('cards');
      expect(done.introResolved).toBe(true);
    }
  });

  it('does not let a beat interrupt the deck or the ending', () => {
    const cards = cardsOpen();
    expect(p06Reducer(cards, { type: 'INTRO_BEAT', run, beat: 'journey' })).toBe(cards);
    const accepted = p06Reducer(cards, { type: 'CONTINUE_ACCEPTED', run });
    expect(p06Reducer(accepted, { type: 'INTRO_BEAT', run, beat: 'intro' })).toBe(accepted);
  });

  it('ignores input from an earlier run', () => {
    const state: P06State = createP06State(run);
    expect(p06Reducer(state, { type: 'INTRO_BEAT', run: Symbol('old'), beat: 'journey' })).toBe(
      state,
    );
  });
});
