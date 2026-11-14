import { useFrame, useThree } from '@react-three/fiber';
import { useCallback, useMemo, useRef, type MutableRefObject, type ReactNode } from 'react';
import type { Group, Mesh } from 'three';
import { CameraRig } from '../../three/camera';
import { toWorldY } from '../../three/designSpace';
import { DustField, RadialGlow, RingPulse } from '../../three/effects';
import { Vignette } from '../../three/layers';
import { SceneGroup } from '../../three/SceneGroup';
import { SpriteLayer } from '../../three/SpriteLayer';
import { useAssetTexture } from '../../three/textures';
import { PARALLAX } from './camera';
import { DUST_PARTICLES } from './dust';
import {
  layoutP01,
  panShift,
  percyPanShift,
  rockHostRect,
  type P01Layout,
  type RockLayout,
} from './layout';
import type { P01Nodes } from './nodes';
import type { RockId } from './interactions';
import { SkyStreaks } from './SkyStreaks';
import type { SonarMode } from './sonar';

/** Paint order replaces CSS z-index (sky-scroll children, then overlays). */
const ORDER = {
  sky: 0,
  clouds: 1,
  streaks: 2,
  ridgeFar: 3,
  ground: 4,
  ridgeNear: 5,
  sonar: 6,
  rock: 7,
  percyGlow: 8,
  percyShadow: 9,
  percy: 10,
  fgV1: 11,
  fgV2: 12,
  dust: 20,
  vignette: 30,
} as const;

const VIGNETTE_RGB = [43, 26, 22] as const;
const PERCY_GLOW_RGBA = [255, 220, 160, 0.65] as const;

export interface RockViewState {
  inspected: boolean;
  sonarMode: SonarMode;
}

export interface P01WorldProps {
  nodes: P01Nodes;
  rocks: Readonly<Record<RockId, RockViewState>>;
  reducedMotion: boolean;
  /** Live hover/focus brightness per rock, written by the DOM hit proxies. */
  hover: Readonly<Record<RockId, MutableRefObject<number>>>;
  /** The DOM hit proxies; the world moves them over the drawn rocks. */
  proxies: MutableRefObject<Partial<Record<RockId, HTMLElement | null>>>;
}

// --- Camera groups ---------------------------------------------------------------

/** Whole-world zoom about a point (host fractions), like CSS transform-origin. */
function ScaledWorld({ nodes, children }: { nodes: P01Nodes; children: ReactNode }) {
  const ref = useRef<Group>(null);
  useFrame(({ size }) => {
    const group = ref.current;
    if (!group) {
      return;
    }
    const { world } = nodes;
    const scale = world.scale * world.scaleX;
    const ox = world.originX * size.width;
    const oy = world.originY * size.height;
    group.scale.set(scale, scale, 1);
    group.position.set(ox * (1 - scale) + world.x, toWorldY(oy * (1 - scale) + world.y), 0);
  });
  return <group ref={ref}>{children}</group>;
}

/** The tall scroll: the camera descends by moving the whole container up. */
function ScrollGroup({ nodes, children }: { nodes: P01Nodes; children: ReactNode }) {
  const ref = useRef<Group>(null);
  useFrame(({ size }) => {
    const group = ref.current;
    if (group) {
      const shift = (nodes.skyScroll.yPercent / 100) * size.height * 2.6;
      group.position.set(0, toWorldY(shift), 0);
    }
  });
  return <group ref={ref}>{children}</group>;
}

/** A layer that slides with the pan at its own parallax factor. */
function PanGroup({
  nodes,
  shift,
  children,
}: {
  nodes: P01Nodes;
  shift: (width: number, pan: number) => number;
  children: ReactNode;
}) {
  const ref = useRef<Group>(null);
  useFrame(({ size }) => {
    if (ref.current) {
      ref.current.position.x = shift(size.width, nodes.pan.value);
    }
  });
  return <group ref={ref}>{children}</group>;
}

const parallaxShift = (factor: number) => (width: number, pan: number) =>
  panShift(width, factor, pan);

// --- Clouds ------------------------------------------------------------------------

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

