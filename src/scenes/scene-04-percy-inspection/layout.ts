import { fitScale } from '../../three/designSpace';
import { GROUND_LINE } from '../scene-03-arrival-jezero/layout';

/**
 * P-04 geometry.
 *
 * The host is split into three regions that never overlap: the monitor (the
 * only clipped viewport), the side card column, and the controls band. The
 * card column is reserved even when no card is open, so opening one cannot
 * resize the monitor or re-fit the model under the reader's pointer.
 *
 * Sizes are host CSS pixels. `unit` converts design units (the 1920 x 1080
 * storybook frame) into host pixels, so Percy keeps his proportions instead of
 * filling a small screen.
 */
export const P04_LAYOUT = {
  /** Below this host width the monitor stacks above the card. */
  wideMinWidth: 960,
  gapWide: 24,
  gapNarrow: 16,
  pad: 24,
  padNarrow: 16,
  /** Room above the monitor for the heading and the progress line. */
  topInset: 88,
  /** Same, on a narrow host where the playback controls sit above the heading. */
  topInsetNarrow: 128,
  /** Room below for the controls band and the playback bar. */
  bottomInset: 104,
  cardMin: 280,
  cardMax: 340,
  monitorMinHeight: 220,
  monitorMaxHeight: 460,
  /** Share of the host height the stacked monitor may take. */
  monitorHeightShare: 0.42,
  /** Smallest card the stacked layout needs before it gives up and goes side by side. */
  stackedCardMin: 120,
  /** Smallest host that still fits three regions without clipping. */
  minWidth: 240,
  minHeight: 320,
  /**
   * Strip under the monitor for the words that speak from the bottom band.
   * It is only reserved when the host has slack, so the picture never shrinks
   * to make room for a sentence.
   */
  speechBand: 84,
  /** Breathing room above and below the speech strip. */
  speechGap: 6,
} as const;

/** Where the returning rover settles for P-05, in design units. */
export const P04_RETURN_ROCK_X = 920;

export interface Rect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface P04Layout {
  /** False for a zero, negative or non-finite host; the scene then suspends. */
  readonly valid: boolean;
  /** Host pixels per design unit. */
  readonly unit: number;
  /** Host y of the wheel contact line. */
  readonly groundY: number;
  readonly width: number;
  readonly height: number;
  readonly monitor: Rect;
  readonly card: Rect;
  /** Where bottom-band copy may sit without covering the monitor; null when
   * there is no room and the copy falls back to the host's bottom edge. */
  readonly speech: Rect | null;
  readonly controls: Rect;
  /** Design-unit x of the rock Percy returns to. */
  readonly returnRockX: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const emptyRect: Rect = { left: 0, top: 0, width: 0, height: 0 };

const invalidLayout = (width: number, height: number): P04Layout => ({
  valid: false,
  unit: 1,
  groundY: 0,
  width: Number.isFinite(width) ? width : 0,
  height: Number.isFinite(height) ? height : 0,
  monitor: emptyRect,
  card: emptyRect,
  speech: null,
  controls: emptyRect,
  returnRockX: P04_RETURN_ROCK_X,
});

/** The band is a bonus, never a cost: no slack, no band. */
function speechBandHeight(availableHeight: number, needed: number): number {
  const slack = availableHeight - needed - 12;
  return Math.max(0, Math.min(P04_LAYOUT.speechBand, Math.floor(slack)));
}

function speechRect(
  width: number,
  pad: number,
  topInset: number,
  regionHeight: number,
  speechHeight: number,
): Rect | null {
  const inner = speechHeight - P04_LAYOUT.speechGap * 2;
  if (inner <= 0) {
    return null;
  }
  return {
    left: pad,
    top: topInset + regionHeight + P04_LAYOUT.speechGap,
    width,
    height: inner,
  };
}

export function layoutP04(width: number, height: number): P04Layout {
  const usableWidth = Math.floor(width);
  const usableHeight = Math.floor(height);
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    usableWidth < P04_LAYOUT.minWidth ||
    usableHeight < P04_LAYOUT.minHeight
  ) {
    return invalidLayout(width, height);
  }

