/**
 * Homepage local presentation phase (own machine, like P-02's state.ts; the
 * engine's idle/playing/waiting/completed does not apply before the story).
 */
export type HomePhase = 'idle' | 'ignition' | 'liftoff' | 'exit' | 'done';

export interface HomeGuardSnapshot {
  phase: HomePhase;
  launched: boolean;
}

/** The single required action (Play) is valid only from the idle state. */
export function canStartLaunch(snapshot: HomeGuardSnapshot): boolean {
  return snapshot.phase === 'idle' && !snapshot.launched;
}
