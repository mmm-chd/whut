import type { SceneStatus } from '../../engine/types';

/**
 * P-02 local presentation phase. These values stay out of the shared
 * SceneStatus machine: the engine only knows idle/playing/waiting/completed,
 * while the scene owns the beats inside its run.
 */
export type P02Phase =
  | 'flashback'
  | 'establishing'
  | 'window'
  | 'percy'
  | 'ginny'
  | 'invitation'
  | 'awaiting-launch'
  | 'countdown'
  | 'ascent'
  | 'exit'
  | 'done';

export interface P02GuardSnapshot {
  phase: P02Phase;
  status: SceneStatus;
  paused: boolean;
  currentRun: boolean;
  sceneActive: boolean;
  dialogueResolved: boolean;
  launchAccepted: boolean;
  countdownFinished: boolean;
  rocketOffscreen: boolean;
}

/** The single required action is valid only at the guarded launch gate. */
export function canAcceptP02Launch(s: P02GuardSnapshot): boolean {
  return (
    s.currentRun &&
    s.sceneActive &&
    !s.paused &&
    s.status === 'waiting' &&
    s.phase === 'awaiting-launch' &&
    s.dialogueResolved &&
    !s.launchAccepted
  );
}

/** Completion needs every P-02 predicate, not only a finished timeline. */
export function canCompleteP02(s: P02GuardSnapshot): boolean {
  return (
    s.currentRun &&
    s.sceneActive &&
    !s.paused &&
    s.status === 'waiting' &&
    s.phase === 'exit' &&
    s.dialogueResolved &&
    s.launchAccepted &&
    s.countdownFinished &&
    s.rocketOffscreen
  );
}
