import { useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import { PlaneGeometry, type Group, type Mesh } from 'three';
import { PercyRig } from '../../characters/percy/PercyRig';
import { CameraRig } from '../../three/camera';
import { toWorldY } from '../../three/designSpace';
import { RingPulse } from '../../three/effects';
import { Vignette } from '../../three/layers';
import { SceneGroup } from '../../three/SceneGroup';
import { inheritedOpacity } from '../../three/sceneGraph';
import { SpriteLayer, SpriteMesh } from '../../three/SpriteLayer';
import { useAssetTexture } from '../../three/textures';
import { applySpriteUniforms, createSpriteMaterial } from '../../three/SpriteMaterial';
import { Cloud } from '../shared/mars/Cloud';
import { DESCENT_END_PERCENT, layoutP01 } from '../scene-01-jezero/layout';
import { PARALLAX } from '../scene-01-jezero/camera';
import { createDoorTextures } from './doorArt';
import { DOOR, ROCKET, layoutP03 } from './layout';
import type { P03Nodes } from './nodes';
import type { LoadedTexture } from '../../three/textures';

/**
 * The P-03 picture, drawn with WebGL. The landscape is the P-01 one (same
 * layers, same layout rules); the actors are the layered Percy rig, the P-02
 * rocket art as a landed rocket, a drawn door, and a small P-01 rock.
 * Paint order replaces CSS z-index.
 */
const ORDER = {
  sky: 0,
  clouds: 1,
  ridgeFar: 3,
  ground: 4,
  ridgeNear: 5,
  rocket: 7,
  doorOpening: 8,
  /** The hull-crop door and its seams, over the recess and under Percy. */
  doorPanel: 9,
  doorSeams: 10,
  rock: 11,
  scan: 13,
  dustPad: 15,
  percy: 20,
  dustExit: 40,
  vignette: 60,
} as const;

const VIGNETTE_RGB = [43, 26, 22] as const;
/**
 * The sky is the farthest layer: it drifts only a hair with the walk, so the
 * 1920 px art covers the whole view and no join can come into frame.
 */
const SKY_PARALLAX = 0.012;
/** Share of the sky's width over which the main sky fades into its mirrored sides. */
const SKY_BLEND = 0.25;
/**
 * Neighbouring landscape tiles overlap by this many pixels, so filtering at a
 * tile edge never leaves a hairline between two mirrored copies.
 */
const TILE_OVERLAP = 3;
/** Background layers follow the camera zoom at this share of the world zoom. */
const BACKGROUND_ZOOM_SHARE = 0.25;

type Placement = { x: number; y: number };
/** Touchdown dust sits either side of the rocket; the landing puffs where Percy comes down. */
const DUST_OFFSETS: readonly Placement[] = [
  { x: -260, y: 0 },
  { x: 0, y: 0 },
  { x: 260, y: 0 },
  { x: 400, y: 0 },
  { x: 460, y: 0 },
  { x: 520, y: 0 },
];

/** A group that slides with the camera at a parallax factor (pixels, host space). */
function ShiftGroup({
  nodes,
  unit,
  factor,
  relativeToWorld,
  children,
}: {
  nodes: P03Nodes;
  unit: number;
  factor: number;
  /** World layers: counter-shift so they trail the camera by `1 - factor`. */
  relativeToWorld: boolean;
  children: ReactNode;
}) {
  const ref = useRef<Group>(null);
  useFrame(() => {
    if (ref.current) {
      const camX = nodes.camera.x * unit;
      ref.current.position.x = relativeToWorld ? camX * (1 - factor) : 0;
    }
  });
  return <group ref={ref}>{children}</group>;
}

/** Far layers: scaled gently about the view centre and shifted by the pan. */
function BackdropGroup({
  nodes,
  unit,
  factor,
  children,
}: {
  nodes: P03Nodes;
  unit: number;
  factor: number;
  children: ReactNode;
}) {
  const ref = useRef<Group>(null);
  useFrame(({ size }) => {
    const group = ref.current;
    if (!group) {
      return;
    }
    const scale = 1 + (nodes.camera.scale - 1) * BACKGROUND_ZOOM_SHARE;
    group.scale.set(scale, scale, 1);
    group.position.set(
      (size.width / 2) * (1 - scale) - nodes.camera.x * unit * factor,
      -(size.height / 2) * (1 - scale),
      0,
    );
  });
  return <group ref={ref}>{children}</group>;
}

/** The world camera: zoom about the view centre, aimed at (x, lift). */
function WorldCamera({
  nodes,
  unit,
  children,
}: {
  nodes: P03Nodes;
  unit: number;
  children: ReactNode;
}) {
  const ref = useRef<Group>(null);
  useFrame(({ size }) => {
    const group = ref.current;
    if (!group) {
      return;
    }
    const { x, lift, scale } = nodes.camera;
    const camX = x * unit;
    const camY = size.height / 2 - lift * unit;
    group.scale.set(scale, scale, 1);
    group.position.set(size.width / 2 - scale * camX, -size.height / 2 + scale * camY, 0);
  });
  return <group ref={ref}>{children}</group>;
}

const unitPlane = new PlaneGeometry(1, 1);
const FULL_CROP = [0, 0, 1, 1] as const;

/**
 * The sliding door. Closed, it is the hull itself (a crop of the rocket art at
 * the same place), so it cannot be told from the wall. It opens by sliding left
 * into the wall, and the wall is a mask: only the part of the door still inside the doorway is drawn, so nothing
 * shows left of the opening. That is done by cropping, not by squashing: the
 * visible box keeps its left edge on the doorway and shrinks from the right, and
 * the texture is cropped to match, so the door's art really moves left.
 */
function SlidingDoor({
  nodes,
  source,
  baseCrop,
  order,
  left,
  top,
  width,
  height,
}: {
  nodes: P03Nodes;
  source: LoadedTexture | null;
  /** The part of the texture the whole door shows, as top-left fractions: x, y, w, h. */
  baseCrop: readonly [number, number, number, number];
  order: number;
  left: number;
  top: number;
  width: number;
  height: number;
}) {
  const meshRef = useRef<Mesh>(null);
  const material = useMemo(() => createSpriteMaterial('normal'), []);
  useEffect(() => () => material.dispose(), [material]);

  useLayoutEffect(() => {
    if (source) {
      material.uniforms.map.value = source.texture;
      applySpriteUniforms(material, { fit: [1, 1, 0, 0], crop: [0, 0, 1, 1] });
    }
  }, [material, source]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) {
      return;
    }
    const open = nodes.door.open;
    // Share of the door still in the doorway: the right-hand part of its art.
    const shown = Math.max(0, 1 - open);
    const crop = material.uniforms.uCrop.value as { set: (...v: number[]) => void };
    const [cx, cy, cw, ch] = baseCrop;
    crop.set(cx + cw * (1 - shown), cy, Math.max(cw * shown, 0.0001), ch);
    mesh.scale.set(Math.max(width * shown, 0.001), height, 1);
    mesh.position.set(left + (width * shown) / 2, toWorldY(top + height / 2), 0);
    const opacity = inheritedOpacity(mesh);
    material.uniforms.uOpacity.value = opacity;
    mesh.visible = shown > 0.002 && opacity > 0.001;
  });

  if (!source) {
    return null;
  }
  return (
    <mesh
      ref={meshRef}
      geometry={unitPlane}
      material={material}
      renderOrder={order}
      frustumCulled={false}
    />
  );
}

