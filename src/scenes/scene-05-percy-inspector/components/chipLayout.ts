import type { InspectionPointId } from '../../scene-04-percy-inspection/inspectionState';
import { P04_POINT_IDS } from '../../scene-04-percy-inspection/inspectionState';
import { modelAnchors } from '../../scene-04-percy-inspection/inspector/modelConfig';
import { projectAnchor, type MonitorViewport } from '../../scene-04-percy-inspection/inspector/projection';
import type { InspectorRotation } from '../../scene-04-percy-inspection/inspector/rotation';
import { chipAnchor, chipState, leaderFor, type ChipState, type Point2 } from '../annotations';

/**
 * Where the four chips and their leader lines sit for one view.
 *
 * Kept apart from the component so the geometry can be asserted on its own,
 * without rendering anything.
 */

/**
 * Room a chip needs around its centre, so a label never hangs out of the
 * picture. The widest label in the set is about 190 px at 1280 and about 105 px
 * on a narrow host, where the hint line is hidden; the margin covers both.
 */
export const CHIP_MARGIN_X = 104;
export const CHIP_MARGIN_Y = 30;

/** Keeps a chip centre inside the picture, whatever the standoff asked for. */
export function clampChipAnchor(anchor: Point2, width: number, height: number): Point2 {
  const clamp = (value: number, size: number, margin: number): number => {
    if (!Number.isFinite(value) || !Number.isFinite(size)) {
      return Math.max(margin, size / 2);
    }
    const max = Math.max(margin, size - margin);
    return Math.min(Math.max(value, margin), max);
  };
  return {
    x: clamp(anchor.x, width, CHIP_MARGIN_X),
    y: clamp(anchor.y, height, CHIP_MARGIN_Y),
  };
}

/**
 * A chip's own box, so two of them can be kept apart without measuring the DOM.
 *
 * The numbers are the measured sizes of the shipped labels: with the hint line
 * at 1280 px wide, and without it (the narrow-host rule) below 560 px of
 * picture.
 */
export const CHIP_BOXES: Record<InspectionPointId, { readonly width: number; readonly height: number }> = {
  cameras: { width: 156, height: 54 },
  microphone: { width: 165, height: 54 },
  moxie: { width: 132, height: 54 },
  'earth-team': { width: 186, height: 54 },
};

export const CHIP_BOXES_COMPACT: Record<
  InspectionPointId,
  { readonly width: number; readonly height: number }
> = {
  cameras: { width: 80, height: 44 },
  microphone: { width: 104, height: 44 },
  moxie: { width: 65, height: 44 },
  'earth-team': { width: 123, height: 44 },
};

/** Below this picture width the hint line is hidden, so chips are narrower. */
export const CHIP_COMPACT_BELOW_PX = 560;

/** Space left between two chips that would otherwise touch. */
export const CHIP_GAP_PX = 8;

const overlaps = (a: Point2, aw: number, ah: number, b: Point2, bw: number, bh: number): boolean =>
  Math.abs(a.x - b.x) < (aw + bw) / 2 + CHIP_GAP_PX &&
  Math.abs(a.y - b.y) < (ah + bh) / 2 + CHIP_GAP_PX;

/**
 * Push overlapping chips apart, in the fixed part order.
 *
 * The first chip keeps the spot its ray asked for; a later chip slides down out
 * of the way, or up when there is no room below. Order is never re-sorted, so
 * the DOM order (and the tab order) still matches the reading order.
 */
export function separateChips<T extends { readonly point: InspectionPointId; readonly anchor: Point2 }>(
  chips: readonly T[],
  compact: boolean,
  height: number,
): T[] {
  const boxes = compact ? CHIP_BOXES_COMPACT : CHIP_BOXES;
  const placed: T[] = [];
  for (const chip of chips) {
    const box = boxes[chip.point];
    let anchor = chip.anchor;
    for (let pass = 0; pass < 4; pass += 1) {
      const hit = placed.find((other) => {
        const otherBox = boxes[other.point];
        return overlaps(anchor, box.width, box.height, other.anchor, otherBox.width, otherBox.height);
      });
      if (!hit) {
        break;
      }
      const otherBox = boxes[hit.point];
      const needed = (box.height + otherBox.height) / 2 + CHIP_GAP_PX;
      const low = CHIP_MARGIN_Y;
      const high = Math.max(low, height - CHIP_MARGIN_Y);
      const below = hit.anchor.y + needed;
      const above = hit.anchor.y - needed;
      const target = below <= high ? below : above >= low ? above : high;
      anchor = { x: anchor.x, y: Math.min(Math.max(target, low), high) };
    }
    placed.push({ ...chip, anchor });
  }
  return placed;
}

export interface ChipLayout {
  readonly point: InspectionPointId;
  readonly state: ChipState;
  readonly anchor: Point2;
  readonly part: Point2;
  readonly side: 'left' | 'right';
  readonly leader: { from: Point2; to: Point2; visible: boolean };
}

/** Every chip and line for one view, in the fixed part order. */
export function chipLayout(input: {
  readonly viewport: MonitorViewport;
  readonly rotation: InspectorRotation;
  readonly occluded: readonly InspectionPointId[];
  readonly activePoint: InspectionPointId | null;
  readonly hoveredPoint: InspectionPointId | null;
  readonly completed: readonly InspectionPointId[];
}): readonly ChipLayout[] {
  const anchors = modelAnchors();
  const centre = { x: input.viewport.width / 2, y: input.viewport.height / 2 };
  const chips = P04_POINT_IDS.map((point) => {
    const projection = projectAnchor(anchors[point], input.rotation, input.viewport);
    const part = { x: projection.x, y: projection.y };
    const placed = chipAnchor(part, centre);
    const anchor = clampChipAnchor(placed, input.viewport.width, input.viewport.height);
    return {
      point,
      state: chipState({
        point,
        active: input.activePoint,
        hovered: input.hoveredPoint,
        completed: input.completed,
        occluded: input.occluded,
      }),
      anchor,
      part,
      side: placed.side,
      leader: leaderFor(anchor, part),
    };
  });
  const compact = input.viewport.width < CHIP_COMPACT_BELOW_PX;
  // Separation moves a chip, so its line is drawn again from the final spot.
  return separateChips(chips, compact, input.viewport.height).map((chip) => ({
    ...chip,
    leader: leaderFor(chip.anchor, chip.part),
  }));
}

