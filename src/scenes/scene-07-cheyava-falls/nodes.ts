import { createPercyNodes, resetPercyNodes, type PercyNodes } from '../../characters/percy/percyNodes';
import { createNode, resetNode, type SceneNode } from '../../three/nodeState';
import type { P06Layout } from './layout';

/**
 * The animation state the intro drives and the WebGL world reads.
 *
 * Positions are design units; `World` converts them. Nothing in here is React
 * state: the timeline writes into these nodes every frame, so the intro never
 * re-renders the scene.
 */
export interface P06Nodes {
  readonly percy: PercyNodes;
  /** x: world x, lift: view raise, scale: zoom about the view centre. */
  readonly camera: { x: number; lift: number; scale: number };
  /** The ancient-river valley fades in behind the time skip. */
  readonly valley: SceneNode;
  /** The restrained attention ring around the Cheyava rock. */
  readonly marker: SceneNode;
  /** Full-frame black used by the time skip and the ending. */
  readonly fade: SceneNode;
  readonly flags: { reducedMotion: boolean };
}

export function createP06Nodes(reducedMotion = false): P06Nodes {
  return {
    percy: createPercyNodes(),
    camera: { x: 0, lift: 0, scale: 1 },
    valley: createNode({ opacity: 0 }),
    marker: createNode({ opacity: 0, scale: 0.7 }),
    fade: createNode({ opacity: 0 }),
    flags: { reducedMotion },
  };
}

/** Back to the first frame of the journey for a fresh run. */
export function resetP06Nodes(nodes: P06Nodes, layout: P06Layout, reducedMotion = false): void {
  resetPercyNodes(nodes.percy);
  nodes.percy.body.x = layout.startX;
  nodes.percy.body.opacity = 1;
  Object.assign(nodes.camera, {
    x: layout.journey.x,
    lift: layout.journey.lift,
    scale: layout.journey.scale,
  });
  resetNode(nodes.valley, { opacity: 0 });
  resetNode(nodes.marker, { opacity: 0, scale: 0.7 });
  resetNode(nodes.fade, { opacity: 0 });
  nodes.flags.reducedMotion = reducedMotion;
}
