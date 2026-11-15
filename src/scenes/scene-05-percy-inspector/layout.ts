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
  /** Below this host width the card docks under the picture. */
  sideBySideMinWidth: 900,
  padWide: 24,
  padNarrow: 14,
  /** Room above the picture for the heading and the progress line. */
  topInsetWide: 84,
  topInsetNarrow: 116,
  /** Room below the picture for the exit control and the playback bar. */
  bottomInsetWide: 76,
  bottomInsetNarrow: 92,
  /** A short host cannot afford the tall insets: the strip would be the picture. */
  shortHostHeight: 480,
  topInsetShort: 84,
  bottomInsetShort: 56,
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

export interface P05Layout {
  readonly valid: boolean;
  readonly width: number;
  readonly height: number;
  /** The framed picture: the canvas, the chips and their leader lines. */
  readonly picture: Rect;
  /** Where the part card sits; always reserved, empty when nothing is open. */
  readonly card: Rect;
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
  stacked: false,
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/**
 * P-05 geometry for one host.
 *
 * `cardOpen` only matters on a narrow host: there the card is a bottom sheet,
 * and an empty sheet would squeeze the picture into a strip. Closed means the
 * picture keeps the whole height; open means the sheet takes its share, which
 * is the one place where opening a card does resize the picture.
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

  const stacked = usableWidth < P05_LAYOUT.sideBySideMinWidth;
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

  if (stacked) {
    const sheetHeight = options.cardOpen
      ? Math.max(
          120,
          Math.min(contentHeight - 120, Math.floor(contentHeight * P05_LAYOUT.sheetShare)),
        )
      : 0;
    const pictureHeight = Math.max(80, contentHeight - sheetHeight - P05_LAYOUT.gap);
    return {
      valid: true,
      width: usableWidth,
      height: usableHeight,
      stacked: true,
      picture: { left: pad, top: topInset, width: contentWidth, height: pictureHeight },
      card: {
        left: pad,
        top: topInset + pictureHeight + P05_LAYOUT.gap,
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
  const pictureWidth = contentWidth - cardWidth - P05_LAYOUT.gap;
  return {
    valid: true,
    width: usableWidth,
    height: usableHeight,
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
