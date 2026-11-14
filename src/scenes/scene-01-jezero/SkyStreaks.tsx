import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  AddEquation,
  CustomBlending,
  Mesh,
  OneFactor,
  OneMinusSrcAlphaFactor,
  PlaneGeometry,
  ShaderMaterial,
} from 'three';
import { toWorldY } from '../../three/designSpace';
import {
  MAX_CONCURRENT,
  SPAWN_DELAY_MS,
  chooseSpawn,
  createSkyEvent,
  streakPose,
  type SkyEventSpec,
} from './skyEvents.logic';
import { WORLD_HEIGHT_FACTOR } from './layout';
import type { P01Nodes } from './nodes';

const vertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/**
 * One streak in its own frame: x runs along the axis (tail to head), the
 * origin is the middle of the shell box. Meteor and comet differ only in
 * colour stops, head size and the comet's outer glow.
 */
const fragment = /* glsl */ `
uniform float uComet;
uniform float uLength;
uniform float uThick;
uniform float uHead;
uniform vec2 uQuad;
uniform float uShift;
uniform float uOpacity;
varying vec2 vUv;

void main() {
  vec2 p = (vUv - 0.5) * uQuad + vec2(uShift, 0.0);
  float hl = uLength * 0.5;
  float t = clamp((p.x + hl) / uLength, 0.0, 1.0);

  // Pill body: distance to the axis segment, minus half the thickness.
  float segX = clamp(p.x, -hl + uThick * 0.5, hl - uThick * 0.5);
  float dBody = length(p - vec2(segX, 0.0)) - uThick * 0.5;
  float edge = max(fwidth(dBody), 0.0001);
  float body = 1.0 - smoothstep(0.0, edge * 1.5, dBody);

  float tailA;
  vec3 tailC;
  float headCenter;
  float headR;
  if (uComet > 0.5) {
    tailA = t < 0.3 ? mix(0.0, 0.14, t / 0.3) : (t < 0.82 ? mix(0.14, 0.6, (t - 0.3) / 0.52) : mix(0.6, 0.95, (t - 0.82) / 0.18));
    tailC = mix(vec3(127.0, 212.0, 255.0), vec3(255.0), smoothstep(0.82, 1.0, t)) / 255.0;
    headCenter = hl - uHead * 0.8;
    headR = uHead * 1.4;
  } else {
    tailA = t < 0.4 ? mix(0.0, 0.18, t / 0.4) : (t < 0.92 ? mix(0.18, 0.85, (t - 0.4) / 0.52) : mix(0.85, 1.0, (t - 0.92) / 0.08));
    tailC = mix(vec3(255.0, 239.0, 210.0), vec3(255.0), smoothstep(0.92, 1.0, t)) / 255.0;
    headCenter = hl + 2.0 - uHead * 0.5;
    headR = uHead * 0.5;
  }

  float a = body * tailA;
  vec3 c = tailC * a;

  // Head: a radial gradient whose reach is the CSS farthest-corner radius.
  float dh = length(p - vec2(headCenter, 0.0)) / (headR * 1.4142);
  float headA;
  vec3 headC;
  if (uComet > 0.5) {
    headA = dh < 0.32 ? mix(0.95, 0.6, dh / 0.32) : mix(0.6, 0.0, clamp((dh - 0.32) / 0.36, 0.0, 1.0));
    headC = mix(vec3(1.0), vec3(155.0, 232.0, 255.0) / 255.0, smoothstep(0.0, 0.32, dh));
  } else {
    headA = dh < 0.5 ? mix(1.0, 0.85, dh / 0.5) : mix(0.85, 0.0, clamp((dh - 0.5) / 0.28, 0.0, 1.0));
    headC = mix(vec3(1.0), vec3(255.0, 239.0, 210.0) / 255.0, smoothstep(0.0, 0.5, dh));
  }
  c = c * (1.0 - headA) + headC * headA;
  a = a * (1.0 - headA) + headA;

  if (uComet > 0.5) {
    // Outer glow of the comet body (box-shadow 0 0 18px).
    float glow = 0.35 * pow(clamp(1.0 - max(dBody, 0.0) / 18.0, 0.0, 1.0), 2.0) * (1.0 - body);
    c += vec3(127.0, 212.0, 255.0) / 255.0 * glow;
    a += glow;
  }

  a *= uOpacity;
  c *= uOpacity;
  gl_FragColor = vec4(c, a);
}
`;

const unitPlane = new PlaneGeometry(1, 1);

