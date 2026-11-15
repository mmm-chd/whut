import type { Rect } from '../scene-04-percy-inspection/layout';

/**
 * P-05 geometry.
 *
 * The picture owns the screen; the card column is reserved beside it so
 * opening a part never resizes the model under the reader's pointer. On a
 * narrow host the card becomes a bottom sheet instead of squeezing the picture
 * into a strip.
 *
 * Sizes are host CSS pixels and the layout is derived, never stored.
 */
export const P05_LAYOUT = {
  /**
   * At and above this width the card would get its own column beside the picture.
   * The picture now fills the screen on every wide host and the card floats over
   * it, so no host is wide enough for a column.
   */
  sideBySideMinWidth: Number.POSITIVE_INFINITY,
  /** Between these two widths the card floats over the picture (tablet). */
  overlayMinWidth: 720,
  padWide: 14,
  padNarrow: 14,
  /** Room above the picture for the heading and the progress line. */
  topInsetWide: 84,
  topInsetNarrow: 116,
  /** Room below the picture for the exit control and the playback bar. */
  bottomInsetWide: 30,
  bottomInsetNarrow: 92,
  /** A short host cannot afford the tall insets: the strip would be the picture. */
  shortHostHeight: 480,
  topInsetShort: 84,
  bottomInsetShort: 30,
  gap: 20,
  cardMin: 280,
  cardMax: 380,
  /** Share of the width the card may take before it starts eating the picture. */
  cardShare: 0.3,
  /** Height share of the sheet on a narrow host. */
  sheetShare: 0.46,
  minWidth: 240,
  minHeight: 320,
} as const;

/**
 * How the card shares the host with the picture:
 * `side`    a column of its own, beside a narrower picture (desktop),
 * `overlay` floating over the right of a full-width picture (tablet),
 * `sheet`   a drawer under the picture (narrow host).
 */
export type P05Mode = 'side' | 'overlay' | 'sheet';

export interface P05Layout {
  readonly valid: boolean;
  readonly width: number;
  readonly height: number;
  /** The framed picture: the canvas, the chips and their leader lines. */
  readonly picture: Rect;
  /** Where the part card sits; always reserved, empty when nothing is open. */
  readonly card: Rect;
  readonly mode: P05Mode;
  /** True when the card is a bottom sheet rather than a side column. */
  readonly stacked: boolean;
}

const EMPTY: Rect = { left: 0, top: 0, width: 0, height: 0 };

export const EMPTY_P05_LAYOUT: P05Layout = {
  valid: false,
  width: 0,
  height: 0,
  picture: EMPTY,
  card: EMPTY,
  mode: 'side',
  stacked: false,
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/**
 * P-05 geometry for one host.
 *
 * Three modes, one picture. On a desktop the card is a column and the picture
 * gives up width rather than the model giving up size; on a tablet the card
 * floats over the picture's right side, so the viewer keeps its full width; on
 * a narrow host it becomes a bottom sheet.
 *
 * `cardOpen` only matters in `sheet` mode, where the drawer takes its height
 * from the picture's bottom edge. In every mode the picture keeps its full
 * size when a part is opened: opening a card never re-fits the model.
 */
export function layoutP05(
  width: number,
  height: number,
  options: { readonly cardOpen?: boolean } = {},
): P05Layout {
  const usableWidth = Math.floor(width);
  const usableHeight = Math.floor(height);
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    usableWidth < P05_LAYOUT.minWidth ||
    usableHeight < P05_LAYOUT.minHeight
  ) {
    return { ...EMPTY_P05_LAYOUT, width: Number.isFinite(width) ? usableWidth : 0, height: Number.isFinite(height) ? usableHeight : 0 };
  }

  const mode: P05Mode =
    usableWidth >= P05_LAYOUT.sideBySideMinWidth
      ? 'side'
      : usableWidth >= P05_LAYOUT.overlayMinWidth
        ? 'overlay'
        : 'sheet';
  const stacked = mode === 'sheet';
  const shortHost = usableHeight < P05_LAYOUT.shortHostHeight;
  const pad = stacked ? P05_LAYOUT.padNarrow : P05_LAYOUT.padWide;
  const topInset = shortHost
    ? P05_LAYOUT.topInsetShort
    : stacked
      ? P05_LAYOUT.topInsetNarrow
      : P05_LAYOUT.topInsetWide;
  const bottomInset = shortHost
    ? P05_LAYOUT.bottomInsetShort
    : stacked
      ? P05_LAYOUT.bottomInsetNarrow
      : P05_LAYOUT.bottomInsetWide;
  const contentWidth = usableWidth - pad * 2;
  const contentHeight = Math.max(80, usableHeight - topInset - bottomInset);

  if (mode === 'sheet') {
    // The sheet floats over the bottom of the picture instead of squeezing it.
    // Squeezing left a strip too short to separate four chips, and two chips on
    // one spot made the wrong part open.
    const sheetHeight = options.cardOpen
      ? Math.max(
          120,
          Math.min(contentHeight - 120, Math.floor(contentHeight * P05_LAYOUT.sheetShare)),
        )
      : 0;
    return {
      valid: true,
      width: usableWidth,
      height: usableHeight,
      mode,
      stacked: true,
      picture: { left: pad, top: topInset, width: contentWidth, height: contentHeight },
      card: {
        left: pad,
        top: topInset + contentHeight - sheetHeight,
        width: contentWidth,
        height: sheetHeight,
      },
    };
  }

  const cardWidth = clamp(
    Math.floor(contentWidth * P05_LAYOUT.cardShare),
    P05_LAYOUT.cardMin,
    P05_LAYOUT.cardMax,
  );

  if (mode === 'overlay') {
    // A tablet keeps the whole picture; the card sits over its right edge with
    // a margin, so the rover is never fully covered.
    const overlayWidth = clamp(
      Math.floor(contentWidth * 0.34),
      260,
      340,
    );
    return {
      valid: true,
      width: usableWidth,
      height: usableHeight,
      mode,
      stacked: false,
      picture: { left: pad, top: topInset, width: contentWidth, height: contentHeight },
      card: {
        left: pad + contentWidth - overlayWidth,
        top: topInset + 12,
        width: overlayWidth,
        height: Math.max(120, contentHeight - 24),
      },
    };
  }

  const pictureWidth = contentWidth - cardWidth - P05_LAYOUT.gap;
  return {
    valid: true,
    width: usableWidth,
    height: usableHeight,
    mode,
    stacked: false,
    picture: { left: pad, top: topInset, width: pictureWidth, height: contentHeight },
    card: {
      left: pad + pictureWidth + P05_LAYOUT.gap,
      top: topInset,
      width: cardWidth,
      height: contentHeight,
    },
  };
}
