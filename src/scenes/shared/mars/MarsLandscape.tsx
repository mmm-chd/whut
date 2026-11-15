import { useFrame } from '@react-three/fiber';
import { useRef, type ReactNode } from 'react';
import type { Group } from 'three';
import { SpriteLayer } from '../../../three/SpriteLayer';
import { PARALLAX } from '../../scene-01-jezero/camera';
import type { P01Layout } from '../../scene-01-jezero/layout';
import { Cloud } from './Cloud';
import {
  backdropOffset,
  backdropScale,
  landscapeTileIndexes,
  tileStep,
  worldCameraTransform,
} from './marsViewMath';

/**
 * The Mars landscape P-03 and P-04 draw, extracted with no new abstraction:
 * the same sky blend, the same cloud field, the same three tiled ground layers,
 * the same camera. Each scene keeps its own actors and its own paint order.
 *
 * `camera` is a stable mutable object read per frame (x world units, lift above
 * the view centre, and zoom about that centre), so a scene can animate the
 * camera without re-rendering React.
 */
export interface MarsCameraPose {
  x: number;
  lift: number;
  scale: number;
}

/** The sky drifts only a hair with the walk. */
export const MARS_SKY_PARALLAX = 0.012;
/** Share of the sky's width over which the main sky fades into its mirrored sides. */
export const MARS_SKY_BLEND = 0.25;
/** Neighbouring tiles overlap so filtering never leaves a hairline. */
export const MARS_TILE_OVERLAP = 3;
/** Background layers follow the camera zoom at this share of the world zoom. */
export const MARS_BACKGROUND_ZOOM_SHARE = 0.25;

/** Paint order for the landscape layers, owned by the calling scene. */
export interface MarsLandscapeOrder {
  sky: number;
  clouds: number;
  ridgeFar: number;
  ground: number;
  ridgeNear: number;
}

/** Far layers: scaled gently about the view centre and shifted by the pan. */
function BackdropLayer({
  camera,
  unit,
  factor,
  children,
}: {
  camera: MarsCameraPose;
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
    const scale = backdropScale(camera.scale, MARS_BACKGROUND_ZOOM_SHARE);
    const offset = backdropOffset({
      width: size.width,
      height: size.height,
      cameraX: camera.x,
      unit,
      factor,
      scale,
    });
    group.scale.set(scale, scale, 1);
    group.position.set(offset.x, offset.y, 0);
  });
  return <group ref={ref}>{children}</group>;
}

/** World layers: counter-shift so they trail the camera by `1 - factor`. */
function ShiftLayer({
  camera,
  unit,
  factor,
  children,
}: {
  camera: MarsCameraPose;
  unit: number;
  factor: number;
  children: ReactNode;
}) {
  const ref = useRef<Group>(null);
  useFrame(() => {
    if (ref.current) {
      const camX = camera.x * unit;
      ref.current.position.x = camX * (1 - factor);
    }
  });
  return <group ref={ref}>{children}</group>;
}

/** The world camera: zoom about the view centre, aimed at (x, lift). */
export function MarsWorldCamera({
  camera,
  unit,
  children,
}: {
  camera: MarsCameraPose;
  unit: number;
  children: ReactNode;
}) {
  const ref = useRef<Group>(null);
  useFrame(({ size }) => {
    const group = ref.current;
    if (!group) {
      return;
    }
    const transform = worldCameraTransform({
      width: size.width,
      height: size.height,
      camera,
      unit,
    });
    group.scale.set(transform.scale, transform.scale, 1);
    group.position.set(transform.x, transform.y, 0);
  });
  return <group ref={ref}>{children}</group>;
}

/**
 * Sky and clouds. The mirrored copies under the main sky fade into each other,
 * so the join is a blend rather than a line at any zoom or pan.
 */
