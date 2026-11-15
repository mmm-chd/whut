import { useThree } from '@react-three/fiber';
import { useCallback, useMemo } from 'react';
import { PercyRig } from '../../characters/percy/PercyRig';
import { CameraRig } from '../../three/camera';
import { Vignette } from '../../three/layers';
import { SpriteLayer } from '../../three/SpriteLayer';
import { DESCENT_END_PERCENT, layoutP01 } from '../scene-01-jezero/layout';
import { MarsBackdrop, MarsGroundLayers, MarsWorldCamera } from '../shared/mars/MarsLandscape';
import { layoutSample } from './layout';
import type { SampleNodes } from './nodes';

/**
 * The sampling picture, drawn the way P-01, P-03 and P-04 draw theirs: the
 * shared Mars sky, clouds, ridges and ground, the layered Percy rig, and the
 * rock he is working at. Clouds stay still here so the game never competes
 * with moving sky.
 */
const ORDER = {
  sky: 0,
  clouds: 1,
  ridgeFar: 3,
  ground: 4,
  ridgeNear: 5,
  rock: 11,
  pebble: 12,
  percy: 20,
  vignette: 60,
} as const;

const VIGNETTE_RGB = [43, 26, 22] as const;

export function SampleWorld({ nodes }: { nodes: SampleNodes }) {
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const layout = useMemo(() => layoutSample(width, height), [width, height]);
  const mars = useMemo(() => layoutP01(width, height), [width, height]);

  const getPose = useCallback(
    (hostWidth: number, hostHeight: number) => ({ x: hostWidth / 2, y: hostHeight / 2, zoom: 1 }),
    [],
  );

  const descent = (DESCENT_END_PERCENT / 100) * mars.containerHeight;
  const unit = layout.unit || 1;

  return (
    <>
      <CameraRig getPose={getPose} />

      <MarsBackdrop
        camera={nodes.camera}
        unit={unit}
        layout={mars}
        descent={descent}
        width={width}
        animateClouds={false}
        order={ORDER}
      />

      <MarsWorldCamera camera={nodes.camera} unit={unit}>
        <MarsGroundLayers
          camera={nodes.camera}
          unit={unit}
          layout={mars}
          descent={descent}
          viewportWidth={width}
          maxCameraPx={1600 * unit}
          order={ORDER}
        />

        <SpriteLayer
          asset="rock-a"
          x={layout.rockX * unit}
          y={layout.groundY + 6 * unit}
          w={150 * unit}
          originX={0.5}
          originY={1}
          order={ORDER.rock}
        />
        {layout.compact ? null : (
          <SpriteLayer
            asset="rock-a"
            x={(layout.rockX + 190) * unit}
            y={layout.groundY + 24 * unit}
            w={54 * unit}
            originX={0.5}
            originY={1}
            order={ORDER.pebble}
          />
        )}

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
