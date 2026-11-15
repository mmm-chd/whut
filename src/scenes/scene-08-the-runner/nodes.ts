import { createNode, resetNode, type SceneNode } from '../../three/nodeState';
import type { Cell } from './grid';
import { cellCenter } from './mapInput';

/**
 * What the driver writes and the world reads each frame. Percy's `x` and `y`
 * are board units (the 1280 x 960 board), `rotation` is degrees clockwise with
 * 0 meaning the front points up. Nothing here is React state, so a moving rover
 * costs no renders.
 */
export interface RunnerNodes {
  percy: SceneNode;
  flags: { reducedMotion: boolean };
}

export function createRunnerNodes(start: Cell, reducedMotion = false): RunnerNodes {
  const nodes: RunnerNodes = { percy: createNode({ opacity: 0 }), flags: { reducedMotion } };
  resetRunnerNodes(nodes, start, reducedMotion);
  return nodes;
}

/** Percy begins below the board, out of sight, facing up. */
export const ENTRY_OFFSET = 70;

export function resetRunnerNodes(nodes: RunnerNodes, start: Cell, reducedMotion = false): void {
  const centre = cellCenter(start);
  resetNode(nodes.percy, { x: centre.x, y: centre.y, rotation: 0, opacity: 0 });
  nodes.flags.reducedMotion = reducedMotion;
}
