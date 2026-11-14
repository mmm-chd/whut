import { describe, expect, it } from 'vitest';
import gsap from 'gsap';
import { assetManifest } from '../../assets/manifest';
import {
  addConfused,
  addExcited,
  addInspect,
  addLookAround,
  addPointMast,
  addRelax,
} from './percyClips';
import { createPercyNodes, resetPercyNodes } from './percyNodes';
import {
  PERCY_SCALE,
  RIG_PARTS,
  ROVER_ANCHOR,
  ROVER_FRAME,
  WHEEL_IDS,
  armShoulderPivot,
  mastBasePivot,
  mastHeadPivot,
  rigPart,
  rollBobUnits,
  rollRockDegrees,
  ROLL_BOB_AMPLITUDE,
  ROLL_BOB_PERIOD,
} from './rigLayout';

describe('Percy rig layout', () => {
  it('has the 11 drawn parts, back to front, each with a real manifest image', () => {
    expect(RIG_PARTS).toHaveLength(11);
    expect(new Set(RIG_PARTS.map((part) => part.id)).size).toBe(11);
    for (const part of RIG_PARTS) {
      expect(assetManifest[part.asset]?.type, part.asset).toBe('image');
      expect(assetManifest[part.asset]?.status, part.asset).toBe('final');
    }
    // Body under the mast and arm, wheels over the chassis.
    const order = RIG_PARTS.map((part) => part.id);
    expect(order.indexOf('body')).toBeLessThan(order.indexOf('neck'));
    expect(order.indexOf('chassis')).toBeLessThan(order.indexOf('wheel-front-left'));
    expect(order.indexOf('neck')).toBeLessThan(order.indexOf('camera'));
  });

  it('keeps every visible part inside the rover frame around the anchor', () => {
    for (const part of RIG_PARTS) {
      const left = part.visible.left + ROVER_ANCHOR.x;
      const top = part.visible.top + ROVER_ANCHOR.y;
      const right = part.visible.right + ROVER_ANCHOR.x;
      const bottom = part.visible.bottom + ROVER_ANCHOR.y;
      expect(left, part.id).toBeGreaterThanOrEqual(0);
      expect(top, part.id).toBeGreaterThanOrEqual(0);
      expect(right, part.id).toBeLessThanOrEqual(ROVER_FRAME.width);
      expect(bottom, part.id).toBeLessThanOrEqual(ROVER_FRAME.height);
    }
  });

  it('puts the nearest wheel on the ground line and the camera on top', () => {
    // The view is three-quarter, so far wheels sit higher; the nearest wheel
    // touches the anchor line and none dips below it.
    const bottoms = WHEEL_IDS.map((id) => rigPart(id).visible.bottom);
    expect(Math.max(...bottoms)).toBeGreaterThan(-40);
    expect(Math.max(...bottoms)).toBeLessThan(40);
    const camera = rigPart('camera');
    for (const part of RIG_PARTS) {
      expect(camera.visible.top).toBeLessThanOrEqual(part.visible.top);
    }
  });

  it('keeps each pivot inside its part', () => {
    const inside = (id: Parameters<typeof rigPart>[0], pivot: { x: number; y: number }) => {
      const { visible } = rigPart(id);
      expect(pivot.x).toBeGreaterThanOrEqual(visible.left - 1);
      expect(pivot.x).toBeLessThanOrEqual(visible.right + 1);
      expect(pivot.y).toBeGreaterThanOrEqual(visible.top - 1);
      expect(pivot.y).toBeLessThanOrEqual(visible.bottom + 1);
    };
    inside('neck', mastBasePivot());
    inside('neck', mastHeadPivot());
    inside('arm', armShoulderPivot());
    for (const id of WHEEL_IDS) {
      inside(id, rigPart(id).center);
    }
  });

  it('rolls with a small bob that depends only on distance, never on a clock', () => {
    expect(rollBobUnits(0)).toBeCloseTo(0);
    // Same distance, same bob: nothing time-based.
    expect(rollBobUnits(123.4)).toBe(rollBobUnits(123.4));
    // One bounce per period, always upward or flat, never below the ground.
    for (let x = 0; x < ROLL_BOB_PERIOD * 3; x += 3) {
      expect(rollBobUnits(x)).toBeLessThanOrEqual(0);
      expect(rollBobUnits(x)).toBeGreaterThanOrEqual(-ROLL_BOB_AMPLITUDE - 1e-9);
    }
    expect(rollBobUnits(ROLL_BOB_PERIOD / 2)).toBeCloseTo(-ROLL_BOB_AMPLITUDE);
    expect(rollBobUnits(ROLL_BOB_PERIOD)).toBeCloseTo(0);
    expect(Math.abs(rollRockDegrees(37))).toBeLessThan(1);
    expect(PERCY_SCALE * 848).toBeCloseTo(340);
  });

  it('keeps the wheels out of any rotating group: they never tumble', async () => {
    const source = await import('./PercyRig?raw');
    expect(source.default).not.toMatch(/wheelSpin|spin\(/);
  });
});

describe('Percy clips', () => {
  function run(add: (tl: ReturnType<typeof gsap.timeline>, reduced: boolean) => number, reduced: boolean) {
    const timeline = gsap.timeline({ paused: true });
    const duration = add(timeline, reduced);
    timeline.progress(1);
    timeline.kill();
    return duration;
  }

  it('look-around returns the mast to centre', () => {
    for (const reduced of [false, true]) {
      const nodes = createPercyNodes();
      const duration = run((tl, r) => addLookAround(tl, nodes, 0, r), reduced);
      expect(duration).toBeGreaterThan(0);
      expect(nodes.mast.pan).toBeCloseTo(0);
      expect(nodes.mast.tilt).toBeCloseTo(0);
    }
  });

  it('inspect leans in and relax returns to rest', () => {
    const nodes = createPercyNodes();
    run((tl, r) => addInspect(tl, nodes, 0, r), false);
    expect(nodes.body.rotation).toBeGreaterThan(0);
    expect(nodes.mast.tilt).toBeLessThan(0);
    run((tl, r) => addRelax(tl, nodes, 0, r), false);
    expect(nodes.body.rotation).toBeCloseTo(0);
    expect(nodes.arm.angle).toBeCloseTo(0);
  });

  it('confused sweeps and holds a pose; reduced motion is a single short move', () => {
    const normal = createPercyNodes();
    const reduced = createPercyNodes();
    const long = run((tl, r) => addConfused(tl, normal, 0, r), false);
    const short = run((tl, r) => addConfused(tl, reduced, 0, r), true);
    expect(short).toBeLessThan(long);
    expect(short).toBeLessThan(0.5);
  });

  it('excited hops and ends at rest; reduced motion never leaves the ground', () => {
    const nodes = createPercyNodes();
    run((tl, r) => addExcited(tl, nodes, 0, r), false);
    expect(nodes.body.y).toBeCloseTo(0);
    expect(nodes.body.rotation).toBeCloseTo(0);
    expect(nodes.arm.angle).toBeCloseTo(0);

    const still = createPercyNodes();
    let lowest = 0;
    const timeline = gsap.timeline({ paused: true });
    addExcited(timeline, still, 0, true);
    for (let time = 0; time <= timeline.duration(); time += 0.05) {
      timeline.time(time);
      lowest = Math.min(lowest, still.body.y);
    }
    timeline.kill();
    expect(lowest).toBe(0);
  });

  it('point-mast aims up and right; clips never move body.x', () => {
    const nodes = createPercyNodes();
    nodes.body.x = 700;
    run((tl, r) => addPointMast(tl, nodes, 0, r), false);
    run((tl, r) => addLookAround(tl, nodes, 0, r), false);
    run((tl, r) => addExcited(tl, nodes, 0, r), false);
    expect(nodes.body.x).toBe(700);
  });

  it('resets to rest', () => {
    const nodes = createPercyNodes();
    nodes.body.x = 5;
    nodes.mast.pan = 1;
    nodes.arm.angle = 9;
    resetPercyNodes(nodes);
    expect(nodes.body.x).toBe(0);
    expect(nodes.mast.pan).toBe(0);
    expect(nodes.arm.angle).toBe(0);
  });
});
