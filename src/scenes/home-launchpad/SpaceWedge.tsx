import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { Group } from 'three';
import { DESIGN_HEIGHT } from '../../three/designSpace';
import { FlatShapes, ShapedGradient } from '../../three/layers';
import { SceneGroup } from '../../three/SceneGroup';
import { SpriteMesh } from '../../three/SpriteLayer';
import type { LoadedTexture } from '../../three/textures';
import { SPACE_STOPS, spaceStars } from '../shared/space';
import type { HomeNodes } from './nodes';
import { WEDGE, wedgeEdgeY, wedgePolygon } from './wedge';

export interface WedgeOrders {
  shadow: number;
  rim: number;
  fill: number;
  star: number;
}

/** How far below the edge a star has to be before it is fully lit, design px. */
const STAR_FADE = 90;

/**
 * The space wedge (plan §6.2, T8b).
 *
 * Three outlines of the same jagged shape — a 26 px soft shadow, a 10 px cream
 * rim and the space fill on top of them — rise as one rigid body, because the
 * prototype only ever changes the apex height. The fill samples the space
 * gradient by screen y (see `ShapedGradient`), so the space does not travel with
 * the shape.
 *
 * The star field is screen-fixed: the stars are the journal's stars, and they
 * light up exactly as the edge passes them, so nothing sparkles in the sky the
 * rocket has not left yet.
 */
export function SpaceWedge({ nodes, dot, orders }: { nodes: HomeNodes; dot: LoadedTexture | null; orders: WedgeOrders }) {
  const polygons = useMemo(
    () => ({
      fill: wedgePolygon(WEDGE.apexRest, 0),
      rim: wedgePolygon(WEDGE.apexRest, WEDGE.rim),
      shadow: wedgePolygon(WEDGE.apexRest, WEDGE.shadow),
    }),
    [],
  );
  const stars = useMemo(() => spaceStars(), []);
  const starGroups = useRef<Group[]>([]);

  useFrame(() => {
    const apex = WEDGE.apexRest + nodes.wedge.motion.y;
    stars.forEach((star, index) => {
      const group = starGroups.current[index];
      if (!group) {
        return;
      }
      // Revealed when the edge has passed the star: the wedge is everything
      // below the edge, so a star is lit once the edge is *above* it. One frame
      // of arithmetic per star, no per-star tween to keep in step with the climb.
      const covered = star.y - wedgeEdgeY(star.x, apex);
      const fade = Math.min(1, Math.max(0, covered / STAR_FADE));
      group.userData.opacity = fade;
      group.visible = fade > 0.01;
    });
  });

  return (
    <>
      <SceneGroup node={nodes.wedge.motion}>
        <FlatShapes
          rawSrgb
          polygons={[polygons.shadow]}
          color="#0e1b30"
          opacity={0.3}
          order={orders.shadow}
        />
        <FlatShapes rawSrgb polygons={[polygons.rim]} color="#f3e3c3" order={orders.rim} />
        <ShapedGradient
          polygon={polygons.fill}
          stops={SPACE_STOPS}
          top={0}
          bottom={DESIGN_HEIGHT}
          order={orders.fill}
        />
      </SceneGroup>
      {dot
        ? stars.map((star, index) => (
            <group
              key={`wedge-star-${index}`}
              ref={(group) => {
                if (group) {
                  starGroups.current[index] = group;
                }
              }}
              visible={false}
            >
              <SpriteMesh
                source={dot}
                x={star.x - star.r}
                y={star.y - star.r}
                w={star.r * 2}
                h={star.r * 2}
                order={orders.star}
              />
            </group>
          ))
        : null}
    </>
  );
}
