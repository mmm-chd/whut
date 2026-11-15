import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import type { Group } from 'three';
import { CameraRig } from '../../three/camera';
import { SpriteMesh } from '../../three/SpriteLayer';
import { BOARD_HEIGHT, BOARD_WIDTH } from './grid';
import { defaultMap } from './map';
import type { RunnerNodes } from './nodes';
import { PERCY_ART, createRunnerTextures } from './terrainArt';

/**
 * The board seen from above, drawn with WebGL like the side-view scenes: one
 * terrain texture and one Percy sprite. The stage is exactly the board, so a
 * board unit times `scale` is a stage pixel, the same transform the route
 * overlay and the pointer use.
 */
const ORDER = { terrain: 1, percy: 20 } as const;

function PercyActor({
  nodes,
  scale,
  texture,
}: {
  nodes: RunnerNodes;
  scale: number;
  texture: NonNullable<ReturnType<typeof createRunnerTextures>>['percy'];
}) {
  const ref = useRef<Group>(null);
  useFrame(() => {
    const group = ref.current;
    if (!group) {
      return;
    }
    const { percy } = nodes;
    group.position.set(percy.x * scale, -percy.y * scale, 0);
    group.rotation.z = (-percy.rotation * Math.PI) / 180;
    group.userData.opacity = percy.opacity;
    group.visible = percy.opacity > 0.001;
  });
  return (
    <group ref={ref}>
      <SpriteMesh
        source={texture}
        x={0}
        y={0}
        w={PERCY_ART.width * scale}
        h={PERCY_ART.height * scale}
        originX={0.5}
        originY={0.5}
        order={ORDER.percy}
      />
    </group>
  );
}

export function RunnerWorld({ nodes }: { nodes: RunnerNodes }) {
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const textures = useMemo(() => createRunnerTextures(defaultMap), []);
  useEffect(() => () => textures?.dispose(), [textures]);

  const getPose = useMemo(
    () => (hostWidth: number, hostHeight: number) => ({ x: hostWidth / 2, y: hostHeight / 2, zoom: 1 }),
    [],
  );

  const scale = width > 0 ? width / BOARD_WIDTH : 1;
  if (!textures || width <= 1 || height <= 1) {
    return <CameraRig getPose={getPose} />;
  }
  return (
    <>
      <CameraRig getPose={getPose} />
      <SpriteMesh
        source={textures.terrain}
        x={0}
        y={0}
        w={BOARD_WIDTH * scale}
        h={BOARD_HEIGHT * scale}
        order={ORDER.terrain}
      />
      <PercyActor nodes={nodes} scale={scale} texture={textures.percy} />
    </>
  );
}
