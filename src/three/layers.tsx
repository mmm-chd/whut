import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  AddEquation,
  CanvasTexture,
  CustomBlending,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  OneFactor,
  OneMinusSrcAlphaFactor,
  PlaneGeometry,
  Shape,
  ShapeGeometry,
  ShaderMaterial,
  Vector2,
  Vector3,
  type BufferGeometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { toWorldY, type SpriteRect } from './designSpace';
import { inheritedOpacity } from './sceneGraph';
import { SpriteMesh } from './SpriteLayer';
import type { LoadedTexture } from './textures';

// --- Gradient rectangle ------------------------------------------------------

export interface GradientStop {
  /** Position along the layer height, in layer pixels (like a CSS stop). */
  at: number;
  color: string;
}

/**
 * A vertical colour gradient drawn once to a small canvas. Hard stops (two
 * stops at the same `at`) stay hard because the canvas is 1:1 in height.
 */
export function GradientLayer({
  stops,
  order,
  ...rect
}: SpriteRect & { w: number; h: number; stops: readonly GradientStop[]; order: number }) {
  const source = useMemo<LoadedTexture | null>(() => {
    const height = Math.min(4096, Math.ceil(rect.h));
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      return null;
    }
    const gradient = context.createLinearGradient(0, 0, 0, height);
    const scale = height / rect.h;
    for (const stop of stops) {
      gradient.addColorStop(Math.min(1, Math.max(0, (stop.at * scale) / height)), stop.color);
    }
    context.fillStyle = gradient;
    context.fillRect(0, 0, 4, height);
    const texture = new CanvasTexture(canvas);
    return { texture, width: 4, height, placeholder: false };
  }, [stops, rect.h]);

  useEffect(
    () => () => {
      source?.texture.dispose();
    },
    [source],
  );

  return <SpriteMesh source={source} order={order} {...rect} />;
}

// --- Flat filled polygons ----------------------------------------------------

/** One closed polygon in design pixels (y down). */
export type Polygon = readonly (readonly [number, number])[];

/**
 * Many flat-colour polygons merged into one draw call (the procedural sky
 * ribbons). Vector geometry stays sharp at any zoom; MSAA smooths the edges.
 */
export function FlatShapes({
  polygons,
  color,
  order,
}: {
  polygons: readonly Polygon[];
  color: string;
  order: number;
}) {
  const geometry = useMemo<BufferGeometry | null>(() => {
    const parts = polygons
      .filter((polygon) => polygon.length >= 3)
      .map((polygon) => {
        const shape = new Shape(polygon.map(([x, y]) => new Vector2(x, toWorldY(y))));
        return new ShapeGeometry(shape);
      });
    if (parts.length === 0) {
      return null;
    }
    const merged = mergeGeometries(parts, false);
    parts.forEach((part) => part.dispose());
    return merged;
  }, [polygons]);

  const material = useMemo(
    () => new MeshBasicMaterial({ color, side: DoubleSide, depthTest: false, depthWrite: false }),
    [color],
  );

  useEffect(
    () => () => {
      geometry?.dispose();
    },
    [geometry],
  );
  useEffect(() => () => material.dispose(), [material]);

  if (!geometry) {
    return null;
  }
  return <mesh geometry={geometry} material={material} renderOrder={order} frustumCulled={false} />;
}

// --- Screen-space vignette ---------------------------------------------------

const vignetteVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy * 2.0, 0.0, 1.0);
}
`;

const vignetteFragment = /* glsl */ `
uniform vec2 uCenter;
uniform vec2 uSize;
uniform float uInner;
uniform vec3 uColor;
uniform float uAlpha;
uniform float uOpacity;
varying vec2 vUv;
void main() {
  vec2 c = vec2(uCenter.x, 1.0 - uCenter.y);
  float radius = length(max(c, 1.0 - c) * uSize);
  float t = length((vUv - c) * uSize) / radius;
  float s = clamp((t - uInner) / (1.0 - uInner), 0.0, 1.0);
  float a = uAlpha * s * uOpacity;
  gl_FragColor = vec4(uColor * a, a);
}
`;

const unitPlane = new PlaneGeometry(1, 1);

/**
 * The radial edge darkening the CSS stage had, as a full-screen quad. It is
 * `circle at (centerX, centerY)` with the farthest-corner radius, transparent
 * until `inner`, then fading to `alpha`.
 */
export function Vignette({
  centerX,
  centerY,
  inner,
  rgb,
  alpha,
  order,
}: {
  centerX: number;
  centerY: number;
  inner: number;
  rgb: readonly [number, number, number];
  alpha: number;
  order: number;
}) {
  const meshRef = useRef<Mesh>(null);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: vignetteVertex,
        fragmentShader: vignetteFragment,
        uniforms: {
          uCenter: { value: new Vector2(centerX, centerY) },
          uSize: { value: new Vector2(1, 1) },
          uInner: { value: inner },
          uColor: { value: new Vector3(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255) },
          uAlpha: { value: alpha },
          uOpacity: { value: 1 },
        },
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: CustomBlending,
        blendEquation: AddEquation,
        blendSrc: OneFactor,
        blendDst: OneMinusSrcAlphaFactor,
        blendSrcAlpha: OneFactor,
        blendDstAlpha: OneMinusSrcAlphaFactor,
      }),
    [centerX, centerY, inner, rgb, alpha],
  );
  useEffect(() => () => material.dispose(), [material]);

  useFrame(({ size }) => {
    (material.uniforms.uSize.value as Vector2).set(size.width, size.height);
    if (meshRef.current) {
      material.uniforms.uOpacity.value = inheritedOpacity(meshRef.current);
    }
  });

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
