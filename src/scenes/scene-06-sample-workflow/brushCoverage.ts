import type { EligibleShape } from './content';

/**
 * Brush coverage on a fixed 32 x 24 grid.
 *
 * The grid is over the rock's 0..1 square, so its size never depends on the
 * screen. A cell counts only if its centre lies on the rock face, and each cell
 * is cleared at most once, so scrubbing the same spot cannot add progress. All
 * coordinates are normalised; a 4:3 picture is assumed when measuring the brush
 * radius, so the brush is round on screen.
 */
export const GRID_W = 32;
export const GRID_H = 24;
/** Height to width of the picture, to keep the brush circular. */
const ASPECT_V = 0.75;

export interface BrushCoverage {
  readonly eligible: Uint8Array;
  readonly cleared: Uint8Array;
  readonly totalEligible: number;
  clearedEligible: number;
}

export interface Point {
  readonly u: number;
  readonly v: number;
}

export interface Sweep {
  readonly from: Point;
  readonly to: Point;
}

function cellCentre(index: number): Point {
  return { u: ((index % GRID_W) + 0.5) / GRID_W, v: (Math.floor(index / GRID_W) + 0.5) / GRID_H };
}

export function createBrushCoverage(shape: EligibleShape): BrushCoverage {
  const eligible = new Uint8Array(GRID_W * GRID_H);
  let total = 0;
  for (let i = 0; i < eligible.length; i += 1) {
    const { u, v } = cellCentre(i);
    const dx = (u - shape.cx) / shape.rx;
    const dy = (v - shape.cy) / shape.ry;
    if (dx * dx + dy * dy <= 1) {
      eligible[i] = 1;
      total += 1;
    }
  }
  return { eligible, cleared: new Uint8Array(GRID_W * GRID_H), totalEligible: total, clearedEligible: 0 };
}

function distanceToSegment(p: Point, a: Point, b: Point): number {
  const ax = a.u;
  const ay = a.v * ASPECT_V;
  const bx = b.u;
  const by = b.v * ASPECT_V;
  const px = p.u;
  const py = p.v * ASPECT_V;
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function validPoint(point: Point): boolean {
  return Number.isFinite(point.u) && Number.isFinite(point.v);
}

/**
 * Clear every eligible cell the capsule from `from` to `to` touches. `from`
 * may equal `to` (a tap). Returns how many cells were newly cleared. Invalid
 * input clears nothing.
 */
export function applyBrushSweep(
  coverage: BrushCoverage,
  from: Point,
  to: Point,
  radius: number,
): number {
  if (!validPoint(from) || !validPoint(to) || !Number.isFinite(radius) || radius <= 0) {
    return 0;
  }
  // Only the cells inside the capsule's bounding box can be touched.
  const minU = Math.min(from.u, to.u) - radius;
  const maxU = Math.max(from.u, to.u) + radius;
  const minV = Math.min(from.v, to.v) - radius / ASPECT_V;
  const maxV = Math.max(from.v, to.v) + radius / ASPECT_V;
  const x0 = Math.max(0, Math.floor(minU * GRID_W));
  const x1 = Math.min(GRID_W - 1, Math.ceil(maxU * GRID_W));
  const y0 = Math.max(0, Math.floor(minV * GRID_H));
  const y1 = Math.min(GRID_H - 1, Math.ceil(maxV * GRID_H));

  let cleared = 0;
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const index = y * GRID_W + x;
      if (!coverage.eligible[index] || coverage.cleared[index]) {
        continue;
      }
      if (distanceToSegment(cellCentre(index), from, to) <= radius) {
        coverage.cleared[index] = 1;
        cleared += 1;
      }
    }
  }
  coverage.clearedEligible += cleared;
  return cleared;
}

export function coverageRatio(coverage: BrushCoverage): number {
  return coverage.totalEligible === 0 ? 0 : coverage.clearedEligible / coverage.totalEligible;
}

/** Brush radius: about 6% of the rock's smaller dimension, in picture widths. */
export function brushRadiusFor(shape: EligibleShape): number {
  return 0.06 * Math.min(shape.rx, shape.ry) * 2;
}

/**
 * The next deterministic sweep for the accessible `Brush next area` button: a
 * stroke across the first row that still has an uncleared eligible cell, from
 * its leftmost to its rightmost such cell. Null once everything is clean.
 */
export function nextUnclearedSweep(coverage: BrushCoverage): Sweep | null {
  for (let y = 0; y < GRID_H; y += 1) {
    let first = -1;
    let last = -1;
    for (let x = 0; x < GRID_W; x += 1) {
      const index = y * GRID_W + x;
      if (coverage.eligible[index] && !coverage.cleared[index]) {
        if (first < 0) {
          first = x;
        }
        last = x;
      }
    }
    if (first >= 0) {
      const v = (y + 0.5) / GRID_H;
      return {
        from: { u: (first + 0.5) / GRID_W, v },
        to: { u: (last + 0.5) / GRID_W, v },
      };
    }
  }
  return null;
}

/** Clears every remaining eligible cell: used when the threshold is passed. */
export function finishClearing(coverage: BrushCoverage): void {
  for (let i = 0; i < coverage.eligible.length; i += 1) {
    if (coverage.eligible[i] && !coverage.cleared[i]) {
      coverage.cleared[i] = 1;
      coverage.clearedEligible += 1;
    }
  }
}
