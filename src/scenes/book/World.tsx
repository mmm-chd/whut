import { useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { CanvasTexture } from 'three';
import { CameraRig } from '../../three/camera';
import { DESIGN_HEIGHT, DESIGN_WIDTH, fitScale } from '../../three/designSpace';
import { GradientLayer, Vignette, type GradientStop } from '../../three/layers';
import { SpriteLayer, SpriteMesh } from '../../three/SpriteLayer';
import type { LoadedTexture } from '../../three/textures';
import { BookParallaxDriver, BookParallaxGroup } from './ParallaxRig';

/**
 * The deep-space backdrop behind the adventure journal (concept 5.2): a paper
 * gradient, three star depths, a paper-cut Mars and a small moon. The book
 * itself is DOM above this canvas; only the backdrop lives in WebGL.
 */

const ORDER = {
  space: 0,
  starsFar: 1,
  starsMid: 2,
  planet: 3,
  moon: 4,
  starsNear: 5,
  vignette: 10,
} as const;

/** Oversized so cursor parallax never reveals an edge. */
const BACKDROP = { x: -320, y: -420, w: 2560, h: 1840 } as const;

const SPACE_STOPS: readonly GradientStop[] = [
  // Top matches the launchpad's deep-space gradient so the handoff is seamless.
  { at: 0, color: '#0e1b30' },
  { at: 0.32, color: '#13243c' },
  { at: 0.68, color: '#1c3552' },
  { at: 1, color: '#274766' },
];

/** Deterministic star scatter: the backdrop must be identical on every load. */
function makeStars(count: number, seed: number): readonly (readonly [number, number])[] {
  let value = seed;
  const next = () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
  return Array.from(
    { length: count },
    () => [next() * DESIGN_WIDTH, next() * DESIGN_HEIGHT] as const,
  );
}

const STARS_FAR = makeStars(46, 7);
const STARS_MID = makeStars(26, 31);
const STARS_NEAR = makeStars(12, 97);

/** Soft round star drawn once to a small canvas (same recipe as the launchpad). */
function useStarDot(color: string): LoadedTexture | null {
  const source = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const context = canvas.getContext('2d');
    if (!context) {
      return null;
    }
    const gradient = context.createRadialGradient(8, 8, 1, 8, 8, 8);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.55, color);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 16, 16);
    const texture = new CanvasTexture(canvas);
    return { texture, width: 16, height: 16, placeholder: false };
  }, [color]);

  useEffect(
    () => () => {
      source?.texture.dispose();
    },
    [source],
  );

  return source;
}

function StarField({
  stars,
  size,
  order,
  dot,
}: {
  stars: readonly (readonly [number, number])[];
  size: number;
  order: number;
  dot: LoadedTexture;
}) {
  return (
    <>
      {stars.map(([x, y], index) => (
        <SpriteMesh key={index} source={dot} x={x} y={y} w={size} h={size} order={order} />
      ))}
    </>
  );
}

/** Wraps one backdrop depth so the parallax driver only moves the group. */
function Depth({ depth, children }: { depth: number; children?: ReactNode }) {
  return <BookParallaxGroup depth={depth}>{children}</BookParallaxGroup>;
}

export function BookWorld({ reducedMotion }: { reducedMotion: boolean }) {
  const starDot = useStarDot('rgba(217, 228, 236, 0.95)');
  const warmDot = useStarDot('rgba(255, 233, 201, 0.9)');

  const getPose = useCallback((hostWidth: number, hostHeight: number) => {
    const fit = fitScale(hostWidth, hostHeight);
    return {
      x: DESIGN_WIDTH / 2,
      y: DESIGN_HEIGHT / 2,
      zoom: fit > 0 ? fit : 1,
    };
  }, []);

  return (
    <>
      <CameraRig getPose={getPose} />
      <BookParallaxDriver reducedMotion={reducedMotion} />

      <Depth depth={0.02}>
        <GradientLayer
          x={BACKDROP.x}
          y={BACKDROP.y}
          w={BACKDROP.w}
          h={BACKDROP.h}
          stops={SPACE_STOPS}
          order={ORDER.space}
        />
      </Depth>

      {starDot ? (
        <Depth depth={0.1}>
          <StarField stars={STARS_FAR} size={5} order={ORDER.starsFar} dot={starDot} />
        </Depth>
      ) : null}

      {warmDot ? (
        <Depth depth={0.22}>
          <StarField stars={STARS_MID} size={8} order={ORDER.starsMid} dot={warmDot} />
        </Depth>
      ) : null}

      {/* Mars hangs low-left, mostly cropped: a destination, not a subject. */}
      <Depth depth={0.3}>
        <SpriteLayer
          asset="book-planet"
          x={-430}
          y={470}
          w={1180}
          fit="contain"
          order={ORDER.planet}
        />
      </Depth>

      <Depth depth={0.18}>
        <SpriteLayer asset="home-moon" x={1585} y={86} w={104} fit="contain" order={ORDER.moon} />
      </Depth>

      {starDot ? (
        <Depth depth={0.45}>
          <StarField stars={STARS_NEAR} size={12} order={ORDER.starsNear} dot={starDot} />
        </Depth>
      ) : null}

      <Vignette
        centerX={0.5}
        centerY={0.5}
        inner={0.62}
        rgb={[7, 13, 24]}
        alpha={0.55}
        order={ORDER.vignette}
      />
    </>
  );
}
