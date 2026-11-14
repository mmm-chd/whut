import { useCallback, useEffect, useMemo } from 'react';
import type { Mesh } from 'three';
import { CanvasTexture } from 'three';
import { CameraRig } from '../../three/camera';
import { DESIGN_HEIGHT, DESIGN_WIDTH, fitScale } from '../../three/designSpace';
import { FlatShapes, GradientLayer, type GradientStop } from '../../three/layers';
import { SceneGroup } from '../../three/SceneGroup';
import { SpriteLayer, SpriteMesh } from '../../three/SpriteLayer';
import type { LoadedTexture } from '../../three/textures';
import type { SceneNode } from '../../three/nodeState';
import { ParallaxGroup } from './ParallaxLayers';
import {
  BOAT,
  CROWD,
  CROWD_SPRITE_ASPECT,
  DUSK,
  FLAME,
  ROCKET,
  ROCKET_CENTER,
  ROCKET_NOZZLE,
  SKY_STOPS,
  SMOKE_LAYERS,
  SMOKE_SPRITE_ASPECT,
  SPACE_STARS,
  SPACE_STOPS,
  TOWERS,
  BACKDROP,
} from './layers';
import {
  CLOUD_TONES,
  HILL_FAR_KEYS,
  HILL_NEAR_KEYS,
  MOON,
  PAPER_CLOUDS,
  PAPER_SHADOW,
  SEA_KEYS,
  SEA_STRIPES,
  SKY_SPARKLES,
  SKY_STARS,
  cloudCircles,
  diamondPolygon,
  offsetPolygon,
  ridgePolygon,
  sparklePolygon,
  stripPolygon,
} from './backdrop';
import { smokeClusterBase, smokeClusterCenter, type HomeNodes } from './nodes';

/**
 * The launchpad picture (paper-cut, Dusk palette). Paint order replaces
 * z-index; every layer nests motion (launch timeline) > parallax (cursor)
 * > idle (loops), so the three drivers never fight over one node.
 */

const ORDER = {
  sky: 0,
  duskStars: 1.2,
  duskSparkles: 1.4,
  spaceGradient: 2,
  spaceStars: 3,
  moon: 4,
  sea: 5,
  clouds: 8,
  towers: 10,
  smokeFar: 20,
  flame: 21,
  rocket: 22,
  smokeMid: 30,
  smokeNear: 31,
  crowd: 40,
} as const;

/** Soft round star drawn once to a small canvas. */
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
    // The sprite shader blends premultiplied alpha; without this the transparent
    // corners of the dot add their colour and the stars read as hard squares.
    texture.premultiplyAlpha = true;
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

/** The exhaust flame flickers like a live fire (mesh-level, like P-02). */
function flicker(mesh: Mesh, reduced: boolean, elapsed: number): void {
  const phase = reduced ? 0 : Math.sin((elapsed / 0.16) * Math.PI) * 0.5 + 0.5;
  const scaleY = reduced ? 1 : 0.94 + (1.08 - 0.94) * phase;
  const scaleX = reduced ? 1 : 1.02 + (0.98 - 1.02) * phase;
  mesh.position.set(FLAME.left + FLAME.width / 2, -(FLAME.top + (FLAME.height * scaleY) / 2), 0);
  mesh.scale.set(FLAME.width * scaleX, FLAME.height * scaleY, 1);
}

interface SmokeLayerProps {
  asset: string;
  clusters: readonly { left: number; top: number; width: number }[];
  motion: SceneNode;
  idle: SceneNode;
  depth: number;
  order: number;
}

/** One smoke depth layer: two sprites, breathing about their centres. */
function SmokeLayer({ asset, clusters, motion, idle, depth, order }: SmokeLayerProps) {
  return (
    <SceneGroup node={motion} pivot={smokeClusterBase(clusters[0])}>
      <ParallaxGroup depth={depth}>
        <SceneGroup node={idle} pivot={smokeClusterCenter(clusters[0])}>
          {clusters.map((cluster, index) => (
            <SpriteLayer
              key={index}
              asset={asset}
              x={cluster.left}
              y={cluster.top}
              w={cluster.width}
              h={cluster.width / SMOKE_SPRITE_ASPECT}
              order={order}
            />
          ))}
        </SceneGroup>
      </ParallaxGroup>
    </SceneGroup>
  );
}

