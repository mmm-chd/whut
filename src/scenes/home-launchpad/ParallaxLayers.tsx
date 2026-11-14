import { useFrame } from '@react-three/fiber';
import { useMemo, type ReactNode } from 'react';
import { createNode, type SceneNode } from '../../three/nodeState';
import { SceneGroup } from '../../three/SceneGroup';
import { LERP } from './layers';
import { homeParallax, layerOffset } from './parallax';

/**
 * Advances the shared parallax smoothing once per frame. Mounted once, inside
 * the canvas; every ParallaxGroup then reads the shared current value.
 */
export function ParallaxDriver({ reducedMotion }: { reducedMotion: boolean }) {
  useFrame(() => {
    const state = homeParallax;
    if (reducedMotion) {
      state.current.x = 0;
      state.current.y = 0;
      return;
    }
    state.current.x += (state.target.x - state.current.x) * LERP;
    state.current.y += (state.target.y - state.current.y) * LERP;
  });
  return null;
}

interface ParallaxGroupProps {
  depth: number;
  maxShift?: number;
  /** Degrees at full deflection (rocket tilt). 0 disables rotation. */
  tilt?: number;
  /** Rotation/scale pivot in parent design coordinates. */
  pivot?: readonly [number, number];
  children?: ReactNode;
}

/**
 * A layer that shifts (and optionally tilts) with the cursor every frame,
 * wrapping the timeline-driven groups inside it.
 */
export function ParallaxGroup({
  depth,
  maxShift,
  tilt = 0,
  pivot,
  children,
}: ParallaxGroupProps) {
  const node = useMemo<SceneNode>(() => createNode(), []);

  useFrame(() => {
    const pointer = homeParallax.current;
    const offset = layerOffset(pointer, depth, maxShift);
    node.x = offset.x;
    node.y = offset.y;
    node.rotation = tilt !== 0 ? pointer.x * tilt : 0;
  });

  return (
    <SceneGroup node={node} pivot={pivot}>
      {children}
    </SceneGroup>
  );
}
