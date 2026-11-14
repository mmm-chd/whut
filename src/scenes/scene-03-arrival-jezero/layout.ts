import { fitScale } from '../../three/designSpace';
import { PERCY_DESIGN_WIDTH } from '../../characters/percy/rigLayout';

/**
 * P-03 geometry.
 *
 * Everything is in "design units" along the walk (x) and above the ground (y),
 * and becomes host pixels through `unit = min(W / 1920, H / 1080)`. A narrow
 * or tall host therefore shrinks the actors with the picture instead of
 * letting Percy fill the screen. The ground line sits at 0.82 H, the same
 * line P-01 puts Percy on, so the shared landscape lines up.
 *
 * Camera poses are computed from the host size when a run starts. A resize
 * mid-run keeps every actor in proportion but can leave a pose a little off;
 * the next run (replay) is exact.
 */
export const GROUND_LINE = 0.82;

export const ROCKET = {
  /** Centre x of the landed rocket and the art scale (art pixels to design units). */
  x: 400,
  scale: 1.6,
  /** `rocket-full-body.png` canvas and the bottom-centre of its visible body. */
  art: { width: 724, height: 2172, baseX: 360, baseY: 2109 },
  /** Height the rocket starts above its landed position, in design units. */
  dropHeight: 2600,
} as const;

/**
 * The hatch, in design units. It is cut into the core stage, high on the
 * rocket, not at the ground: a small upright door (150 x 240) whose sill is
 * `sill` units above the ground. Its picture is the hull itself, so a closed
 * door cannot be told from the wall except by thin seams; it slides left into
 * the wall. When it is open Percy fades in at the sill and jumps down.
 */
export const DOOR = { width: 150, height: 240, sill: 470 } as const;

export const PERCY_HALF_WIDTH = PERCY_DESIGN_WIDTH / 2;

const DOOR_CAMERA_SCALE = 1.25;
const OFFSCREEN_MARGIN = 40;

export interface CameraPose {
  /** World x in design units at the centre of the view. */
  x: number;
  /** Lift in design units: how far the view centre is raised above the host centre. */
  lift: number;
  scale: number;
}

export interface P03Layout {
  width: number;
  height: number;
  /** Host pixels per design unit. */
  unit: number;
  /** Host y of the wheel contact line. */
  groundY: number;
  doorX: number;
  /** Left edge of the hatch. */
  doorLeft: number;
  /** Where Percy appears at the sill, and where he jumps from. */
  jumpFromX: number;
  /** Where he lands on the ground. */
  landX: number;
  /** Percy is fully outside the door camera's view at this x. */
  exitOffX: number;
  stopA: number;
  stopA2: number;
  stopB: number;
  rockX: number;
  rockWidth: number;
  stopC: number;
  /** Furthest camera x in host pixels; sets how many landscape tiles to draw. */
  maxCameraPx: number;
  poses: {
    landing: CameraPose;
    door: CameraPose;
    reveal: CameraPose;
    inspect: CameraPose;
    confused: CameraPose;
    rovers: CameraPose;
    mission: CameraPose;
    final: CameraPose;
  };
  /** Camera x that keeps Percy a little left of centre while he rolls right. */
  followX: (percyX: number) => number;
  followScale: number;
  /** Lift that keeps the ground line low in the frame while following. */
  followLift: number;
}

export function layoutP03(width: number, height: number): P03Layout {
  const unit = fitScale(width, height) || 1;
  const groundY = GROUND_LINE * height;

  /** Lift that puts a point `aim` design units above the ground at the view centre. */
  const liftFor = (aim: number) => (height / 2 - (groundY - aim * unit)) / unit;
  /** Lift that puts the ground line at `fraction` of the host height at `scale`. */
  const liftForGround = (fraction: number, scale: number) =>
    (height / 2 - (groundY - ((fraction - 0.5) * height) / scale)) / unit;
  const pose = (x: number, scale: number, aim?: number, ground = 0.82): CameraPose => ({
    x,
    scale,
    lift: aim === undefined ? liftForGround(ground, scale) : liftFor(aim),
  });
  const followScale = 1.5;

  // The view shows the whole door, the ledge, and the ground Percy lands on.
  const doorCameraX = ROCKET.x + 200;
  const halfView = width / 2 / (DOOR_CAMERA_SCALE * unit);
  const exitOffX = doorCameraX + halfView + PERCY_HALF_WIDTH + OFFSCREEN_MARGIN;

  const stopA = exitOffX + 1000;
  const stopA2 = stopA + 500;
  const stopB = stopA2 + 1000;
  const rockX = stopB + 330;
  const stopC = stopB + 800;

  return {
    width,
    height,
    unit,
    groundY,
    doorX: ROCKET.x,
    doorLeft: ROCKET.x - DOOR.width / 2,
    jumpFromX: ROCKET.x + 40,
    landX: ROCKET.x + 450,
    exitOffX,
    stopA,
    stopA2,
    stopB,
    rockX,
    rockWidth: 140,
    stopC,
    maxCameraPx: (stopC + 700) * unit,
    poses: {
      landing: pose(ROCKET.x + 60, 1),
      door: pose(doorCameraX, DOOR_CAMERA_SCALE, 380),
      reveal: pose(exitOffX + 350, 0.9),
      inspect: pose(rockX - 80, 1.9, 110),
      confused: pose(stopC + 120, 1.6, undefined, 0.8),
      // Percy stands above the card row, which fills the bottom of the frame.
      rovers: pose(stopC + 160, 0.85, undefined, 0.64),
      mission: pose(stopC + 110, 1.5, undefined, 0.8),
      final: pose(stopC + 320, 0.85, undefined, 0.8),
    },
    followX: (percyX) => percyX + 130,
    followScale,
    followLift: liftForGround(0.8, followScale),
  };
}
