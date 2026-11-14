import { CAMERA_X, DESIGN_WIDTH, PARALLAX, screenToWorld } from './camera';
import type { RockId } from './interactions';

export interface RockConfig {
  id: RockId;
  alt: string;
  /** Frame-2 screen centre, fraction of the design width (mockup). */
  screenX: number;
  /** Base Y, fraction of the design height. */
  baseY: number;
  /** Width, fraction of the design width. */
  size: number;
  /** World X in design px, derived so the pan lands on screenX. */
  worldX: number;
}

const definitions = [
  { id: 'rock-a', alt: 'A jagged rust-red rock', screenX: 0.83, baseY: 0.8, size: 0.08 },
  { id: 'rock-b', alt: 'A rounded ochre rock', screenX: 0.74, baseY: 0.649, size: 0.085 },
  { id: 'rock-c', alt: 'A tall grey rock with blue veins', screenX: 0.91, baseY: 0.74, size: 0.08 },
] as const;

export const rocksConfig: readonly RockConfig[] = definitions.map((rock) => ({
  ...rock,
  worldX: screenToWorld(rock.screenX * DESIGN_WIDTH, CAMERA_X.rocks, PARALLAX.rocks),
}));
