import { createPercyNodes, resetPercyNodes, type PercyNodes } from '../../characters/percy/percyNodes';
import { createNode, resetNode, type SceneNode } from '../../three/nodeState';
import type { MarsCameraPose } from '../shared/mars/MarsLandscape';
import type { P08Layout } from './layout';
import { TRACK_COUNT } from './tracks';

/**
 * What the driver writes and the world reads each frame. Nothing here is React
 * state, so a rolling Percy and a moving camera cost no renders. The track
 * array is allocated once; its length never changes.
 */
export interface P08Nodes {
  readonly percy: PercyNodes;
  readonly camera: MarsCameraPose;
  /** 1 while the sample tray is the picture, 0 once the side view takes over. */
  readonly sampleReveal: SceneNode;
  /** Opacity of the black cover used by the entry, close-ups and the final fade. */
  readonly cover: { opacity: number };
  /** Opacity of the Mars world; the samples phase hides it. */
  readonly world: { opacity: number };
  readonly trackOpacity: Float32Array;
  /** World x the track row starts from; set when Percy begins to roll away. */
  readonly trackOrigin: { x: number };
  readonly flags: { reducedMotion: boolean };
}

export function createP08Nodes(layout: P08Layout, reducedMotion = false): P08Nodes {
  const nodes: P08Nodes = {
    percy: createPercyNodes(),
    camera: { x: 0, lift: 0, scale: 1 },
    sampleReveal: createNode({ opacity: 0 }),
    cover: { opacity: 0 },
    world: { opacity: 0 },
    trackOpacity: new Float32Array(TRACK_COUNT),
    trackOrigin: { x: 0 },
    flags: { reducedMotion },
  };
  resetP08Nodes(nodes, layout, reducedMotion);
  return nodes;
}

export function resetP08Nodes(nodes: P08Nodes, layout: P08Layout, reducedMotion = false): void {
  resetPercyNodes(nodes.percy);
  nodes.percy.body.x = layout.hopeStartX;
  Object.assign(nodes.camera, { x: layout.followX(layout.hopeStartX), lift: 0, scale: 1 });
  resetNode(nodes.sampleReveal, { opacity: 0 });
  nodes.cover.opacity = 0;
  nodes.world.opacity = 0;
  nodes.trackOpacity.fill(0);
  nodes.trackOrigin.x = layout.hopeStartX;
  nodes.flags.reducedMotion = reducedMotion;
}
