import { useFrame } from '@react-three/fiber';
import { useMemo, type ReactNode } from 'react';
import { createNode, type SceneNode } from '../../three/nodeState';
import { SceneGroup } from '../../three/SceneGroup';
import { BOOK_LERP, bookParallax, parallaxOffset } from './parallax';

/** Advances the backdrop smoothing once per frame, inside the canvas. */
export function BookParallaxDriver({ reducedMotion }: { reducedMotion: boolean }) {
  useFrame(() => {
    if (reducedMotion) {
      bookParallax.current.x = 0;
      bookParallax.current.y = 0;
      return;
    }
    bookParallax.current.x += (bookParallax.target.x - bookParallax.current.x) * BOOK_LERP;
    bookParallax.current.y += (bookParallax.target.y - bookParallax.current.y) * BOOK_LERP;
  });
  return null;
}

/** A backdrop layer that shifts slightly with the cursor. */
export function BookParallaxGroup({ depth, children }: { depth: number; children?: ReactNode }) {
  const node = useMemo<SceneNode>(() => createNode(), []);
  useFrame(() => {
    const offset = parallaxOffset(bookParallax.current, depth);
    node.x = offset.x;
    node.y = offset.y;
  });
  return <SceneGroup node={node}>{children}</SceneGroup>;
}