export function HomeWorld({ nodes }: { nodes: HomeNodes }) {
  const spaceDot = useStarDot('rgba(255, 255, 255, 0.95)');

  // Backdrop geometry: built once, the ridge smoothing is the expensive part.
  const starDiamonds = useMemo(
    () => SKY_STARS.map(([x, y, radius]) => diamondPolygon(x, y, radius)),
    [],
  );
  const starSparkles = useMemo(
    () => SKY_SPARKLES.map(([x, y, radius]) => sparklePolygon(x, y, radius)),
    [],
  );
  const hillFar = useMemo(() => ridgePolygon(HILL_FAR_KEYS, 1500), []);
  const hillNear = useMemo(() => ridgePolygon(HILL_NEAR_KEYS, 1500), []);
  const sea = useMemo(() => ridgePolygon(SEA_KEYS, 1500), []);
  const seaStripes = useMemo(
    () => SEA_STRIPES.map((stripe) => ({
      color: stripe.color,
      polygons: [stripPolygon(stripe.keys, stripe.thickness)],
    })),
    [],
  );
  const cloudShapes = useMemo(
    () => PAPER_CLOUDS.map((cloud) => ({
      fill: cloudCircles(cloud),
      shade: cloudCircles(cloud, 14 * cloud.scale),
    })),
    [],
  );

  const getPose = useCallback((hostWidth: number, hostHeight: number) => {
    const fit = fitScale(hostWidth, hostHeight);
    return {
      x: DESIGN_WIDTH / 2,
      y: DESIGN_HEIGHT / 2,
      zoom: fit > 0 ? fit : 1,
    };
  }, []);

  const onFlameFrame = useCallback(
    (mesh: Mesh, _material: unknown, elapsed: number) =>
      flicker(mesh, nodes.flags.reducedMotion, elapsed),
    [nodes],
  );

  const skyStops = SKY_STOPS as readonly GradientStop[];
  const spaceStops = SPACE_STOPS as readonly GradientStop[];

  return (
    <>
      <CameraRig getPose={getPose} />

      {/* Dusk sky, oversized so parallax and letterboxing never show an edge. */}
      <SceneGroup node={nodes.sky.motion}>
        <ParallaxGroup depth={0.02}>
          <GradientLayer
            x={BACKDROP.x}
            y={BACKDROP.y}
            w={BACKDROP.w}
            h={BACKDROP.h}
            stops={skyStops}
            order={ORDER.sky}
          />
        </ParallaxGroup>
      </SceneGroup>

      {/* Deep space waits behind the sky and fades in during the transition. */}
      <SceneGroup node={nodes.space.fade}>
        <ParallaxGroup depth={0.04}>
          <GradientLayer
            x={BACKDROP.x}
            y={BACKDROP.y}
            w={BACKDROP.w}
            h={BACKDROP.h}
            stops={spaceStops}
            order={ORDER.spaceGradient}
          />
          {spaceDot ? <StarField stars={SPACE_STARS} size={7} order={ORDER.spaceStars} dot={spaceDot} /> : null}
        </ParallaxGroup>
      </SceneGroup>

      {/* Paper stars: cut diamonds for the specks, cut sparkles for the eye. */}
      <ParallaxGroup depth={0.04}>
        <FlatShapes polygons={starDiamonds} color={DUSK.cream} order={ORDER.duskStars} />
        <FlatShapes polygons={starSparkles} color="#ffe1b8" order={ORDER.duskSparkles} />
      </ParallaxGroup>

      {/* Crescent moon. */}
      <SceneGroup node={nodes.moon.motion}>
        <ParallaxGroup depth={0.06}>
          <SpriteLayer asset="home-moon" x={MOON.left} y={MOON.top} w={MOON.width} fit="contain" order={ORDER.moon} />
        </ParallaxGroup>
      </SceneGroup>

      {/* Horizon: two stacked paper ridges and a striped sea, each cut-out with
          its own soft shadow underneath (concept 4.5). */}
      <SceneGroup node={nodes.sea.motion}>
        <ParallaxGroup depth={0.1}>
          <FlatShapes
            polygons={[offsetPolygon(hillFar, 0, PAPER_SHADOW.dy)]}
            color="#5b3470"
            order={ORDER.sea - 0.3}
          />
          <FlatShapes polygons={[hillFar]} color={DUSK.hillsDark} order={ORDER.sea - 0.2} />
          <FlatShapes
            polygons={[offsetPolygon(hillNear, 0, PAPER_SHADOW.dy)]}
            color="#4a2a5e"
            order={ORDER.sea - 0.1}
          />
          <FlatShapes polygons={[hillNear]} color={DUSK.hills} order={ORDER.sea} />
          <FlatShapes
            polygons={[offsetPolygon(sea, 0, PAPER_SHADOW.dy)]}
            color="#c4576b"
            order={ORDER.sea + 0.1}
          />
          <FlatShapes polygons={[sea]} color={DUSK.sea} order={ORDER.sea + 0.2} />
          {seaStripes.map((stripe, index) => (
            <FlatShapes
              key={`stripe-${index}`}
              polygons={stripe.polygons}
              color={stripe.color}
              order={ORDER.sea + 0.3 + index * 0.01}
            />
          ))}
          <SceneGroup node={nodes.boat.motion}>
            <SceneGroup node={nodes.boat.idle}>
              <SpriteLayer asset="home-ship" x={BOAT.left} y={BOAT.top} w={BOAT.width} fit="contain" order={ORDER.sea + 3} />
            </SceneGroup>
          </SceneGroup>
        </ParallaxGroup>
      </SceneGroup>

      {/* Drifting paper clouds: stacked lobes in three tones with a printed
          shadow bar underneath (reference: cream, peach and pink stacks). */}
      {PAPER_CLOUDS.map((cloud, index) => {
        const shape = cloudShapes[index];
        const tone = CLOUD_TONES[cloud.tone];
        return (
          <SceneGroup key={`cloud-${index}`} node={nodes.clouds[index].motion}>
            <ParallaxGroup depth={0.12}>
              <SceneGroup node={nodes.clouds[index].idle}>
                <FlatShapes polygons={shape.shade} color={tone.shade} order={ORDER.clouds} />
                <FlatShapes polygons={shape.fill} color={tone.fill} order={ORDER.clouds + 0.1} />
              </SceneGroup>
            </ParallaxGroup>
          </SceneGroup>
        );
      })}

      {/* Lattice towers behind the smoke. */}
      <SceneGroup node={nodes.towers.motion}>
        <ParallaxGroup depth={0.18}>
          {TOWERS.map((tower, index) => (
            <SpriteLayer
              key={index}
              asset="home-tower"
              x={tower.left}
              y={tower.top}
              w={tower.width}
              fit="contain"
              order={ORDER.towers}
            />
          ))}
        </ParallaxGroup>
      </SceneGroup>

      {/* Smoke depth stack; the transition scales them over the frame. */}
      <SmokeLayer
        asset="home-smoke-deep"
        clusters={SMOKE_LAYERS.far}
        motion={nodes.smokeFar.motion}
        idle={nodes.smokeFar.idle}
        depth={0.25}
        order={ORDER.smokeFar}
      />

      {/* Rocket: moves about the nozzle; tilts with the cursor. */}
      <SceneGroup node={nodes.rocket.motion} pivot={[ROCKET_NOZZLE.x, ROCKET_NOZZLE.y]}>
        <ParallaxGroup depth={0.3} tilt={1.5} pivot={[ROCKET_CENTER.x, ROCKET_CENTER.y]}>
          <SceneGroup node={nodes.rocket.idle}>
            <SceneGroup
              node={nodes.rocket.exhaust}
              pivot={[FLAME.left + FLAME.width / 2, FLAME.top]}
            >
              <SpriteLayer
                asset="home-flame"
                x={FLAME.left}
                y={FLAME.top}
                w={FLAME.width}
                h={FLAME.height}
                order={ORDER.flame}
                onFrame={onFlameFrame}
              />
            </SceneGroup>
            <SpriteLayer
              asset="home-rocket"
              x={ROCKET.left}
              y={ROCKET.top}
              w={ROCKET.width}
              h={ROCKET.height}
              fit="contain"
              order={ORDER.rocket}
            />
          </SceneGroup>
        </ParallaxGroup>
      </SceneGroup>

      <SmokeLayer
        asset="home-smoke-mid"
        clusters={SMOKE_LAYERS.mid}
        motion={nodes.smokeMid.motion}
        idle={nodes.smokeMid.idle}
        depth={0.4}
        order={ORDER.smokeMid}
      />
      <SmokeLayer
        asset="home-smoke-near"
        clusters={SMOKE_LAYERS.near}
        motion={nodes.smokeNear.motion}
        idle={nodes.smokeNear.idle}
        depth={0.55}
        order={ORDER.smokeNear}
      />

      {/* Waving crowd, closest to the camera; the two poses cross-fade. */}
      <SceneGroup node={nodes.crowd.motion}>
        <ParallaxGroup depth={0.8}>
          <SceneGroup node={nodes.crowd.poseA}>
            <SpriteLayer
              asset="home-crowd-a"
              x={CROWD.left}
              y={CROWD.top}
              w={CROWD.width}
              h={CROWD.width / CROWD_SPRITE_ASPECT}
              order={ORDER.crowd}
            />
          </SceneGroup>
          <SceneGroup node={nodes.crowd.poseB}>
            <SpriteLayer
              asset="home-crowd-b"
              x={CROWD.left}
              y={CROWD.top}
              w={CROWD.width}
              h={CROWD.width / CROWD_SPRITE_ASPECT}
              order={ORDER.crowd}
            />
          </SceneGroup>
        </ParallaxGroup>
      </SceneGroup>
    </>
  );
}
