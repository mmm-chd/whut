import {
  createPercyNodes,
  resetPercyNodes,
  type PercyNodes,
} from '../../characters/percy/percyNodes';
import type { SampleLayout } from './layout';

/**
 * Animation state of the sampling picture: Percy's rig and a nearly fixed
 * camera. The world reads these every frame; the scene only writes them when a
 * pose changes, so a still game schedules no work.
 */
export interface SampleNodes {
  percy: PercyNodes;
  camera: { x: number; lift: number; scale: number };
  flags: { reducedMotion: boolean };
}

export function createSampleNodes(layout: SampleLayout, reducedMotion = false): SampleNodes {
  const nodes: SampleNodes = {
    percy: createPercyNodes(),
    camera: { x: 0, lift: 0, scale: 1 },
    flags: { reducedMotion },
  };
  resetSampleNodes(nodes, layout, reducedMotion);
  return nodes;
}

export function resetSampleNodes(
  nodes: SampleNodes,
  layout: SampleLayout,
  reducedMotion = false,
): void {
  resetPercyNodes(nodes.percy);
  nodes.percy.body.x = layout.percyX;
  Object.assign(nodes.camera, { x: layout.cameraX, lift: 0, scale: 1 });
  nodes.flags.reducedMotion = reducedMotion;
}