  // A broken fit scale must not silently become 1 (that would blow the art up).
  const unit = fitScale(usableWidth, usableHeight);
  const groundY = GROUND_LINE * usableHeight;
  const pad = usableWidth >= P04_LAYOUT.wideMinWidth ? P04_LAYOUT.pad : P04_LAYOUT.padNarrow;
  const gap = usableWidth >= P04_LAYOUT.wideMinWidth ? P04_LAYOUT.gapWide : P04_LAYOUT.gapNarrow;
  const contentWidth = usableWidth - pad * 2;
  const stackedHost = usableWidth < P04_LAYOUT.wideMinWidth;
  const topInset = stackedHost ? P04_LAYOUT.topInsetNarrow : P04_LAYOUT.topInset;
  const availableHeight = usableHeight - topInset - P04_LAYOUT.bottomInset;
  const controls: Rect = {
    left: pad,
    top: usableHeight - P04_LAYOUT.bottomInset + 8,
    width: contentWidth,
    height: P04_LAYOUT.bottomInset - 16,
  };

  // Stacking needs room for the monitor, the gap and a readable card. A short
  // host (a landscape phone) falls back to two columns instead of overlapping.
  const stacked =
    stackedHost &&
    availableHeight >= P04_LAYOUT.monitorMinHeight + gap + P04_LAYOUT.stackedCardMin;

  if (!stacked) {
    const cardWidth = clamp(
      contentWidth * 0.24,
      Math.min(P04_LAYOUT.cardMin, contentWidth * 0.42),
      P04_LAYOUT.cardMax,
    );
    const monitorWidth = contentWidth - gap - cardWidth;
    const speechHeight = speechBandHeight(availableHeight, availableHeight * 0.7);
    const regionHeight = Math.max(80, availableHeight - speechHeight);
    return {
      valid: true,
      unit,
      groundY,
      width: usableWidth,
      height: usableHeight,
      monitor: { left: pad, top: topInset, width: monitorWidth, height: regionHeight },
      card: {
        left: pad + monitorWidth + gap,
        top: topInset,
        width: cardWidth,
        height: regionHeight,
      },
      speech: speechRect(contentWidth, pad, topInset, regionHeight, speechHeight),
      controls,
      returnRockX: P04_RETURN_ROCK_X,
    };
  }

  // The card keeps its minimum: the monitor gives up height before the card
  // is pushed into the controls band.
  const roomForCard = gap + P04_LAYOUT.stackedCardMin;
  const speechHeight = speechBandHeight(availableHeight, P04_LAYOUT.monitorMinHeight + roomForCard);
  const monitorHeight = Math.min(
    clamp(
      usableHeight * P04_LAYOUT.monitorHeightShare,
      P04_LAYOUT.monitorMinHeight,
      P04_LAYOUT.monitorMaxHeight,
    ),
    availableHeight - roomForCard - speechHeight,
  );
  const cardTop = topInset + monitorHeight + gap;
  const cardHeight = Math.max(
    P04_LAYOUT.stackedCardMin,
    controls.top - gap - cardTop,
  );
  return {
    valid: true,
    unit,
    groundY,
    width: usableWidth,
    height: usableHeight,
    monitor: { left: pad, top: topInset, width: contentWidth, height: monitorHeight },
    card: { left: pad, top: cardTop, width: contentWidth, height: cardHeight },
    speech: speechRect(contentWidth, pad, topInset, monitorHeight, speechHeight),
    controls,
    returnRockX: P04_RETURN_ROCK_X,
  };
}

/** Inset drop rectangle of the monitor, i.e. inside its decorative frame. */
export function monitorContentRect(monitor: Rect, frame = 6): Rect {
  return {
    left: monitor.left + frame,
    top: monitor.top + frame,
    width: Math.max(0, monitor.width - frame * 2),
    height: Math.max(0, monitor.height - frame * 2),
  };
}

/** True when a host point (CSS px) is inside the monitor's content rectangle. */
export function isInsideMonitor(monitor: Rect, x: number, y: number, frame = 6): boolean {
  const rect = monitorContentRect(monitor, frame);
  return (
    x >= rect.left && x <= rect.left + rect.width && y >= rect.top && y <= rect.top + rect.height
  );
}
