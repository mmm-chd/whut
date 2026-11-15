import { CanvasTexture } from 'three';
import type { LoadedTexture } from '../../three/textures';
import { BOARD_HEIGHT, BOARD_WIDTH, CELL_SIZE } from './grid';
import type { NavigationMap } from './map';

/**
 * The board and Percy seen from above, painted at mount.
 *
 * The same palette as the side-view Mars scenes: rust ground, dark red rocks
 * with a cream rim light, and Percy's cream and teal. There are no overhead
 * source images, so this is authored art; real top-down art replaces it under
 * the same two roles (`terrain`, `percy`). Every visible blocker is painted
 * inside the raw cells the planner treats as blocked, so the picture and the
 * map agree.
 */

/** Small deterministic generator: the same board paints the same way. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function blobPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, random: () => number): void {
  const count = 11;
  const points: Array<[number, number]> = [];
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    const radius = r * (0.78 + random() * 0.28);
    points.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius * 0.88]);
  }
  ctx.beginPath();
  const mid = (a: [number, number], b: [number, number]): [number, number] => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const start = mid(points[count - 1], points[0]);
  ctx.moveTo(start[0], start[1]);
  for (let i = 0; i < count; i += 1) {
    const next = mid(points[i], points[(i + 1) % count]);
    ctx.quadraticCurveTo(points[i][0], points[i][1], next[0], next[1]);
  }
  ctx.closePath();
}

function paintGround(ctx: CanvasRenderingContext2D, random: () => number): void {
  const base = ctx.createLinearGradient(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
  base.addColorStop(0, '#c0583d');
  base.addColorStop(0.5, '#b04a35');
  base.addColorStop(1, '#a14030');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);

  // Large soft patches of lighter and darker dust.
  for (let i = 0; i < 38; i += 1) {
    const x = random() * BOARD_WIDTH;
    const y = random() * BOARD_HEIGHT;
    const r = 70 + random() * 170;
    const light = random() > 0.5;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, light ? 'rgba(232, 150, 108, 0.20)' : 'rgba(90, 30, 22, 0.20)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // Wind ripples: long, low arcs of lighter sand.
  ctx.lineCap = 'round';
  for (let i = 0; i < 46; i += 1) {
    const x = random() * BOARD_WIDTH;
    const y = random() * BOARD_HEIGHT;
    const length = 40 + random() * 90;
    ctx.strokeStyle = 'rgba(240, 190, 150, 0.16)';
    ctx.lineWidth = 2 + random() * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + length / 2, y - 8 - random() * 10, x + length, y);
    ctx.stroke();
  }

  // Grit and tiny pebbles. All are far smaller than a cell, so none reads as a blocker.
  for (let i = 0; i < 1400; i += 1) {
    const x = random() * BOARD_WIDTH;
    const y = random() * BOARD_HEIGHT;
    ctx.fillStyle = random() > 0.45 ? 'rgba(255, 210, 170, 0.20)' : 'rgba(60, 22, 16, 0.26)';
    ctx.fillRect(x, y, 1.5 + random() * 3, 1.5 + random() * 2);
  }
  for (let i = 0; i < 120; i += 1) {
    const x = random() * BOARD_WIDTH;
    const y = random() * BOARD_HEIGHT;
    const r = 2 + random() * 3.5;
    ctx.fillStyle = 'rgba(50, 18, 14, 0.30)';
    ctx.beginPath();
    ctx.ellipse(x + 1.5, y + 2, r * 1.2, r * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7d3b2d';
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintRock(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, random: () => number): void {
  // Cast shadow to the lower right, then the body, then the rim light.
  ctx.save();
  ctx.translate(r * 0.28, r * 0.34);
  blobPath(ctx, cx, cy, r, random);
  ctx.fillStyle = 'rgba(40, 14, 10, 0.34)';
  ctx.fill();
  ctx.restore();

  const shape = random() * 1000;
  const body = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  body.addColorStop(0, '#8a4636');
  body.addColorStop(1, '#4c241c');
  blobPath(ctx, cx, cy, r, rng(shape));
  ctx.fillStyle = body;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#2a1510';
  ctx.stroke();

  ctx.save();
  blobPath(ctx, cx, cy, r, rng(shape));
  ctx.clip();
  ctx.strokeStyle = 'rgba(30, 10, 8, 0.32)';
  ctx.lineWidth = 2;
  for (let i = -1; i <= 1; i += 1) {
    ctx.beginPath();
    ctx.moveTo(cx - r, cy + i * r * 0.4);
    ctx.quadraticCurveTo(cx, cy + i * r * 0.4 + 6, cx + r, cy + i * r * 0.4 - 2);
    ctx.stroke();
  }
  ctx.restore();

  // Cream rim along the top-left edge.
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - r * 1.2, cy - r * 1.2, r * 1.2, r * 1.2);
  ctx.clip();
  blobPath(ctx, cx, cy, r, rng(shape));
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(240, 201, 160, 0.75)';
  ctx.stroke();
  ctx.restore();
}

function paintPit(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, random: () => number): void {
  const cx = x + w / 2;
  const cy = y + h / 2;
  // Lit lip below, deep shadow inside.
  ctx.fillStyle = 'rgba(244, 196, 156, 0.5)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 4, w * 0.46, h * 0.44, 0, 0, Math.PI * 2);
  ctx.fill();
  const depth = ctx.createRadialGradient(cx, cy - 4, 4, cx, cy, w * 0.46);
  depth.addColorStop(0, '#1a0c08');
  depth.addColorStop(0.7, '#3b1a12');
  depth.addColorStop(1, '#6a2f22');
  ctx.fillStyle = depth;
  blobPath(ctx, cx, cy, w * 0.46, random);
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#2a1510';
  ctx.stroke();
}

function paintRoughPatch(ctx: CanvasRenderingContext2D, cx: number, cy: number, random: () => number): void {
  // Quietly visible: darker mottled ground with a few chips. Not a rock.
  const gradient = ctx.createRadialGradient(cx, cy, 2, cx, cy, 44);
  gradient.addColorStop(0, 'rgba(70, 24, 18, 0.55)');
  gradient.addColorStop(1, 'rgba(70, 24, 18, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(cx - 46, cy - 46, 92, 92);
  for (let i = 0; i < 34; i += 1) {
    const angle = random() * Math.PI * 2;
    const distance = random() * 32;
    const r = 2.5 + random() * 5;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(236, 170, 130, 0.5)' : 'rgba(46, 16, 12, 0.55)';
    ctx.beginPath();
    ctx.ellipse(cx + Math.cos(angle) * distance, cy + Math.sin(angle) * distance, r, r * 0.7, angle, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function paintTerrain(ctx: CanvasRenderingContext2D, map: NavigationMap): void {
  const random = rng(7007);
  paintGround(ctx, random);

  for (const blocker of map.blockers) {
    const cols = blocker.rawCells.map((cell) => cell.col);
    const rows = blocker.rawCells.map((cell) => cell.row);
    const x = Math.min(...cols) * CELL_SIZE;
    const y = Math.min(...rows) * CELL_SIZE;
    const w = (Math.max(...cols) - Math.min(...cols) + 1) * CELL_SIZE;
    const h = (Math.max(...rows) - Math.min(...rows) + 1) * CELL_SIZE;
    if (blocker.kind === 'pit') {
      paintPit(ctx, x, y, w, h, random);
      continue;
    }
    // Rocks stay inside their raw cells; sort by y so lower ones overlap upper ones.
    const rocks: Array<[number, number, number]> = [];
    const count = Math.max(3, Math.round((w * h) / 4200));
    for (let i = 0; i < count; i += 1) {
      const r = 20 + random() * 12;
      rocks.push([x + r + random() * (w - r * 2), y + r + random() * (h - r * 2), r]);
    }
    rocks.sort((a, b) => a[1] - b[1]);
    for (const [cx, cy, r] of rocks) {
      paintRock(ctx, cx, cy, r, random);
    }
  }

  for (const hazard of map.hazards) {
    for (const cell of hazard.rawCells) {
      paintRoughPatch(ctx, (cell.col + 0.5) * CELL_SIZE, (cell.row + 0.5) * CELL_SIZE, random);
    }
  }
}

/** Rounded rectangle path without `roundRect`, which older browsers lack. */
function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Percy from above: front at the top. Painted at 4 px per board unit. */
/** The picture is drawn in a 46 x 64 box and stretched to this size. */
export const PERCY_ART = { width: 58, height: 80, scale: 4 } as const;
const PERCY_DRAWING = { width: 46, height: 64 } as const;

