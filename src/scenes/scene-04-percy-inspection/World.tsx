import { useThree } from '@react-three/fiber';
import { useCallback, useMemo } from 'react';
import { PercyRig } from '../../characters/percy/PercyRig';
import { CameraRig } from '../../three/camera';
import { Vignette } from '../../three/layers';
import { SpriteLayer } from '../../three/SpriteLayer';
import { MarsBackdrop, MarsGroundLayers, MarsWorldCamera } from '../shared/mars/MarsLandscape';
import { DESCENT_END_PERCENT, layoutP01 } from '../scene-01-jezero/layout';
import { layoutP04 } from './layout';
import type { P04Nodes } from './nodes';

/**
 * The P-04 picture, drawn with WebGL in the same language as P-01 and P-03:
 * the shared Mars sky, clouds, ridges and ground, the layered Percy rig, and
 * the rock he will return to. Paint order replaces CSS z-index.
 */
const ORDER = {
  sky: 0,
  clouds: 1,
  ridgeFar: 3,
  ground: 4,
  ridgeNear: 5,
  rock: 11,
  percy: 20,
  vignette: 60,
} as const;

const VIGNETTE_RGB = [43, 26, 22] as const;

export function P04World({ nodes }: { nodes: P04Nodes }) {
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const layout = useMemo(() => layoutP04(width, height), [width, height]);
  const mars = useMemo(() => layoutP01(width, height), [width, height]);

  const getPose = useCallback(
    (hostWidth: number, hostHeight: number) => ({ x: hostWidth / 2, y: hostHeight / 2, zoom: 1 }),
    [],
  );

  /** Same descent P-01 ends on, so the ground line matches P-03. */
  const descent = (DESCENT_END_PERCENT / 100) * mars.containerHeight;
  const unit = layout.unit || 1;
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
          maxCameraPx={(layout.returnRockX + 900) * unit}
          order={ORDER}
        />

        {/* The rock Percy walks back to for P-05. */}
        <SpriteLayer
          asset="rock-a"
          x={layout.returnRockX * unit}
          y={layout.groundY + 6 * unit}
          w={140 * unit}
          originX={0.5}
          originY={1}
          order={ORDER.rock}
        />

        <PercyRig nodes={nodes.percy} unit={unit} groundY={layout.groundY} order={ORDER.percy} />
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
