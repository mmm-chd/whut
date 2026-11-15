import type { SceneStatus } from '../../engine/types';

/**
 * P-04 phases, renderer modes and the two acceptance guards.
 *
 * The phases stay local: the engine only ever sees `idle`, `playing`,
 * `waiting` and `completed`. `waiting` starts at the invitation and lasts
 * through the hand-over, so carrying Percy into the close-up never flips the
 * story back to `playing`.
 *
 * P-04 ends where the close-up begins. The inspection itself (turning Percy,
 * the four parts, the exit) is `scene-05-percy-inspector`; this scene only has
 * to hand him over, fade out and complete.
 */
export type P04Phase =
  | 'entry'
  | 'distance'
  | 'dimensions'
  | 'wheels'
  | 'invitation'
  | 'awaiting-inspection'
  | 'handoff'
  | 'exit'
  | 'done';

/**
 * How a monitor is drawing Percy right now. P-04 no longer owns a monitor, but
 * the inspector module and scene-05 share this vocabulary, so it lives with the
 * other inspector types.
 */
export type InspectorRenderer = 'loading' | '3d' | '2d-fallback';

export interface P04GuardSnapshot {
  readonly phase: P04Phase;
  readonly status: SceneStatus;
  readonly currentRun: boolean;
  readonly sceneActive: boolean;
  readonly paused: boolean;
  /** Every line before the invitation has been read. */
  readonly introResolved: boolean;
  readonly entryAccepted: boolean;
  readonly fadeFinished: boolean;
  readonly completionAccepted: boolean;
}

/**
 * The hand-over may start once, after the invitation is read.
 *
 * It starts by itself: P-04 carries Percy in rather than waiting for a drag, so
 * the reader can also skip ahead with the button, which runs this same guard.
 */
export function canEnterP04(s: P04GuardSnapshot): boolean {
  return (
    s.currentRun &&
    s.sceneActive &&
    !s.paused &&
    s.status === 'waiting' &&
    s.phase === 'awaiting-inspection' &&
    s.introResolved &&
    !s.entryAccepted
  );
}

/** Completion is evaluated while still in `exit`, never after `done`. */
export function canCompleteP04(s: P04GuardSnapshot): boolean {
  return (
    s.currentRun &&
    s.sceneActive &&
    !s.paused &&
    s.status === 'waiting' &&
    s.phase === 'exit' &&
    s.entryAccepted &&
    s.fadeFinished &&
    !s.completionAccepted
  );
}

/**
 * Scene interaction IDs, latched once each by the scene dispatcher.
 *
 * The four part interactions belong to scene-05; only the hand-over is P-04's.
 */
export const P04_INTERACTION_IDS = ['p04-inspect-entry'] as const;

export type P04InteractionId = (typeof P04_INTERACTION_IDS)[number];