import { createNode, resetNode, type SceneNode } from '../../three/nodeState';
import {
  HILL_FAR_KEYS,
  HILL_NEAR_KEYS,
  MOON,
  PAPER_CLOUDS,
  SEA_KEYS,
} from './backdrop';
import {
  BOAT,
  CROWD,
  FLAME,
  ROCKET,
  SMOKE_LAYERS,
  SMOKE_SPRITE_ASPECT,
  TOWERS,
} from './layers';

/**
 * Animation state the launch timeline drives and the WebGL world reads
 * (same pattern as P-02's nodes.ts). One object per mounted scene.
 */
export interface HomeLayerNodes {
  /** Launch timeline: the liftoff shift (and smoke cover scale). */
  motion: SceneNode;
  /** Idle loops: breathing, bobbing, drifting. */
  idle: SceneNode;
}

export interface HomeNodes {
  sky: { motion: SceneNode };
  /** Deep-space overlay revealed behind the smoke during the transition. */
  space: { fade: SceneNode };
  moon: HomeLayerNodes;
  sea: { motion: SceneNode; idle: SceneNode };
  boat: HomeLayerNodes;
  clouds: HomeLayerNodes[];
  towers: HomeLayerNodes;
  smokeFar: HomeLayerNodes;
  smokeMid: HomeLayerNodes;
  smokeNear: HomeLayerNodes;
  rocket: {
    motion: SceneNode;
    idle: SceneNode;
    exhaust: SceneNode;
    vibration: SceneNode;
  };
  crowd: { motion: SceneNode; poseA: SceneNode; poseB: SceneNode };
  flags: { launched: boolean; reducedMotion: boolean };
}

/** Resting state = the first frame of the presentation. */
function restingNodes(reducedMotion: boolean): HomeNodes {
  return {
    sky: { motion: createNode() },
    space: { fade: createNode({ opacity: 0 }) },
    moon: { motion: createNode(), idle: createNode() },
    sea: { motion: createNode(), idle: createNode() },
    boat: { motion: createNode(), idle: createNode() },
    clouds: PAPER_CLOUDS.map(() => ({ motion: createNode(), idle: createNode() })),
    towers: { motion: createNode(), idle: createNode() },
    smokeFar: { motion: createNode(), idle: createNode() },
    smokeMid: { motion: createNode(), idle: createNode() },
    smokeNear: { motion: createNode(), idle: createNode() },
    rocket: {
      motion: createNode(),
      idle: createNode(),
      // The pilot flame glows dimly while the rocket waits (concept 4.7).
      exhaust: createNode({ opacity: 0.85, scaleY: 0.62 }),
      vibration: createNode(),
    },
    crowd: {
      motion: createNode(),
      poseA: createNode(),
      poseB: createNode({ opacity: 0 }),
    },
    flags: { launched: false, reducedMotion },
  };
}

export function createHomeNodes(reducedMotion = false): HomeNodes {
  return restingNodes(reducedMotion);
}

export function resetHomeNodes(nodes: HomeNodes, reducedMotion = false): void {
  resetNode(nodes.sky.motion);
  resetNode(nodes.space.fade, { opacity: 0 });
  for (const layer of [
    nodes.moon,
    nodes.sea,
    nodes.boat,
    nodes.towers,
    nodes.smokeFar,
    nodes.smokeMid,
    nodes.smokeNear,
  ] as HomeLayerNodes[]) {
    resetNode(layer.motion);
    resetNode(layer.idle);
  }
  for (const cloud of nodes.clouds) {
    resetNode(cloud.motion);
    resetNode(cloud.idle);
  }
  resetNode(nodes.rocket.motion);
  resetNode(nodes.rocket.idle);
  resetNode(nodes.rocket.exhaust, { opacity: 0.85, scaleY: 0.62 });
  resetNode(nodes.rocket.vibration);
  resetNode(nodes.crowd.motion);
  resetNode(nodes.crowd.poseA);
  resetNode(nodes.crowd.poseB, { opacity: 0 });
  Object.assign(nodes.flags, { launched: false, reducedMotion });
}

/** Centre point of a smoke cluster sprite, used as the scale pivot. */
export function smokeClusterCenter(cluster: {
  left: number;
  top: number;
  width: number;
}): [number, number] {
  const height = cluster.width / SMOKE_SPRITE_ASPECT;
  return [cluster.left + cluster.width / 2, cluster.top + height / 2];
}

/** Bottom-centre pivot so the transition smoke grows upward over the frame. */
export function smokeClusterBase(cluster: {
  left: number;
  top: number;
  width: number;
}): [number, number] {
  const height = cluster.width / SMOKE_SPRITE_ASPECT;
  return [cluster.left + cluster.width / 2, cluster.top + height];
}

/** Exposed for tests and the HUD projection. */
export const HOME_LAYOUT = {
  rocket: ROCKET,
  flame: FLAME,
  moon: MOON,
  hills: { far: HILL_FAR_KEYS, near: HILL_NEAR_KEYS },
  sea: SEA_KEYS,
  towers: TOWERS,
  clouds: PAPER_CLOUDS,
  boat: BOAT,
  smoke: SMOKE_LAYERS,
  crowd: CROWD,
} as const;