function Cloud({
  id,
  x,
  y,
  w,
  animate,
}: {
  id: string;
  x: number;
  y: number;
  w: number;
  animate: boolean;
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
  return <SpriteLayer asset={id} x={x} y={y} w={w} order={ORDER.clouds} onFrame={onFrame} />;
}

// --- Actors ------------------------------------------------------------------------

function RockActor({
  rock,
  layout,
  nodes,
  state,
  reducedMotion,
  hover,
  proxies,
}: {
  rock: RockLayout;
  layout: P01Layout;
  nodes: P01Nodes;
  state: RockViewState;
  reducedMotion: boolean;
  hover: MutableRefObject<number>;
  proxies: P01WorldProps['proxies'];
}) {
  const texture = useAssetTexture(rock.id);
  const aspect = texture ? texture.width / texture.height : 1;
  const height = rock.w / aspect;

  // The DOM hit proxy sits exactly over the drawn rock, whatever the camera does.
  useFrame(() => {
    const element = proxies.current[rock.id];
    if (!element || !texture) {
      return;
    }
    const rect = rockHostRect(layout, rock, aspect, {
      scale: nodes.world.scale * nodes.world.scaleX,
      originX: nodes.world.originX,
      originY: nodes.world.originY,
      scrollPercent: nodes.skyScroll.yPercent,
      pan: nodes.pan.value,
    });
    element.style.left = `${rect.left}px`;
    element.style.top = `${rect.top}px`;
    element.style.width = `${rect.width}px`;
    element.style.height = `${rect.height}px`;
  });

  const showSonar = state.sonarMode !== 'off';
  return (
    <>
      {showSonar && reducedMotion ? (
        // A static glow instead of moving rings: the CSS `rock__sonar--static`.
        <RadialGlow
          x={rock.x + rock.w / 2 - rock.w * 0.75}
          y={rock.y - height * 0.8 + height * 0.18}
          w={rock.w * 1.5}
          h={height * 0.8}
          rgba={[255, 239, 210, 0.3]}
          center={[0.5, 1]}
          radius={[(rock.w * 1.5) / Math.SQRT2, (height * 0.8) * Math.SQRT2]}
          stop={0.68}
          order={ORDER.sonar}
        />
      ) : null}
      {showSonar && !reducedMotion ? (
        <RingPulse
          centerX={rock.x + rock.w / 2}
          centerY={rock.y}
          diameter={rock.w}
          paused={state.sonarMode === 'paused'}
          order={ORDER.sonar}
        />
      ) : null}
      <SpriteLayer
        asset={rock.id}
        x={rock.x}
        y={rock.y}
        w={rock.w}
        originX={0}
        originY={1}
        order={ORDER.rock}
        brightenRef={hover}
      />
    </>
  );
}

function PercyActor({ layout, nodes }: { layout: P01Layout; nodes: P01Nodes }) {
  const texture = useAssetTexture('rover');
  if (!texture) {
    return null;
  }
  const { width: roverW, anchorX, anchorY } = layout.percy;
  const roverH = roverW / (texture.width / texture.height);
  const top = anchorY - roverH;

  // Glow box: inset -20% / -15% of the rover, clipped to its inscribed ellipse.
  const glowW = roverW * 1.3;
  const glowH = roverH * 1.4;
  const glowRadius = 0.5 * Math.hypot(glowW, glowH);

  return (
    <PanGroup nodes={nodes} shift={percyPanShift}>
      <SceneGroup node={nodes.percy}>
        <SceneGroup node={nodes.glow}>
          <RadialGlow
            x={anchorX - roverW / 2 - roverW * 0.15}
            y={top - roverH * 0.2}
            w={glowW}
            h={glowH}
            rgba={PERCY_GLOW_RGBA}
            radius={[glowRadius, glowRadius]}
            stop={0.65}
            clipEllipse
            order={ORDER.percyGlow}
          />
        </SceneGroup>
        <SpriteLayer
          asset="rover-shadow"
          x={anchorX}
          y={anchorY + roverH * 0.04}
          w={roverW * 0.86}
          originX={0.5}
          originY={1}
          opacity={0.85}
          order={ORDER.percyShadow}
        />
        <SpriteLayer
          asset="rover"
          x={anchorX}
          y={anchorY}
          w={roverW}
          originX={0.5}
          originY={1}
          order={ORDER.percy}
        />
      </SceneGroup>
    </PanGroup>
  );
}

// --- World -------------------------------------------------------------------------

export function P01World({ nodes, rocks, reducedMotion, hover, proxies }: P01WorldProps) {
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const layout = useMemo(() => layoutP01(width, height), [width, height]);

  const getPose = useCallback(
    (hostWidth: number, hostHeight: number) => ({
      x: hostWidth / 2,
      y: hostHeight / 2,
      zoom: 1,
    }),
    [],
  );

  const cloudsAnimate = !reducedMotion;

  return (
    <>
      <CameraRig getPose={getPose} />

      <ScaledWorld nodes={nodes}>
        <ScrollGroup nodes={nodes}>
          <PanGroup nodes={nodes} shift={parallaxShift(PARALLAX.sky)}>
            <SpriteLayer
              asset="bg-space"
              x={layout.sky.x}
              y={layout.sky.y}
              w={layout.sky.w}
              h={layout.sky.h}
              fit="cover"
              position={[0.5, 0]}
              order={ORDER.sky}
            />
          </PanGroup>

          {/* The clouds ride the 0.15 parallax, measured from the sky's own 0.05. */}
          <PanGroup nodes={nodes} shift={parallaxShift(PARALLAX.clouds - PARALLAX.sky)}>
            {layout.clouds.map((cloud) => (
              <Cloud
                key={cloud.id}
                id={cloud.id}
                x={cloud.x}
                y={cloud.y}
                w={cloud.w}
                animate={cloudsAnimate}
              />
            ))}
          </PanGroup>

          <PanGroup nodes={nodes} shift={parallaxShift(PARALLAX.sky)}>
            <SkyStreaks nodes={nodes} reducedMotion={reducedMotion} order={ORDER.streaks} />
          </PanGroup>

          <PanGroup nodes={nodes} shift={parallaxShift(PARALLAX.ridgeFar)}>
            <SpriteLayer
              asset="bg-ridge-far"
              {...layout.ridgeFar}
              fit="contain"
              position={[0.5, 1]}
              order={ORDER.ridgeFar}
            />
            <SpriteLayer
              asset="bg-ridge-far"
              {...layout.ridgeFar}
              x={layout.ridgeFarDupX}
              fit="contain"
              position={[0.5, 1]}
              flipX
              order={ORDER.ridgeFar}
            />
          </PanGroup>

          <PanGroup nodes={nodes} shift={parallaxShift(PARALLAX.ground)}>
            <SpriteLayer
              asset="bg-ground"
              {...layout.ground}
              fit="cover"
              position={[0.5, 1]}
              order={ORDER.ground}
            />
            <SpriteLayer
              asset="bg-ground"
              {...layout.ground}
              x={layout.groundDupX}
              fit="cover"
              position={[0.5, 1]}
              flipX
              order={ORDER.ground}
            />
          </PanGroup>

          <PanGroup nodes={nodes} shift={parallaxShift(PARALLAX.ridgeNear)}>
            <SpriteLayer
              asset="bg-ridge-near"
              {...layout.ridgeNear}
              fit="contain"
              position={[0.5, 1]}
              order={ORDER.ridgeNear}
            />
            <SpriteLayer
              asset="bg-ridge-near"
              {...layout.ridgeNear}
              x={layout.ridgeNearDupX}
              fit="contain"
              position={[0.5, 1]}
              flipX
              order={ORDER.ridgeNear}
            />
          </PanGroup>

          <PanGroup nodes={nodes} shift={parallaxShift(PARALLAX.rocks)}>
            {layout.rocks.map((rock) => (
              <RockActor
                key={rock.id}
                rock={rock}
                layout={layout}
                nodes={nodes}
                state={rocks[rock.id]}
                reducedMotion={reducedMotion}
                hover={hover[rock.id]}
                proxies={proxies}
              />
            ))}
          </PanGroup>

          <PercyActor layout={layout} nodes={nodes} />

          <PanGroup nodes={nodes} shift={parallaxShift(PARALLAX.foreground)}>
            <SceneGroup node={nodes.fgV1}>
              <SpriteLayer asset="fg-band" {...layout.fgV1} order={ORDER.fgV1} />
            </SceneGroup>
            <SceneGroup node={nodes.fgV2}>
              <SpriteLayer asset="fg-band-wide" {...layout.fgV2} order={ORDER.fgV2} />
            </SceneGroup>
          </PanGroup>
        </ScrollGroup>
      </ScaledWorld>

      {/* Screen-space overlays: they do not zoom or scroll with the world. */}
      <DustField particles={DUST_PARTICLES} still={reducedMotion} order={ORDER.dust} />
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
