import { createPercyNodes, resetPercyNodes, type PercyNodes } from '../../characters/percy/percyNodes';
import { createNode, resetNode, type SceneNode } from '../../three/nodeState';
import { DOOR, PERCY_HALF_WIDTH, ROCKET, type P03Layout } from './layout';

/** Touchdown ring puffs (0..2) and exit puffs (3..5). */
export const P03_DUST_COUNT = 6;

/**
 * Animation state the P-03 timeline drives and the WebGL world reads.
 * Positions are design units; the world converts them to pixels.
 */
export interface P03Nodes {
  percy: PercyNodes;
  /** x: world x; lift: view raise; scale: zoom about the view centre. */
  camera: { x: number; lift: number; scale: number };
  /** `y` is design units above the landed position (negative is up). */
  rocket: SceneNode;
  /** 0 closed .. 1 open. */
  door: { open: number };
  dust: SceneNode[];
  /** Opacity of the scan ring at the rock. */
  scan: SceneNode;
  /** Rover cards: how many are revealed, and whether the row is visible. */
  cards: { shown: number; visible: number };
  flags: { reducedMotion: boolean };
}

export function createP03Nodes(reducedMotion = false): P03Nodes {
  return {
    percy: createPercyNodes(),
    camera: { x: ROCKET.x + 60, lift: 0, scale: 1 },
    rocket: createNode({ y: -ROCKET.dropHeight }),
    door: { open: 0 },
    dust: Array.from({ length: P03_DUST_COUNT }, () => createNode({ opacity: 0, scale: 0.6 })),
    scan: createNode({ opacity: 0 }),
    cards: { shown: 0, visible: 0 },
    flags: { reducedMotion },
  };
}

/** Back to the first frame of the cue sheet for a fresh run. */
export function resetP03Nodes(nodes: P03Nodes, layout: P03Layout, reducedMotion = false): void {
  resetPercyNodes(nodes.percy);
  nodes.percy.body.x = layout.jumpFromX;
  // He waits on the sill, high in the hull; the jump brings him down to 0.
  nodes.percy.body.y = -DOOR.sill;
  // Unseen until the door is open: he fades in at the sill, then jumps.
  nodes.percy.body.opacity = 0;
  Object.assign(nodes.camera, {
    x: layout.poses.landing.x,
    lift: layout.poses.landing.lift,
    scale: layout.poses.landing.scale,
  });
  resetNode(nodes.rocket, { y: -ROCKET.dropHeight });
  nodes.door.open = 0;
  nodes.dust.forEach((node) => resetNode(node, { opacity: 0, scale: 0.6 }));
  resetNode(nodes.scan, { opacity: 0 });
  nodes.cards.shown = 0;
  nodes.cards.visible = 0;
  nodes.flags.reducedMotion = reducedMotion;
}

interface ScreenSpan {
  left: number;
  right: number;
}

/** Host-pixel span of Percy's visible width at the current camera. */
export function percyScreenSpan(nodes: P03Nodes, layout: P03Layout): ScreenSpan {
  const { camera, percy } = nodes;
  const { unit, width } = layout;
  const toScreen = (designX: number) => width / 2 + camera.scale * (designX - camera.x) * unit;
  return {
    left: toScreen(percy.body.x - PERCY_HALF_WIDTH),
    right: toScreen(percy.body.x + PERCY_HALF_WIDTH),
  };
}

/**
 * Percy has left the picture when his whole visible width is past the right
 * edge by the margin. Pure math from node state, like the P-02 rocket check.
 */
export function isPercyOffscreen(nodes: P03Nodes, layout: P03Layout, margin = 24): boolean {
  const span = percyScreenSpan(nodes, layout);
  return span.left >= layout.width + margin * layout.unit || span.right <= -margin * layout.unit;
}
