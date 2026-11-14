import { useCallback, useMemo } from 'react';
import type { Mesh } from 'three';
import { CameraRig, FrameSpace } from '../../three/camera';
import { fitScale } from '../../three/designSpace';
import { FadeGroup } from '../../three/FadeGroup';
import { FlatShapes, GradientLayer, Vignette, type GradientStop } from '../../three/layers';
import type { SceneNode } from '../../three/nodeState';
import { SceneGroup } from '../../three/SceneGroup';
import { SpriteLayer } from '../../three/SpriteLayer';
import {
  P02_CLOSEUP,
  P02_CLOSEUP_SERVICE_TOWER,
  P02_CLOSEUP_TOWERS,
  P02_ESTABLISHING_SERVICE_TOWER,
  P02_ESTABLISHING_TOWERS,
  P02_LAND,
  P02_ROCKET,
  P02_TOWER_SPRITE,
  P02_WINDOW,
  p02TowerSpriteStyle,
  type P02Box,
  type P02TowerPlacement,
} from './camera';
import { P02_EXHAUST_BOX, P02_ROCKET_PIVOT, p02CameraPose, type P02Nodes } from './nodes';
import { P02_SKY_CLOUDS, P02_SKY_CLOUD_COLOR } from './skyClouds';
import { skyCloudPolygons } from './skyPolygons';
import { SMOKE_ASSET, SMOKE_NODES } from './smoke';

/**
 * The P-02 picture, drawn with WebGL. Every number is the design-pixel value
 * the CSS stage used (see camera.ts and the reference measurements), so the
 * references still apply. Paint order replaces CSS z-index.
 */

const ORDER = {
  backdrop: 0,
  skyStrip: 1,
  skyCloud: 2,
  skyArt: 3,
  skyCap: 4,
  sea: 10,
  ground: 11,
  serviceTower: 12,
  lattice: 13,
  exhaust: 20,
  rocketBody: 21,
  window: 22,
  smokeFar: 30,
  smokeMid: 31,
  smokeNear: 32,
  closeup: 40,
  vignette: 50,
} as const;

const SMOKE_ORDER = { far: ORDER.smokeFar, mid: ORDER.smokeMid, near: ORDER.smokeNear } as const;

/** Sky art (1670 x 942) is shown at 1920 x 1083 in the world. */
const SKY = { width: 1920, height: 1083, srcWidth: 1670, srcHeight: 942, top: -2 } as const;
const SKY_CLEAN_SRC_TOP = 260;
const SKY_CLEAN_ROWS = 300;

/** Sampled from sky.png, sea.png and ground.png (see the CSS-era backdrop). */
const BACKDROP_STOPS: readonly GradientStop[] = [
  { at: 0, color: '#6f97ac' },
  { at: 2600, color: '#82a6b6' },
  { at: 3060, color: '#89acbd' },
  { at: 3290, color: '#9cb7c1' },
  { at: 3361, color: '#aabec1' },
  { at: 3361, color: '#67868f' },
  { at: 3402, color: '#67868f' },
  { at: 3402, color: '#8a855f' },
  { at: 3480, color: '#c8a46e' },
];

interface SkyStrip {
  left: number;
  top: number;
  srcTop: number;
  height: number;
  flipX?: boolean;
  flipY?: boolean;
}

/**
 * Strips of the sky art that continue the sky above the opening frame. The
 * ascent camera shows world y -1380..780 and the art covers only 0..1083, so
 * mirrored tiles of the clean-blue rows (art rows 260..560) fill the height.
 */
const SKY_STRIPS: readonly SkyStrip[] = [-1, 0, 1].flatMap((column) =>
  [1, 2, 3, 4, 5].map(
    (row): SkyStrip => ({
      left: column * SKY.width,
      top: -2 - row * SKY_CLEAN_ROWS,
      srcTop: SKY_CLEAN_SRC_TOP,
      height: SKY_CLEAN_ROWS,
      flipX: column % 2 !== 0,
      flipY: row % 2 === 1,
    }),
  ),
);

