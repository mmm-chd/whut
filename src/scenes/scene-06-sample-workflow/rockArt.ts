import { GRID_H, GRID_W, type BrushCoverage } from './brushCoverage';
import type { RockTarget, SampleSite } from './content';

/**
 * Drawing for the rock close-up, in the palette of the Mars scenes: rust red
 * ground, dark layered rock with a cream rim light, and soft sandy dust.
 *
 * The static picture (ground, rock, strata, cracks) is painted once per rock
 * into a cached bitmap. Each frame only draws that bitmap, the dust layer and
 * the site on top, so brushing never repaints the rock body.
 */
export const CANVAS_W = 640;
export const CANVAS_H = 480;

const OUTLINE = '#2a1510';
const RIM = '#f0c9a0';

type Point = readonly [number, number];

/** Small deterministic noise: the same rock always looks the same. */
function noise(index: number, seed: number): number {
  const x = Math.sin(index * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function seedFor(rock: RockTarget): number {
  return rock.id.length * 7 + rock.id.charCodeAt(0);
}

/** The rock's silhouette: a lumpy loop that always stays inside its ellipse. */
export function rockOutline(rock: RockTarget): Point[] {
  const { cx, cy, rx, ry } = rock.shape;
  const seed = seedFor(rock);
  const count = 22;
  const points: Point[] = [];
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    // Flatter underneath so the rock sits on the ground.
    const lump = 0.9 + noise(i, seed) * 0.1;
    const flat = Math.sin(angle) > 0.55 ? 0.93 : 1;
    points.push([
      (cx + Math.cos(angle) * rx * lump) * CANVAS_W,
      (cy + Math.sin(angle) * ry * lump * flat) * CANVAS_H,
    ]);
  }
  return points;
}

/** A smooth closed path through the midpoints of the outline. */
export function tracePath(ctx: CanvasRenderingContext2D, points: readonly Point[]): void {
  const mid = (a: Point, b: Point): Point => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  ctx.beginPath();
  const start = mid(points[points.length - 1], points[0]);
  ctx.moveTo(start[0], start[1]);
  for (let i = 0; i < points.length; i += 1) {
    const next = mid(points[i], points[(i + 1) % points.length]);
    ctx.quadraticCurveTo(points[i][0], points[i][1], next[0], next[1]);
  }
  ctx.closePath();
}

function paintGround(ctx: CanvasRenderingContext2D, seed: number): void {
  const ground = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  ground.addColorStop(0, '#c4573d');
  ground.addColorStop(0.55, '#a94330');
  ground.addColorStop(1, '#7d3326');
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Fine grit.
  for (let i = 0; i < 260; i += 1) {
    const x = noise(i, seed + 1) * CANVAS_W;
    const y = noise(i, seed + 2) * CANVAS_H;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(240, 190, 150, 0.18)' : 'rgba(60, 24, 18, 0.2)';
    ctx.fillRect(x, y, 2 + noise(i, seed + 3) * 3, 2 + noise(i, seed + 4) * 2);
  }
  // A few pebbles with a shadow and a lit edge.
  for (let i = 0; i < 16; i += 1) {
    const x = noise(i, seed + 5) * CANVAS_W;
    const y = 40 + noise(i, seed + 6) * (CANVAS_H - 60);
    const r = 4 + noise(i, seed + 7) * 9;
    ctx.fillStyle = 'rgba(50, 20, 15, 0.35)';
    ctx.beginPath();
    ctx.ellipse(x + 2, y + r * 0.6, r * 1.2, r * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7a3a2d';
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(240, 201, 160, 0.5)';
    ctx.beginPath();
    ctx.ellipse(x - r * 0.25, y - r * 0.25, r * 0.5, r * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintRockBody(ctx: CanvasRenderingContext2D, rock: RockTarget, outline: readonly Point[]): void {
  const { cx, cy, rx, ry } = rock.shape;
  const fragile = rock.condition === 'cracked-fragile';
  const seed = seedFor(rock);

  // Shadow on the ground.
  ctx.fillStyle = 'rgba(48, 18, 14, 0.4)';
  ctx.beginPath();
  ctx.ellipse(cx * CANVAS_W + 10, (cy + ry * 0.92) * CANVAS_H, rx * CANVAS_W * 0.95, ry * CANVAS_H * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body.
  tracePath(ctx, outline);
  const body = ctx.createLinearGradient(
    (cx - rx) * CANVAS_W,
    (cy - ry) * CANVAS_H,
    (cx + rx * 0.6) * CANVAS_W,
    (cy + ry) * CANVAS_H,
  );
  if (fragile) {
    body.addColorStop(0, '#caa386');
    body.addColorStop(1, '#8c5f4a');
  } else {
    body.addColorStop(0, '#9a5a44');
    body.addColorStop(1, '#52281f');
  }
  ctx.fillStyle = body;
  ctx.fill();

  ctx.save();
  tracePath(ctx, outline);
  ctx.clip();

  // Strata: wavy bands, stronger on the layered rock.
  const bands = rock.condition === 'solid-layered' ? 7 : fragile ? 3 : 4;
  for (let i = 0; i < bands; i += 1) {
    const top = (cy - ry + ((i + 0.5) * ry * 2) / bands) * CANVAS_H;
    const thickness = (ry * 2 * CANVAS_H) / bands;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(40, 14, 10, 0.2)' : 'rgba(240, 190, 140, 0.09)';
    ctx.beginPath();
    ctx.moveTo((cx - rx) * CANVAS_W - 10, top);
    const sway = 12 + noise(i, seed + 8) * 10;
    ctx.bezierCurveTo(
      cx * CANVAS_W - rx * CANVAS_W * 0.4,
      top + sway,
      cx * CANVAS_W + rx * CANVAS_W * 0.3,
      top - sway,
      (cx + rx) * CANVAS_W + 10,
      top + 4,
    );
    ctx.lineTo((cx + rx) * CANVAS_W + 10, top + thickness * 0.55);
    ctx.bezierCurveTo(
      cx * CANVAS_W + rx * CANVAS_W * 0.3,
      top + thickness * 0.55 - sway,
      cx * CANVAS_W - rx * CANVAS_W * 0.4,
      top + thickness * 0.55 + sway,
      (cx - rx) * CANVAS_W - 10,
      top + thickness * 0.55,
    );
    ctx.closePath();
    ctx.fill();
  }

  // Speckle texture.
  for (let i = 0; i < 220; i += 1) {
    const x = noise(i, seed + 9) * CANVAS_W;
    const y = noise(i, seed + 10) * CANVAS_H;
    ctx.fillStyle = i % 2 ? 'rgba(25, 8, 6, 0.22)' : 'rgba(255, 220, 180, 0.16)';
    ctx.fillRect(x, y, 2 + noise(i, seed + 11) * 3, 2);
  }

  if (fragile) {
    ctx.strokeStyle = '#2a1510';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const cracks: ReadonlyArray<readonly Point[]> = [
      [[0.2, 0.3], [0.36, 0.42], [0.44, 0.58], [0.4, 0.78]],
      [[0.8, 0.26], [0.64, 0.4], [0.58, 0.56], [0.66, 0.8]],
      [[0.44, 0.58], [0.56, 0.62]],
    ];
    cracks.forEach((crack, index) => {
      ctx.lineWidth = index === 2 ? 3 : 5;
      ctx.beginPath();
      crack.forEach(([u, v], step) => {
        if (step === 0) {
          ctx.moveTo(u * CANVAS_W, v * CANVAS_H);
        } else {
          ctx.lineTo(u * CANVAS_W, v * CANVAS_H);
        }
      });
      ctx.stroke();
    });
  }
  ctx.restore();

  // Outline and a cream rim light along the top edge.
  tracePath(ctx, outline);
  ctx.lineWidth = 5;
  ctx.strokeStyle = OUTLINE;
  ctx.lineJoin = 'round';
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, CANVAS_W, (cy - ry * 0.1) * CANVAS_H);
  ctx.clip();
  tracePath(ctx, outline);
  ctx.lineWidth = 3;
  ctx.strokeStyle = RIM;
  ctx.globalAlpha = 0.7;
  ctx.translate(0, 3);
  ctx.stroke();
  ctx.restore();
}

/** The cached, unchanging picture: ground, shadow, rock. */
export function paintBase(ctx: CanvasRenderingContext2D, rock: RockTarget): void {
  const outline = rockOutline(rock);
  paintGround(ctx, seedFor(rock));
  paintRockBody(ctx, rock, outline);
}

/**
 * The dust layer is full size, built from soft round blobs (one per uncleared
 * cell) so the edge of a brushed patch is rounded and organic, not a staircase
 * of squares. Two blob tints keep the sand from looking flat.
 */
const CELL_W = CANVAS_W / GRID_W;
const CELL_H = CANVAS_H / GRID_H;
let dustSprites: HTMLCanvasElement[] | null = null;

function makeSprite(rgb: readonly [number, number, number]): HTMLCanvasElement | null {
  const sprite = document.createElement('canvas');
  const size = 56;
  sprite.width = size;
  sprite.height = size;
  const ctx = sprite.getContext('2d');
  if (!ctx) {
    return null;
  }
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 1)`);
  gradient.addColorStop(0.55, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.95)`);
  gradient.addColorStop(1, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return sprite;
}

function getDustSprites(): HTMLCanvasElement[] {
  if (!dustSprites) {
    dustSprites = [makeSprite([226, 172, 122]), makeSprite([212, 154, 108])].filter(
      (sprite): sprite is HTMLCanvasElement => sprite !== null,
    );
  }
  return dustSprites;
}

export function createDustLayer(): HTMLCanvasElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  return canvas;
}

export function paintDust(layer: HTMLCanvasElement, coverage: BrushCoverage, seed: number): void {
  const ctx = layer.getContext('2d');
  const sprites = getDustSprites();
  if (!ctx || sprites.length === 0) {
    return;
  }
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  for (let i = 0; i < coverage.eligible.length; i += 1) {
    if (!coverage.eligible[i] || coverage.cleared[i]) {
      continue;
    }
    const x = (i % GRID_W) * CELL_W + CELL_W / 2;
    const y = Math.floor(i / GRID_W) * CELL_H + CELL_H / 2;
    const n = noise(i, seed);
    ctx.drawImage(sprites[n > 0.5 ? 0 : 1], x - CELL_W * 1.1, y - CELL_H * 1.1, CELL_W * 2.2, CELL_H * 2.2);
  }
}

export interface OverlayArgs {
  readonly site: SampleSite;
  readonly dust: HTMLCanvasElement | null;
  readonly outline: readonly Point[];
  readonly drilling: boolean;
  readonly depleted: boolean;
  readonly cleaned: boolean;
  readonly time: number;
}

/** Everything that changes per frame: dust, the site marker and the drill. */
export function paintOverlay(ctx: CanvasRenderingContext2D, args: OverlayArgs): void {
  const { site, dust, outline, drilling, depleted, cleaned, time } = args;

  if (dust) {
    ctx.save();
    tracePath(ctx, outline);
    ctx.clip();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(dust, 0, 0, CANVAS_W, CANVAS_H);
    ctx.restore();
  }

  const sx = site.u * CANVAS_W;
  const sy = site.v * CANVAS_H;

  if (depleted) {
    ctx.fillStyle = '#1d0f0a';
    ctx.beginPath();
    ctx.ellipse(sx, sy, 24, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = RIM;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.6;
    ctx.stroke();
    ctx.globalAlpha = 1;
  } else if (cleaned && !drilling) {
    // A pulsing, hand-drawn looking ring around the chosen spot.
    const pulse = 1 + Math.sin(time / 260) * 0.05;
    ctx.strokeStyle = '#fff1d6';
    ctx.lineWidth = 4;
    ctx.setLineDash([9, 7]);
    ctx.beginPath();
    ctx.ellipse(sx, sy, 32 * pulse, 20 * pulse, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (drilling) {
    const jitter = Math.sin(time / 18) * 1.6;
    const top = Math.max(0, sy - 190);
    // Bit shaft with a steel gradient and spiral flutes.
    const shaft = ctx.createLinearGradient(sx - 9, 0, sx + 9, 0);
    shaft.addColorStop(0, '#9aa7ad');
    shaft.addColorStop(0.45, '#eef3f5');
    shaft.addColorStop(1, '#6d7b82');
    ctx.fillStyle = shaft;
    ctx.fillRect(sx - 9 + jitter, top, 18, sy - top);
    ctx.strokeStyle = 'rgba(40, 56, 64, 0.55)';
    ctx.lineWidth = 2;
    for (let y = top + ((time / 14) % 14); y < sy; y += 14) {
      ctx.beginPath();
      ctx.moveTo(sx - 9 + jitter, y);
      ctx.lineTo(sx + 9 + jitter, y + 7);
      ctx.stroke();
    }
    ctx.fillStyle = '#4a565c';
    ctx.beginPath();
    ctx.moveTo(sx - 9 + jitter, sy);
    ctx.lineTo(sx + jitter, sy + 12);
    ctx.lineTo(sx + 9 + jitter, sy);
    ctx.closePath();
    ctx.fill();

    // A bounded puff of dust: ten particles, never more.
    for (let k = 0; k < 10; k += 1) {
      const phase = ((time / 520 + k / 10) % 1);
      const side = k % 2 ? 1 : -1;
      const x = sx + side * (6 + phase * (22 + noise(k, 3) * 18));
      const y = sy + 6 - phase * (20 + noise(k, 4) * 26);
      ctx.fillStyle = `rgba(232, 182, 136, ${(1 - phase) * 0.8})`;
      ctx.beginPath();
      ctx.arc(x, y, 2 + noise(k, 5) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
