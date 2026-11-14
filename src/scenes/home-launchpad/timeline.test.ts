import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHomeNodes, resetHomeNodes, type HomeNodes } from './nodes';
import { createHomeLaunchTimeline, createHomeIdleLoops } from './timeline';

let nodes: HomeNodes;

function makeTimeline(overrides: Partial<Parameters<typeof createHomeLaunchTimeline>[0]> = {}) {
  return createHomeLaunchTimeline({
    nodes,
    reducedMotion: false,
    onPhase: vi.fn(),
    onCountdown: vi.fn(),
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

    expect(timeline.labels).toMatchObject({
      liftoff: 3.5,
      exit: 5.6,
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

  it('fires the countdown stamps in order', () => {
    const stamps: Array<number | string | null> = [];
    const timeline = makeTimeline({ onCountdown: (value) => stamps.push(value) });

    timeline.pause();
    timeline.seek(0.5, false);
    expect(stamps).toEqual([]);
    timeline.seek(1.0, false);
    expect(stamps).toEqual([3]);
    timeline.seek(2.6, false);
    expect(stamps).toEqual([3, 2, 1]);
    timeline.seek(3.4, false);
    expect(stamps).toEqual([3, 2, 1, 'GO!']);

    timeline.dispose();
  });

  it('moves the rocket up and the layers down at liftoff', () => {
    const timeline = makeTimeline();

    timeline.pause();
    timeline.seek(3.4, false);
    expect(nodes.rocket.motion.y).toBe(0);
    timeline.seek(4.6, false);
    expect(nodes.rocket.motion.y).toBeLessThan(0);
    // Deeper layers slide down; the crowd leaves fastest.
    expect(nodes.sky.motion.y).toBeGreaterThan(0);
    expect(nodes.crowd.motion.y).toBeGreaterThan(nodes.sky.motion.y);

    timeline.dispose();
  });

  it('covers the frame with smoke and fades the sky to deep space', () => {
    const phases: string[] = [];
    const timeline = makeTimeline({ onPhase: (phase) => phases.push(phase) });

    timeline.pause();
    timeline.seek(5.7, false);
    expect(phases).toContain('exit');
    timeline.seek(8.0, false);
    expect(nodes.smokeNear.motion.scale).toBeGreaterThan(1);
    expect(nodes.space.fade.opacity).toBeGreaterThan(0);

    timeline.dispose();
  });

  it('calls onComplete exactly once', () => {
    const onComplete = vi.fn();
    const timeline = makeTimeline({ onComplete });

    timeline.pause();
    timeline.seek(8.8, false);
    expect(onComplete).toHaveBeenCalledTimes(1);
    timeline.seek(9.2, false);
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

  it('creates loops for the rocket, smoke, crowd, boat and clouds', () => {
    const loops = createHomeIdleLoops(nodes, false);
    expect(loops).toHaveLength(10);
    for (const tween of loops) {
      tween.kill();
    }
  });

  it('resets the nodes back to rest', () => {
    nodes.rocket.motion.y = -120;
    nodes.smokeNear.motion.scale = 5;
    nodes.crowd.poseB.opacity = 1;
    resetHomeNodes(nodes, false);
    expect(nodes.rocket.motion.y).toBe(0);
    expect(nodes.smokeNear.motion.scale).toBe(1);
    expect(nodes.crowd.poseB.opacity).toBe(0);
    expect(nodes.rocket.exhaust.opacity).toBeCloseTo(0.85);
  });
});
