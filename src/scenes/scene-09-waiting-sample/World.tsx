import { useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import type { Group } from 'three';
import { PercyRig } from '../../characters/percy/PercyRig';
import { CameraRig } from '../../three/camera';
import { Vignette } from '../../three/layers';
import { inheritedOpacity } from '../../three/sceneGraph';
import { SpriteMesh } from '../../three/SpriteLayer';
import { DESCENT_END_PERCENT, layoutP01 } from '../scene-01-jezero/layout';
import { MarsBackdrop, MarsGroundLayers, MarsWorldCamera } from '../shared/mars/MarsLandscape';
import { layoutP08 } from './layout';
import type { P08Nodes } from './nodes';
import { createTrackTexture } from './trackArt';
import { TRACK_COUNT, trackX } from './tracks';

/**
 * The ending's side-view picture, built from the same pieces as P-03 and P-04:
 * the shared Mars sky, ridges and ground, the layered Percy rig, and one new
 * row of track stamps. The clouds stay still so nothing competes with the
 * words. The whole world fades with `nodes.world`, which hides it while the
 * samples are the picture.
 */
const ORDER = {
  sky: 0,
  clouds: 1,
  ridgeFar: 3,
  ground: 4,
  ridgeNear: 5,
  tracks: 12,
  percy: 20,
  vignette: 60,
} as const;

/** Evening: a deep warm-violet edge, heavier than the daytime scenes. */
const VIGNETTE_RGB = [52, 28, 38] as const;
/** Tread stamps sit just under the wheels. */
const TRACK_DROP = 30;
/** Each stamp is drawn this wide, so a few of them read as a trail from a distance. */
const TRACK_DRAW_WIDTH = 124;

function Stamp({
  index,
  nodes,
  unit,
  groundY,
  texture,
}: {
  index: number;
  nodes: P08Nodes;
  unit: number;
  groundY: number;
  texture: NonNullable<ReturnType<typeof createTrackTexture>>['texture'];
}) {
  return (
    <SpriteMesh
      source={texture}
      x={0}
      y={groundY + TRACK_DROP * unit}
      w={TRACK_DRAW_WIDTH * unit}
      originX={0.5}
      originY={0.5}
      order={ORDER.tracks}
      opacity={0}
      onFrame={(mesh, material) => {
        // Each stamp reads its own opacity and place from the nodes every frame.
        mesh.position.x = trackX(nodes.trackOrigin.x, index) * unit;
        const value = nodes.trackOpacity[index] * inheritedOpacity(mesh);
        material.uniforms.uOpacity.value = value;
        mesh.visible = value > 0.001;
      }}
    />
  );
}

function WorldFade({ nodes, children }: { nodes: P08Nodes; children: ReactNode }) {
  const ref = useRef<Group>(null);
  useFrame(() => {
    const group = ref.current;
    if (!group) {
      return;
    }
    group.userData.opacity = nodes.world.opacity;
    group.visible = nodes.world.opacity > 0.001;
  });
  return <group ref={ref}>{children}</group>;
}

export function P08World({ nodes, budgetMs }: { nodes: P08Nodes; budgetMs: number }) {
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const layout = useMemo(() => layoutP08(width, height, budgetMs), [width, height, budgetMs]);
  const mars = useMemo(() => layoutP01(width, height), [width, height]);
  const track = useMemo(() => createTrackTexture(), []);
  useEffect(() => () => track?.dispose(), [track]);

  const getPose = useCallback(
    (hostWidth: number, hostHeight: number) => ({ x: hostWidth / 2, y: hostHeight / 2, zoom: 1 }),
    [],
  );

  if (!layout) {
    return <CameraRig getPose={getPose} />;
  }
  const { unit, groundY } = layout;
  const descent = (DESCENT_END_PERCENT / 100) * mars.containerHeight;

  return (
    <>
      <CameraRig getPose={getPose} />
      <WorldFade nodes={nodes}>
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
            maxCameraPx={layout.maxCameraX * unit}
            order={ORDER}
          />
          {track
            ? Array.from({ length: TRACK_COUNT }, (_, index) => (
                <Stamp
                  key={index}
                  index={index}
                  nodes={nodes}
                  unit={unit}
                  groundY={groundY}
                  texture={track.texture}
                />
              ))
            : null}
          <PercyRig nodes={nodes.percy} unit={unit} groundY={groundY} order={ORDER.percy} />
        </MarsWorldCamera>

        <Vignette centerX={0.5} centerY={0.5} inner={0.38} rgb={VIGNETTE_RGB} alpha={0.42} order={ORDER.vignette} />
      </WorldFade>
    </>
  );
}
