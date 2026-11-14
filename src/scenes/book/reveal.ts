/**
 * Book Reveal timing (concept 6.4): the book and rocket arrive, the cover
 * swings open, then the journal is ready. Kept as data so the reveal can be
 * tuned and asserted without rendering.
 */

export type RevealPhase = 'arriving' | 'opening' | 'ready';

export const REVEAL_TIMING = {
  /** Rocket leaves and the book settles. */
  openAt: 1600,
  /** Cover finished opening; HUD and navigation fade in. */
  readyAt: 2600,
} as const;

export function nextRevealPhase(phase: RevealPhase): RevealPhase | null {
  switch (phase) {
    case 'arriving':
      return 'opening';
    case 'opening':
      return 'ready';
    case 'ready':
      return null;
  }
}

/** Delay before the next phase, in milliseconds. */
export function revealDelay(phase: RevealPhase): number {
  if (phase === 'arriving') {
    return REVEAL_TIMING.openAt;
  }
  if (phase === 'opening') {
    return REVEAL_TIMING.readyAt - REVEAL_TIMING.openAt;
  }
  return 0;
}
