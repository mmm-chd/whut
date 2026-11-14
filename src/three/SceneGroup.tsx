import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import type { Group } from 'three';
import { toWorldY } from './designSpace';
import type { SceneNode } from './nodeState';

interface SceneGroupProps {
  node: SceneNode;
  /**
   * Transform origin in the parent's design coordinates (y down). Scale and
   * rotation happen about this point, like CSS `transform-origin`.
   */
  pivot?: readonly [number, number];
  children?: ReactNode;
}

function applyNode(group: Group, node: SceneNode, px: number, py: number): void {
  group.position.set(px + node.x, toWorldY(py + node.y), 0);
  group.scale.set(node.scale * node.scaleX, node.scale * node.scaleY, 1);
  group.rotation.z = (-node.rotation * Math.PI) / 180;
  group.userData.opacity = node.opacity;
  group.visible = node.opacity > 0.001;
}

/**
 * A group driven by a SceneNode. Children are laid out in the parent's design
 * coordinates; the pivot only decides what scale and rotation turn about.
 */
export function SceneGroup({ node, pivot = [0, 0], children }: SceneGroupProps) {
  const outer = useRef<Group>(null);
  const [px, py] = pivot;

  useLayoutEffect(() => {
    if (outer.current) {
      applyNode(outer.current, node, px, py);
    }
  }, [node, px, py]);

  useFrame(() => {
    if (outer.current) {
      applyNode(outer.current, node, px, py);
    }
  });

  return (
    <group ref={outer}>
      <group position={[-px, py, 0]}>{children}</group>
    </group>
  );
}
