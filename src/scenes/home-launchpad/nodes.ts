import { createNode, resetNode, type SceneNode } from '../../three/nodeState';
import {
  CROWD_ARC,
  HILL_FAR_KEYS,
  HILL_NEAR_KEYS,
  MOON,
  PAPER_CLOUDS,
  crowdFeetY,
} from './backdrop';
import {
  CROWD_ROWS,
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
  /**
   * The space wedge's apex, in design px relative to `WEDGE.apexRest`:
   * 0 = resting below the frame, -570 at lift-off, then it climbs with the
   * rocket (plan §6.2).
   */
  wedge: { motion: SceneNode };
  moon: HomeLayerNodes;
  /** Ridges and the regolith mass the crowd stands on. */
  ground: { motion: SceneNode; idle: SceneNode };
  clouds: HomeLayerNodes[];
  towers: HomeLayerNodes;
  /** Sand behind the rocket, welded to the wedge's edge (plan T7b). */
  smokeBack: HomeLayerNodes;
  /** Sand in front of the rocket, welded to the same edge. */
  smokeFront: HomeLayerNodes;
  rocket: {
    motion: SceneNode;
    idle: SceneNode;
    exhaust: SceneNode;
    vibration: SceneNode;
  };
  /** One motion node for the whole crowd, one pose pair per row so the rows
   *  never wave in unison (plan §6.1). */
  crowd: { motion: SceneNode; rows: { poseA: SceneNode; poseB: SceneNode }[] };
  flags: { launched: boolean; reducedMotion: boolean };
}

/** Resting state = the first frame of the presentation. */
function restingNodes(reducedMotion: boolean): HomeNodes {
  return {
    sky: { motion: createNode() },
    space: { fade: createNode({ opacity: 0 }) },
    wedge: { motion: createNode() },
    moon: { motion: createNode(), idle: createNode() },
    ground: { motion: createNode(), idle: createNode() },
    clouds: PAPER_CLOUDS.map(() => ({ motion: createNode(), idle: createNode() })),
    towers: { motion: createNode(), idle: createNode() },
    // Idle is the rocket waiting on the pad: no smoke at all until ignition
    // (owner lock L5). The stack fades in as the rocket climbs.
    smokeBack: { motion: createNode({ opacity: 0 }), idle: createNode() },
    smokeFront: { motion: createNode({ opacity: 0 }), idle: createNode() },
    rocket: {
      motion: createNode(),
      idle: createNode(),
      // Cold engine: nothing burns until the reader presses Play (plan T5b).
      exhaust: createNode({ opacity: 0, scaleY: 0.62 }),
      vibration: createNode(),
    },
    crowd: {
      motion: createNode(),
      rows: CROWD_ROWS.map(() => ({
        poseA: createNode(),
        poseB: createNode({ opacity: 0 }),
      })),
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
  resetNode(nodes.wedge.motion);
  for (const layer of [nodes.moon, nodes.ground, nodes.towers] as HomeLayerNodes[]) {
    resetNode(layer.motion);
    resetNode(layer.idle);
  }
  // Smoke rests hidden: it exists only while the engine is burning.
  for (const layer of [nodes.smokeBack, nodes.smokeFront] as HomeLayerNodes[]) {
    resetNode(layer.motion, { opacity: 0 });
    resetNode(layer.idle);
  }
  for (const cloud of nodes.clouds) {
    resetNode(cloud.motion);
    resetNode(cloud.idle);
  }
  resetNode(nodes.rocket.motion);
  resetNode(nodes.rocket.idle);
  resetNode(nodes.rocket.exhaust, { opacity: 0, scaleY: 0.62 });
  resetNode(nodes.rocket.vibration);
  resetNode(nodes.crowd.motion);
  for (const row of nodes.crowd.rows) {
    resetNode(row.poseA);
    resetNode(row.poseB, { opacity: 0 });
  }
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
  crowdArc: CROWD_ARC,
  crowdFeet: crowdFeetY,
  towers: TOWERS,
  clouds: PAPER_CLOUDS,
  smoke: SMOKE_LAYERS,
  crowdRows: CROWD_ROWS,
} as const;
