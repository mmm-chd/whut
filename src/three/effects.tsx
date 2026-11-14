import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  AddEquation,
  BufferAttribute,
  BufferGeometry,
  CustomBlending,
  OneFactor,
  OneMinusSrcAlphaFactor,
  PlaneGeometry,
  Points,
  ShaderMaterial,
  Vector2,
  Vector4,
  type Mesh,
} from 'three';
import { toWorldY } from './designSpace';
import { inheritedOpacity } from './sceneGraph';

/** Premultiplied "over" blending shared by every effect shader here. */
const premultipliedBlending = {
  transparent: true,
  depthTest: false,
  depthWrite: false,
  blending: CustomBlending,
  blendEquation: AddEquation,
  blendSrc: OneFactor,
  blendDst: OneMinusSrcAlphaFactor,
  blendSrcAlpha: OneFactor,
  blendDstAlpha: OneMinusSrcAlphaFactor,
} as const;

const unitPlane = new PlaneGeometry(1, 1);

// --- Drifting dust -------------------------------------------------------------

export interface DustParticle {
  /** Start position as fractions of the host. */
  left: number;
  top: number;
  /** Pixel size, drift in pixels (y down), seconds. */
  size: number;
  duration: number;
  delay: number;
  dx: number;
  dy: number;
  opacity: number;
}

const dustVertex = /* glsl */ `
attribute vec4 aA;
attribute vec4 aB;
uniform float uTime;
uniform vec2 uSize;
uniform float uPixelRatio;
uniform float uStill;
varying float vAlpha;
void main() {
  float ph = uStill > 0.5 ? 0.0 : fract((uTime - aB.y) / aB.x);
  float fade = ph < 0.15 ? ph / 0.15 : (ph > 0.85 ? (1.0 - ph) / 0.15 : 1.0);
  vAlpha = uStill > 0.5 ? 0.2 * 0.8 : fade * aB.w * 0.8;
  vec2 p = vec2(aA.x * uSize.x + aA.z * ph, -(aA.y * uSize.y + aA.w * ph));
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 0.0, 1.0);
  gl_PointSize = aB.z * uPixelRatio;
}
`;

const dustFragment = /* glsl */ `
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float a = vAlpha * (1.0 - smoothstep(0.8, 1.0, d));
  gl_FragColor = vec4(vec3(255.0, 236.0, 210.0) / 255.0 * a, a);
}
`;

/** Slow cream motes over the whole picture: one draw call, animated on the GPU. */
export function DustField({
  particles,
  still,
  order,
}: {
  particles: readonly DustParticle[];
  still: boolean;
  order: number;
}) {
  const size = useThree((state) => state.size);
  const gl = useThree((state) => state.gl);

  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(particles.length * 3), 3));
    g.setAttribute(
      'aA',
      new BufferAttribute(
        new Float32Array(particles.flatMap((p) => [p.left, p.top, p.dx, p.dy])),
        4,
      ),
    );
    g.setAttribute(
      'aB',
      new BufferAttribute(
        new Float32Array(particles.flatMap((p) => [p.duration, p.delay, p.size, p.opacity])),
        4,
      ),
    );
    return g;
  }, [particles]);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: dustVertex,
        fragmentShader: dustFragment,
        uniforms: {
          uTime: { value: 0 },
          uSize: { value: new Vector2(1, 1) },
          uPixelRatio: { value: 1 },
          uStill: { value: 0 },
        },
        ...premultipliedBlending,
      }),
    [],
  );
  const points = useMemo(() => {
    const object = new Points(geometry, material);
    object.frustumCulled = false;
    return object;
  }, [geometry, material]);
  points.renderOrder = order;

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
    (material.uniforms.uSize.value as Vector2).set(size.width, size.height);
    material.uniforms.uPixelRatio.value = gl.getPixelRatio();
    material.uniforms.uStill.value = still ? 1 : 0;
  });

  return <primitive object={points} />;
}

// --- Radial glow ---------------------------------------------------------------

const glowFragment = /* glsl */ `
uniform vec4 uColor;
uniform vec2 uCenter;
uniform vec2 uRadius;
uniform vec2 uBox;
uniform float uStop;
uniform float uEllipseClip;
uniform float uOpacity;
varying vec2 vUv;
void main() {
  vec2 box = vec2(vUv.x, 1.0 - vUv.y);
  vec2 px = (box - uCenter) * uBox;
  float t = length(px / uRadius);
  float a = uColor.a * clamp(1.0 - t / uStop, 0.0, 1.0);
  if (uEllipseClip > 0.5) {
    float r = length((box - 0.5) * 2.0);
    float edge = max(fwidth(r), 0.0001);
    a *= 1.0 - smoothstep(1.0 - edge, 1.0, r);
  }
  a *= uOpacity;
  gl_FragColor = vec4(uColor.rgb * a, a);
}
`;

const glowVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export interface RadialGlowProps {
  /** Box in design/host pixels, top-left anchored, y down. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** 0..255 colour and 0..1 peak alpha. */
  rgba: readonly [number, number, number, number];
  /** Gradient centre as box fractions. */
  center?: readonly [number, number];
  /** Gradient radius in pixels (circle: equal values). */
  radius: readonly [number, number];
  /** Fraction of the radius where the glow has faded out (CSS stop). */
  stop: number;
  /** Clip to the inscribed ellipse (CSS `border-radius: 50%`). */
  clipEllipse?: boolean;
  order: number;
}

/** A soft radial gradient box: Percy's glow, the reduced-motion rock glow. */
export function RadialGlow({
  x,
  y,
  w,
  h,
  rgba,
  center = [0.5, 0.5],
  radius,
  stop,
  clipEllipse = false,
  order,
}: RadialGlowProps) {
  const meshRef = useRef<Mesh>(null);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: glowVertex,
        fragmentShader: glowFragment,
        uniforms: {
          uColor: { value: new Vector4(rgba[0] / 255, rgba[1] / 255, rgba[2] / 255, rgba[3]) },
          uCenter: { value: new Vector2(center[0], center[1]) },
          uRadius: { value: new Vector2(radius[0], radius[1]) },
          uBox: { value: new Vector2(w, h) },
          uStop: { value: stop },
          uEllipseClip: { value: clipEllipse ? 1 : 0 },
          uOpacity: { value: 1 },
        },
        ...premultipliedBlending,
      }),
    [rgba, center, radius, w, h, stop, clipEllipse],
  );
  useEffect(() => () => material.dispose(), [material]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (mesh) {
      const value = inheritedOpacity(mesh);
      material.uniforms.uOpacity.value = value;
      mesh.visible = value > 0.001;
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={[x + w / 2, toWorldY(y + h / 2), 0]}
      scale={[w, h, 1]}
      geometry={unitPlane}
      material={material}
      renderOrder={order}
      frustumCulled={false}
    />
  );
}

// --- Sonar rings -----------------------------------------------------------------

const ringFragment = /* glsl */ `
uniform float uTime;
uniform float uDiameter;
uniform float uQuad;
uniform float uOpacity;
varying vec2 vUv;

float ring(float dist, float t, float delay) {
  if (t < delay) return 0.0;
  float ph = fract((t - delay) / 2.2);
  float radius = uDiameter * mix(0.35, 1.8, ph) * 0.5;
  float inner = radius - 2.0;
  float a = smoothstep(inner - 0.6, inner + 0.6, dist) * (1.0 - smoothstep(radius - 0.6, radius + 0.6, dist));
  return a * 0.65 * (1.0 - ph);
}

void main() {
  vec2 p = (vUv - 0.5) * uQuad;
  float dist = length(p);
  float a = max(ring(dist, uTime, 0.0), ring(dist, uTime, 0.7)) * uOpacity;
  gl_FragColor = vec4(vec3(255.0, 239.0, 210.0) / 255.0 * a, a);
}
`;

/**
 * Two cream rings spreading from a rock's base, 0.7 s apart (the CSS sonar).
 * `paused` freezes them where they are, like `animation-play-state: paused`.
 */
export function RingPulse({
  centerX,
  centerY,
  diameter,
  paused,
  order,
}: {
  /** Ring centre in design/host pixels (the rock's bottom centre). */
  centerX: number;
  centerY: number;
  diameter: number;
  paused: boolean;
  order: number;
}) {
  const meshRef = useRef<Mesh>(null);
  const clockRef = useRef(0);
  const quad = diameter * 1.8 + 8;

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: glowVertex,
        fragmentShader: ringFragment,
        uniforms: {
          uTime: { value: 0 },
          uDiameter: { value: diameter },
          uQuad: { value: quad },
          uOpacity: { value: 1 },
        },
        ...premultipliedBlending,
      }),
    [diameter, quad],
  );
  useEffect(() => () => material.dispose(), [material]);

  useFrame((_state, delta) => {
    if (!paused) {
      clockRef.current += delta;
    }
    material.uniforms.uTime.value = clockRef.current;
    const mesh = meshRef.current;
    if (mesh) {
      const value = inheritedOpacity(mesh);
      material.uniforms.uOpacity.value = value;
      mesh.visible = value > 0.001;
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={[centerX, toWorldY(centerY), 0]}
      scale={[quad, quad, 1]}
      geometry={unitPlane}
      material={material}
      renderOrder={order}
      frustumCulled={false}
    />
  );
}
