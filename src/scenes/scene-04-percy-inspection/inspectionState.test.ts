import { describe, expect, it } from 'vitest';
import {
  P04_POINT_IDS,
  allPointsComplete,
  completedPointIds,
  createInspectionState,
  reduceInspection,
  type InspectionState,
} from './inspectionState';

/**
 * The four educational points each have one honest completion rule. Opening a
 * card is enough for cameras and microphone (the media is optional); MOXIE and
 * the Earth team need their own activity endpoint.
 */

const open = (state: InspectionState, point: (typeof P04_POINT_IDS)[number]) =>
  reduceInspection(state, { type: 'OPEN_POINT', point });

describe('completion rule', () => {
  it('requires the two activities after all four cards are opened', () => {
    let state = createInspectionState();
    for (const point of P04_POINT_IDS) {
      state = open(state, point);
    }

    expect(completedPointIds(state)).toEqual(['cameras', 'microphone']);

    // The MOXIE card is not even active here, and step 0 cannot finish.
    state = reduceInspection(state, { type: 'MOXIE_FINISH' });
    expect(completedPointIds(state)).toHaveLength(2);
    expect(allPointsComplete(state)).toBe(false);
  });

  it('counts cameras and microphone as soon as the card opens', () => {
    const state = open(createInspectionState(), 'microphone');
    expect(completedPointIds(state)).toEqual(['microphone']);
  });
});

describe('MOXIE activity', () => {
  it('cannot finish before step 3', () => {
    let state = open(createInspectionState(), 'moxie');
    state = reduceInspection(state, { type: 'MOXIE_FINISH' });
    expect(state.moxieFinished).toBe(false);

    state = reduceInspection(state, { type: 'MOXIE_NEXT' });
    state = reduceInspection(state, { type: 'MOXIE_NEXT' });
    // "Finish MOXIE" is not offered at step 2, and the reducer agrees.
    state = reduceInspection(state, { type: 'MOXIE_FINISH' });
    expect(state.moxieFinished).toBe(false);
    expect(completedPointIds(state)).toEqual([]);
  });

  it('finishes only at step 3', () => {
    let state = open(createInspectionState(), 'moxie');
    for (let step = 0; step < 3; step += 1) {
      state = reduceInspection(state, { type: 'MOXIE_NEXT' });
    }
    expect(state.moxieStep).toBe(3);

    state = reduceInspection(state, { type: 'MOXIE_FINISH' });
    expect(state.moxieFinished).toBe(true);
    expect(completedPointIds(state)).toEqual(['moxie']);
  });

  it('clamps the step counter at the last step', () => {
    let state = open(createInspectionState(), 'moxie');
    for (let step = 0; step < 10; step += 1) {
      state = reduceInspection(state, { type: 'MOXIE_NEXT' });
    }
    expect(state.moxieStep).toBe(3);
  });

  it('ignores steps from another card', () => {
    const state = open(createInspectionState(), 'cameras');
    expect(reduceInspection(state, { type: 'MOXIE_NEXT' })).toBe(state);
    expect(reduceInspection(state, { type: 'MOXIE_FINISH' })).toBe(state);
  });

  it('keeps the finished state when the card is reopened', () => {
    let state = open(createInspectionState(), 'moxie');
    for (let step = 0; step < 3; step += 1) {
      state = reduceInspection(state, { type: 'MOXIE_NEXT' });
    }
    state = reduceInspection(state, { type: 'MOXIE_FINISH' });
    state = reduceInspection(state, { type: 'CLOSE_POINT' });
    state = open(state, 'moxie');

    expect(state.moxieFinished).toBe(true);
    expect(state.moxieStep).toBe(3);
    expect(completedPointIds(state)).toEqual(['moxie']);
  });
});

describe('Earth team activity', () => {
  const teamCard = () => open(createInspectionState(), 'earth-team');

  it('cannot confirm before the message is opened', () => {
    const state = reduceInspection(teamCard(), { type: 'CONFIRM_LOOK_LEFT' });
    expect(state.commandState).toBe('unconfirmed');
  });

  it('needs a response before the point counts', () => {
    let state = teamCard();
    state = reduceInspection(state, { type: 'OPEN_MESSAGE' });
    state = reduceInspection(state, { type: 'CONFIRM_LOOK_LEFT' });
    expect(state.commandState).toBe('responding');
    expect(completedPointIds(state)).toEqual([]);

    state = reduceInspection(state, { type: 'COMMAND_FINISHED' });
    expect(state.commandState).toBe('finished');
    expect(completedPointIds(state)).toEqual(['earth-team']);
  });

  it('ignores a repeat confirmation while responding', () => {
    let state = teamCard();
    state = reduceInspection(state, { type: 'OPEN_MESSAGE' });
    state = reduceInspection(state, { type: 'CONFIRM_LOOK_LEFT' });
    const responding = reduceInspection(state, { type: 'CONFIRM_LOOK_LEFT' });
    expect(responding).toBe(state);
  });

  it('cancels a response on card close and keeps the opened message', () => {
    let state = teamCard();
    state = reduceInspection(state, { type: 'OPEN_MESSAGE' });
    state = reduceInspection(state, { type: 'CONFIRM_LOOK_LEFT' });

    state = reduceInspection(state, { type: 'CLOSE_POINT' });

    expect(state.commandState).toBe('unconfirmed');
    expect(state.messageOpened).toBe(true);
    expect(completedPointIds(state)).toEqual([]);

    // A late response callback from the cancelled attempt is ignored.
    state = reduceInspection(state, { type: 'COMMAND_FINISHED' });
    expect(state.commandState).toBe('unconfirmed');
    expect(completedPointIds(state)).toEqual([]);
  });

  it('only accepts the message on its own card', () => {
    const state = open(createInspectionState(), 'cameras');
    expect(reduceInspection(state, { type: 'OPEN_MESSAGE' })).toBe(state);
  });
});

describe('closing and reopening', () => {
  it('clears the active point but keeps every finished point', () => {
    let state = createInspectionState();
    state = open(state, 'cameras');
    state = open(state, 'microphone');
    state = reduceInspection(state, { type: 'CLOSE_POINT' });

    expect(state.activePoint).toBeNull();
    expect(completedPointIds(state)).toEqual(['cameras', 'microphone']);
  });

  it('reaches 4/4 only through the real endpoints', () => {
    let state = createInspectionState();
    state = open(state, 'cameras');
    state = open(state, 'microphone');

    state = open(state, 'moxie');
    for (let step = 0; step < 3; step += 1) {
      state = reduceInspection(state, { type: 'MOXIE_NEXT' });
    }
    state = reduceInspection(state, { type: 'MOXIE_FINISH' });

    state = open(state, 'earth-team');
    state = reduceInspection(state, { type: 'OPEN_MESSAGE' });
    state = reduceInspection(state, { type: 'CONFIRM_LOOK_LEFT' });
    state = reduceInspection(state, { type: 'COMMAND_FINISHED' });

    expect(completedPointIds(state)).toEqual([...P04_POINT_IDS]);
    expect(allPointsComplete(state)).toBe(true);
  });
});
