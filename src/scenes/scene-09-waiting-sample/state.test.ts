import { describe, expect, it } from 'vitest';
import { P08_ALL_LINE_IDS, P08_BOUNDARY_LINE, linesForSegment, type P08Boundary } from './dialogue';
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

const RUN = Symbol('test-p08');
type Body<T> = T extends unknown ? Omit<T, 'runId'> : never;

function send(state: P08State, ...events: Body<P08Event>[]): P08State {
  return events.reduce((s, e) => reduceP08(s, { runId: RUN, ...e } as P08Event), state);
}

const ctx = (_state: P08State, extra: Partial<P08Context> = {}): P08Context => ({
  runId: RUN,
  sceneActive: true,
  paused: false,
  visible: true,
  status: 'waiting',
  activeLineId: null,
  ...extra,
});

const resolve = (ids: readonly string[]) => ids.map((lineId) => ({ type: 'LINE_RESOLVED' as const, lineId }));
const ids = (segment: Parameters<typeof linesForSegment>[0]) => linesForSegment(segment).map((line) => line.id);
const inner = (segment: Parameters<typeof linesForSegment>[0], boundary: P08Boundary) =>
  ids(segment).filter((id) => id !== P08_BOUNDARY_LINE[boundary]);

function atHope(): P08State {
  return send(
    createP08State(RUN),
    { type: 'READY' },
    ...resolve(inner('samples', 'samples')),
    { type: 'BOUNDARY_ACCEPTED', boundary: 'samples' },
    { type: 'HOPE_TRANSITION_FINISHED' },
    ...resolve(ids('hope-travel')),
  );
}

function atMessage(): P08State {
  return send(
    atHope(),
    { type: 'DING_SETTLED' },
    { type: 'PERCY_STOPPED' },
    { type: 'BOUNDARY_ACCEPTED', boundary: 'hope' },
    { type: 'CLOSEUP_FINISHED' },
    ...resolve(ids('message-news')),
    { type: 'REACTION_PAUSE_STARTED' },
    { type: 'REACTION_PAUSE_FINISHED' },
    ...resolve(inner('message-after', 'message')),
  );
}

function atTracks(): P08State {
  return send(
    atMessage(),
    { type: 'BOUNDARY_ACCEPTED', boundary: 'message' },
    ...resolve(ids('departure')),
    { type: 'PERCY_EXITED' },
    { type: 'TRACKS_SETTLED' },
    ...resolve(ids('final')),
  );
}

describe('boundaries', () => {
  it('accepts the first Continue only after the earlier phase-one lines are read', () => {
    const early = send(createP08State(RUN), { type: 'READY' }, { type: 'BOUNDARY_ACCEPTED', boundary: 'samples' });
    expect(early.phase).toBe('samples');
    expect(early.acceptedBoundaries).toEqual([]);
    const ok = send(early, ...resolve(inner('samples', 'samples')), { type: 'BOUNDARY_ACCEPTED', boundary: 'samples' });
    expect(ok.phase).toBe('hope-transition');
  });

  it('does not need the boundary line to be resolved before its own Continue', () => {
    const state = send(createP08State(RUN), { type: 'READY' }, ...resolve(inner('samples', 'samples')));
    expect(state.resolvedLineIds).not.toContain(P08_BOUNDARY_LINE.samples);
    expect(canAcceptP08Continue(state, ctx(state, { activeLineId: P08_BOUNDARY_LINE.samples }), 'samples')).toBe(true);
  });

  it('holds the hope boundary until Ding has settled and Percy has stopped', () => {
    const hope = atHope();
    expect(send(hope, { type: 'BOUNDARY_ACCEPTED', boundary: 'hope' }).phase).toBe('hope');
    const dinged = send(hope, { type: 'DING_SETTLED' });
    expect(send(dinged, { type: 'BOUNDARY_ACCEPTED', boundary: 'hope' }).phase).toBe('hope');
    const stopped = send(dinged, { type: 'PERCY_STOPPED' });
    expect(send(stopped, { type: 'BOUNDARY_ACCEPTED', boundary: 'hope' }).phase).toBe('message-transition');
  });

  it('needs both the stop and the Ding, in either order', () => {
    const stoppedFirst = send(atHope(), { type: 'PERCY_STOPPED' });
    expect(send(stoppedFirst, { type: 'BOUNDARY_ACCEPTED', boundary: 'hope' }).phase).toBe('hope');
    expect(send(stoppedFirst, { type: 'DING_SETTLED' }).dingSettled).toBe(true);
    expect(send(stoppedFirst, { type: 'DING_SETTLED' }, { type: 'BOUNDARY_ACCEPTED', boundary: 'hope' }).phase).toBe(
      'message-transition',
    );
  });

  it('holds the message boundary until the close-up, all news lines and the full pause', () => {
    const message = atMessage();
    expect(message.reactionPauseFinished).toBe(true);
    const missingPause = send(
      atHope(),
      { type: 'DING_SETTLED' },
      { type: 'PERCY_STOPPED' },
      { type: 'BOUNDARY_ACCEPTED', boundary: 'hope' },
      { type: 'CLOSEUP_FINISHED' },
      ...resolve(ids('message-news')),
      ...resolve(inner('message-after', 'message')),
      { type: 'BOUNDARY_ACCEPTED', boundary: 'message' },
    );
    expect(missingPause.phase).toBe('message');
    expect(send(message, { type: 'BOUNDARY_ACCEPTED', boundary: 'message' }).phase).toBe('departing');
  });

  it('starts the emotional pause only after the news has been read', () => {
    const early = send(
      atHope(),
      { type: 'DING_SETTLED' },
      { type: 'PERCY_STOPPED' },
      { type: 'BOUNDARY_ACCEPTED', boundary: 'hope' },
      { type: 'CLOSEUP_FINISHED' },
      { type: 'REACTION_PAUSE_STARTED' },
    );
    expect(early.phase).toBe('message');
  });

  it('latches each boundary once and admits only the three', () => {
    const state = send(atMessage(), { type: 'BOUNDARY_ACCEPTED', boundary: 'message' });
    expect(send(state, { type: 'BOUNDARY_ACCEPTED', boundary: 'message' })).toBe(state);
    expect(state.acceptedBoundaries).toEqual(['samples', 'hope', 'message']);
  });
});