interface Slot {
  mesh: Mesh;
  material: ShaderMaterial;
}

interface LiveEvent {
  spec: SkyEventSpec;
  startedAt: number;
}

function createSlot(order: number): Slot {
  const material = new ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: {
      uComet: { value: 0 },
      uLength: { value: 100 },
      uThick: { value: 2 },
      uHead: { value: 5 },
      uQuad: { value: [100, 20] },
      uShift: { value: 0 },
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
  });
  const mesh = new Mesh(unitPlane, material);
  mesh.renderOrder = order;
  mesh.frustumCulled = false;
  mesh.visible = false;
  return { mesh, material };
}

/**
 * Meteors and comets across the sky. Streaks live in the tall world's own
 * coordinates, so the camera descent slides past them and their trails stay
 * put in the sky. Place it inside the sky-scroll group.
 */
export function SkyStreaks({
  nodes,
  reducedMotion,
  order,
}: {
  nodes: P01Nodes;
  reducedMotion: boolean;
  order: number;
}) {
  const size = useThree((state) => state.size);
  const slots = useMemo(
    () => Array.from({ length: MAX_CONCURRENT }, () => createSlot(order)),
    [order],
  );
  const live = useRef<LiveEvent[]>([]);
  const nextId = useRef(1);
  const lastComet = useRef(0);

  useEffect(
    () => () => {
      slots.forEach((slot) => slot.material.dispose());
    },
    [slots],
  );

  useEffect(() => {
    if (reducedMotion) {
      live.current = [];
      return;
    }

    let cancelled = false;
    let timer = 0;
    const schedule = () => {
      const delay =
        SPAWN_DELAY_MS.min + Math.random() * (SPAWN_DELAY_MS.max - SPAWN_DELAY_MS.min);
      timer = window.setTimeout(() => {
        if (cancelled) {
          return;
        }
        const now = Date.now();
        const { kind, band } = chooseSpawn(nodes.flags.skyPhase, now, lastComet.current);
        if (kind === 'comet') {
          lastComet.current = now;
        }
        const spec = createSkyEvent(nextId.current, kind, band);
        nextId.current += 1;
        live.current = [
          ...live.current.slice(-(MAX_CONCURRENT - 1)),
          { spec, startedAt: performance.now() },
        ];
        schedule();
      }, delay);
    };
    schedule();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [nodes, reducedMotion]);

  useFrame(() => {
    const now = performance.now();
    const containerHeight = size.height * WORLD_HEIGHT_FACTOR;
    live.current = live.current.filter((event) => now - event.startedAt < event.spec.durationMs);

    slots.forEach((slot, index) => {
      const event = live.current[index];
      if (!event) {
        slot.mesh.visible = false;
        return;
      }
      const { spec } = event;
      const progress = (now - event.startedAt) / spec.durationMs;
      // Space streaks ride the top 60 % of the world; Mars streaks the band the
      // camera rests on after landing.
      const bandTop = spec.band === 'space' ? 0 : containerHeight * 0.6154;
      const bandHeight = spec.band === 'space' ? containerHeight * 0.6 : containerHeight * 0.3846;
      const pose = streakPose(spec, progress, size, bandTop, bandHeight);

      // The quad reaches past the shell on both ends to hold the head glow.
      const margin = 20;
      const reach = spec.head * 2 + margin;
      const quadWidth = spec.length + reach + margin;
      const quadHeight = Math.max(spec.thickness, spec.head * 2.8) + margin * 2;
      const shift = (reach - margin) / 2;
      const axis = (spec.angle * Math.PI) / 180;

      const u = slot.material.uniforms;
      u.uComet.value = spec.kind === 'comet' ? 1 : 0;
      u.uLength.value = spec.length;
      u.uThick.value = spec.thickness;
      u.uHead.value = spec.head;
      u.uQuad.value = [quadWidth, quadHeight];
      u.uShift.value = shift;
      u.uOpacity.value = pose.opacity;

      slot.mesh.visible = pose.opacity > 0.001;
      slot.mesh.scale.set(quadWidth, quadHeight, 1);
      slot.mesh.rotation.z = -axis;
      // The quad centre sits `shift` ahead of the shell centre along the axis.
      slot.mesh.position.set(
        pose.x + Math.cos(axis) * shift,
        toWorldY(pose.y + Math.sin(axis) * shift),
        0,
      );
    });
  });

  return (
    <>
      {slots.map((slot, index) => (
        <primitive key={index} object={slot.mesh} />
      ))}
    </>
  );
}
