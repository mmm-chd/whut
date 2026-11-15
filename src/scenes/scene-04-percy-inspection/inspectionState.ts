/**
 * P-04 inspection progress.
 *
 * Four points, and two of them have an activity behind the card: MOXIE needs
 * its four steps finished, the Earth team needs a confirmed command and a
 * finished response. Opening a card is the whole requirement for the cameras
 * and the microphone, because the media is optional.
 *
 * This is a pure reducer so the completion rule can be proven without a
 * renderer: no counter is stored, `completedPointIds` derives the answer from
 * the state, which makes "4/4" impossible to fake.
 */
export const P04_POINT_IDS = ['cameras', 'microphone', 'moxie', 'earth-team'] as const;

export type InspectionPointId = (typeof P04_POINT_IDS)[number];

export type CommandState = 'unconfirmed' | 'responding' | 'finished';

export interface InspectionState {
  readonly activePoint: InspectionPointId | null;
  readonly opened: Readonly<Record<InspectionPointId, boolean>>;
  /** 0..3, where 3 is the last explanation step before `Finish MOXIE`. */
  readonly moxieStep: 0 | 1 | 2 | 3;
  readonly moxieFinished: boolean;
  readonly messageOpened: boolean;
  readonly commandState: CommandState;
}

export type InspectionEvent =
  | { readonly type: 'OPEN_POINT'; readonly point: InspectionPointId }
  | { readonly type: 'CLOSE_POINT' }
  | { readonly type: 'MOXIE_NEXT' }
  | { readonly type: 'MOXIE_FINISH' }
  | { readonly type: 'OPEN_MESSAGE' }
  | { readonly type: 'CONFIRM_LOOK_LEFT' }
  | { readonly type: 'COMMAND_FINISHED' }
  | { readonly type: 'CANCEL_COMMAND' };

export function createInspectionState(): InspectionState {
  return {
    activePoint: null,
    opened: { cameras: false, microphone: false, moxie: false, 'earth-team': false },
    moxieStep: 0,
    moxieFinished: false,
    messageOpened: false,
    commandState: 'unconfirmed',
  };
}

/**
 * Every event re-checks the active card, so a stray MOXIE step from the team
 * card (or a second Finish) cannot move progress. Revisiting a finished
 * activity never erases it.
 */
export function reduceInspection(
  state: InspectionState,
  event: InspectionEvent,
): InspectionState {
  switch (event.type) {
    case 'OPEN_POINT':
      return {
        ...state,
        activePoint: event.point,
        opened: { ...state.opened, [event.point]: true },
      };

    case 'CLOSE_POINT':
      return {
        ...state,
        activePoint: null,
        // Closing a responding team card cancels the attempt but keeps the
        // message the reader already opened.
        commandState: state.commandState === 'responding' ? 'unconfirmed' : state.commandState,
      };

    case 'MOXIE_NEXT':
      if (state.activePoint !== 'moxie' || state.moxieFinished) {
        return state;
      }
      return {
        ...state,
        moxieStep: Math.min(3, state.moxieStep + 1) as InspectionState['moxieStep'],
      };

    case 'MOXIE_FINISH':
      if (state.activePoint !== 'moxie' || state.moxieStep !== 3) {
        return state;
      }
      return { ...state, moxieFinished: true };

    case 'OPEN_MESSAGE':
      if (state.activePoint !== 'earth-team') {
        return state;
      }
      return { ...state, messageOpened: true };

    case 'CONFIRM_LOOK_LEFT':
      if (state.activePoint !== 'earth-team') {
        return state;
      }
      if (!state.messageOpened || state.commandState !== 'unconfirmed') {
        return state;
      }
      return { ...state, commandState: 'responding' };

    case 'COMMAND_FINISHED':
      if (state.activePoint !== 'earth-team' || state.commandState !== 'responding') {
        return state;
      }
      return { ...state, commandState: 'finished' };

    case 'CANCEL_COMMAND':
      if (state.commandState !== 'responding') {
        return state;
      }
      return { ...state, commandState: 'unconfirmed' };
  }
}

/** The points the reader has actually finished, in a stable order. */
export function completedPointIds(state: InspectionState): readonly InspectionPointId[] {
  return P04_POINT_IDS.filter((id) => {
    switch (id) {
      case 'cameras':
        return state.opened.cameras;
      case 'microphone':
        return state.opened.microphone;
      case 'moxie':
        return state.opened.moxie && state.moxieFinished;
      case 'earth-team':
        return state.opened['earth-team'] && state.commandState === 'finished';
    }
  });
}

/** True once every point is finished; the return control unlocks. */
export function allPointsComplete(state: InspectionState): boolean {
  return completedPointIds(state).length === P04_POINT_IDS.length;
}