/** Source crop for a strip that shows displayed-art rows srcTop..srcTop+height. */
function skyCrop(srcTop: number, height: number) {
  const ratio = SKY.srcHeight / SKY.height;
  return { x: 0, y: srcTop * ratio, w: SKY.srcWidth, h: height * ratio };
}

const LAND_OFFSET = P02_LAND.establishingOffsetY;

/**
 * The window clip: ellipse(30% 28.8% at 50.1% 45.4%) of the window box. The
 * frame asset's glass hole is slightly smaller, so the clip tucks under the
 * ring.
 */
const WINDOW_MASK = { cx: 0.501, cy: 0.454, rx: 0.3, ry: 0.288 } as const;

interface RelativeBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** The window clip expressed in the box fractions of a sprite inside the window. */
function maskInBox(box: RelativeBox, windowSize: number): [number, number, number, number] {
  return [
    (WINDOW_MASK.cx * windowSize - box.left) / box.width,
    (WINDOW_MASK.cy * windowSize - box.top) / box.height,
    (WINDOW_MASK.rx * windowSize) / box.width,
    (WINDOW_MASK.ry * windowSize) / box.height,
  ];
}

const FULL_WINDOW_MASK = [WINDOW_MASK.cx, WINDOW_MASK.cy, WINDOW_MASK.rx, WINDOW_MASK.ry] as const;

interface WindowArtProps {
  /** Window box origin and size, in the parent's design coordinates. */
  x: number;
  y: number;
  size: number;
  order: number;
  percyBox: RelativeBox;
  ginnyBox: RelativeBox;
  percyNode?: SceneNode;
  ginnyNode?: SceneNode;
}

/** Background, glass tint, Percy, Ginny, then the cream ring on top. */
function WindowArt({
  x,
  y,
  size,
  order,
  percyBox,
  ginnyBox,
  percyNode,
  ginnyNode,
}: WindowArtProps) {
  const percy = (
    <SpriteLayer
      asset="p02-percy"
      x={x + percyBox.left}
      y={y + percyBox.top}
      w={percyBox.width}
      h={percyBox.height}
      fit="contain"
      mask={maskInBox(percyBox, size)}
      order={order + 2}
    />
  );
  const ginny = (
    <SpriteLayer
      asset="p02-ginny"
      x={x + ginnyBox.left}
      y={y + ginnyBox.top}
      w={ginnyBox.width}
      h={ginnyBox.height}
      fit="contain"
      mask={maskInBox(ginnyBox, size)}
      order={order + 3}
    />
  );

  return (
    <>
      <SpriteLayer
        asset="p02-window-bg"
        x={x}
        y={y}
        w={size}
        h={size}
        fit="cover"
        mask={FULL_WINDOW_MASK}
        order={order}
      />
      <SpriteLayer
        asset="p02-window-glass"
        x={x}
        y={y}
        w={size}
        h={size}
        fit="contain"
        mask={FULL_WINDOW_MASK}
        order={order + 1}
      />
      {percyNode ? <SceneGroup node={percyNode}>{percy}</SceneGroup> : percy}
      {ginnyNode ? <SceneGroup node={ginnyNode}>{ginny}</SceneGroup> : ginny}
      <SpriteLayer
        asset="p02-window-frame"
        x={x}
        y={y}
        w={size}
        h={size}
        fit="contain"
        order={order + 4}
      />
    </>
  );
}

/** One lattice tower cut out of the two-tower sheet (UV crop, never stretched). */
function TowerSprite({
  placement,
  offsetY = 0,
  order,
}: {
  placement: P02TowerPlacement;
  offsetY?: number;
  order: number;
}) {
  const { wrapper } = p02TowerSpriteStyle(placement, offsetY);
  const sprite = P02_TOWER_SPRITE[placement.sprite];
  const crop = useMemo(
    () => ({ x: sprite.left, y: sprite.top, w: sprite.width, h: sprite.height }),
    [sprite],
  );
  return (
    <SpriteLayer
      asset="p02-tower-front"
      x={wrapper.left}
      y={wrapper.top}
      w={wrapper.width}
      h={wrapper.height}
      crop={crop}
      order={order}
    />
  );
}

