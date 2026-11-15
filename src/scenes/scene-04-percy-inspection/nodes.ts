import { createPercyNodes, resetPercyNodes, type PercyNodes } from '../../characters/percy/percyNodes';
import { createNode, resetNode, type SceneNode } from '../../three/nodeState';
import type { P04Layout } from './layout';

/**
 * Animation state the P-04 driver will write and the world reads.
 *
 * `transfer` is a DOM sprite centre in host CSS pixels (the hand and Percy's
 * hand-off picture), not a model coordinate; `fade` is opacity only. Keeping
 * the transfer in CSS pixels means the drag proxy and the drawn sprite can
 * share numbers.
 */
export interface P04Nodes {
  percy: PercyNodes;
  /** x: world x in design units; lift: view raise; scale: zoom about the view centre. */
  camera: { x: number; lift: number; scale: number };
  /** Which annotation is on screen; one at a time. */
  annotation: { value: 'none' | 'distance' | 'dimensions' | 'wheels' };
  transfer: SceneNode;
  fade: SceneNode;
  flags: { reducedMotion: boolean };
}

/** Where Percy stands on the first frame, in design units. */
export const P04_START_X = 0;

export function createP04Nodes(layout: P04Layout, reducedMotion = false): P04Nodes {
  const nodes: P04Nodes = {
    percy: createPercyNodes(),
    camera: { x: P04_START_X, lift: 0, scale: 1 },
    annotation: { value: 'none' },
    transfer: createNode({ opacity: 0 }),
    fade: createNode({ opacity: 0 }),
    flags: { reducedMotion },
  };
  resetP04Nodes(nodes, layout, reducedMotion);
  return nodes;
}

/** Back to the first frame for a fresh run. */
export function resetP04Nodes(
  nodes: P04Nodes,
  layout: P04Layout,
  reducedMotion = false,
): void {
  resetPercyNodes(nodes.percy);
  nodes.percy.body.x = P04_START_X;
  Object.assign(nodes.camera, { x: P04_START_X, lift: 0, scale: 1 });
  nodes.annotation.value = 'none';
  resetNode(nodes.transfer, { opacity: 0 });
  resetNode(nodes.fade, { opacity: 0 });
  nodes.flags.reducedMotion = reducedMotion;
  // The layout is read lazily by the world; touch it so a stale layout cannot
  // be created after a resize without at least one reset.
  void layout;
}
