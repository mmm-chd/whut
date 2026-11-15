import { useFrame, useThree } from '@react-three/fiber';
import { useCallback, useRef } from 'react';
import type { Group } from 'three';
import { CameraRig } from '../../three/camera';
import { Vignette } from '../../three/layers';
import { SpriteLayer } from '../../three/SpriteLayer';

const ORDER = { bg: 0, veil: 10 } as const;
const VEIL_RGB = [7, 12, 24] as const;

/**
 * Quiet cruise backdrop: the deep-space art, drifting very slowly sideways as if
 * the ship were moving, and a soft edge veil. The ship and the text are DOM above.
 */
export function CruiseWorld({ reducedMotion }: { reducedMotion: boolean }) {
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const drift = useRef<Group>(null);

  const getPose = useCallback(
    (hostWidth: number, hostHeight: number) => ({
      x: hostWidth / 2,
      y: hostHeight / 2,
      zoom: 1,
    }),
    [],
  );

  useFrame(({ clock, size }) => {
    if (drift.current) {
      const t = reducedMotion ? 0 : clock.elapsedTime;
      drift.current.position.x = -Math.sin(t / 14) * size.width * 0.035;
    }
  });

  return (
    <>
      <CameraRig getPose={getPose} />
      <group ref={drift}>
        <SpriteLayer
          asset="cruise-bg-space"
          x={-width * 0.06}
          y={0}
          w={width * 1.12}
          h={height}
          fit="cover"
          order={ORDER.bg}
        />
      </group>
      <Vignette
        centerX={0.5}
        centerY={0.55}
        inner={0.2}
        rgb={VEIL_RGB}
        alpha={0.55}
        order={ORDER.veil}
      />
    </>
  );
}
