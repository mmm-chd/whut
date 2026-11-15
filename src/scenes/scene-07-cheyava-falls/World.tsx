import { useThree } from '@react-three/fiber';
import { useCallback, useMemo } from 'react';
import { PercyRig } from '../../characters/percy/PercyRig';
import { CameraRig } from '../../three/camera';
import { RingPulse } from '../../three/effects';
import { Vignette } from '../../three/layers';
import { SceneGroup } from '../../three/SceneGroup';
import { SpriteLayer } from '../../three/SpriteLayer';
import { DESCENT_END_PERCENT, layoutP01 } from '../scene-01-jezero/layout';
import {
  MarsBackdrop,
  MarsGroundLayers,
  MarsWorldCamera,
} from '../shared/mars/MarsLandscape';
import { layoutP06 } from './layout';
import type { P06Nodes } from './nodes';

/**
 * The P-06 picture, drawn with WebGL: the same landscape layers P-01 and P-03
 * use, with Percy on the ground and a cluster of rocks that stands in for the
 * ancient river valley. Paint order replaces CSS z-index.
 */
const ORDER = {
  sky: 0,
  clouds: 1,
  ridgeFar: 3,
  ground: 4,
  ridgeNear: 5,
  valleyRockFar: 8,
  valleyRockNear: 10,
  marker: 13,
  percy: 20,
  vignette: 60,
} as const;

const VIGNETTE_RGB = [43, 26, 22] as const;

/** Rock sizes in design units: two small stones behind, the fallen slab in front. */
const VALLEY_ROCKS = [
  { asset: 'rock-b', dx: -260, width: 190, order: ORDER.valleyRockFar },
  { asset: 'rock-b', dx: 300, width: 150, order: ORDER.valleyRockFar },
  { asset: 'rock-a', dx: 0, width: 300, order: ORDER.valleyRockNear },
] as const;

export function P06World({ nodes }: { nodes: P06Nodes }) {
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const layout = useMemo(() => layoutP06(width, height), [width, height]);
  const mars = useMemo(() => layoutP01(width, height), [width, height]);
  const { unit, groundY } = layout;

  const getPose = useCallback(
    (hostWidth: number, hostHeight: number) => ({ x: hostWidth / 2, y: hostHeight / 2, zoom: 1 }),
    [],
  );

  /** Same descent P-01 ends on: the container bottom meets the viewport bottom. */
  const descent = (DESCENT_END_PERCENT / 100) * mars.containerHeight;
  const animateClouds = !nodes.flags.reducedMotion;

  return (
    <>
      <CameraRig getPose={getPose} />

      <MarsBackdrop
        camera={nodes.camera}
        unit={unit}
        layout={mars}
        descent={descent}
        width={width}
        animateClouds={animateClouds}
        order={ORDER}
      />

      <MarsWorldCamera camera={nodes.camera} unit={unit}>
        <MarsGroundLayers
          camera={nodes.camera}
          unit={unit}
          layout={mars}
          descent={descent}
          viewportWidth={width}
          maxCameraPx={Math.max(layout.rockX, layout.exitX) * unit + 1200 * unit}
          order={ORDER}
        />

        {/* The valley fades in after the time skip, so the journey behind it can be the same land. */}
        <SceneGroup node={nodes.valley}>
          {VALLEY_ROCKS.map((rock, index) => (
            <SpriteLayer
              key={`valley-${index}`}
              asset={rock.asset}
              x={(layout.rockX + rock.dx) * unit}
              y={groundY + 6 * unit}
              w={rock.width * unit}
              originX={0.5}
              originY={1}
              order={rock.order}
            />
          ))}
        </SceneGroup>

        <SceneGroup node={nodes.marker}>
          <RingPulse
            centerX={layout.rockX * unit}
            centerY={groundY - 60 * unit}
            diameter={240 * unit}
            paused={nodes.flags.reducedMotion}
            order={ORDER.marker}
          />
        </SceneGroup>

        <PercyRig nodes={nodes.percy} unit={unit} groundY={groundY} order={ORDER.percy} />
      </MarsWorldCamera>

      <Vignette
        centerX={0.5}
        centerY={0.45}
        inner={0.45}
        rgb={VIGNETTE_RGB}
        alpha={0.28}
        order={ORDER.vignette}
      />
    </>
  );
}
