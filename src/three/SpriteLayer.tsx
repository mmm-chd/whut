import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { PlaneGeometry, type Mesh, type ShaderMaterial } from 'three';
import {
  computeSpriteFit,
  normaliseCrop,
  spriteTransform,
  type Box,
  type FitMode,
  type SpriteRect,
} from './designSpace';
import { inheritedOpacity } from './sceneGraph';
import {
  applySpriteUniforms,
  createSpriteMaterial,
  type BlendMode,
} from './SpriteMaterial';
import { useAssetTexture, type LoadedTexture } from './textures';

const planeGeometry = new PlaneGeometry(1, 1);
const CENTER = [0.5, 0.5] as const;

export interface SpriteStyleProps {
  /** Global paint order; higher draws later (replaces CSS z-index). */
  order: number;
  fit?: FitMode;
  /** CSS object-position as 0..1 fractions. */
  position?: readonly [number, number];
  /** Source-pixel crop of the texture. */
  crop?: Box;
  flipX?: boolean;
  flipY?: boolean;
  opacity?: number;
  /** Elliptical clip in box fractions: cx, cy, rx, ry. */
  mask?: readonly [number, number, number, number];
  fadeX?: number;
  fadeBottom?: number;
  blend?: BlendMode;
  /** Live additive brightness (hover), read every frame. */
  brightenRef?: { current: number };
  /** Per-frame hook for effects such as flicker. */
  onFrame?: (mesh: Mesh, material: ShaderMaterial, elapsed: number) => void;
}

export type SpriteLayerProps = SpriteRect & SpriteStyleProps & { asset: string };
export type SpriteMeshProps = SpriteRect & SpriteStyleProps & { source: LoadedTexture | null };

/** Draws an already-loaded texture (an asset, a canvas, a render target). */
export function SpriteMesh({
  source,
  order,
  fit = 'fill',
  position = CENTER,
  crop,
  flipX,
  flipY,
  opacity = 1,
  mask,
  fadeX,
  fadeBottom,
  blend = 'normal',
  brightenRef,
  onFrame,
  x,
  y,
  w,
  h,
  originX,
  originY,
}: SpriteMeshProps) {
  const meshRef = useRef<Mesh>(null);
  const material = useMemo(() => createSpriteMaterial(blend), [blend]);
  useEffect(() => () => material.dispose(), [material]);

  const layout = useMemo(() => {
    if (!source) {
      return null;
    }
    const cropW = crop?.w ?? source.width;
    const cropH = crop?.h ?? source.height;
    const transform = spriteTransform({ x, y, w, h, originX, originY }, cropW / cropH);
    const spriteFit = computeSpriteFit(
      transform.w,
      transform.h,
      cropW,
      cropH,
      fit,
      position[0],
      position[1],
    );
    return { transform, spriteFit, crop: normaliseCrop(crop, source.width, source.height) };
  }, [source, crop, x, y, w, h, originX, originY, fit, position]);

  useLayoutEffect(() => {
    if (!source || !layout) {
      return;
    }
    material.uniforms.map.value = source.texture;
    applySpriteUniforms(material, {
      fit: [
        layout.spriteFit.scaleX,
        layout.spriteFit.scaleY,
        layout.spriteFit.offsetX,
        layout.spriteFit.offsetY,
      ],
      crop: layout.crop,
      mask: mask ? [mask[0], mask[1], mask[2], mask[3]] : undefined,
      flipX,
      flipY,
      fadeX,
      fadeBottom,
    });
  }, [material, source, layout, mask, flipX, flipY, fadeX, fadeBottom]);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) {
      return;
    }
    const value = inheritedOpacity(mesh) * opacity;
    material.uniforms.uOpacity.value = value;
    material.uniforms.uBrighten.value = brightenRef?.current ?? 0;
    mesh.visible = value > 0.001;
    onFrame?.(mesh, material, state.clock.elapsedTime);
  });

  if (!layout || !source) {
    return null;
  }

  const { transform } = layout;
  return (
    <mesh
      ref={meshRef}
      position={[transform.cx, transform.cy, 0]}
      scale={[transform.w, transform.h, 1]}
      renderOrder={order}
      frustumCulled={false}
      geometry={planeGeometry}
      material={material}
    />
  );
}

/** A manifest image drawn as a design-pixel rect. */
export function SpriteLayer({ asset, ...props }: SpriteLayerProps) {
  const source = useAssetTexture(asset);
  return <SpriteMesh source={source} {...props} />;
}
