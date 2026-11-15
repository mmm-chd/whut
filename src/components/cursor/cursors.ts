/**
 * The scene's pointing devices, drawn in the project's own palette.
 *
 * Four states, the same four a desktop gives a drag:
 * `default`  the plain arrow, for the picture itself,
 * `active`   a pointing hand, for anything that opens something,
 * `grab`     an open hand, for anything that can be carried,
 * `grabbing` a closed hand, while something is actually being carried.
 *
 * They are inline SVG rather than images so they stay crisp at any size, and
 * they are exposed as `cursor:` values with an explicit hotspot and a CSS
 * fallback, so a browser that refuses the data URI still shows a cursor.
 */
export type CursorKind = 'default' | 'active' | 'grab' | 'grabbing';

interface CursorArt {
  /** Inner markup of a 24 x 26 box; the wrapper supplies the settings. */
  readonly body: string;
  /** The pixel inside the box that does the pointing. */
  readonly hotspot: readonly [number, number];
}

const OUTLINE = '#f7f1e3';
const INK = '#10201f';

/** Shared paint so every state looks like one family. */
const paint = `fill="${INK}" stroke="${OUTLINE}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"`;

const ARROW = `<path d="M5 2.5 L19.4 10.2 L12.6 12.1 L9.6 18.8 Z" ${paint}/>`;

/** Four fingers and a thumb: the open hand that picks something up. */
const OPEN_HAND = `
  <g ${paint}>
    <rect x="7.4" y="3.2" width="3.2" height="10" rx="1.6"/>
    <rect x="11.1" y="2.2" width="3.2" height="11" rx="1.6"/>
    <rect x="14.8" y="3.6" width="3.2" height="9.6" rx="1.6"/>
    <rect x="18.2" y="6.2" width="3" height="7" rx="1.5"/>
    <path d="M7.4 12.6 L5.2 10.4 A1.7 1.7 0 0 0 2.4 12.8 L6 17.4 Z"/>
    <rect x="5.4" y="11.4" width="15.8" height="11.6" rx="4.6"/>
  </g>`;

/** The same hand, closed around the thing it is carrying. */
const CLOSED_HAND = `
  <g ${paint}>
    <rect x="4.4" y="11.2" width="16.2" height="12" rx="5"/>
    <rect x="6.6" y="7.6" width="3.2" height="5.2" rx="1.6"/>
    <rect x="10.3" y="6.4" width="3.2" height="6.4" rx="1.6"/>
    <rect x="14" y="7.4" width="3.2" height="5.4" rx="1.6"/>
    <rect x="17.4" y="9.4" width="3" height="4" rx="1.5"/>
    <path d="M6.4 12.4 L3.8 10.6 A1.6 1.6 0 0 0 1.8 13.4 L4.8 16.6 Z"/>
    <path d="M7.6 15.4 q4.4 1.6 9.6 0" fill="none" stroke-width="1.1" opacity="0.65"/>
  </g>`;

/** One finger up: something here can be opened or pressed. */
const POINTING_HAND = `
  <g ${paint}>
    <rect x="9.6" y="1.8" width="3.4" height="12" rx="1.7"/>
    <rect x="13.4" y="8.4" width="3.2" height="6" rx="1.6"/>
    <rect x="16.9" y="9.6" width="3" height="5" rx="1.5"/>
    <path d="M9.6 11.4 L6.8 9.6 A1.7 1.7 0 0 0 4.4 12.2 L8 16 Z"/>
    <rect x="7.6" y="10.6" width="12.6" height="11" rx="4.4"/>
  </g>`;

export const CURSOR_ART: Record<CursorKind, CursorArt> = {
  default: { body: ARROW, hotspot: [5, 3] },
  active: { body: POINTING_HAND, hotspot: [11, 2] },
  grab: { body: OPEN_HAND, hotspot: [11, 6] },
  grabbing: { body: CLOSED_HAND, hotspot: [11, 9] },
};

/** The cursor as a data URI, so CSS can use it without a network request. */
export function cursorDataUri(kind: CursorKind): string {
  const art = CURSOR_ART[kind];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="26" viewBox="0 0 24 26">${art.body}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** A full `cursor:` value: the art, its hotspot, then the system fallback. */
export function cursorCss(
  kind: CursorKind,
  fallback: 'auto' | 'pointer' | 'grab' | 'grabbing' = 'auto',
): string {
  const [x, y] = CURSOR_ART[kind].hotspot;
  return `url("${cursorDataUri(kind)}") ${x} ${y}, ${fallback}`;
}