/** Rocket height above its landed position, design units to pixels. */
function RocketGroup({
  nodes,
  unit,
  children,
}: {
  nodes: P03Nodes;
  unit: number;
  children: ReactNode;
}) {
  const ref = useRef<Group>(null);
  useFrame(() => {
    if (ref.current) {
      ref.current.position.y = toWorldY(nodes.rocket.y * unit);
    }
  });
  return <group ref={ref}>{children}</group>;
}

export function P03World({ nodes }: { nodes: P03Nodes }) {
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const layout = useMemo(() => layoutP03(width, height), [width, height]);
  const mars = useMemo(() => layoutP01(width, height), [width, height]);
  const { unit, groundY } = layout;

  const getPose = useCallback(
    (hostWidth: number, hostHeight: number) => ({ x: hostWidth / 2, y: hostHeight / 2, zoom: 1 }),
    [],
  );

  /** Same descent P-01 ends on: the container bottom meets the viewport bottom. */
  const descent = (DESCENT_END_PERCENT / 100) * mars.containerHeight;

  // Mirrored tiles butt edge to edge (step = tile width), so every join is seamless.
  const tiles = (step: number) => {
    const last = Math.ceil((layout.maxCameraPx + width) / step) + 1;
    return Array.from({ length: last + 2 }, (_, index) => index - 1);
  };

  const rocketScale = ROCKET.scale * unit;
  const rocketLeft = ROCKET.x * unit - ROCKET.art.baseX * rocketScale;
  const rocketTop = groundY - ROCKET.art.baseY * rocketScale;

  const doorWidth = DOOR.width * unit;
  const doorHeight = DOOR.height * unit;
  const doorLeft = ROCKET.x * unit - doorWidth / 2;
  const doorTop = groundY - (DOOR.sill + DOOR.height) * unit;

  // The door's closed picture is the hull: the same pixels of the rocket art,
  // at the same place. Its crop, as fractions of the art, is the door rectangle.
  const hull = useAssetTexture('p02-rocket');
  const hullCrop = useMemo<readonly [number, number, number, number]>(() => {
    const { art, scale } = ROCKET;
    const artWidth = DOOR.width / scale;
    const artHeight = DOOR.height / scale;
    const artTop = art.baseY - (DOOR.sill + DOOR.height) / scale;
    return [
      (art.baseX - artWidth / 2) / art.width,
      artTop / art.height,
      artWidth / art.width,
      artHeight / art.height,
    ];
  }, []);

  // The recess and the seams are painted once; both are released with the scene.
  const door = useMemo(() => createDoorTextures(), []);
  useEffect(() => () => door?.dispose(), [door]);

  const dustSize = 220 * unit;
  const animateClouds = !nodes.flags.reducedMotion;

  return (
    <>
      <CameraRig getPose={getPose} />

      <BackdropGroup nodes={nodes} unit={unit} factor={SKY_PARALLAX}>
        {/* Mirrored sky on both sides sits under the main sky, whose edges fade
            out over it: the join is a blend, not a line, at any zoom or pan. */}
        {[-1, 1].map((side) => (
          <SpriteLayer
            key={`sky-side-${side}`}
            asset="bg-space"
            x={mars.sky.x + side * mars.sky.w * (1 - SKY_BLEND)}
            y={mars.sky.y + descent}
            w={mars.sky.w}
            h={mars.sky.h}
            fit="cover"
            position={[0.5, 0]}
            flipX
            order={ORDER.sky}
          />
        ))}
        <SpriteLayer
          asset="bg-space"
          x={mars.sky.x}
          y={mars.sky.y + descent}
          w={mars.sky.w}
          h={mars.sky.h}
          fit="cover"
          position={[0.5, 0]}
          fadeX={SKY_BLEND}
          order={ORDER.sky + 0.5}
        />
      </BackdropGroup>
      <BackdropGroup nodes={nodes} unit={unit} factor={PARALLAX.clouds}>
        {[-1, 0, 1, 2, 3].flatMap((copy) =>
          mars.clouds
            // The third P-01 cloud ends in a flat vertical cut (its art is cropped at
            // the right edge, which P-01 hides at the screen edge). Mid-screen in P-03
            // it would show as a broken sky, so only the two tapered clouds are used.
            .filter((cloud) => cloud.id !== 'bg-cloud-3')
            .map((cloud) => (
            <Cloud
              key={`${cloud.id}-${copy}`}
              id={cloud.id}
              x={cloud.x + copy * width}
              y={cloud.y + descent}
              w={cloud.w}
              animate={animateClouds}
              order={ORDER.clouds}
            />
          )),
        )}
      </BackdropGroup>

      <WorldCamera nodes={nodes} unit={unit}>
        <ShiftGroup nodes={nodes} unit={unit} factor={PARALLAX.ridgeFar} relativeToWorld>
          {tiles(mars.ridgeFar.w - TILE_OVERLAP).map((k) => (
            <SpriteLayer
              key={`ridge-far-${k}`}
              asset="bg-ridge-far"
              {...mars.ridgeFar}
              y={mars.ridgeFar.y + descent}
              x={mars.ridgeFar.x + k * (mars.ridgeFar.w - TILE_OVERLAP)}
              fit="contain"
              position={[0.5, 1]}
              flipX={Math.abs(k) % 2 === 1}
              order={ORDER.ridgeFar}
            />
          ))}
        </ShiftGroup>
        <ShiftGroup nodes={nodes} unit={unit} factor={PARALLAX.ground} relativeToWorld>
          {tiles(mars.ground.w - TILE_OVERLAP).map((k) => (
            <SpriteLayer
              key={`ground-${k}`}
              asset="bg-ground"
              {...mars.ground}
              y={mars.ground.y + descent}
              x={mars.ground.x + k * (mars.ground.w - TILE_OVERLAP)}
              fit="cover"
              position={[0.5, 1]}
              flipX={Math.abs(k) % 2 === 1}
              order={ORDER.ground}
            />
          ))}
        </ShiftGroup>
        <ShiftGroup nodes={nodes} unit={unit} factor={PARALLAX.ridgeNear} relativeToWorld>
          {tiles(mars.ridgeNear.w - TILE_OVERLAP).map((k) => (
            <SpriteLayer
              key={`ridge-near-${k}`}
              asset="bg-ridge-near"
              {...mars.ridgeNear}
              y={mars.ridgeNear.y + descent}
              x={mars.ridgeNear.x + k * (mars.ridgeNear.w - TILE_OVERLAP)}
              fit="contain"
              position={[0.5, 1]}
              flipX={Math.abs(k) % 2 === 1}
              order={ORDER.ridgeNear}
            />
          ))}
        </ShiftGroup>

        {/* Landed rocket (the P-02 art, a storybook stand-in) and its hatch. */}
        <RocketGroup nodes={nodes} unit={unit}>
          <SpriteLayer
            asset="p02-rocket"
            x={rocketLeft}
            y={rocketTop}
            w={ROCKET.art.width * rocketScale}
            h={ROCKET.art.height * rocketScale}
            order={ORDER.rocket}
          />
          <SpriteMesh
            source={door?.interior ?? null}
            x={doorLeft}
            y={doorTop}
            w={doorWidth}
            h={doorHeight}
            order={ORDER.doorOpening}
          />
          <SlidingDoor
            nodes={nodes}
            source={hull}
            baseCrop={hullCrop}
            order={ORDER.doorPanel}
            left={doorLeft}
            top={doorTop}
            width={doorWidth}
            height={doorHeight}
          />
          <SlidingDoor
            nodes={nodes}
            source={door?.seams ?? null}
            baseCrop={FULL_CROP}
            order={ORDER.doorSeams}
            left={doorLeft}
            top={doorTop}
            width={doorWidth}
            height={doorHeight}
          />
        </RocketGroup>

        <SpriteLayer
          asset="rock-a"
          x={layout.rockX * unit}
          y={groundY + 6 * unit}
          w={layout.rockWidth * unit}
          originX={0.5}
          originY={1}
          order={ORDER.rock}
        />
        <SceneGroup node={nodes.scan}>
          <RingPulse
            centerX={layout.rockX * unit}
            centerY={groundY - 50 * unit}
            diameter={260 * unit}
            paused={false}
            order={ORDER.scan}
          />
        </SceneGroup>

        <PercyRig nodes={nodes.percy} unit={unit} groundY={groundY} order={ORDER.percy} />

        {DUST_OFFSETS.map((offset, index) => {
          const cx = (ROCKET.x + offset.x) * unit;
          const cy = groundY - dustSize * 0.35;
          return (
            <SceneGroup key={`dust-${index}`} node={nodes.dust[index]} pivot={[cx, cy]}>
              <SpriteLayer
                asset="p02-smoke-mid"
                x={cx - dustSize / 2}
                y={cy - dustSize / 2}
                w={dustSize}
                h={dustSize}
                fit="contain"
                order={index < 3 ? ORDER.dustPad : ORDER.dustExit}
              />
            </SceneGroup>
          );
        })}
      </WorldCamera>

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
