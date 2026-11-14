/**
 * Procedural clouds for the high sky of the P-02 ascent.
 *
 * The opening sky art holds three flat cream ribbons (#fce4c4). Measured at
 * design size, each is about 750-950 px long and about 38-50 px thick at its
 * widest; it tapers to a point at both ends, bends in a soft S, and lies
 * nearly flat. Two of them run as an overlapping pair. This module draws more
 * ribbons with exactly those rules, so the high sky reads as the same sky:
 *
 *  - Ribbons lie in horizontal bands, like the band in the art, with even
 *    gaps inside a band and a stagger between bands, so the sky looks full
 *    but never cluttered.
 *  - Every ribbon has its own curve, length and thickness inside the
 *    measured range. Nothing is copied, flipped or mirrored from the art.
 *  - A fixed seed gives the same sky on every run.
 */
export const P02_SKY_CLOUD_COLOR = '#fce4c4';

export interface P02SkyCloud {
  /** World position of the cloud box (top left), in design pixels. */
  left: number;
  top: number;
  width: number;
  height: number;
  /** SVG path data in the box's own coordinates. */
  paths: string[];
}

/** World area the ascent camera shows above the opening frame (y 0..1083). */
export const P02_SKY_CLOUD_AREA = {
  left: -1400,
  right: 3300,
  /** Highest band centre. */
  top: -1380,
  /** Lowest band centre: clear of the art's own cloud band and its cut top. */
  bottom: -330,
} as const;

/** Measured from the opening sky art (see the module comment). */
export const P02_SKY_RIBBON = {
  minLength: 720,
  maxLength: 980,
  minThickness: 38,
  maxThickness: 50,
} as const;

const BAND_GAP = 300;
const BOX_PAD = 40;

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

type Random = () => number;

const between = (random: Random, min: number, max: number) => min + (max - min) * random();

interface Point {
  x: number;
  y: number;
}

function cubic(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

/**
 * One ribbon from (x, y) to (x + length, y + rise). The centre line is a soft
 * S (one hump up, one down); the thickness is zero at both tips and widest at
 * `peak`, so the ribbon swells once and thins into long tails.
 */
function ribbon(random: Random, x: number, y: number, length: number): string {
  const wave = length * between(random, 0.08, 0.13) * (random() < 0.5 ? 1 : -1);
  // Most ribbons lie nearly flat; some climb or dip like the art's long ribbon.
  const rise = length * (random() < 0.35 ? between(random, 0.12, 0.2) * (random() < 0.5 ? 1 : -1) : between(random, -0.08, 0.08));
  const p0 = { x, y };
  const p1 = { x: x + length * between(random, 0.25, 0.35), y: y - wave };
  const p2 = { x: x + length * between(random, 0.6, 0.72), y: y + rise + wave * between(random, 0.6, 1) };
  const p3 = { x: x + length, y: y + rise };
  const thickness = between(random, P02_SKY_RIBBON.minThickness, P02_SKY_RIBBON.maxThickness);
  const peak = between(random, 0.38, 0.62);

  const steps = 64;
  const top: Point[] = [];
  const bottom: Point[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const centre = cubic(p0, p1, p2, p3, t);
    const ahead = cubic(p0, p1, p2, p3, Math.min(1, t + 0.005));
    const behind = cubic(p0, p1, p2, p3, Math.max(0, t - 0.005));
    const dx = ahead.x - behind.x;
    const dy = ahead.y - behind.y;
    const norm = Math.hypot(dx, dy) || 1;
    // Warp t so the widest point sits at `peak`, then use a sine swell whose
    // power keeps the tails long and the tips sharp.
    const warped = t < peak ? (t / peak) * 0.5 : 0.5 + ((t - peak) / (1 - peak)) * 0.5;
    const half = (thickness / 2) * Math.pow(Math.sin(Math.PI * warped), 0.85);
    top.push({ x: centre.x + (dy / norm) * half, y: centre.y - (dx / norm) * half });
    bottom.push({ x: centre.x - (dy / norm) * half, y: centre.y + (dx / norm) * half });
  }

  const points = [...top, ...bottom.reverse()];
  const round = (value: number) => Math.round(value * 10) / 10;
  return `M${points.map((point) => `${round(point.x)} ${round(point.y)}`).join(' L')}Z`;
}

/**
 * One cloud: a single ribbon, or (about one in three) an overlapping pair
 * like the right-hand pair in the art: a second, shorter ribbon that starts
 * later and sits a little lower.
 */
function cloud(random: Random, left: number, centreY: number, length: number): P02SkyCloud {
  const pair = random() < 0.45;
  const secondLength = length * between(random, 0.6, 0.8);
  const secondOffsetX = length * between(random, 0.3, 0.45);
  const secondOffsetY = between(random, 42, 64);
  const width = pair ? Math.max(length, secondOffsetX + secondLength) : length;
  const height = BOX_PAD * 2 + length * 0.5 + (pair ? secondOffsetY : 0);

  const baseY = BOX_PAD + length * 0.25;
  const paths = [ribbon(random, 0, baseY, length)];
  if (pair) {
    paths.push(ribbon(random, secondOffsetX, baseY + secondOffsetY, secondLength));
  }
  return {
    left: Math.round(left),
    top: Math.round(centreY - baseY),
    width: Math.ceil(width) + 2,
    height: Math.ceil(height),
    paths,
  };
}

/**
 * Bands from just above the opening art up to the top of the ascent view.
 * Inside a band, clouds follow each other left to right with a gap of
 * 0.25-0.55 of a ribbon length; each band starts at a different offset so
 * the gaps do not line up from band to band.
 */
export function createP02SkyClouds(seed = 20260714): P02SkyCloud[] {
  const random = mulberry32(seed);
  const clouds: P02SkyCloud[] = [];
  const { left, right, top, bottom } = P02_SKY_CLOUD_AREA;

  let band = 0;
  for (let centreY = bottom; centreY >= top; centreY -= BAND_GAP) {
    let x = left - between(random, 0, 600) - (band % 2) * 350;
    while (x < right) {
      const length = between(random, P02_SKY_RIBBON.minLength, P02_SKY_RIBBON.maxLength);
      const y = centreY + between(random, -80, 80);
      const next = cloud(random, x, y, length);
      clouds.push(next);
      x += next.width + length * between(random, 0.15, 0.45);
    }
    band += 1;
  }
  return clouds;
}

export const P02_SKY_CLOUDS: readonly P02SkyCloud[] = createP02SkyClouds();
