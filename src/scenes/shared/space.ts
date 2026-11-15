/**
 * One space spec for the whole story (plan §7.1).
 *
 * The launchpad's exit wedge and the journal backdrop both read this object, so
 * the space the rocket flies into is literally the space the journal sits in.
 * Nothing here touches the DOM: the consumers decide how to draw it.
 */

export interface SpaceStop {
  /** 0 = top of the frame, 1 = bottom. */
  readonly at: number;
  readonly color: string;
}

export interface SpaceStar {
  /** Design pixels in the 1920 x 1080 frame. */
  readonly x: number;
  readonly y: number;
  /** Radius in design pixels. */
  readonly r: number;
  /** 0 = farthest (drifts least), 2 = nearest (drifts most). */
  readonly depth: 0 | 1 | 2;
  /** Every third star breathes; the rest are steady. */
  readonly twinkle: boolean;
}

/** Vertical gradient, top to bottom (plan §7.1). */
export const SPACE_STOPS: readonly SpaceStop[] = [
  { at: 0, color: '#0e1b30' },
  { at: 0.5, color: '#112039' },
  { at: 1, color: '#13243c' },
];

export const SPACE_SEED = 7;

/** `[count, parallax k]` per depth, 82 stars in total (plan §7.1, L11). */
export const SPACE_DEPTHS = [
  { count: 44, parallax: 6 },
  { count: 26, parallax: 14 },
  { count: 12, parallax: 26 },
] as const;

export const SPACE_STAR_COUNT = SPACE_DEPTHS.reduce((total, depth) => total + depth.count, 0);

/** Deterministic PRNG: same seed, same sky. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The star field, in design pixels of the 1920 x 1080 frame.
 *
 * The prototype generates stars in a 1000 x 1000 box and stretches it over the
 * frame; the same box is mapped here so the numbers match, and `y` is kept
 * inside the frame so a reveal test can reason about it.
 */
export function spaceStars(seed = SPACE_SEED): readonly SpaceStar[] {
  const random = mulberry32(seed);
  const stars: SpaceStar[] = [];
  SPACE_DEPTHS.forEach((band, depth) => {
    for (let i = 0; i < band.count; i += 1) {
      const bx = random() * 1000;
      const by = random() * 1000;
      const size = random();
      stars.push({
        x: -(bx / 1000) * 1920 + 1920,
        y: (by / 1000) * 1080,
        r: 0.8 + size * (1.2 + 0.5 * depth),
        depth: depth as 0 | 1 | 2,
        twinkle: stars.length % 3 === 0,
      });
    }
  });
  return stars;
}