describe('guards', () => {
  it('Continue needs a live waiting scene showing that boundary line', () => {
    const state = send(createP08State(RUN), { type: 'READY' }, ...resolve(inner('samples', 'samples')));
    const base = ctx(state, { activeLineId: P08_BOUNDARY_LINE.samples });
    expect(canAcceptP08Continue(state, base, 'samples')).toBe(true);
    expect(canAcceptP08Continue(state, { ...base, paused: true }, 'samples')).toBe(false);
    expect(canAcceptP08Continue(state, { ...base, visible: false }, 'samples')).toBe(false);
    expect(canAcceptP08Continue(state, { ...base, status: 'playing' }, 'samples')).toBe(false);
    expect(canAcceptP08Continue(state, { ...base, runId: Symbol('other') }, 'samples')).toBe(false);
    expect(canAcceptP08Continue(state, { ...base, activeLineId: 'p08-samples-count' }, 'samples')).toBe(false);
    expect(canAcceptP08Continue(state, base, 'hope')).toBe(false);
  });

  it('an event from another run changes nothing', () => {
    const state = createP08State(RUN);
    expect(reduceP08(state, { runId: Symbol('other'), type: 'READY' })).toBe(state);
  });
});

describe('exit, fade and completion', () => {
  it('does not begin the fade until the final narration and tracks are done', () => {
    const without = send(
      atMessage(),
      { type: 'BOUNDARY_ACCEPTED', boundary: 'message' },
      { type: 'PERCY_EXITED' },
      { type: 'TRACKS_SETTLED' },
    );
    expect(canBeginP08Fade(without, ctx(without))).toBe(false);
    expect(send(without, { type: 'FADE_STARTED' }).phase).toBe('tracks');
    const ready = atTracks();
    expect(canBeginP08Fade(ready, ctx(ready))).toBe(true);
  });

  it('the final caption does not count while an earlier final chunk is unread', () => {
    const state = send(
      atMessage(),
      { type: 'BOUNDARY_ACCEPTED', boundary: 'message' },
      { type: 'LINE_RESOLVED', lineId: 'p08-final-narration' },
    );
    expect(state.finalNarrationResolved).toBe(false);
    const both = send(state, { type: 'PERCY_EXITED' }, ...resolve(['p08-final-narration-1']), {
      type: 'LINE_RESOLVED',
      lineId: 'p08-final-narration',
    });
    // The early final line was ignored; reading both chunks in order then counts.
    expect(both.finalNarrationResolved).toBe(true);
  });

  it('does not complete with a missing fade, and completes once with it', () => {
    let state = atTracks();
    state = send(state, { type: 'FADE_STARTED' });
    expect(canCompleteP08(state, ctx(state))).toBe(false);
    state = send(state, { type: 'FADE_FINISHED' });
    expect(canCompleteP08(state, ctx(state))).toBe(true);
    expect(canCompleteP08(state, ctx(state, { runId: Symbol('x') }))).toBe(false);
    expect(canCompleteP08(state, ctx(state, { paused: true }))).toBe(false);
    state = send(state, { type: 'COMPLETED' });
    expect(state.phase).toBe('done');
    expect(canCompleteP08(state, ctx(state))).toBe(false);
  });

  it('knows every caption id exactly once', () => {
    expect(new Set(P08_ALL_LINE_IDS).size).toBe(P08_ALL_LINE_IDS.length);
  });
});
