import type { Object3D } from 'three';

/**
 * Opacity is inherited the way CSS opacity is: a SceneGroup writes its node
 * opacity to `userData.opacity`, and a sprite multiplies every ancestor's
 * value into its own. (Overlapping layers that must fade as one unit use
 * FadeGroup, which composites them in a render target first.)
 */
export function inheritedOpacity(object: Object3D): number {
  let opacity = 1;
  for (let parent = object.parent; parent; parent = parent.parent) {
    const value = parent.userData.opacity as number | undefined;
    if (value !== undefined) {
      opacity *= value;
    }
  }
  return opacity;
}
