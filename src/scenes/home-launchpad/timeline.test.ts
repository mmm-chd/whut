import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHomeNodes, resetHomeNodes, type HomeNodes } from './nodes';
import { SMOKE_EDGE_OFFSET } from './layers';
import { WEDGE } from './wedge';
import { createHomeLaunchTimeline, createHomeIdleLoops } from './timeline';

let nodes: HomeNodes;

function makeTimeline(overrides: Partial<Parameters<typeof createHomeLaunchTimeline>[0]> = {}) {
  return createHomeLaunchTimeline({
    nodes,
    reducedMotion: false,
    onPhase: vi.fn(),
    onComplete: vi.fn(),
    ...overrides,
  });
}

describe('createHomeLaunchTimeline', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    nodes = createHomeNodes();
  });

  it('exposes the phase labels in presentation order', () => {
    const timeline = makeTimeline();
    timeline.pause();

    // The count-down is gone, so the cue sheet is compressed (plan §6.2).
    expect(timeline.labels).toMatchObject({
      ignition: 0,
      liftoff: 0.9,
      exit: 3,
    });

    timeline.dispose();
  });

  it('starts idle, then ignites', () => {
    const phases: string[] = [];
    const timeline = makeTimeline({ onPhase: (phase) => phases.push(phase) });

    timeline.pause();
    timeline.seek(0.02, false);
    expect(phases).toEqual(['ignition']);

    timeline.dispose();
  });

  it('leaves the engine cold until Play, then coughs before it roars', () => {
    const timeline = makeTimeline();
    timeline.pause();

    // Cold at rest (plan T5b): the plume is not drawn at all.
    expect(nodes.rocket.exhaust.opacity).toBe(0);

    // The cough: flame flickers on and part way off during the ignition beat.
    timeline.seek(0.1, true);
    const firstCough = nodes.rocket.exhaust.opacity;
    expect(firstCough).toBeGreaterThan(0.2);
    expect(firstCough).toBeLessThanOrEqual(0.6);

    // The roar: full plume and a longer flame before liftoff.
    timeline.seek(1, true);
    expect(nodes.rocket.exhaust.opacity).toBe(1);
    expect(nodes.rocket.exhaust.scaleY).toBeCloseTo(1.2, 1);

    timeline.dispose();
  });

  it('holds the rocket on the pad through ignition and climbs after liftoff', () => {
    const timeline = makeTimeline();
    timeline.pause();

    timeline.seek(0.85, true);
    expect(nodes.rocket.motion.y).toBe(0);

    timeline.seek(1.6, true);
    expect(nodes.rocket.motion.y).toBeLessThan(-20);

    timeline.dispose();
  });

  it('walks ignition, liftoff and exit in order, with no count-down beat', () => {
    const phases: string[] = [];
    const timeline = makeTimeline({ onPhase: (phase) => phases.push(phase) });

    timeline.pause();
    timeline.seek(0.4, false);
    expect(phases).toEqual(['ignition']);
    timeline.seek(1, false);
    expect(phases).toEqual(['ignition', 'liftoff']);
    timeline.seek(3.4, false);
    expect(phases).toEqual(['ignition', 'liftoff', 'exit']);

    timeline.dispose();
  });

  it('moves the rocket up and the layers down at liftoff', () => {
    const timeline = makeTimeline();

    timeline.pause();
    timeline.seek(0.7, false);
    expect(nodes.rocket.motion.y).toBe(0);
    timeline.seek(1.8, false);
    expect(nodes.rocket.motion.y).toBeLessThan(0);
    // Deeper layers slide down; the crowd leaves fastest.
    expect(nodes.sky.motion.y).toBeGreaterThan(0);
    expect(nodes.crowd.motion.y).toBeGreaterThan(nodes.sky.motion.y);

    timeline.dispose();
  });

  it('lifts the space wedge out of frame as the rocket climbs, and fades the sky with it', () => {
    const phases: string[] = [];
    const timeline = makeTimeline({ onPhase: (phase) => phases.push(phase) });

    timeline.pause();
    // Resting: the apex is below the frame, so the wedge shows nothing.
    expect(nodes.wedge.motion.y).toBe(0);
    timeline.seek(0.45, true);
    expect(nodes.wedge.motion.y).toBeLessThan(-300);
    // Lift-off beat: the apex is exactly at the pad's height.
    timeline.seek(0.9, true);
    expect(nodes.wedge.motion.y).toBeCloseTo(WEDGE.apexTakeoff - WEDGE.apexRest, 0);
    // Exit: the apex is past the top of the frame, so the wedge is the cover.
    timeline.seek(3.6, false);
    expect(WEDGE.apexRest + nodes.wedge.motion.y).toBeLessThan(0);
    expect(phases).toContain('exit');
    timeline.seek(4.6, false);
    expect(nodes.space.fade.opacity).toBeGreaterThan(0);

    timeline.dispose();
  });

  it('calls onComplete exactly once', () => {
    const onComplete = vi.fn();
    const timeline = makeTimeline({ onComplete });

    timeline.pause();
    timeline.seek(4.6, false);
    expect(onComplete).toHaveBeenCalledTimes(1);
    timeline.seek(6, false);
    expect(onComplete).toHaveBeenCalledTimes(1);

    timeline.dispose();
  });

  it('does nothing after dispose', () => {
    const onPhase = vi.fn();
    const timeline = makeTimeline({ onPhase });
    timeline.dispose();

    timeline.play(0);
    timeline.seek(1, false);

    expect(onPhase).not.toHaveBeenCalled();
  });
});

