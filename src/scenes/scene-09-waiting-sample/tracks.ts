/**
 * Percy's tracks: a fixed row of at most twelve tread-pair stamps along the
 * departure leg. They are allocated once and revealed as he passes each one;
 * nothing is added per frame and no coordinate history is kept.
 */
export const TRACK_COUNT = 12;
export const TRACK_SPACING = 96;
const FIRST_OFFSET = 60;

/** World x of each stamp, from where Percy starts to roll away. Finite and fixed. */
export function trackPositions(startX: number): readonly number[] {
  if (!Number.isFinite(startX)) {
    return [];
  }
  return Array.from({ length: TRACK_COUNT }, (_, index) => startX + FIRST_OFFSET + index * TRACK_SPACING);
}

/** World x of stamp `index` for a row that starts at `originX`, without allocating. */
export function trackX(originX: number, index: number): number {
  return originX + FIRST_OFFSET + index * TRACK_SPACING;
}

/** How many stamps Percy has rolled past: those whose x is behind his rear. */
export function revealedTracks(bodyX: number, positions: readonly number[]): number {
  if (!Number.isFinite(bodyX)) {
    return 0;
  }
  let count = 0;
  for (const x of positions) {
    if (bodyX - 30 >= x) {
      count += 1;
    }
  }
  return count;
}

/** Writes each stamp's opacity into a preallocated array. Returns whether it changed. */
export function updateTrackOpacity(target: Float32Array, revealed: number): boolean {
  let changed = false;
  for (let i = 0; i < target.length; i += 1) {
    const next = Math.fround(i < revealed ? Math.max(0.35, 0.8 - (revealed - 1 - i) * 0.04) : 0);
    if (target[i] !== next) {
      target[i] = next;
      changed = true;
    }
  }
  return changed;
}