export function MarsBackdrop({
  camera,
  unit,
  layout,
  descent,
  width,
  animateClouds,
  order,
}: {
  camera: MarsCameraPose;
  unit: number;
  layout: P01Layout;
  /** Extra drop applied to the sky, matching the scene's ground line. */
  descent: number;
  /** Host width; each cloud copy is spaced by it. */
  width: number;
  animateClouds: boolean;
  order: MarsLandscapeOrder;
}) {
  const sky = layout.sky;

  return (
    <>
      <BackdropLayer camera={camera} unit={unit} factor={MARS_SKY_PARALLAX}>
        {[-1, 1].map((side) => (
          <SpriteLayer
            key={`sky-side-${side}`}
            asset="bg-space"
            x={sky.x + side * sky.w * (1 - MARS_SKY_BLEND)}
            y={sky.y + descent}
            w={sky.w}
            h={sky.h}
            fit="cover"
            position={[0.5, 0]}
            flipX
            order={order.sky}
          />
        ))}
        <SpriteLayer
          asset="bg-space"
          x={sky.x}
          y={sky.y + descent}
          w={sky.w}
          h={sky.h}
          fit="cover"
          position={[0.5, 0]}
          fadeX={MARS_SKY_BLEND}
          order={order.sky + 0.5}
        />
      </BackdropLayer>

      <BackdropLayer camera={camera} unit={unit} factor={PARALLAX.clouds}>
        {[-1, 0, 1, 2, 3].flatMap((copy) =>
          layout.clouds
            // The third P-01 cloud ends in a flat vertical cut (its art is cropped
            // at the right edge, which P-01 hides at the screen edge). Mid-screen it
            // would show as a broken sky, so only the two tapered clouds are used.
            .filter((cloud) => cloud.id !== 'bg-cloud-3')
            .map((cloud) => (
              <Cloud
                key={`${cloud.id}-${copy}`}
                id={cloud.id}
                x={cloud.x + copy * width}
                y={cloud.y + descent}
                w={cloud.w}
                animate={animateClouds}
                order={order.clouds}
              />
            )),
        )}
      </BackdropLayer>
    </>
  );
}

/**
 * Far ridge, ground and near ridge, tiled edge to edge with a fixed ring so a
 * long walk cannot grow the scene graph.
 */
export function MarsGroundLayers({
  camera,
  unit,
  layout,
  descent,
  viewportWidth,
  maxCameraPx,
  order,
}: {
  camera: MarsCameraPose;
  unit: number;
  layout: P01Layout;
  descent: number;
  viewportWidth: number;
  /** Furthest camera x in host pixels; sets the ring size. */
  maxCameraPx: number;
  order: MarsLandscapeOrder;
}) {
  const layer = (
    asset: string,
    layerLayout: { x: number; y: number; w: number; h: number },
    fit: 'contain' | 'cover',
    position: readonly [number, number],
    paintOrder: number,
    factor: number,
    keyPrefix: string,
  ) => {
    const step = tileStep(layerLayout.w, MARS_TILE_OVERLAP);
    const indexes = landscapeTileIndexes({
      viewportWidth,
      maxCameraPx,
      tileWidth: step,
    });
    return (
      <ShiftLayer camera={camera} unit={unit} factor={factor}>
        {indexes.map((k) => (
          <SpriteLayer
            key={`${keyPrefix}-${k}`}
            asset={asset}
            {...layerLayout}
            y={layerLayout.y + descent}
            x={layerLayout.x + k * step}
            fit={fit}
            position={position}
            flipX={Math.abs(k) % 2 === 1}
            order={paintOrder}
          />
        ))}
      </ShiftLayer>
    );
  };

  return (
    <>
      {layer(
        'bg-ridge-far',
        layout.ridgeFar,
        'contain',
        [0.5, 1],
        order.ridgeFar,
        PARALLAX.ridgeFar,
        'ridge-far',
      )}
      {layer('bg-ground', layout.ground, 'cover', [0.5, 1], order.ground, PARALLAX.ground, 'ground')}
      {layer(
        'bg-ridge-near',
        layout.ridgeNear,
        'contain',
        [0.5, 1],
        order.ridgeNear,
        PARALLAX.ridgeNear,
        'ridge-near',
      )}
    </>
  );
}
