import { useCallback } from 'react';
import type { Mesh } from 'three';
import { toWorldY } from '../../../three/designSpace';
import { SpriteLayer } from '../../../three/SpriteLayer';

/**
 * The drifting Mars clouds shared by P-01 and P-03: a gentle bob and roll that
 * loops back to rest (the CSS cloud-wave keyframes, now on the GPU).
 */

interface WaveKeyframe {
  at: number;
  x: number;
  y: number;
  rotation: number;
}

/** The CSS cloud-wave keyframes: translate in % of the cloud, rotate in degrees. */
const WAVE: readonly WaveKeyframe[] = [
  { at: 0, x: 0, y: 0, rotation: 0 },
  { at: 0.25, x: 0.7, y: -0.9, rotation: 0.6 },
  { at: 0.5, x: 1.4, y: 0.2, rotation: 0 },
  { at: 0.75, x: 0.7, y: -0.4, rotation: -0.6 },
  { at: 1, x: 0, y: 0, rotation: 0 },
];

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t));

function waveAt(phase: number): WaveKeyframe {
  for (let i = 1; i < WAVE.length; i += 1) {
    const to = WAVE[i];
    const from = WAVE[i - 1];
    if (phase <= to.at) {
      const t = easeInOut((phase - from.at) / (to.at - from.at));
      return {
        at: phase,
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t,
        rotation: from.rotation + (to.rotation - from.rotation) * t,
      };
    }
  }
  return WAVE[0];
}

/** Seconds per loop and start offset of each cloud, as the CSS declared them. */
const CLOUD_MOTION: Record<string, { duration: number; delay: number }> = {
  'bg-cloud-1': { duration: 26, delay: 0 },
  'bg-cloud-2': { duration: 32, delay: -6 },
  'bg-cloud-3': { duration: 22, delay: -11 },
};

export function Cloud({
  id,
  x,
  y,
  w,
  animate,
  order,
}: {
  id: string;
  x: number;
  y: number;
  w: number;
  animate: boolean;
  order: number;
}) {
  const motion = CLOUD_MOTION[id] ?? { duration: 24, delay: 0 };
  const onFrame = useCallback(
    (mesh: Mesh, _material: unknown, elapsed: number) => {
      const width = mesh.scale.x;
      const height = mesh.scale.y;
      const phase = animate
        ? (((elapsed - motion.delay) / motion.duration) % 1 + 1) % 1
        : 0;
      const wave = waveAt(phase);
      mesh.position.x = x + width / 2 + (wave.x / 100) * width;
      mesh.position.y = toWorldY(y + height / 2) - (wave.y / 100) * height;
      mesh.rotation.z = (-wave.rotation * Math.PI) / 180;
    },
    [animate, motion.delay, motion.duration, x, y],
  );
  return <SpriteLayer asset={id} x={x} y={y} w={w} order={order} onFrame={onFrame} />;
}

