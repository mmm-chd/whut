/**
 * Plain animation state for one scene node.
 *
 * Timelines tween these numbers (GSAP happily tweens plain objects); the
 * WebGL layer reads them every frame. Nothing here touches the DOM or
 * three.js, so cue sheets run and test in jsdom.
 *
 * Units are design pixels (y down) and degrees, matching the CSS-era
 * transforms: the effective scale on each axis is `scale * scaleX|Y`.
 */
export interface SceneNode {
  x: number;
  y: number;
  scale: number;
  scaleX: number;
  scaleY: number;
  /** Degrees, clockwise on screen. */
  rotation: number;
  opacity: number;
}

export function createNode(init: Partial<SceneNode> = {}): SceneNode {
  return {
    x: 0,
    y: 0,
    scale: 1,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    opacity: 1,
    ...init,
  };
}

/** Puts a node back to its defaults (a restarted run begins from rest). */
export function resetNode(node: SceneNode, init: Partial<SceneNode> = {}): void {
  Object.assign(node, createNode(init));
}
