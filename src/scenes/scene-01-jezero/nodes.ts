import { createNode, type SceneNode } from '../../three/nodeState';

/**
 * Animation state the P-01 timeline drives and the WebGL world reads.
 * (The opening title stays DOM text, so it is not a node.)
 */
export interface P01Nodes {
  /** Whole-world zoom about a point given as host fractions. */
  world: SceneNode & { originX: number; originY: number };
  /** The camera descent: the tall scroll's `yPercent`. */
  skyScroll: { yPercent: number };
  /** Horizontal pan progress 0..1; each layer scales it by its parallax. */
  pan: { value: number };
  percy: SceneNode;
  glow: SceneNode;
  fgV1: SceneNode;
  fgV2: SceneNode;
  /** Comets belong to space; once the camera lands only meteors spawn. */
  flags: { skyPhase: 'space' | 'sky' };
}

export function createP01Nodes(): P01Nodes {
  return {
    world: { ...createNode(), originX: 0.5, originY: 0.5 },
    skyScroll: { yPercent: 0 },
    pan: { value: 0 },
    percy: createNode(),
    glow: createNode({ opacity: 0 }),
    fgV1: createNode({ opacity: 1 }),
    fgV2: createNode({ opacity: 0 }),
    flags: { skyPhase: 'space' },
  };
}

export function resetP01Nodes(nodes: P01Nodes): void {
  const rest = createP01Nodes();
  Object.assign(nodes.world, rest.world);
  Object.assign(nodes.skyScroll, rest.skyScroll);
  Object.assign(nodes.pan, rest.pan);
  Object.assign(nodes.percy, rest.percy);
  Object.assign(nodes.glow, rest.glow);
  Object.assign(nodes.fgV1, rest.fgV1);
  Object.assign(nodes.fgV2, rest.fgV2);
  Object.assign(nodes.flags, rest.flags);
}