export function paintPercy(ctx: CanvasRenderingContext2D): void {
  const k = PERCY_ART.scale;
  const w = PERCY_ART.width * k;
  const h = PERCY_ART.height * k;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.scale((k * PERCY_ART.width) / PERCY_DRAWING.width, (k * PERCY_ART.height) / PERCY_DRAWING.height);

  const OUT = '#2a2420';
  const rubber = '#2c3a40';
  const wheel = (x: number, y: number) => {
    ctx.fillStyle = 'rgba(30, 14, 10, 0.35)';
    ctx.fillRect(x + 1, y + 1.5, 7, 12);
    ctx.fillStyle = rubber;
    ctx.fillRect(x, y, 7, 12);
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = OUT;
    ctx.strokeRect(x, y, 7, 12);
    // Cleats.
    ctx.strokeStyle = 'rgba(190, 205, 208, 0.45)';
    ctx.lineWidth = 0.6;
    for (let t = y + 2; t < y + 11; t += 2.2) {
      ctx.beginPath();
      ctx.moveTo(x + 0.8, t);
      ctx.lineTo(x + 6.2, t);
      ctx.stroke();
    }
  };
  for (const y of [8, 26, 44]) {
    wheel(2, y);
    wheel(37, y);
  }

  // Rocker-bogie arms between wheels and body.
  ctx.strokeStyle = '#7b5a3c';
  ctx.lineWidth = 1.6;
  for (const x of [9, 37]) {
    ctx.beginPath();
    ctx.moveTo(x, 14);
    ctx.lineTo(x, 50);
    ctx.stroke();
  }

  // Rear power unit.
  ctx.fillStyle = '#4e6b72';
  ctx.beginPath();
  roundedRect(ctx, 15, 47, 16, 14, 3);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 0.9;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(220, 235, 238, 0.4)';
  ctx.lineWidth = 0.6;
  for (let x = 18; x < 30; x += 3) {
    ctx.beginPath();
    ctx.moveTo(x, 49);
    ctx.lineTo(x, 59);
    ctx.stroke();
  }

  // Body deck.
  const deck = ctx.createLinearGradient(10, 10, 36, 52);
  deck.addColorStop(0, '#f7ecd2');
  deck.addColorStop(1, '#d4be98');
  ctx.fillStyle = deck;
  ctx.beginPath();
  roundedRect(ctx, 10, 12, 26, 38, 4);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Deck details: panel seams, a cream dish, a dark science box.
  ctx.strokeStyle = 'rgba(123, 90, 60, 0.55)';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(10, 30);
  ctx.lineTo(36, 30);
  ctx.moveTo(23, 30);
  ctx.lineTo(23, 50);
  ctx.stroke();
  ctx.fillStyle = '#34494f';
  ctx.fillRect(12.5, 33, 8, 7);
  ctx.fillStyle = '#c79970';
  ctx.beginPath();
  ctx.arc(29.5, 38, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Mast and camera head at the front, slightly off centre like Percy's own.
  ctx.fillStyle = '#7b5a3c';
  ctx.fillRect(21.6, 15, 2.8, 8);
  ctx.fillStyle = '#f3e6ca';
  ctx.beginPath();
  roundedRect(ctx, 17, 6, 12, 8, 2.5);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 0.9;
  ctx.stroke();
  ctx.fillStyle = '#26363c';
  ctx.beginPath();
  ctx.arc(20.4, 10, 2, 0, Math.PI * 2);
  ctx.arc(25.6, 10, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#9cc0c8';
  ctx.beginPath();
  ctx.arc(19.8, 9.4, 0.7, 0, Math.PI * 2);
  ctx.arc(25, 9.4, 0.7, 0, Math.PI * 2);
  ctx.fill();

  // Arm folded at the front-left.
  ctx.strokeStyle = '#7b5a3c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(12, 14);
  ctx.lineTo(8, 5);
  ctx.stroke();
  ctx.fillStyle = '#e0a04a';
  ctx.beginPath();
  ctx.arc(8, 4.4, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export interface RunnerTextures {
  readonly terrain: LoadedTexture;
  readonly percy: LoadedTexture;
  dispose(): void;
}

function toTexture(canvas: HTMLCanvasElement): LoadedTexture {
  const texture = new CanvasTexture(canvas);
  texture.premultiplyAlpha = true;
  return { texture, width: canvas.width, height: canvas.height, placeholder: false };
}

/** Paint both pictures. Null where there is no 2D canvas (tests, a failed context). */
export function createRunnerTextures(map: NavigationMap): RunnerTextures | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const terrainCanvas = document.createElement('canvas');
  terrainCanvas.width = BOARD_WIDTH;
  terrainCanvas.height = BOARD_HEIGHT;
  const terrainCtx = terrainCanvas.getContext('2d');
  const percyCanvas = document.createElement('canvas');
  percyCanvas.width = PERCY_ART.width * PERCY_ART.scale;
  percyCanvas.height = PERCY_ART.height * PERCY_ART.scale;
  const percyCtx = percyCanvas.getContext('2d');
  if (!terrainCtx || !percyCtx) {
    return null;
  }
  paintTerrain(terrainCtx, map);
  paintPercy(percyCtx);
  const terrain = toTexture(terrainCanvas);
  const percy = toTexture(percyCanvas);
  return {
    terrain,
    percy,
    dispose: () => {
      terrain.texture.dispose();
      percy.texture.dispose();
    },
  };
}
