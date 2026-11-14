import { createNode, type SceneNode } from '../../three/nodeState';
import {
  P02_CAMERA,
  P02_LAND,
  P02_DESIGN_HEIGHT,
  P02_DESIGN_WIDTH,
  P02_ROCKET,
  P02_ROCKET_ESTABLISHING,
  cameraTransform,
  type P02Bounds,
  type P02CameraPose,
} from './camera';
import { SMOKE_NODES } from './smoke';

/** CSS-style camera parameters: screen = (x, y) + world * scale. */
export interface P02CameraNode {
  x: number;
  y: number;
  scale: number;
}

/**
 * Animation state the P-02 timeline drives and the WebGL world reads.
 * One object per mounted scene; `resetP02Nodes` puts it back to rest for a
 * restarted run.
 */
export interface P02Nodes {
  camera: P02CameraNode;
  shake: SceneNode;
  rocket: SceneNode;
  vibration: SceneNode;
  exhaust: SceneNode;
  closeup: SceneNode;
  land: SceneNode;
  windowGinny: SceneNode;
  closeupPercy: SceneNode;
  closeupGinny: SceneNode;
  skyCap: SceneNode;
  smoke: SceneNode[];
  flags: { launching: boolean; reducedMotion: boolean };
}

export const P02_ROCKET_PIVOT = {
  x: P02_ROCKET.centerX,
  /** CSS `transform-origin: 50% 97%` of the rocket box. */
  y: P02_ROCKET.top + (P02_ROCKET_ESTABLISHING.originY / 100) * P02_ROCKET.height,
} as const;

/** The exhaust box hangs from the rocket box at this offset (see Scene.css era). */
export const P02_EXHAUST_BOX = {
  left: P02_ROCKET.centerX - P02_ROCKET.width / 2,
  top: P02_ROCKET.top + 838,
  width: P02_ROCKET.width,
  height: 260,
} as const;

function cameraNode(pose: P02CameraPose): P02CameraNode {
  return { ...cameraTransform(pose) };
}

/**
 * Resting state = the first frame of the cue sheet (the timeline sets the same
 * values at 0), so the very first rendered frame is already correct.
 */
function restingNodes(reducedMotion: boolean): P02Nodes {
  return {
    camera: cameraNode(P02_CAMERA.establishing),
    shake: createNode(),
    rocket: createNode({
      y: P02_ROCKET_ESTABLISHING.offsetY,
      scale: P02_ROCKET_ESTABLISHING.scale,
    }),
    vibration: createNode(),
    exhaust: createNode({ opacity: 0, scaleY: 0.4 }),
    closeup: createNode({ opacity: 0, scale: reducedMotion ? 1 : 1.04 }),
    land: createNode({ y: P02_LAND.establishingOffsetY }),
    windowGinny: createNode({ opacity: 0 }),
    closeupPercy: createNode({ opacity: 0, y: 60 }),
    closeupGinny: createNode({ opacity: 0, y: 60 }),
    skyCap: createNode({ opacity: 0 }),
    smoke: SMOKE_NODES.map(() => createNode({ opacity: 0, scale: 0.6 })),
    flags: { launching: false, reducedMotion },
  };
}

export function createP02Nodes(reducedMotion = false): P02Nodes {
  return restingNodes(reducedMotion);
}

export function resetP02Nodes(nodes: P02Nodes, reducedMotion = false): void {
  const rest = restingNodes(reducedMotion);
  Object.assign(nodes.camera, rest.camera);
  Object.assign(nodes.shake, rest.shake);
  Object.assign(nodes.rocket, rest.rocket);
  Object.assign(nodes.vibration, rest.vibration);
  Object.assign(nodes.exhaust, rest.exhaust);
  Object.assign(nodes.closeup, rest.closeup);
  Object.assign(nodes.land, rest.land);
  Object.assign(nodes.windowGinny, rest.windowGinny);
  Object.assign(nodes.closeupPercy, rest.closeupPercy);
  Object.assign(nodes.closeupGinny, rest.closeupGinny);
  Object.assign(nodes.skyCap, rest.skyCap);
  nodes.smoke.forEach((node, index) => Object.assign(node, rest.smoke[index]));
  Object.assign(nodes.flags, rest.flags);
}

/** The camera pose a CSS-style camera node stands for, shake included. */
export function p02CameraPose(nodes: P02Nodes): P02CameraPose {
  const { camera, shake } = nodes;
  const scale = camera.scale > 0 ? camera.scale : 1;
  return {
    // The shake moves the picture, so the view moves the opposite way.
    centerX: (P02_DESIGN_WIDTH / 2 - camera.x - shake.x) / scale,
    centerY: (P02_DESIGN_HEIGHT / 2 - camera.y - shake.y) / scale,
    scale,
  };
}

/**
 * Design-frame bounds of the rocket plus its exhaust, from node state alone.
 * This replaces the old getBoundingClientRect measurement: it runs in jsdom
 * and does not depend on the host layout. Transparent padding counts, as it
 * did for the DOM boxes.
 */
export function getP02NodeBounds(nodes: P02Nodes): P02Bounds {
  const { rocket, exhaust, camera } = nodes;
  const rocketScale = rocket.scale * rocket.scaleX;
  const rocketScaleY = rocket.scale * rocket.scaleY;
  const toWorld = (x: number, y: number) => ({
    x: P02_ROCKET_PIVOT.x + (x - P02_ROCKET_PIVOT.x) * rocketScale + rocket.x,
    y: P02_ROCKET_PIVOT.y + (y - P02_ROCKET_PIVOT.y) * rocketScaleY + rocket.y,
  });

  const bodyLeft = P02_ROCKET.centerX - P02_ROCKET.width / 2;
  const bodyRight = P02_ROCKET.centerX + P02_ROCKET.width / 2;
  const exhaustBottom =
    P02_EXHAUST_BOX.top + P02_EXHAUST_BOX.height * exhaust.scale * exhaust.scaleY;

  const topLeft = toWorld(bodyLeft, P02_ROCKET.top);
  const bottomRight = toWorld(
    bodyRight,
    Math.max(P02_ROCKET.top + P02_ROCKET.height, exhaustBottom),
  );

  return {
    left: camera.x + topLeft.x * camera.scale,
    top: camera.y + topLeft.y * camera.scale,
    right: camera.x + bottomRight.x * camera.scale,
    bottom: camera.y + bottomRight.y * camera.scale,
  };
}