describe('createHomeIdleLoops', () => {
  beforeEach(() => {
    nodes = createHomeNodes();
  });

  it('returns no loops under reduced motion', () => {
    expect(createHomeIdleLoops(nodes, true)).toEqual([]);
  });

  it('creates loops only for the rocket and clouds — never for smoke or static launch equipment', () => {
    const loops = createHomeIdleLoops(nodes, false);
    // Idle is the rocket waiting on the pad: the smoke stack has no breathing
    // loop because it is not on screen at all. The crowd was replaced by a
    // quiet launch complex, so the pad no longer has figure-wave tweens.
    expect(loops).toHaveLength(4);
    for (const tween of loops) {
      tween.kill();
    }
  });

  it('hides both sand banks while the pad is idle', () => {
    // Two banks, not three: the middle layer was deleted in T7b.
    expect(Object.keys(nodes).filter((key) => key.startsWith('smoke'))).toEqual([
      'smokeBack',
      'smokeFront',
    ]);
    expect(nodes.smokeBack.motion.opacity).toBe(0);
    expect(nodes.smokeFront.motion.opacity).toBe(0);
  });

  it('brings the sand in with the ignition, in half a second', () => {
    const timeline = createHomeLaunchTimeline({
      nodes,
      reducedMotion: false,
      onPhase: () => {},
      onComplete: () => {},
    });
    timeline.play(0);
    timeline.seek(0.5, true);
    expect(nodes.smokeBack.motion.opacity).toBeGreaterThan(0.9);
    expect(nodes.smokeFront.motion.opacity).toBeGreaterThan(0.9);
    timeline.dispose();
  });

  it('welds both sand banks to the wedge edge', () => {
    const timeline = makeTimeline();
    timeline.pause();

    // The first frame puts the banks near the parked edge, below the frame; the
    // rise starts immediately, so this only has to be in the right region.
    const parked = WEDGE.apexRest - WEDGE.apexTakeoff;
    timeline.seek(0.02, true);
    expect(nodes.smokeBack.motion.y).toBeGreaterThan(parked * 0.8);
    expect(nodes.smokeBack.motion.y).toBeLessThanOrEqual(parked + SMOKE_EDGE_OFFSET.back + 1);

    // Lift-off: the bank is exactly one offset away from the edge line.
    timeline.seek(0.9, true);
    const edgeAtLiftoff = WEDGE.apexRest + nodes.wedge.motion.y - WEDGE.apexTakeoff;
    expect(nodes.smokeBack.motion.y).toBeCloseTo(edgeAtLiftoff + SMOKE_EDGE_OFFSET.back, 0);
    expect(nodes.smokeFront.motion.y).toBeCloseTo(edgeAtLiftoff + SMOKE_EDGE_OFFSET.front, 0);
    // ...and the front bank is the nearer of the two, so it sits lower.
    expect(SMOKE_EDGE_OFFSET.front).toBeGreaterThan(SMOKE_EDGE_OFFSET.back);

    // Exit: both banks have ridden the climb out of the frame.
    timeline.seek(3.6, true);
    expect(nodes.smokeBack.motion.y).toBeLessThan(-WEDGE.climb + 200);
    timeline.dispose();
  });

  it('resets the nodes back to rest', () => {
    nodes.rocket.motion.y = -120;
    nodes.smokeFront.motion.scale = 5;
    nodes.crowd.rows[2].poseB.opacity = 1;
    resetHomeNodes(nodes, false);
    expect(nodes.rocket.motion.y).toBe(0);
    expect(nodes.smokeFront.motion.scale).toBe(1);
    expect(nodes.smokeFront.motion.opacity).toBe(0);
    expect(nodes.crowd.rows[2].poseB.opacity).toBe(0);
    // A cold engine: nothing burns while the rocket waits (plan T5b).
    expect(nodes.rocket.exhaust.opacity).toBe(0);
    expect(nodes.rocket.exhaust.scaleY).toBeCloseTo(0.62);
  });
});
