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
import { PAD, cloudBands, horizonBand, launchComplex, padGantry, padHills, padSlab } from './padArt';
import { ParallaxGroup } from './ParallaxLayers';
import { SpaceWedge } from './SpaceWedge';
import {
  HOME,
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
  MOON,
  PAPER_CLOUDS,
  cloudCircles,
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
  smokeBack: 20,
  flame: 21,
  rocket: 22,
  smokeFront: 31,
  // Quiet foreground launch-site equipment sits in front of the pad, but behind
  // the wedge, smoke and rocket so the exit still reads as one continuous move.
  /** The pad the prototype draws: hills, road, gantry, slab (plan T6c). */
  padClouds: 6.5,
  padTower: 10.1,
  padBrace: 10.2,
  padArm: 10.3,
  padRail: 10.4,
  padSlab: 10.5,
  padSkirt: 10.6,
  padLeg: 10.7,
  padShadow: 10.75,
  padPlatform: 10.8,
  complex: 11,
  wedgeShadow: 12,
  wedgeRim: 12.4,
  wedgeFill: 12.8,
  wedgeStar: 13.2,
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

/**
 * One smoke depth layer: two sprites, breathing about their centres.
 *
 * Each sprite gets its own group driven by the same motion node, pivoted on
 * its OWN base. A shared pivot would scale the second cluster away from the
 * frame — at 5x the offset between clusters becomes thousands of design pixels
 * and the exit cover only filled a corner.
 */
function SmokeLayer({ asset, clusters, motion, idle, depth, order }: SmokeLayerProps) {
  return (
    <ParallaxGroup depth={depth}>
      {clusters.map((cluster, index) => (
        <SceneGroup key={index} node={motion} pivot={smokeClusterBase(cluster)}>
          <SceneGroup node={idle} pivot={smokeClusterCenter(cluster)}>
            <SpriteLayer
              asset={asset}
              x={cluster.left}
              y={cluster.top}
              w={cluster.width}
              h={cluster.width / SMOKE_SPRITE_ASPECT}
              order={order}
            />
          </SceneGroup>
        </SceneGroup>
      ))}
    </ParallaxGroup>
  );
}

export function HomeWorld({ nodes }: { nodes: HomeNodes }) {
  const spaceDot = useStarDot('rgba(255, 255, 255, 0.95)');

  // Backdrop geometry: built once.
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

      {/* Crescent moon. */}
      <SceneGroup node={nodes.moon.motion}>
        <ParallaxGroup depth={0.06}>
          <SpriteLayer asset="home-moon" x={MOON.left} y={MOON.top} w={MOON.width} fit="contain" order={ORDER.moon} />
        </ParallaxGroup>
      </SceneGroup>

      {/* Horizon and the ground plane of the launch complex. */}
      <SceneGroup node={nodes.ground.motion}>
        <ParallaxGroup depth={0.1}>
          <FlatShapes rawSrgb polygons={[horizonBand]} color={PAD.horizon} order={ORDER.sea - 0.3} />
          <FlatShapes rawSrgb polygons={[padHills.far]} color={PAD.hillFar} order={ORDER.sea - 0.2} />
          <FlatShapes rawSrgb polygons={[padHills.near]} color={PAD.hillNear} order={ORDER.sea - 0.1} />
          <FlatShapes rawSrgb polygons={[launchComplex.ground]} color={HOME.hills} order={ORDER.sea + 0.1} />
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
                <FlatShapes rawSrgb polygons={shape.shade} color={tone.shade} order={ORDER.clouds} />
                <FlatShapes rawSrgb polygons={shape.fill} color={tone.fill} order={ORDER.clouds + 0.1} />
              </SceneGroup>
            </ParallaxGroup>
          </SceneGroup>
        );
      })}

      {/* Separate the broad cloud bands from the sky so they contribute a
          gentle far-field parallax, rather than moving as a single backdrop. */}
      <ParallaxGroup depth={0.08}>
        <FlatShapes rawSrgb polygons={cloudBands} color={HOME.cream} order={ORDER.padClouds} />
      </ParallaxGroup>

      {/* The launch pad: green foothills, the gantry and the gold slab the rocket
          stands on. Every polygon is read from the prototype (plan T6c); the pad
          is paper, so it all takes `rawSrgb`. The prototype's access road is
          not drawn: in the prototype the crowd mass covers it, here it read as
          a stray strip. */}
      <ParallaxGroup depth={0.22}>
        <SceneGroup node={nodes.ground.idle}>
          <FlatShapes rawSrgb polygons={[padGantry.tower]} color={PAD.teal} order={ORDER.padTower} />
          <FlatShapes rawSrgb polygons={padGantry.braces} color={PAD.brace} order={ORDER.padBrace} />
          <FlatShapes rawSrgb polygons={padGantry.arms} color={PAD.gold} order={ORDER.padArm} />
          <FlatShapes rawSrgb polygons={padGantry.rails} color={PAD.gold} order={ORDER.padRail} />
          <FlatShapes rawSrgb polygons={[padSlab.slab]} color={PAD.gold} order={ORDER.padSlab} />
          <FlatShapes rawSrgb polygons={[padSlab.skirt]} color={PAD.teal} order={ORDER.padSkirt} />
          <FlatShapes rawSrgb polygons={padSlab.legs} color={PAD.leg} order={ORDER.padLeg} />
          <FlatShapes rawSrgb polygons={[padSlab.shadow]} color={PAD.shadow} opacity={0.5} order={ORDER.padShadow} />
          <FlatShapes rawSrgb polygons={[padSlab.platform]} color={PAD.platform} order={ORDER.padPlatform} />
        </SceneGroup>
      </ParallaxGroup>

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

      {/* The exit: a jagged space wedge rising behind the rocket, its cream rim
          hiding the seam with the sky (plan §6.2). */}
      <SpaceWedge
        nodes={nodes}
        dot={spaceDot}
        orders={{
          shadow: ORDER.wedgeShadow,
          rim: ORDER.wedgeRim,
          fill: ORDER.wedgeFill,
          star: ORDER.wedgeStar,
        }}
      />

      {/* Two sand banks, not three (plan T7b). Both ride the wedge's edge: the
          back bank hides the seam from above, the front bank from below. */}
      <SmokeLayer
        asset="home-smoke-deep"
        clusters={SMOKE_LAYERS.back}
        motion={nodes.smokeBack.motion}
        idle={nodes.smokeBack.idle}
        depth={0.25}
        order={ORDER.smokeBack}
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
        asset="home-smoke-near"
        clusters={SMOKE_LAYERS.front}
        motion={nodes.smokeFront.motion}
        idle={nodes.smokeFront.idle}
        depth={0.55}
        order={ORDER.smokeFront}
      />

      {/* Foreground support equipment replaces the crowd: its road, lights,
          tanks and vehicle create depth without distracting animated figures. */}
      <SceneGroup node={nodes.crowd.motion}>
        <ParallaxGroup depth={0.9}>
          <FlatShapes rawSrgb polygons={[launchComplex.road]} color={PAD.road} order={ORDER.complex} />
          <FlatShapes rawSrgb polygons={launchComplex.roadEdges} color={PAD.gold} order={ORDER.complex + 0.01} />
          <FlatShapes rawSrgb polygons={[launchComplex.roadCentre]} color={PAD.hillNear} order={ORDER.complex + 0.02} />
          <FlatShapes rawSrgb polygons={launchComplex.lightPoles} color={PAD.teal} order={ORDER.complex + 0.03} />
          <FlatShapes rawSrgb polygons={launchComplex.lightCaps} color={PAD.brace} order={ORDER.complex + 0.04} />
          <FlatShapes rawSrgb polygons={launchComplex.lightFaces} color={HOME.cream} order={ORDER.complex + 0.05} />
          <FlatShapes rawSrgb polygons={launchComplex.tankBodies} color={HOME.cream} order={ORDER.complex + 0.06} />
          <FlatShapes rawSrgb polygons={launchComplex.tankRoofs} color={PAD.teal} order={ORDER.complex + 0.07} />
          <FlatShapes rawSrgb polygons={launchComplex.tankDoors} color={PAD.teal} order={ORDER.complex + 0.08} />
          <FlatShapes rawSrgb polygons={launchComplex.tankWindows} color={HOME.skyMid1} order={ORDER.complex + 0.09} />
          <FlatShapes rawSrgb polygons={[launchComplex.truckBody]} color={PAD.gold} order={ORDER.complex + 0.1} />
          <FlatShapes rawSrgb polygons={[launchComplex.truckCab]} color={HOME.hills} order={ORDER.complex + 0.11} />
          <FlatShapes rawSrgb polygons={[launchComplex.truckWindow]} color={HOME.skyMid1} order={ORDER.complex + 0.12} />
          <FlatShapes rawSrgb polygons={launchComplex.truckWheels} color={HOME.silhouette} order={ORDER.complex + 0.13} />
        </ParallaxGroup>
      </SceneGroup>
    </>
  );
}
