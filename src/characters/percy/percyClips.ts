import gsap from 'gsap';
import type { PercyNodes } from './percyNodes';

type Timeline = ReturnType<typeof gsap.timeline>;

/**
 * Percy's motion clips. Each builder adds tweens to a timeline at `at`, writes
 * only to `PercyNodes`, and returns its duration in seconds. A clip never
 * moves `body.x`: travel belongs to the scene, so the scene decides where
 * Percy goes and a dialogue change can never stop him.
 *
 * Reduced motion keeps every beat but replaces motion with one short pose:
 * no hop, no hesitation, no repeated sweeps.
 */
const SHORT = 0.25;

type MastPose = Partial<PercyNodes['mast']>;

function runSteps(
  timeline: Timeline,
  target: PercyNodes['mast'],
  at: number,
  steps: ReadonlyArray<readonly [MastPose, number]>,
): number {
  let cursor = at;
  for (const [pose, duration] of steps) {
    timeline.to(target, { ...pose, duration, ease: 'sine.inOut' }, cursor);
    cursor += duration;
  }
  return cursor - at;
}

/** Mast sweeps left, right, up, down, then returns to centre. */
export function addLookAround(
  timeline: Timeline,
  nodes: PercyNodes,
  at: number,
  reduced: boolean,
): number {
  const { mast } = nodes;
  if (reduced) {
    timeline.to(mast, { pan: -1, duration: SHORT, ease: 'none' }, at);
    timeline.to(mast, { pan: 0, tilt: 0, duration: SHORT, ease: 'none' }, at + SHORT);
    return SHORT * 2;
  }
  return runSteps(timeline, mast, at, [
    [{ pan: -1, tilt: 0 }, 0.7],
    [{ pan: 1, tilt: 0 }, 1.1],
    [{ pan: 0.4, tilt: 0.8 }, 0.8],
    [{ pan: -0.4, tilt: -0.7 }, 0.9],
    [{ pan: 0, tilt: 0 }, 0.7],
  ]);
}

/** Lean toward the ground and lower the arm: a scanning pose that holds. */
export function addInspect(
  timeline: Timeline,
  nodes: PercyNodes,
  at: number,
  reduced: boolean,
): number {
  const duration = reduced ? SHORT : 0.8;
  timeline.to(nodes.body, { rotation: 3, duration, ease: 'power2.out' }, at);
  timeline.to(nodes.mast, { tilt: -0.9, pan: 0.5, duration, ease: 'power2.out' }, at);
  timeline.to(nodes.arm, { angle: -10, duration, ease: 'power2.out' }, at);
  return duration;
}

/** Back to the rest pose after an inspect. */
export function addRelax(
  timeline: Timeline,
  nodes: PercyNodes,
  at: number,
  reduced: boolean,
): number {
  const duration = reduced ? SHORT : 0.6;
  timeline.to(nodes.body, { rotation: 0, duration, ease: 'power2.inOut' }, at);
  timeline.to(nodes.mast, { tilt: 0, pan: 0, duration, ease: 'power2.inOut' }, at);
  timeline.to(nodes.arm, { angle: 0, duration, ease: 'power2.inOut' }, at);
  return duration;
}

/** Confusion: the mast sweeps one way, hesitates, sweeps back. */
export function addConfused(
  timeline: Timeline,
  nodes: PercyNodes,
  at: number,
  reduced: boolean,
): number {
  const { mast } = nodes;
  if (reduced) {
    timeline.to(mast, { pan: -0.6, tilt: 0.3, duration: SHORT, ease: 'none' }, at);
    return SHORT;
  }
  return runSteps(timeline, mast, at, [
    [{ pan: -0.9, tilt: 0.2 }, 0.8],
    [{ pan: -0.9, tilt: 0.2 }, 0.45],
    [{ pan: 0.9, tilt: 0.3 }, 0.9],
    [{ pan: 0.9, tilt: 0.3 }, 0.4],
    [{ pan: -0.2, tilt: 0.5 }, 0.8],
  ]);
}

/** Point the mast at the horizon and hold. */
export function addPointMast(
  timeline: Timeline,
  nodes: PercyNodes,
  at: number,
  reduced: boolean,
): number {
  const duration = reduced ? SHORT : 0.9;
  timeline.to(nodes.mast, { pan: 1, tilt: 0.6, duration, ease: 'power2.inOut' }, at);
  return duration;
}

/**
 * The excited beat. Normal motion: two small mechanical hops with the arm
 * raised. Reduced motion: one short arm-raise pose. Either way the beat ends
 * with the body at rest.
 */
export function addExcited(
  timeline: Timeline,
  nodes: PercyNodes,
  at: number,
  reduced: boolean,
): number {
  if (reduced) {
    timeline.to(nodes.arm, { angle: 18, duration: SHORT, ease: 'none' }, at);
    timeline.to(nodes.arm, { angle: 0, duration: SHORT, ease: 'none' }, at + SHORT);
    return SHORT * 2;
  }
  timeline.to(nodes.arm, { angle: 20, duration: 0.3, ease: 'power2.out' }, at);
  timeline.to(nodes.glow, { opacity: 0.55, duration: 0.3, ease: 'sine.inOut' }, at);
  for (let hop = 0; hop < 2; hop += 1) {
    const start = at + 0.3 + hop * 0.7;
    timeline.to(nodes.body, { y: -34, rotation: -2, duration: 0.3, ease: 'power2.out' }, start);
    timeline.to(nodes.body, { y: 0, rotation: 0, duration: 0.4, ease: 'bounce.out' }, start + 0.3);
  }
  timeline.to(nodes.arm, { angle: 0, duration: 0.4, ease: 'power2.inOut' }, at + 1.7);
  timeline.to(nodes.glow, { opacity: 0, duration: 0.4, ease: 'sine.inOut' }, at + 1.7);
  return 2.1;
}
