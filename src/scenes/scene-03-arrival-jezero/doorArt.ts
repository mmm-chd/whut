import { CanvasTexture } from 'three';
import type { LoadedTexture } from '../../three/textures';

/**
 * The rocket hatch. A closed door has to be the hull, so the door itself is not
 * painted: its picture is a crop of the rocket art at the same place (see
 * World.tsx), pixel for pixel, and only thin seams mark it. This module paints
 * the two small layers on top of and behind that crop:
 *  - `seams`: a transparent overlay with the door's outline (a dark groove with a
 *    lit edge, the way the core stage's own seams look) and a small cream lever.
 *    It slides with the door.
 *  - `interior`: what shows when the door is open: a dark warm recess, shadowed
 *    at the top and the left where the wall is deep. It is exactly the size of
 *    the door, so nothing shows around a closed door.
 * Colours are sampled from `rocket-full-body.png`. Real door art replaces these
 * under the same roles.
 */
const SCALE = 2; // canvas pixels per design unit
export const DOOR_ART_WIDTH = 150 * SCALE;
export const DOOR_ART_HEIGHT = 240 * SCALE;

const CORE_SHADE = '#80624b';
const CORE_DEEP = '#5b4333';
const CREAM = '#ecd7ba';

function paintInterior(context: CanvasRenderingContext2D, w: number, h: number): void {
  const depth = context.createRadialGradient(w / 2, h * 0.6, 10, w / 2, h * 0.6, h * 0.75);
  depth.addColorStop(0, '#3d2e25');
  depth.addColorStop(0.5, '#24190f');
  depth.addColorStop(1, '#120c07');
  context.fillStyle = depth;
  context.fillRect(0, 0, w, h);

  // Ribs on the back wall and a lit sill at the bottom.
  context.fillStyle = 'rgba(210, 165, 125, 0.09)';
  for (let x = 40; x < w - 20; x += 44) {
    context.fillRect(x, 0, 6, h);
  }
  context.fillStyle = 'rgba(236, 215, 186, 0.16)';
  context.fillRect(0, h - 22, w, 22);

  // The wall is deep at the top and on the left: the hull's own dark shade.
  const top = context.createLinearGradient(0, 0, 0, 56);
  top.addColorStop(0, CORE_DEEP);
  top.addColorStop(1, 'rgba(91, 67, 51, 0)');
  context.fillStyle = top;
  context.fillRect(0, 0, w, 56);
  const left = context.createLinearGradient(0, 0, 40, 0);
  left.addColorStop(0, CORE_SHADE);
  left.addColorStop(1, 'rgba(128, 98, 75, 0)');
  context.fillStyle = left;
  context.fillRect(0, 0, 40, h);
}

function paintSeams(context: CanvasRenderingContext2D, w: number, h: number): void {
  // The outline: a dark groove, then a lit edge just inside it on the top and left.
  context.lineWidth = 3;
  context.strokeStyle = 'rgba(95, 66, 46, 0.62)';
  context.strokeRect(1.5, 1.5, w - 3, h - 3);
  context.beginPath();
  context.moveTo(4.5, h - 4);
  context.lineTo(4.5, 4.5);
  context.lineTo(w - 4, 4.5);
  context.lineWidth = 2;
  context.strokeStyle = 'rgba(255, 235, 205, 0.32)';
  context.stroke();

  // A faint panel seam across the door, like the hull's own joins.
  context.fillStyle = 'rgba(110, 76, 52, 0.40)';
  context.fillRect(3, h * 0.46, w - 6, 3);
  context.fillStyle = 'rgba(255, 235, 205, 0.28)';
  context.fillRect(3, h * 0.46 + 3, w - 6, 2);

  // A small cream lever near the free edge.
  const lx = w - 34;
  const ly = h * 0.55;
  context.fillStyle = 'rgba(70, 45, 30, 0.35)';
  context.fillRect(lx + 3, ly - 30, 10, 66);
  context.fillStyle = CREAM;
  context.fillRect(lx, ly - 33, 10, 66);
  context.fillStyle = 'rgba(128, 98, 75, 0.5)';
  context.fillRect(lx + 7, ly - 33, 3, 66);
}

export interface DoorTextures {
  interior: LoadedTexture;
  seams: LoadedTexture;
  dispose: () => void;
}

/** Paint both layers. Returns null where there is no 2D canvas (tests). */
export function createDoorTextures(): DoorTextures | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const make = (
    paint: (context: CanvasRenderingContext2D, w: number, h: number) => void,
  ): LoadedTexture | null => {
    const canvas = document.createElement('canvas');
    canvas.width = DOOR_ART_WIDTH;
    canvas.height = DOOR_ART_HEIGHT;
    const context = canvas.getContext('2d');
    if (!context) {
      return null;
    }
    paint(context, DOOR_ART_WIDTH, DOOR_ART_HEIGHT);
    const texture = new CanvasTexture(canvas);
    // The sprite shader expects premultiplied alpha (the overlay is transparent).
    texture.premultiplyAlpha = true;
    return { texture, width: DOOR_ART_WIDTH, height: DOOR_ART_HEIGHT, placeholder: false };
  };
  const interior = make(paintInterior);
  const seams = make(paintSeams);
  if (!interior || !seams) {
    interior?.texture.dispose();
    seams?.texture.dispose();
    return null;
  }
  return {
    interior,
    seams,
    dispose: () => {
      interior.texture.dispose();
      seams.texture.dispose();
    },
  };
}