function ServiceTower({ box, offsetY = 0, order }: { box: P02Box; offsetY?: number; order: number }) {
  return (
    <SpriteLayer
      asset="p02-tower"
      x={box.left}
      y={box.top - offsetY}
      w={box.width}
      h={box.height}
      order={order}
    />
  );
}

/** In-rocket window layout: the close-up layout scaled to the small window. */
const WINDOW_SCALE = P02_WINDOW.size / P02_CLOSEUP.window.size;
const scaledBox = (box: RelativeBox): RelativeBox => ({
  left: box.left * WINDOW_SCALE,
  top: box.top * WINDOW_SCALE,
  width: box.width * WINDOW_SCALE,
  height: box.height * WINDOW_SCALE,
});

const ROCKET_BOX = {
  left: P02_ROCKET.centerX - P02_ROCKET.width / 2,
  top: P02_ROCKET.top,
};
const ROCKET_WINDOW = {
  x: ROCKET_BOX.left + P02_WINDOW.offsetLeft,
  y: ROCKET_BOX.top + P02_WINDOW.offsetTop,
};
const ROCKET_PERCY_BOX = scaledBox(P02_CLOSEUP.percy);
const ROCKET_GINNY_BOX = scaledBox(P02_CLOSEUP.ginny);

const VIGNETTE_RGB = [13, 24, 34] as const;

/** Three plumes hang from the nozzles; they flicker like the CSS animation did. */
function flicker(mesh: Mesh, reduced: boolean, elapsed: number): void {
  const phase = reduced ? 0 : Math.sin((elapsed / 0.14) * Math.PI) * 0.5 + 0.5;
  const scaleY = reduced ? 1 : 0.94 + (1.05 - 0.94) * phase;
  const scaleX = reduced ? 1 : 1.02 + (0.98 - 1.02) * phase;
  const { left, top, width, height } = P02_EXHAUST_BOX;
  mesh.position.set(left + width / 2, -(top + (height * scaleY) / 2), 0);
  mesh.scale.set(width * scaleX, height * scaleY, 1);
}

