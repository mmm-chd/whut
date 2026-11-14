/**
 * Pure navigation helpers for the book (concept sections 7.7 and 8): spread
 * bounds, the turn guard while a leaf is moving, the drag commit rule, and
 * the screen-reader announcements. No DOM, no React.
 */

export type TurnDirection = 1 | -1;

/** Commit threshold for a dragged leaf, as a fraction of one page width. */
export const COMMIT_PROGRESS = 0.35;
/** A quick flick commits even below the position threshold (px/ms). */
export const COMMIT_VELOCITY = 0.5;

export function clampIndex(index: number, count: number): number {
  if (count <= 0) {
    return 0;
  }
  return Math.min(count - 1, Math.max(0, index));
}

export function canTurn(index: number, direction: TurnDirection, count: number): boolean {
  const next = index + direction;
  return next >= 0 && next < count;
}

/** New input is ignored while a leaf is already moving (7.7). */
export function turnAllowed(busy: boolean): boolean {
  return !busy;
}

export function shouldCommitTurn(
  progress: number,
  velocity: number,
  threshold = COMMIT_PROGRESS,
  fastVelocity = COMMIT_VELOCITY,
): boolean {
  return progress >= threshold || Math.abs(velocity) >= fastVelocity;
}

/** "Spread 2 of 2: Ginny, The Mars Helicopter" for aria-live. */
export function spreadAnnouncement(index: number, count: number, title: string): string {
  return `Spread ${index + 1} of ${count}: ${title}`;
}

/** Mobile single-page mode: "Page 3 of 4, right page: Ginny, …". */
export function pageAnnouncement(
  pageIndex: number,
  pageCount: number,
  side: 'left' | 'right',
  title: string,
): string {
  return `Page ${pageIndex + 1} of ${pageCount}, ${side} page: ${title}`;
}
