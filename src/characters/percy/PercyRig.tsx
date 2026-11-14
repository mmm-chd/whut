import { useFrame } from '@react-three/fiber';
import { useRef, type ReactNode } from 'react';
import type { Group } from 'three';
import { RadialGlow } from '../../three/effects';
import { toWorldY } from '../../three/designSpace';
import { SpriteLayer } from '../../three/SpriteLayer';
import type { PercyNodes } from './percyNodes';
import {
  PERCY_SCALE,
  RIG_PARTS,
  ROVER_VISIBLE_WIDTH,
  armShoulderPivot,
  mastBasePivot,
  mastHeadPivot,
  rigPart,
  rollBobUnits,
  rollRockDegrees,
  type RigPart,
  type RigPartId,
} from './rigLayout';

interface PercyRigProps {
  nodes: PercyNodes;
  /** Host pixels per design unit. */
  unit: number;
  /** Host y of the wheel contact line, before the camera. */
  groundY: number;
  /** Paint order of the rig; parts use order + 0 .. 11. */
  order: number;
}

interface RigGroupProps {
  /** Pivot in rover pixels, relative to the anchor (y down). */
  pivot: { x: number; y: number };
  /** Called every frame; set rotation (degrees) and scale on the pivot group. */
  update: (group: Group) => void;
  children: ReactNode;
}

/** A group that turns about a pivot; children use rover pixels (y down). */
function RigGroup({ pivot, update, children }: RigGroupProps) {
  const ref = useRef<Group>(null);
  useFrame(() => {
    if (ref.current) {
      update(ref.current);
    }
  });
  return (
    <group ref={ref} position={[pivot.x, toWorldY(pivot.y), 0]}>
      <group position={[-pivot.x, -toWorldY(pivot.y), 0]}>{children}</group>
    </group>
  );
}

function PartSprite({ part, order }: { part: RigPart; order: number }) {
  return (
    <SpriteLayer
      asset={part.asset}
      x={part.box.x}
      y={part.box.y}
      w={part.box.w}
      h={part.box.h}
      order={order}
    />
  );
}

const DEG = Math.PI / 180;
const MAST_TILT_DEGREES = 8;
const HEAD_TILT_DEGREES = 12;
const HEAD_PAN_SQUASH = 0.32;
const HEAD_PAN_SHIFT = 16;

/**
 * Percy drawn from his parts. Everything is driven by `PercyNodes`: `body`
 * moves and tilts the whole rover, the body bobs with the distance rolled (the
 * wheels stay still: see rigLayout), the mast pans and tilts, and the arm raises.
 */
export function PercyRig({ nodes, unit, groundY, order }: PercyRigProps) {
  const root = useRef<Group>(null);
  const scale = PERCY_SCALE * unit;

  useFrame(() => {
    const group = root.current;
    if (!group) {
      return;
    }
    const { body } = nodes;
    group.position.set(
      body.x * unit,
      toWorldY(groundY + (body.y + rollBobUnits(body.x)) * unit),
      0,
    );
    group.scale.set(scale, scale, 1);
    group.rotation.z = -(body.rotation + rollRockDegrees(body.x)) * DEG;
    group.userData.opacity = body.opacity;
    group.visible = body.opacity > 0.001;

  });

  const byId = (id: RigPartId) => rigPart(id);
  const orderOf = (id: RigPartId) => order + RIG_PARTS.findIndex((part) => part.id === id);

  const mastBase = mastBasePivot();
  const mastHead = mastHeadPivot();
  const shoulder = armShoulderPivot();
  const neck = byId('neck');
  const camera = byId('camera');
  const arm = byId('arm');
  const halfWidth = ROVER_VISIBLE_WIDTH / 2;

  return (
    <group ref={root}>
      {RIG_PARTS.map((part) => {
        if (part.id === 'neck' || part.id === 'camera' || part.id === 'arm') {
          return null;
        }
        return <PartSprite key={part.id} part={part} order={orderOf(part.id)} />;
      })}

      {/* The mast tilts about its base; the head pans (a side view cannot yaw,
          so it squashes and slides) and tilts a little more about the neck top. */}
      <RigGroup
        pivot={mastBase}
        update={(group) => {
          group.rotation.z = nodes.mast.tilt * MAST_TILT_DEGREES * DEG;
        }}
      >
        <PartSprite part={neck} order={orderOf('neck')} />
        <RigGroup
          pivot={mastHead}
          update={(group) => {
            const { pan, tilt } = nodes.mast;
            group.scale.x = 1 - HEAD_PAN_SQUASH * Math.abs(pan);
            group.position.x = mastHead.x + pan * HEAD_PAN_SHIFT;
            group.rotation.z = tilt * HEAD_TILT_DEGREES * DEG;
          }}
        >
          <PartSprite part={camera} order={orderOf('camera')} />
        </RigGroup>
      </RigGroup>

      <RigGroup
        pivot={shoulder}
        update={(group) => {
          group.rotation.z = nodes.arm.angle * DEG;
        }}
      >
        <PartSprite part={arm} order={orderOf('arm')} />
      </RigGroup>

      {/* A soft glow behind the whole rover for the excited beat. */}
      <SceneGlow nodes={nodes} halfWidth={halfWidth} order={order - 1} />
    </group>
  );
}

function SceneGlow({
  nodes,
  halfWidth,
  order,
}: {
  nodes: PercyNodes;
  halfWidth: number;
  order: number;
}) {
  const ref = useRef<Group>(null);
  useFrame(() => {
    if (ref.current) {
      ref.current.userData.opacity = nodes.glow.opacity;
      ref.current.visible = nodes.glow.opacity > 0.001;
    }
  });
  return (
    <group ref={ref}>
      <RadialGlow
        x={-halfWidth * 1.15}
        y={-520}
        w={halfWidth * 2.3}
        h={620}
        rgba={[255, 220, 160, 0.65]}
        radius={[halfWidth * 1.1, halfWidth * 1.1]}
        stop={0.65}
        clipEllipse
        order={order}
      />
    </group>
  );
}