export function P02World({ nodes }: { nodes: P02Nodes }) {
  const cloudPolygons = useMemo(() => skyCloudPolygons(P02_SKY_CLOUDS), []);
  const capCrop = useMemo(() => skyCrop(SKY_CLEAN_SRC_TOP, 140), []);

  const getPose = useCallback(
    (hostWidth: number, hostHeight: number) => {
      const pose = p02CameraPose(nodes);
      const fit = fitScale(hostWidth, hostHeight);
      return { x: pose.centerX, y: pose.centerY, zoom: fit > 0 ? fit * pose.scale : 1 };
    },
    [nodes],
  );

  const onExhaustFrame = useCallback(
    (mesh: Mesh, _material: unknown, elapsed: number) =>
      flicker(mesh, nodes.flags.reducedMotion, elapsed),
    [nodes],
  );

  return (
    <>
      <CameraRig getPose={getPose} />

      {/* World-space backdrop: continues the sky past the 1920 x 1080 art. */}
      <GradientLayer
        x={-1920}
        y={-2600}
        w={5760}
        h={4000}
        stops={BACKDROP_STOPS}
        order={ORDER.backdrop}
      />
      {SKY_STRIPS.map((strip, index) => (
        <SpriteLayer
          key={`sky-strip-${index}`}
          asset="p02-bg-sky"
          x={strip.left}
          y={strip.top}
          w={SKY.width}
          h={strip.height}
          crop={skyCrop(strip.srcTop, strip.height)}
          flipX={strip.flipX}
          flipY={strip.flipY}
          order={ORDER.skyStrip}
        />
      ))}
      <FlatShapes polygons={cloudPolygons} color={P02_SKY_CLOUD_COLOR} order={ORDER.skyCloud} />
      <SpriteLayer
        asset="p02-bg-sky"
        x={0}
        y={SKY.top}
        w={SKY.width}
        h={SKY.height}
        fadeX={0.03}
        order={ORDER.skyArt}
      />
      <SceneGroup node={nodes.skyCap}>
        <SpriteLayer
          asset="p02-bg-sky"
          x={0}
          y={-80}
          w={SKY.width}
          h={140}
          crop={capCrop}
          fadeBottom={0.55}
          order={ORDER.skyCap}
        />
      </SceneGroup>

      {/* Land group: moves down for the establishing shot, up at countdown. */}
      <SceneGroup node={nodes.land}>
        {([-1920, 1920] as const).map((left) => (
          <SpriteLayer
            key={`sea-${left}`}
            asset="p02-sea"
            x={left}
            y={730}
            w={1920}
            h={110}
            flipX
            order={ORDER.sea}
          />
        ))}
        {([-1920, 1920] as const).map((left) => (
          <SpriteLayer
            key={`ground-${left}`}
            asset="p02-ground"
            x={left}
            y={760}
            w={1920}
            h={351}
            flipX
            order={ORDER.ground}
          />
        ))}
        {/* Flipped copy below the ground, for 4:3 hosts. */}
        <SpriteLayer
          asset="p02-ground"
          x={0}
          y={1111}
          w={1920}
          h={351}
          flipY
          order={ORDER.ground}
        />
        <SpriteLayer asset="p02-sea" x={0} y={730} w={1920} h={110} order={ORDER.sea} />
        <SpriteLayer asset="p02-ground" x={0} y={760} w={1920} h={351} order={ORDER.ground} />
        <ServiceTower
          box={P02_ESTABLISHING_SERVICE_TOWER}
          offsetY={LAND_OFFSET}
          order={ORDER.serviceTower}
        />
        {P02_ESTABLISHING_TOWERS.map((placement, index) => (
          <TowerSprite
            key={`tower-${index}`}
            placement={placement}
            offsetY={LAND_OFFSET}
            order={ORDER.lattice}
          />
        ))}
      </SceneGroup>

      {/* Rocket: scales about the visible nozzle, like transform-origin 50% 97%. */}
      <SceneGroup node={nodes.rocket} pivot={[P02_ROCKET_PIVOT.x, P02_ROCKET_PIVOT.y]}>
        <SceneGroup node={nodes.vibration}>
          <SceneGroup node={nodes.exhaust} pivot={[P02_ROCKET.centerX, P02_EXHAUST_BOX.top]}>
            <SpriteLayer
              asset="p02-exhaust"
              x={P02_EXHAUST_BOX.left}
              y={P02_EXHAUST_BOX.top}
              w={P02_EXHAUST_BOX.width}
              h={P02_EXHAUST_BOX.height}
              order={ORDER.exhaust}
              onFrame={onExhaustFrame}
            />
          </SceneGroup>
          <SpriteLayer
            asset="p02-rocket"
            x={ROCKET_BOX.left}
            y={ROCKET_BOX.top}
            w={P02_ROCKET.width}
            h={P02_ROCKET.height}
            fit="contain"
            order={ORDER.rocketBody}
          />
          <WindowArt
            x={ROCKET_WINDOW.x}
            y={ROCKET_WINDOW.y}
            size={P02_WINDOW.size}
            order={ORDER.window}
            percyBox={ROCKET_PERCY_BOX}
            ginnyBox={ROCKET_GINNY_BOX}
            ginnyNode={nodes.windowGinny}
          />
        </SceneGroup>
      </SceneGroup>

      {SMOKE_NODES.map((smoke, index) => (
        <SceneGroup
          key={`smoke-${index}`}
          node={nodes.smoke[index]}
          pivot={[smoke.left + smoke.size / 2, smoke.top + smoke.size / 2]}
        >
          <SpriteLayer
            asset={SMOKE_ASSET[smoke.layer]}
            x={smoke.left}
            y={smoke.top}
            w={smoke.size}
            h={smoke.size}
            fit="contain"
            order={SMOKE_ORDER[smoke.layer]}
          />
        </SceneGroup>
      ))}

      {/* Dedicated close-up: a 1:1 composition outside the story camera, so the
          window art is never magnified. It cross-fades as one finished picture. */}
      <FrameSpace>
        <FadeGroup node={nodes.closeup} order={ORDER.closeup}>
          {/* The close-up covers the whole host. On a host that is not 16:9 it
              reaches past the frame, so the art continues there (clean sky above,
              mirrored sky, sea and ground at the sides, flipped ground below). */}
          <GradientLayer
            x={-1920}
            y={-2600}
            w={5760}
            h={4000}
            stops={BACKDROP_STOPS}
            order={-2}
          />
          {SKY_STRIPS.map((strip, index) => (
            <SpriteLayer
              key={`closeup-sky-strip-${index}`}
              asset="p02-bg-sky"
              x={strip.left}
              y={strip.top}
              w={SKY.width}
              h={strip.height}
              crop={skyCrop(strip.srcTop, strip.height)}
              flipX={strip.flipX}
              flipY={strip.flipY}
              order={-1}
            />
          ))}
          {([-1920, 1920] as const).map((left) => (
            <SpriteLayer
              key={`closeup-side-${left}`}
              asset="p02-bg-sky"
              x={left}
              y={SKY.top}
              w={SKY.width}
              h={SKY.height}
              flipX
              order={0}
            />
          ))}
          <SpriteLayer
            asset="p02-bg-sky"
            x={0}
            y={SKY.top}
            w={SKY.width}
            h={SKY.height}
            order={0}
          />
          {([-1920, 1920] as const).map((left) => (
            <SpriteLayer
              key={`closeup-sea-${left}`}
              asset="p02-sea"
              x={left}
              y={720}
              w={1920}
              h={110}
              flipX
              order={1}
            />
          ))}
          {([-1920, 1920] as const).map((left) => (
            <SpriteLayer
              key={`closeup-ground-${left}`}
              asset="p02-ground"
              x={left}
              y={750}
              w={1920}
              h={351}
              flipX
              order={2}
            />
          ))}
          <SpriteLayer asset="p02-ground" x={0} y={1101} w={1920} h={351} flipY order={2} />
          <SpriteLayer asset="p02-sea" x={0} y={720} w={1920} h={110} order={1} />
          <SpriteLayer asset="p02-ground" x={0} y={750} w={1920} h={351} order={2} />
          <ServiceTower box={P02_CLOSEUP_SERVICE_TOWER} order={3} />
          {P02_CLOSEUP_TOWERS.map((placement, index) => (
            <TowerSprite key={`closeup-tower-${index}`} placement={placement} order={4} />
          ))}
          {/* Stretched on purpose: the reference fairing is stubbier than the art. */}
          <SpriteLayer
            asset="p02-rocket-half"
            x={P02_CLOSEUP.head.left}
            y={P02_CLOSEUP.head.top}
            w={P02_CLOSEUP.head.width}
            h={P02_CLOSEUP.head.height}
            order={5}
          />
          <WindowArt
            x={P02_CLOSEUP.window.left}
            y={P02_CLOSEUP.window.top}
            size={P02_CLOSEUP.window.size}
            order={6}
            percyBox={P02_CLOSEUP.percy}
            ginnyBox={P02_CLOSEUP.ginny}
            percyNode={nodes.closeupPercy}
            ginnyNode={nodes.closeupGinny}
          />
        </FadeGroup>
      </FrameSpace>

      <Vignette
        centerX={0.5}
        centerY={0.46}
        inner={0.48}
        rgb={VIGNETTE_RGB}
        alpha={0.28}
        order={ORDER.vignette}
      />
    </>
  );
}
