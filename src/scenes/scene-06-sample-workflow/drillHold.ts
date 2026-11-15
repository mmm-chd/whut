/**
 * Press-and-hold drilling measured in active time.
 *
 * Progress is the sum of time the hold was really running, not clicks and not
 * wall time. A release, pause, hidden tab or lost capture stops the clock and
 * drops its anchor, so the time spent away adds nothing; a new press resumes
 * the same attempt's total. All functions are pure.
 */
export type DrillSource = 'pointer' | 'keyboard' | 'assist';

export interface DrillHold {
  readonly requiredMs: number;
  readonly activeMs: number;
  readonly holding: boolean;
  /** Timestamp of the last tick, or null when no clock is running. */
  readonly anchor: number | null;
  readonly source: DrillSource | null;
  readonly done: boolean;
}

/** A frame longer than this is a stall, not drilling. */
export const MAX_DRILL_DELTA_MS = 100;

export function createDrillHold(requiredMs: number): DrillHold {
  return {
    requiredMs: Number.isFinite(requiredMs) && requiredMs > 0 ? requiredMs : Number.POSITIVE_INFINITY,
    activeMs: 0,
    holding: false,
    anchor: null,
    source: null,
    done: false,
  };
}

function validTime(now: number): boolean {
  return Number.isFinite(now) && now >= 0;
}

/** Start (or resume) a hold. A repeat while already holding changes nothing. */
export function beginDrillHold(hold: DrillHold, now: number, source: DrillSource): DrillHold {
  if (hold.done || hold.holding || !validTime(now)) {
    return hold;
  }
  return { ...hold, holding: true, anchor: now, source };
}

/** Add the time since the last tick, clamped; finishes at the required total. */
export function advanceDrillHold(hold: DrillHold, now: number): DrillHold {
  if (!hold.holding || hold.done || hold.anchor === null || !validTime(now)) {
    return hold;
  }
  const delta = Math.min(Math.max(now - hold.anchor, 0), MAX_DRILL_DELTA_MS);
  const activeMs = Math.min(hold.activeMs + delta, hold.requiredMs);
  const done = activeMs >= hold.requiredMs;
  return { ...hold, activeMs, anchor: done ? null : now, holding: !done, done, source: done ? null : hold.source };
}

/** Stop the clock without losing the total. */
export function cancelDrillHold(hold: DrillHold): DrillHold {
  if (!hold.holding) {
    return hold;
  }
  return { ...hold, holding: false, anchor: null, source: null };
}

export function drillProgress(hold: DrillHold): number {
  return Number.isFinite(hold.requiredMs) ? Math.min(hold.activeMs / hold.requiredMs, 1) : 0;
}
