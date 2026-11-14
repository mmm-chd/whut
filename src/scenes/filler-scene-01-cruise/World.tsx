import { useFrame, useThree } from '@react-three/fiber';
import { useCallback, useRef } from 'react';
import type { Group } from 'three';
import { CameraRig } from '../../three/camera';
import { toWorldY } from '../../three/designSpace';
import { Vignette } from '../../three/layers';
import { SpriteLayer } from '../../three/SpriteLayer';

const ORDER = { bg: 0, rocket: 2, exhaust: 1, veil: 10 } as const;

/** Seconds the scaffold rocket takes to cross the screen. */
const DRIFT_SECONDS = 26;
const REM = 16;
/** Rocket box: 5rem x 10rem; the body sits inset 0 1rem 2rem. */
const ROCKET = { top: 0.18, left: -8 * REM, body: { x: 1 * REM, w: 3 * REM, h: 8 * REM } } as const;
const VEIL_RGB = [7, 12, 24] as const;

/**
 * Quiet cruise backdrop: the deep-space art, a soft edge veil, and the
 * scaffold rocket drifting across. Text stays DOM above the canvas.
 */
export function CruiseWorld({ reducedMotion }: { reducedMotion: boolean }) {
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const rocket = useRef<Group>(null);

  const getPose = useCallback(
    (hostWidth: number, hostHeight: number) => ({
      x: hostWidth / 2,
      y: hostHeight / 2,
      zoom: 1,
    }),
    [],
  );

  useFrame(({ clock, size }) => {
    const group = rocket.current;
    if (!group) {
      return;
    }
    const x = reducedMotion
      ? 0.12 * size.width
      : ROCKET.left + (((clock.elapsedTime / DRIFT_SECONDS) % 1) * (size.width + 16 * REM));
    group.position.set(x, toWorldY(ROCKET.top * size.height), 0);
  });

  return (
    <>
      <CameraRig getPose={getPose} />
      <SpriteLayer
        asset="cruise-bg-space"
        x={0}
        y={0}
        w={width}
        h={height}
        fit="cover"
        order={ORDER.bg}
      />
      <group ref={rocket}>
        <SpriteLayer
          asset="p02-exhaust"
          x={ROCKET.body.x - 4}
          y={ROCKET.body.h - 6}
          w={ROCKET.body.w + 8}
          h={40}
          order={ORDER.exhaust}
        />
        <SpriteLayer
          asset="p02-rocket"
          x={ROCKET.body.x}
          y={0}
          w={ROCKET.body.w}
          h={ROCKET.body.h}
          fit="contain"
          order={ORDER.rocket}
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
