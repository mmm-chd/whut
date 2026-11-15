import type { SceneStatus } from '../../engine/types';

/** Local phases of P-03. They mirror the animation states in the scene spec. */
export type P03Phase =
  | 'landing'
  | 'door'
  | 'exit'
  | 'reveal'
  | 'walk'
  | 'look-around'
  | 'inspect'
  | 'confused'
  | 'rovers'
  | 'mission'
  | 'excited'
  | 'timeline'
  | 'final-quote'
  | 'transition'
  | 'done';

export interface P03GuardSnapshot {
  phase: P03Phase;
  status: SceneStatus;
  paused: boolean;
  currentRun: boolean;
  sceneActive: boolean;
  /** Every line except the last has resolved. */
  precedingDialogueResolved: boolean;
  /** Every line, the last one included, has resolved. */
  allDialogueResolved: boolean;
  percyExited: boolean;
  roversShown: number;
  excitedPlayed: boolean;
  /** The reader slid back to the lake and chose to go on. */
  gameCompleted: boolean;
  continueAccepted: boolean;
  fadeFinished: boolean;
}

/**
 * The input check: may the final Continue be accepted? It runs when the last
 * line is about to resolve, so it needs the lines before it, not that line.
 */
export function canAcceptP03Continue(s: P03GuardSnapshot): boolean {
  return (
    s.currentRun &&
    s.sceneActive &&
    !s.paused &&
    s.status === 'waiting' &&
    s.phase === 'final-quote' &&
    s.gameCompleted &&
    s.precedingDialogueResolved &&
    !s.continueAccepted
  );
}

/**
 * The completion check: may the scene end? It runs after the exit fade and
 * needs every beat, including the accepted Continue and the last line.
 */
export function canCompleteP03(s: P03GuardSnapshot): boolean {
  return (
    s.currentRun &&
    s.sceneActive &&
    !s.paused &&
    s.status === 'waiting' &&
    s.phase === 'transition' &&
    s.allDialogueResolved &&
    s.percyExited &&
    s.roversShown === 4 &&
    s.excitedPlayed &&
    s.gameCompleted &&
    s.continueAccepted &&
    s.fadeFinished
  );
}
