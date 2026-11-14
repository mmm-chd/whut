import { createNode, type SceneNode } from '../../three/nodeState';

/**
 * Animation state for the layered Percy rig. Clips write these numbers; the
 * rig reads them every frame. Wheel spin is not stored: it is derived from
 * `body.x`, so it can never drift from the distance rolled and it stops with
 * the presentation clock.
 */
export interface PercyNodes {
  /** x: design units along the world; y: design units, negative is up (a hop). */
  body: SceneNode;
  /** pan -1 (left) .. 1 (right); tilt -1 (down) .. 1 (up). */
  mast: { pan: number; tilt: number };
  /** Arm raise in degrees; 0 is the rest pose. */
  arm: { angle: number };
  glow: SceneNode;
}

export function createPercyNodes(): PercyNodes {
  return {
    body: createNode(),
    mast: { pan: 0, tilt: 0 },
    arm: { angle: 0 },
    glow: createNode({ opacity: 0 }),
  };
}

export function resetPercyNodes(nodes: PercyNodes): void {
  const rest = createPercyNodes();
  Object.assign(nodes.body, rest.body);
  Object.assign(nodes.mast, rest.mast);
  Object.assign(nodes.arm, rest.arm);
  Object.assign(nodes.glow, rest.glow);
}
